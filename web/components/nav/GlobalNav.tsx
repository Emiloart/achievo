"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAccount } from "wagmi";
import { DropdownMenu } from "../ui";
import { useBackendAuth } from "../../hooks/useBackendAuth";
import { IdentityBadge } from "../IdentityBadge";
import { GOALS_NAV, PRIMARY_NAV } from "./navItems";
import { SessionIndicator } from "./SessionIndicator";

const ConnectWallet = dynamic(() => import("../ConnectWallet").then((m) => m.ConnectWallet), { ssr: false });

export function GlobalNav() {
  const router = useRouter();
  const { address } = useAccount();
  const { user, signOut } = useBackendAuth();
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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-semibold tracking-tight font-display">
            Achievo
          </Link>
          <DropdownMenu triggerLabel="Menu" className="lg:hidden" items={navMenuItems} />
        </div>
        <div className="flex items-center gap-3">
          <SessionIndicator />
          <IdentityBadge />
          <DropdownMenu triggerLabel={menuTrigger} items={menuItems} />
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
