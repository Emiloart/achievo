import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "e2e-user",
        userId: "ACHUSR-0000000001",
        primaryWallet: "0x0000000000000000000000000000000000000000",
        csrfToken: "e2e-csrf",
      }),
    });
  });

  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
});

test("verification page renders", async ({ page }) => {
  await page.goto("/verify");
  await expect(page.getByText("Verify a claim")).toBeVisible();
});

test("projects page renders for mocked auth", async ({ page }) => {
  await page.route("**/api/projects**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            project: {
              id: "proj-1",
              slug: "alpha",
              name: "Project Alpha",
              description: "Client build",
              status: "ACTIVE",
              visibility: "PRIVATE",
              dueDate: null,
              clientName: "Acme",
            },
            membership: { role: "OWNER", status: "ACTIVE" },
            stats: { goalsTotal: 3, goalsVerified: 1, completionPercent: 33 },
          },
        ],
      }),
    });
  });

  await page.goto("/projects");
  await expect(page.getByText("Project Alpha")).toBeVisible();
});

test("navigation does not request auth nonce after session established", async ({ page }) => {
  const nonceRequests: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/auth/nonce")) {
      nonceRequests.push(req.url());
    }
  });

  await page.goto("/dashboard");
  await page.goto("/projects");

  expect(nonceRequests.length).toBe(0);
});

test("org creation requires on-chain tx before backend finalize", async ({ page }) => {
  let finalizeCalled = false;

  await page.route("**/api/orgs/prepare", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          required: true,
          chainId: 84532,
          registry: "0x0000000000000000000000000000000000000001",
          fee: "1",
          handle: "acme-org",
        },
      }),
    });
  });

  await page.route("**/api/orgs", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.url().endsWith("/api/orgs")) {
      finalizeCalled = true;
    }
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ success: false, error: { message: "should not be called" } }),
    });
  });

  await page.goto("/orgs");
  await page.getByPlaceholder("Handle (lowercase)").fill("acme-org");
  await page.getByPlaceholder("Display name").fill("Acme Org");
  await page.getByRole("button", { name: "Create org" }).click();

  await expect(page.getByText("Connect your wallet to create an organization.")).toBeVisible();
  expect(finalizeCalled).toBe(false);
});
