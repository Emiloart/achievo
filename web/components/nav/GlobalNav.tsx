"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { useAccount, useReadContract } from "wagmi";
import { DropdownMenu } from "../ui";
import { coreAddress, coreAbi } from "../../lib/contracts";
import { useBackendAuth } from "../../hooks/useBackendAuth";
import { IdentityBadge } from "../IdentityBadge";

const ConnectWallet = dynamic(() => import("../ConnectWallet").then((m) => m.ConnectWallet), { ssr: false });

type NavItem = { label: string; href: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Identity", href: "/identity" },
  { label: "Orgs", href: "/orgs" },
  { label: "Projects", href: "/projects" },
  { label: "Parties", href: "/parties" },
  { label: "Usernames", href: "/usernames/market" },
  { label: "Verify", href: "/verify" },
];

const GOALS_GROUP: NavGroup = {
  label: "Goals",
  items: [
    { label: "New goal", href: "/goals/new" },
    { label: "Approvals", href: "/approve" },
  ],
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function GlobalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { address } = useAccount();
  const { user, signOut } = useBackendAuth();
  const { data: owner } = useReadContract({
    address: coreAddress || undefined,
    abi: coreAbi,
    functionName: "owner",
    query: { enabled: Boolean(coreAddress) },
  });

  const ownerAddress = owner ? String(owner).toLowerCase() : "";
  const adminEligible = address && ownerAddress && address.toLowerCase() === ownerAddress;
  const mobileItems: NavItem[] = [
    ...NAV_ITEMS,
    ...GOALS_GROUP.items,
    ...(adminEligible ? [{ label: "Admin", href: "/admin" }] : []),
  ];

  const menuItems = [
    address
      ? {
          id: "profile",
          label: "Profile",
          onSelect: () => router.push(`/profile/${address}`),
        }
      : null,
    user?.userId
      ? {
          id: "professional",
          label: "Professional profile",
          onSelect: () => router.push(`/profile/professional/${user.userId}`),
        }
      : null,
    {
      id: "settings",
      label: "Settings",
      onSelect: () => router.push("/dashboard"),
    },
    user
      ? {
          id: "logout",
          label: "Logout",
          onSelect: () => signOut(),
        }
      : null,
  ].filter(Boolean) as { id: string; label: string; onSelect: () => void }[];

  const menuTrigger = user?.userId || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Account");

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight font-display">
            Achievo
          </Link>
          <DropdownMenu
            triggerLabel="Menu"
            className="md:hidden"
            items={mobileItems.map((item) => ({
              id: item.href,
              label: item.label,
              onSelect: () => router.push(item.href),
            }))}
          />
          <nav className="hidden items-center gap-3 text-xs text-textMuted md:flex">
            {NAV_ITEMS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "rounded-full px-3 py-1 transition",
                  isActive(pathname, link.href) ? "bg-surface2 text-text" : "hover:text-text",
                )}
              >
                {link.label}
              </Link>
            ))}
            <DropdownMenu
              triggerLabel={GOALS_GROUP.label}
              items={GOALS_GROUP.items.map((item) => ({
                id: item.href,
                label: item.label,
                onSelect: () => router.push(item.href),
              }))}
            />
            {adminEligible ? (
              <Link
                href="/admin"
                className={clsx(
                  "rounded-full px-3 py-1 transition",
                  isActive(pathname, "/admin") ? "bg-surface2 text-text" : "hover:text-text",
                )}
              >
                Admin
              </Link>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <IdentityBadge />
          <DropdownMenu triggerLabel={menuTrigger} items={menuItems} />
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
