"use client";

import { getApiError } from "../../../lib/apiError";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useBackendAuth } from "../../../hooks/useBackendAuth";
import { PageHeader } from "../../../components/nav/PageHeader";
import { orgBreadcrumbs } from "../../../components/nav/breadcrumbs";
import { DegradedHint } from "../../../components/states/DegradedHint";
import { EmptyState } from "../../../components/states/EmptyState";
import { ErrorState } from "../../../components/states/ErrorState";
import { LoadingState } from "../../../components/states/LoadingState";
import { Badge, ButtonLink, Card, CardBody, Section, StatusPill } from "../../../components/ui";
import { UI_LABELS } from "../../../lib/uiCopy";

type OrgSummary = {
  org: {
    id: string;
    handle: string;
    displayName: string;
    description?: string | null;
    website?: string | null;
    logoUrl?: string | null;
    visibility: string;
  };
  membership?: { role: string; joinedAt: string } | null;
  membersCount: number;
  programs: Array<{ id: string; slug: string; title: string; summary?: string | null; status: string }>;
};

export default function OrgPage() {
  const params = useParams<{ handle: string }>();
  const searchParams = useSearchParams();
  const handle = params.handle || "";
  const tokenParam = searchParams.get("token");
  const { token } = useBackendAuth();
  const [data, setData] = useState<OrgSummary | null>(null);
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!handle) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/orgs/${handle}${tokenParam ? `?token=${encodeURIComponent(tokenParam)}` : ""}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "include",
        });
        if (!res.ok) {
          const { message, requestId } = await getApiError(res, "Organization not found.");
          const err = new Error(message);
          (err as { requestId?: string | null }).requestId = requestId;
          throw err;
        }
        const json = await res.json();
        if (!active) return;
        setData(json.data as OrgSummary);
      } catch (e: any) {
        if (!active) return;
        setError({ message: e?.message || "Organization not found.", requestId: e?.requestId });
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [handle, tokenParam, token]);

  if (loading) {
    return <LoadingState title="Loading organization" description="Fetching org profile and programs." />;
  }

  if (error) {
    return <ErrorState message={error.message} requestId={error.requestId} />;
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <DegradedHint />
        <EmptyState
          title="Organization not found"
          description="Double-check the handle or return to the org directory."
          primaryAction={{ label: "Back to orgs", href: "/orgs" }}
        />
      </div>
    );
  }

  const { org, membership, membersCount, programs } = data;
  const isAdmin = membership?.role === "OWNER" || membership?.role === "ADMIN";

  return (
    <div className="space-y-8">
      <PageHeader
        title={org.displayName}
        description={org.description || "Organization workspace overview and programs."}
        breadcrumbs={orgBreadcrumbs(org.handle, org.displayName)}
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/orgs" variant="secondary" size="sm">
              {UI_LABELS.backToOrgs}
            </ButtonLink>
            {isAdmin ? (
              <ButtonLink href={`/orgs/${org.handle}/admin`} variant="primary" size="sm">
                {UI_LABELS.manageOrg}
              </ButtonLink>
            ) : null}
          </div>
        }
      />
      <DegradedHint />

      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-4">
            {org.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logoUrl}
                alt={org.displayName}
                className="h-12 w-12 rounded-full border border-border object-cover"
              />
            )}
            <div>
              <div className="text-2xl font-semibold">{org.displayName}</div>
              <div className="text-xs text-textMuted">@{org.handle}</div>
            </div>
          </div>
          {org.description && <div className="text-sm text-textMuted">{org.description}</div>}
          <div className="flex flex-wrap gap-3 text-xs text-textMuted">
            <Badge variant="neutral">{org.visibility}</Badge>
            <span>{membersCount} members</span>
            {org.website && (
              <a href={org.website} className="text-accent hover:underline" target="_blank" rel="noreferrer">
                Website
              </a>
            )}
          </div>
          {membership && <div className="text-xs text-textMuted">Your role: {membership.role}</div>}
        </CardBody>
      </Card>

      <Section
        title="Programs"
        actions={
          <ButtonLink href={`/orgs/${org.handle}/members`} variant="ghost" size="sm">
            View members
          </ButtonLink>
        }
      >
        {programs.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {programs.map((program) => {
              return (
                <Card key={program.id}>
                  <CardBody className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{program.title}</div>
                      <StatusPill status={program.status} />
                    </div>
                    {program.summary && <div className="text-xs text-textMuted">{program.summary}</div>}
                    <Link
                      href={`/orgs/${org.handle}/programs/${program.slug}`}
                      className="text-xs text-accent hover:underline"
                    >
                      View program
                    </Link>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-textMuted">No programs published yet.</div>
        )}
      </Section>
    </div>
  );
}
