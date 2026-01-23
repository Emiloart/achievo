"use client";

import Link from "next/link";
import { PageHeader } from "../../components/nav/PageHeader";
import { Card, CardBody, ButtonLink } from "../../components/ui";

const ADMIN_CONSOLE_URL = process.env.NEXT_PUBLIC_ADMIN_CONSOLE_URL || "http://localhost:3001";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Console"
        description="Administrative tools are hosted separately for isolation."
        breadcrumbs={[{ label: "Admin" }]}
      />
      <Card>
        <CardBody className="space-y-3">
          <div className="text-sm text-textMuted">
            This route is a placeholder. The Admin Console runs on a separate origin for security.
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href={ADMIN_CONSOLE_URL} variant="secondary" size="sm">
              Open Admin Console
            </ButtonLink>
            <Link href="/dashboard" className="text-xs text-accent hover:underline">
              Back to dashboard
            </Link>
          </div>
          <div className="text-xs text-textMuted">Admin Console URL: {ADMIN_CONSOLE_URL}</div>
        </CardBody>
      </Card>
    </div>
  );
}
