import { test, expect, type Page } from "@playwright/test";

const DEFAULT_POLICY = {
  version: 1,
  featureFlags: {
    verifyPortalEnabled: true,
    usernameMarketEnabled: true,
    anchoringEnabled: true,
    orgCreateRequired: true,
    endorsementsEnabled: true,
  },
  thresholds: {
    finalityConfirmations: 1,
    degradedStalenessSeconds: 300,
  },
  displayPolicies: {
    showRiskSignalsToPublic: true,
    showVerificationAsExperimental: false,
    anonymizeUsernameOwner: false,
  },
  messaging: {
    globalBanner: { enabled: false, level: "info", markdown: "" },
    featureNotices: { usernameMarket: "", anchoring: "", verifyPortal: "" },
  },
};

type ApiMock = (route: any) => Promise<boolean>;

let apiMocks: ApiMock[] = [];

test.describe.configure({ timeout: 120_000 });

function registerApiMock(handler: ApiMock) {
  apiMocks.unshift(handler);
}

function registerDefaultApiMock(handler: ApiMock) {
  apiMocks.push(handler);
}

async function goto(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

async function fulfillJson(route: any, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function registerPolicyMock(overrides: Partial<typeof DEFAULT_POLICY>, priority: "default" | "override" = "default") {
  const register = priority === "override" ? registerApiMock : registerDefaultApiMock;
  register(async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/policies/public") return false;
    await fulfillJson(route, 200, { policy: { ...DEFAULT_POLICY, ...overrides } });
    return true;
  });
}

test.beforeEach(async ({ page }) => {
  apiMocks = [];
  await page.addInitScript(() => {
    (globalThis as { __ACHIEVO_POLICY_RESET__?: boolean }).__ACHIEVO_POLICY_RESET__ = true;
  });

  registerDefaultApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/auth/me") return false;
    await fulfillJson(route, 200, {
      id: "e2e-user",
      userId: "ACHUSR-0000000001",
      primaryWallet: "0x0000000000000000000000000000000000000000",
      csrfToken: "e2e-csrf",
    });
    return true;
  });

  registerDefaultApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/auth/refresh") return false;
    await fulfillJson(route, 200, { success: true });
    return true;
  });

  registerDefaultApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/health/chain") return false;
    await fulfillJson(route, 200, { status: "OK" });
    return true;
  });

  registerDefaultApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/health/indexer") return false;
    await fulfillJson(route, 200, { status: "OK" });
    return true;
  });

  registerDefaultApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/health/anchoring") return false;
    await fulfillJson(route, 200, { status: "OK" });
    return true;
  });

  registerPolicyMock({}, "default");

  await page.route("**/api/**", async (route) => {
    for (const handler of apiMocks) {
      if (await handler(route)) return;
    }
    const method = route.request().method().toUpperCase();
    await fulfillJson(route, 200, method === "GET" ? { data: [] } : { success: true });
  });
});

test("verification page renders", async ({ page }) => {
  await goto(page, "/verify");
  await expect(page.getByText("Verify a claim")).toBeVisible();
});

test("projects page renders for mocked auth", async ({ page }) => {
  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/projects")) return false;
    await fulfillJson(route, 200, {
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
    });
    return true;
  });

  await goto(page, "/projects");
  await expect(page.getByText("Project Alpha")).toBeVisible({ timeout: 15000 });
});

test("navigation does not request auth nonce after session established", async ({ page }) => {
  const nonceRequests: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/auth/nonce")) {
      nonceRequests.push(req.url());
    }
  });

  await goto(page, "/dashboard");
  await goto(page, "/projects");

  expect(nonceRequests.length).toBe(0);
});

