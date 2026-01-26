import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { Policy } from "../policy/schema";

export type ActionContext = {
  pathname: string;
  router: AppRouterInstance;
  policy: Policy;
  isAuthenticated: boolean;
  userId?: string | null;
  adminEligible: boolean;
  selectedIds?: string[];
};

export type ActionAvailability = {
  visible: boolean;
  enabled: boolean;
  reason?: string;
};

export type ActionDefinition = {
  id: string;
  label: string;
  section: string;
  shortcut?: string;
  predicate?: (ctx: ActionContext) => ActionAvailability;
  run: (ctx: ActionContext) => void;
};
