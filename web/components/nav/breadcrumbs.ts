import type { Breadcrumb } from "./PageHeader";

const ROOTS = {
  orgs: { label: "Organizations", href: "/orgs" },
  projects: { label: "Projects", href: "/projects" },
  validators: { label: "Validators", href: "/validators/inbox" },
  verify: { label: "Verify", href: "/verify" },
} as const;

export function orgBreadcrumbs(handle: string, label?: string): Breadcrumb[] {
  const name = label || handle;
  return [ROOTS.orgs, { label: name, href: `/orgs/${handle}` }];
}

export function orgAdminBreadcrumbs(handle: string, label?: string): Breadcrumb[] {
  return [...orgBreadcrumbs(handle, label), { label: "Admin" }];
}

export function orgMembersBreadcrumbs(handle: string, label?: string): Breadcrumb[] {
  return [...orgBreadcrumbs(handle, label), { label: "Members" }];
}

export function projectBreadcrumbs(slug: string, label?: string): Breadcrumb[] {
  const name = label || slug;
  return [ROOTS.projects, { label: name, href: `/projects/${slug}` }];
}

export function projectInvoicesBreadcrumbs(slug: string, label?: string): Breadcrumb[] {
  return [...projectBreadcrumbs(slug, label), { label: "Invoices" }];
}

export function validatorInboxBreadcrumbs(): Breadcrumb[] {
  return [ROOTS.validators, { label: "Inbox" }];
}

export function verifyBreadcrumbs(label?: string): Breadcrumb[] {
  return label ? [ROOTS.verify, { label }] : [ROOTS.verify];
}
