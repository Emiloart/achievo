"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBackendAuth } from "../../hooks/useBackendAuth";
import { useAdminEligibility } from "../../hooks/useAdminEligibility";
import { usePolicy } from "../../hooks/usePolicy";
import { getActionRegistry } from "../../lib/actions/registry";
import { CommandPaletteModal } from "./CommandPaletteModal";

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useBackendAuth();
  const { policy } = usePolicy();
  const adminEligible = useAdminEligibility();
  const [open, setOpen] = useState(false);

  const context = useMemo(
    () => ({
      pathname,
      router,
      policy,
      isAuthenticated: Boolean(user),
      userId: user?.userId || null,
      adminEligible,
      selectedIds: [],
    }),
    [adminEligible, pathname, policy, router, user],
  );

  const actions = useMemo(() => {
    const registry = getActionRegistry(context);
    return registry
      .map((action) => {
        const availability = action.predicate ? action.predicate(context) : { visible: true, enabled: true };
        return {
          id: action.id,
          label: action.label,
          section: action.section,
          shortcut: action.shortcut,
          enabled: availability.enabled,
          reason: availability.reason,
          visible: availability.visible,
          onRun: () => action.run(context),
        };
      })
      .filter((action) => action.visible);
  }, [context]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isCmdK) return;
      event.preventDefault();
      setOpen(true);
    };
    const onOpenRequest = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("achievo:command-palette", onOpenRequest as EventListener);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("achievo:command-palette", onOpenRequest as EventListener);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return <CommandPaletteModal open={open} onClose={() => setOpen(false)} actions={actions} />;
}
