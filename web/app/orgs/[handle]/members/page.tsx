"use client";

import { getApiErrorMessage } from "../../../../lib/apiError";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useBackendAuth } from "../../../../hooks/useBackendAuth";
import { ipfsToHttp } from "../../../../lib/ipfs";
import { Badge, ButtonLink, Card, CardBody, EmptyState, Section } from "../../../../components/ui";

type OrgMembersResponse = {
  data: Array<{
    userId: string;
    role: string;
    username?: string;
    displayName?: string;
    avatar?: string;
    credibilityScore?: number;
  }>;
};

export default function OrgMembersPage() {
  const params = useParams<{ handle: string }>();
  const searchParams = useSearchParams();
  const handle = params.handle || "";
  const tokenParam = searchParams.get("token");
  const { token } = useBackendAuth();
  const [orgId, setOrgId] = useState("");
  const [members, setMembers] = useState<OrgMembersResponse["data"]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const loadOrg = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/orgs/${handle}${tokenParam ? `?token=${encodeURIComponent(tokenParam)}` : ""}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "include",
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        if (!active) return;
        const org = json.data?.org;
        setOrgId(org?.id || "");
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "Org not found");
      } finally {
        if (active) setLoading(false);
      }
    };
    if (handle) void loadOrg();
    return () => {
      active = false;
    };
  }, [handle, token, tokenParam]);

  useEffect(() => {
    let active = true;
    const loadMembers = async () => {
      if (!orgId) return;
      try {
        const res = await fetch(
          `/api/orgs/${orgId}/members${tokenParam ? `?token=${encodeURIComponent(tokenParam)}` : ""}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            credentials: "include",
          },
        );
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        if (!active) return;
        setMembers(Array.isArray(json.data) ? json.data : []);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "Failed to load members");
      }
    };
    void loadMembers();
    return () => {
      active = false;
    };
  }, [orgId, token, tokenParam]);

  if (loading && !members.length) {
    return <div className="text-sm text-textMuted">Loading members...</div>;
  }

  if (error && !members.length) {
    return <div className="text-sm text-textMuted">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <ButtonLink href={`/orgs/${handle}`} variant="secondary" size="sm">
        Back to org
      </ButtonLink>

      <Section title="Members" description="People with access to this organization.">
        {members.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((member) => (
              <Card key={member.userId}>
                <CardBody className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden border border-border bg-surface2">
                      {member.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ipfsToHttp(member.avatar)} alt="avatar" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{member.displayName || member.userId}</div>
                      <div className="text-xs text-textMuted">@{member.username || "-"}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-textMuted">
                    <Badge variant="neutral">{member.role}</Badge>
                    <span>Credibility: {member.credibilityScore ?? 0}</span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No members yet" description="Invite a member to get started." />
        )}
      </Section>
    </div>
  );
}
