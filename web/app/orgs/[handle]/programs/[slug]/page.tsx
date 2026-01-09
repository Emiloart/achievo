"use client";

import { getApiErrorMessage } from "../../../../../lib/apiError";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useBackendAuth } from "../../../../../hooks/useBackendAuth";
import { Badge, ButtonLink, Card, CardBody, Section } from "../../../../../components/ui";

type ProgramResponse = {
  org: { id: string; handle: string; displayName: string; visibility: string };
  program: {
    id: string;
    slug: string;
    title: string;
    summary?: string;
    status: string;
    startsAt?: string | null;
    endsAt?: string | null;
  };
  milestones: Array<{ id: string; order: number; title: string; description?: string | null }>;
  membership?: { role: string } | null;
};

export default function OrgProgramPage() {
  const params = useParams<{ handle: string; slug: string }>();
  const searchParams = useSearchParams();
  const handle = params.handle || "";
  const slug = params.slug || "";
  const tokenParam = searchParams.get("token");
  const { token } = useBackendAuth();
  const [orgId, setOrgId] = useState("");
  const [data, setData] = useState<ProgramResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadOrg = async () => {
      if (!handle) return;
      try {
        const res = await fetch(`/api/orgs/${handle}${tokenParam ? `?token=${encodeURIComponent(tokenParam)}` : ""}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "include",
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        if (!active) return;
        setOrgId(json.data?.org?.id || "");
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "Org not found");
      }
    };
    void loadOrg();
    return () => {
      active = false;
    };
  }, [handle, tokenParam, token]);

  useEffect(() => {
    let active = true;
    const loadProgram = async () => {
      if (!orgId || !slug) return;
      try {
        const res = await fetch(
          `/api/orgs/${orgId}/programs/${slug}${tokenParam ? `?token=${encodeURIComponent(tokenParam)}` : ""}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            credentials: "include",
          },
        );
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        if (!active) return;
        setData(json.data as ProgramResponse);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "Program not found");
      }
    };
    void loadProgram();
    return () => {
      active = false;
    };
  }, [orgId, slug, tokenParam, token]);

  if (error && !data) {
    return <div className="text-sm text-textMuted">{error}</div>;
  }

  if (!data) {
    return <div className="text-sm text-textMuted">Loading program...</div>;
  }

  const { org, program, milestones } = data;

  return (
    <div className="space-y-6">
      <ButtonLink href={`/orgs/${handle}`} variant="secondary" size="sm">
        Back to org
      </ButtonLink>

      <Card>
        <CardBody className="space-y-2">
          <div className="text-2xl font-semibold">{program.title}</div>
          <div className="text-xs text-textMuted">{org.displayName}</div>
          {program.summary && <div className="text-sm text-textMuted">{program.summary}</div>}
          <div className="flex flex-wrap gap-3 text-xs text-textMuted">
            <Badge variant={program.status === "LIVE" ? "verified" : "neutral"}>{program.status}</Badge>
            {program.startsAt && <span>Starts: {new Date(program.startsAt).toLocaleDateString()}</span>}
            {program.endsAt && <span>Ends: {new Date(program.endsAt).toLocaleDateString()}</span>}
          </div>
          <Link href={`/orgs/${handle}/programs/${slug}/submit`} className="text-sm text-accent hover:underline">
            Submit milestone
          </Link>
        </CardBody>
      </Card>

      <Section title="Milestones">
        {milestones.length ? (
          <div className="space-y-3">
            {milestones.map((milestone) => (
              <Card key={milestone.id}>
                <CardBody className="space-y-1">
                  <div className="text-sm font-semibold">
                    {milestone.order + 1}. {milestone.title}
                  </div>
                  {milestone.description && <div className="text-xs text-textMuted">{milestone.description}</div>}
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-sm text-textMuted">No milestones yet.</div>
        )}
      </Section>
    </div>
  );
}