test("org creation requires on-chain tx before backend finalize", async ({ page }) => {
  let finalizeCalled = false;

  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/orgs/prepare") return false;
    await fulfillJson(route, 200, {
      success: true,
      data: {
        required: true,
        chainId: 84532,
        registry: "0x0000000000000000000000000000000000000001",
        fee: "1",
        handle: "acme-org",
      },
    });
    return true;
  });

  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/orgs") return false;
    if (route.request().method().toUpperCase() === "POST") {
      finalizeCalled = true;
    }
    await fulfillJson(route, 500, { success: false, error: { message: "should not be called" } });
    return true;
  });

  await goto(page, "/orgs");
  await page.getByPlaceholder("Handle (lowercase)").fill("acme-org");
  await page.getByPlaceholder("Display name").fill("Acme Org");
  await expect(page.getByRole("button", { name: "Create org" })).toBeEnabled({ timeout: 10000 });
  await page.getByRole("button", { name: "Create org" }).click();

  await expect(page.getByText("Create a new org")).toBeVisible({ timeout: 15000 });
  expect(finalizeCalled).toBe(false);
});

test("degraded banner appears when health is degraded", async ({ page }) => {
  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/health/chain") return false;
    await fulfillJson(route, 200, { status: "DEGRADED" });
    return true;
  });

  await goto(page, "/dashboard");
  await expect(page.getByText("Degraded mode")).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("button", { name: "Details" })).toBeVisible({ timeout: 15000 });
});

test("degraded banner stays hidden when health is ok", async ({ page }) => {
  await goto(page, "/dashboard");
  await expect(page.getByText("Degraded mode")).toHaveCount(0);
});

test("verification unknown state renders as non-failure", async ({ page }) => {
  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/verify/proof/")) return false;
    await fulfillJson(route, 200, {
      type: "proof",
      id: "proof-123",
      valid: true,
      checks: { anchorVerified: "unknown" },
      details: { sha256: "0x" + "ab".repeat(32) },
    });
    return true;
  });

  await goto(page, "/verify/proof/proof-123");
  await expect(page.getByText("Verification unknown")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Unable to confirm right now")).toBeVisible();
});

test("verification proof renders invalid and not found states", async ({ page }) => {
  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/verify/proof/")) return false;
    if (url.pathname.endsWith("/proof-invalid")) {
      await fulfillJson(route, 200, {
        type: "proof",
        id: "proof-invalid",
        valid: false,
        checks: { anchorPresent: false, anchorVerified: false },
        details: { sha256: "0x" + "ab".repeat(32) },
      });
      return true;
    }
    if (url.pathname.endsWith("/proof-missing")) {
      await fulfillJson(route, 404, { error: { message: "Not found" } });
      return true;
    }
    return false;
  });

  await goto(page, "/verify/proof/proof-invalid");
  await expect(page.getByText("Verification failed")).toBeVisible({ timeout: 15000 });

  await goto(page, "/verify/proof/proof-missing");
  await expect(page.getByText("Not found").first()).toBeVisible({ timeout: 15000 });
});

test("verification tx renders unknown, invalid, and not found states", async ({ page }) => {
  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/verify/tx/")) return false;
    if (url.pathname.endsWith("0x" + "11".repeat(32))) {
      await fulfillJson(route, 200, {
        type: "tx",
        txHash: "0x" + "11".repeat(32),
        valid: true,
        checks: { anchorPresent: true, anchorVerified: "unknown" },
        details: { chainId: 84532, contract: "0x" + "ab".repeat(20), anchoredAt: null },
      });
      return true;
    }
    if (url.pathname.endsWith("0x" + "22".repeat(32))) {
      await fulfillJson(route, 200, {
        type: "tx",
        txHash: "0x" + "22".repeat(32),
        valid: false,
        checks: { anchorPresent: false, anchorVerified: false },
        details: { chainId: 84532, contract: "0x" + "cd".repeat(20), anchoredAt: null },
      });
      return true;
    }
    await fulfillJson(route, 404, { error: { message: "Not found" } });
    return true;
  });

  await goto(page, `/verify/tx/${"0x" + "11".repeat(32)}`);
  await expect(page.getByText("Verification unknown")).toBeVisible({ timeout: 15000 });

  await goto(page, `/verify/tx/${"0x" + "22".repeat(32)}`);
  await expect(page.getByText("Verification failed")).toBeVisible({ timeout: 15000 });

  await goto(page, `/verify/tx/${"0x" + "33".repeat(32)}`);
  await expect(page.getByText("Not found").first()).toBeVisible({ timeout: 15000 });
});

