"use client";

import { getApiErrorMessage } from "../../../../../../lib/apiError";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useBackendAuth } from "../../../../../../hooks/useBackendAuth";
import { Badge, Button, ButtonLink, Card, CardBody, Section } from "../../../../../../components/ui";

type ProgramResponse = {
  org: { id: string; handle: string; displayName: string };
  program: { id: string; title: string };
  milestones: Array<{ id: string; order: number; title: string }>;
};

function toList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ProgramSubmitPage() {
  const params = useParams<{ handle: string; slug: string }>();
  const searchParams = useSearchParams();
  const handle = params.handle || "";
  const slug = params.slug || "";
  const tokenParam = searchParams.get("token");
  const { token } = useBackendAuth();
  const [orgId, setOrgId] = useState("");
  const [data, setData] = useState<ProgramResponse | null>(null);
  const [milestoneId, setMilestoneId] = useState("");
  const [note, setNote] = useState("");
  const [proofIds, setProofIds] = useState("");
  const [validationIds, setValidationIds] = useState("");
  const [exportIds, setExportIds] = useState("");
  const [urls, setUrls] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const milestoneOptions = useMemo(() => data?.milestones || [], [data]);

  useEffect(() => {
    if (!milestoneId && milestoneOptions.length) {
      setMilestoneId(milestoneOptions[0].id);
    }
  }, [milestoneId, milestoneOptions]);

  const submit = async () => {
    if (!token) {
      setError("Connect wallet to submit.");
      return;
    }
    if (!data || !milestoneId) {
      setError("Select a milestone.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        note: note || undefined,
        evidence: {
          proofArtifactIds: toList(proofIds),
          validationIds: toList(validationIds),
          exportPublicIds: toList(exportIds),
          urls: toList(urls),
        },
      };
      const res = await fetch(`/api/orgs/${orgId}/programs/${data.program.id}/milestones/${milestoneId}/submissions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      setSuccess("Submission sent for review.");
      setNote("");
      setProofIds("");
      setValidationIds("");
      setExportIds("");
      setUrls("");
    } catch (e: any) {
      setError(e?.message || "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return <div className="text-sm text-textMuted">{error || "Loading program..."}</div>;
  }

  return (
    <div className="space-y-6">
      <ButtonLink href={`/orgs/${handle}/programs/${slug}`} variant="secondary" size="sm">
        Back to program
      </ButtonLink>

      <Section title="Submit milestone" description={data.program.title}>
        <Card>
          <CardBody className="space-y-4">
            {error && <Badge variant="danger">{error}</Badge>}
            {success && <Badge variant="success">{success}</Badge>}
            <div className="space-y-3">
              <label className="text-xs text-textMuted">Milestone</label>
              <select
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm w-full"
              >
                {milestoneOptions.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.order + 1}. {milestone.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-xs text-textMuted">Note for reviewers</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note"
                className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm w-full"
                rows={3}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={proofIds}
                onChange={(e) => setProofIds(e.target.value)}
                placeholder="Proof IDs (comma-separated)"
                className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
              />
              <input
                value={validationIds}
                onChange={(e) => setValidationIds(e.target.value)}
                placeholder="Validation IDs (comma-separated)"
                className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
              />
              <input
                value={exportIds}
                onChange={(e) => setExportIds(e.target.value)}
                placeholder="Export public IDs (comma-separated)"
                className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
              />
              <input
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="Evidence URLs (comma-separated)"
                className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
              />
            </div>
            <Button type="button" onClick={submit} disabled={saving}>
              {saving ? "Submitting..." : "Submit for review"}
            </Button>
          </CardBody>
        </Card>
      </Section>
    </div>
  );
}
