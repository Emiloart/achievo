import type { ActionAvailability, ActionContext, ActionDefinition } from "./types";

const ADMIN_CONSOLE_URL = process.env.NEXT_PUBLIC_ADMIN_CONSOLE_URL || "http://localhost:3001";

const allow: ActionAvailability = { visible: true, enabled: true };

function requireAuth(ctx: ActionContext, reason = "Sign in required"): ActionAvailability {
  if (ctx.isAuthenticated) return allow;
  return { visible: true, enabled: false, reason };
}

function requirePolicy(
  ctx: ActionContext,
  flag: keyof ActionContext["policy"]["featureFlags"],
  reason = "Disabled by policy",
): ActionAvailability {
  if (ctx.policy.featureFlags[flag]) return allow;
  return { visible: true, enabled: false, reason };
}

export function getActionRegistry(ctx: ActionContext): ActionDefinition[] {
  const actions: ActionDefinition[] = [
    {
      id: "nav.dashboard",
      label: "Go Dashboard",
      section: "Navigation",
      run: ({ router }) => router.push("/dashboard"),
    },
    {
      id: "nav.identity",
      label: "Go Identity",
      section: "Navigation",
      run: ({ router }) => router.push("/identity"),
    },
    {
      id: "nav.orgs",
      label: "Go Orgs",
      section: "Navigation",
      run: ({ router }) => router.push("/orgs"),
    },
    {
      id: "nav.projects",
      label: "Go Projects",
      section: "Navigation",
      run: ({ router }) => router.push("/projects"),
    },
    {
      id: "nav.parties",
      label: "Go Parties",
      section: "Navigation",
      run: ({ router }) => router.push("/parties"),
    },
    {
      id: "nav.usernames",
      label: "Go Usernames Market",
      section: "Navigation",
      predicate: (next) => requirePolicy(next, "usernameMarketEnabled", "Username market disabled"),
      run: ({ router }) => router.push("/usernames/market"),
    },
    {
      id: "nav.verify",
      label: "Go Verify",
      section: "Navigation",
      predicate: (next) => requirePolicy(next, "verifyPortalEnabled", "Verify portal disabled"),
      run: ({ router }) => router.push("/verify"),
    },
    {
      id: "create.org",
      label: "Create Org",
      section: "Create",
      predicate: (next) => requireAuth(next),
      run: ({ router }) => router.push("/orgs?focus=create"),
    },
    {
      id: "create.project",
      label: "Create Project",
      section: "Create",
      predicate: (next) => requireAuth(next),
      run: ({ router }) => router.push("/projects/new"),
    },
    {
      id: "create.goal",
      label: "Create Goal",
      section: "Create",
      predicate: (next) => requireAuth(next),
      run: ({ router }) => router.push("/goals/new"),
    },
    {
      id: "verify.open",
      label: "Open Verify input",
      section: "Verify",
      predicate: (next) => requirePolicy(next, "verifyPortalEnabled", "Verify portal disabled"),
      run: ({ router }) => router.push("/verify?focus=input"),
    },
    {
      id: "workbench.validator",
      label: "Open Validator Inbox",
      section: "Workbench",
      run: ({ router }) => router.push("/validators/inbox"),
    },
    {
      id: "admin.console",
      label: "Open Admin Console",
      section: "Admin",
      predicate: ({ adminEligible }) =>
        adminEligible ? allow : { visible: false, enabled: false, reason: "Admin eligibility required" },
      run: () => {
        if (typeof window !== "undefined") {
          window.open(ADMIN_CONSOLE_URL, "_blank", "noopener,noreferrer");
        }
      },
    },
  ];

  const orgMatch = ctx.pathname.match(/^\/orgs\/([^/]+)$/);
  if (orgMatch) {
    const handle = orgMatch[1];
    actions.push({
      id: "workbench.orgAdmin",
      label: "Open Org Admin Workspace",
      section: "Workbench",
      predicate: (next) => requireAuth(next),
      run: ({ router }) => router.push(`/orgs/${handle}/admin`),
    });
  }

  const projectMatch = ctx.pathname.match(/^\/projects\/([^/]+)$/);
  if (projectMatch) {
    const slug = projectMatch[1];
    actions.push({
      id: "workbench.project",
      label: "Open Project Workbench",
      section: "Workbench",
      predicate: (next) => requireAuth(next),
      run: ({ router }) => router.push(`/projects/${slug}`),
    });
  }

  return actions;
}