test("policy gating disables verify portal and username market", async ({ page }) => {
  registerPolicyMock(
    {
      featureFlags: { ...DEFAULT_POLICY.featureFlags, verifyPortalEnabled: false, usernameMarketEnabled: false },
    },
    "override",
  );

  await goto(page, "/verify");
  await expect(page.getByText("Verification disabled")).toBeVisible({ timeout: 15000 });

  await goto(page, "/usernames/market");
  await expect(page.getByText("Username market disabled")).toBeVisible({ timeout: 15000 });
});

test("session indicator shows sign in when signed out", async ({ page }) => {
  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/auth/me") return false;
    await fulfillJson(route, 401, { error: "Unauthorized" });
    return true;
  });
  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/auth/refresh") return false;
    await fulfillJson(route, 401, { error: "Unauthorized" });
    return true;
  });

  await goto(page, "/dashboard");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("org create page shows tx stepper and finality timeline when tx state is preset", async ({ page }) => {
  await page.addInitScript(() => {
    (globalThis as any).__ACHIEVO_E2E_TX_STATE__ = {
      state: "confirming",
      txHash: "0x" + "11".repeat(32),
    };
  });

  await goto(page, "/orgs");
  await expect(page.getByText("Transaction status")).toBeVisible();
  await expect(page.getByText("Finality timeline")).toBeVisible();
});

test("org admin workbench renders tabs", async ({ page }) => {
  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/orgs/acme") return false;
    await fulfillJson(route, 200, {
      data: {
        org: {
          id: "org-1",
          handle: "acme",
          displayName: "Acme Org",
          visibility: "PUBLIC",
          onchainStatus: "CONFIRMED",
          onchainChainId: 84532,
          onchainCreationTxHash: "0x" + "11".repeat(32),
        },
        membership: { role: "ADMIN" },
        programs: [],
      },
    });
    return true;
  });

  await goto(page, "/orgs/acme/admin");
  await expect(page.getByText("Acme Org admin")).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Programs" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Submissions" })).toBeVisible();
});

test("validator inbox renders registration gate or inbox", async ({ page }) => {
  await goto(page, "/validators/inbox");
  await expect(page.getByText("Validator inbox")).toBeVisible();
  const gate = page.locator("text=Register as a validator").or(page.locator("text=Connect your wallet"));
  await expect(gate).toBeVisible();
});

