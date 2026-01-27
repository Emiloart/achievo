"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAccount } from "wagmi";
import { Button, DropdownMenu } from "../ui";
import { useBackendAuth } from "../../hooks/useBackendAuth";
import { IdentityBadge } from "../IdentityBadge";
import { GOALS_NAV, PRIMARY_NAV } from "./navItems";
import { SessionIndicator } from "./SessionIndicator";
import { useDensity } from "../layout/DensityProvider";
import { useEffects } from "../layout/EffectsProvider";

const ConnectWallet = dynamic(() => import("../ConnectWallet").then((m) => m.ConnectWallet), { ssr: false });

export function GlobalNav() {
  const router = useRouter();
  const { address } = useAccount();
  const { user, signOut } = useBackendAuth();
  const { density, toggleDensity } = useDensity();
  const { effects, toggleEffects } = useEffects();
  const openCommandPalette = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("achievo:command-palette"));
  };
  const densityLabel = density === "compact" ? "Compact" : "Comfortable";
  const effectsLabel = effects === "on" ? "On" : "Off";
  const menuItems = [
    address
      ? {
          id: "profile",
          label: "Profile",
          onSelect: () => router.push(`/profile/${address}` as Route),
        }
      : null,
    user?.userId
      ? {
          id: "professional",
          label: "Professional profile",
          onSelect: () => router.push(`/profile/professional/${user.userId}` as Route),
        }
      : null,
    {
      id: "settings",
      label: "Settings",
      onSelect: () => router.push("/dashboard" as Route),
    },
    {
      id: "density",
      label: `Density: ${densityLabel}`,
      onSelect: () => toggleDensity(),
    },
    {
      id: "effects",
      label: `Effects: ${effectsLabel}`,
      onSelect: () => toggleEffects(),
    },
    user
      ? {
          id: "logout",
          label: "Logout",
          onSelect: () => signOut(),
        }
      : null,
  ].filter(Boolean) as { id: string; label: string; onSelect: () => void }[];

  const navMenuItems = [...PRIMARY_NAV, ...GOALS_NAV].map((item) => ({
    id: item.href,
    label: item.label,
    onSelect: () => router.push(item.href as Route),
  }));

  const menuTrigger = user?.userId || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Account");

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-[var(--nav-gap)] px-4 py-[var(--nav-pad-y)]">
        <div className="flex items-center gap-[var(--nav-gap-tight)]">
          <Link href="/" className="text-lg font-semibold tracking-tight font-display">
            Achievo
          </Link>
          <DropdownMenu triggerLabel="Menu" className="lg:hidden" items={navMenuItems} />
        </div>
        <div className="flex items-center gap-[var(--nav-gap-tight)]">
          <Button
            size="sm"
            variant="secondary"
            onClick={openCommandPalette}
            aria-haspopup="dialog"
            className="flex items-center gap-2"
          >
            <span>Search / Commands</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-textMuted">
              Ctrl+K / ⌘K
            </span>
          </Button>
          <SessionIndicator />
          <IdentityBadge />
          <DropdownMenu triggerLabel={menuTrigger} items={menuItems} />
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