test("project workbench renders tab shell", async ({ page }) => {
  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/projects/alpha")) return false;
    if (url.pathname === "/api/projects/alpha") {
      await fulfillJson(route, 200, {
        data: {
          project: {
            id: "proj-1",
            slug: "alpha",
            name: "Project Alpha",
            description: "",
            status: "ACTIVE",
            visibility: "PRIVATE",
            ownerAchusrId: "ACHUSR-0000000001",
          },
          membership: { role: "OWNER", status: "ACTIVE" },
          stats: { goalsTotal: 0, goalsVerified: 0, completionPercent: 0, membersCount: 1 },
        },
      });
      return true;
    }
    if (url.pathname.endsWith("/goals")) {
      await fulfillJson(route, 200, { data: { goals: [] } });
      return true;
    }
    if (url.pathname.endsWith("/members")) {
      await fulfillJson(route, 200, { data: [] });
      return true;
    }
    if (url.pathname.endsWith("/activity")) {
      await fulfillJson(route, 200, { data: [] });
      return true;
    }
    if (url.pathname.endsWith("/time-entries")) {
      await fulfillJson(route, 200, {
        data: { entries: [], summary: { totalMinutes: 0, billableMinutes: 0, nonBillableMinutes: 0 } },
      });
      return true;
    }
    if (url.pathname.endsWith("/billing/settings")) {
      await fulfillJson(route, 200, {
        data: {
          billingModel: "TIME",
          currency: "USD",
          hourlyRateAmount: null,
          fixedFeeAmount: null,
          taxPercent: null,
          defaultDueDays: null,
          notes: "",
        },
      });
      return true;
    }
    if (url.pathname.endsWith("/invoices")) {
      await fulfillJson(route, 200, { data: [] });
      return true;
    }
    if (url.pathname.endsWith("/share-links")) {
      await fulfillJson(route, 200, { data: [] });
      return true;
    }
    return false;
  });

  await goto(page, "/projects/alpha");
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("tab", { name: "Time tracking" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("tab", { name: "Invoices" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("tab", { name: "Share links" })).toBeVisible({ timeout: 15000 });
});

test("username market trade transitions from pending to confirmed", async ({ page }) => {
  let tradePolls = 0;
  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/usernames/orders") return false;
    if (url.searchParams.get("type") !== "ASK") return false;
    await fulfillJson(route, 200, {
      data: [
        {
          id: "ask-1",
          normalized: "alice",
          priceWei: "10000000000000000",
          currency: "ETH",
          status: "OPEN",
          makerAddress: "0x0000000000000000000000000000000000000000",
        },
      ],
    });
    return true;
  });

  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/usernames/orders/ask-1/accept") return false;
    await fulfillJson(route, 200, {
      data: {
        trade: { id: "trade-1", normalized: "alice", status: "PENDING", txHash: "0x" + "ab".repeat(32) },
      },
    });
    return true;
  });

  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/usernames/trades") return false;
    if (url.searchParams.get("handle") !== "alice") return false;
    tradePolls += 1;
    const status = tradePolls > 3 ? "CONFIRMED" : "PENDING";
    await fulfillJson(route, 200, {
      data: [{ id: "trade-1", normalized: "alice", status, txHash: "0x" + "ab".repeat(32) }],
    });
    return true;
  });

  await goto(page, "/usernames/market");
  await expect(page.getByText("Signed in")).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: "Buy" })).toBeEnabled({ timeout: 10000 });
  await page.getByRole("button", { name: "Buy" }).click();
  await expect(page.getByText("Transfer for @alice")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Awaiting on-chain confirmations")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Finalized").first()).toBeVisible({ timeout: 7000 });
});

test("a11y: global nav keyboard access and modal focus trap", async ({ page }) => {
  test.setTimeout(90_000);
  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/verify/proof/")) return false;
    await fulfillJson(route, 200, {
      type: "proof",
      id: "proof-acc",
      valid: true,
      checks: { anchorPresent: true, anchorVerified: true },
      details: { sha256: "0x" + "ab".repeat(32) },
    });
    return true;
  });

  await goto(page, "/dashboard");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Achievo" })).toBeFocused();
  await expect(page.getByRole("button", { name: /ACHUSR|Account/ })).toBeVisible();

  await goto(page, "/verify/proof/proof-acc");
  await page.getByRole("button", { name: "View details" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Close drawer" })).toBeVisible();

  await page.keyboard.press("Tab");
  const focusInside = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    return Boolean(active && active.closest('[role="dialog"]'));
  });
  expect(focusInside).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a11y snapshots include headings for key routes", async ({ page }) => {
  test.setTimeout(60_000);
  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/achievo/profile/")) return false;
    const address = url.pathname.split("/").pop() || "";
    await fulfillJson(route, 200, {
      data: {
        displayName: "Test User",
        achusrId: "ACHUSR-0000000001",
        achievoId: "ACHUSR-0000000001",
        username: "testuser",
        bio: "",
        about: "",
        avatar: "",
        walletAddress: address,
      },
    });
    return true;
  });

  registerApiMock(async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/usernames/orders")) return false;
    await fulfillJson(route, 200, { data: [] });
    return true;
  });

  const routes = ["/orgs", "/usernames/market", "/verify", "/profile/0x1111111111111111111111111111111111111111"];

  const hasHeading = (node: any): boolean => {
    if (!node) return false;
    if (node.role === "heading") return true;
    return Array.isArray(node.children) && node.children.some(hasHeading);
  };

  for (const route of routes) {
    await goto(page, route);
    const snapshot = await page.accessibility.snapshot();
    expect(snapshot).toBeTruthy();
    expect(hasHeading(snapshot)).toBeTruthy();
  }
});
