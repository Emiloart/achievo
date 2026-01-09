"use client";

import { getApiErrorMessage } from "../../../../lib/apiError";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useBackendAuth } from "../../../../hooks/useBackendAuth";
import { Badge, Button, ButtonLink, Card, CardBody, CopyField, Section } from "../../../../components/ui";

type OrgAdminData = {
  org: {
    id: string;
    handle: string;
    displayName: string;
  };
  membership?: { role: string } | null;
  programs: Array<{ id: string; slug: string; title: string; status: string }>;
};

type SubmissionItem = {
  id: string;
  userId: string;
  status: string;
  note?: string | null;
  evidence?: any;
  submitter?: { displayName?: string; username?: string };
  createdAt: string;
};

export default function OrgAdminPage() {
  const params = useParams<{ handle: string }>();
  const searchParams = useSearchParams();
  const handle = params.handle || "";
  const tokenParam = searchParams.get("token");
  const { token } = useBackendAuth();
  const [orgData, setOrgData] = useState<OrgAdminData | null>(null);
  const [orgId, setOrgId] = useState("");
  const [error, setError] = useState("");
  const [invites, setInvites] = useState<{ token?: string } | null>(null);
  const [inviteForm, setInviteForm] = useState({ targetUserId: "", email: "", role: "MEMBER" });
  const [programForm, setProgramForm] = useState({ slug: "", title: "", summary: "" });
  const [milestoneForm, setMilestoneForm] = useState({ programId: "", order: 0, title: "", description: "" });
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const isAdmin = orgData?.membership?.role === "OWNER" || orgData?.membership?.role === "ADMIN";

  useEffect(() => {
    let active = true;
    const loadOrg = async () => {
      try {
        const res = await fetch(`/api/orgs/${handle}${tokenParam ? `?token=${encodeURIComponent(tokenParam)}` : ""}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "include",
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        if (!active) return;
        setOrgData(json.data as OrgAdminData);
        setOrgId(json.data?.org?.id || "");
        if (json.data?.programs?.length && !milestoneForm.programId) {
          setMilestoneForm((prev) => ({ ...prev, programId: json.data.programs[0].id }));
        }
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "Org not found");
      }
    };
    void loadOrg();
    return () => {
      active = false;
    };
  }, [handle, token, tokenParam, milestoneForm.programId]);

  const loadSubmissions = useCallback(async () => {
    if (!orgId || !token) return;
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}/submissions?status=SUBMITTED`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setSubmissions(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load submissions");
    } finally {
      setLoadingSubmissions(false);
    }
  }, [orgId, token]);

  useEffect(() => {
    if (isAdmin) void loadSubmissions();
  }, [isAdmin, loadSubmissions]);

  const createInvite = async () => {
    if (!token || !orgId) return;
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgId}/invites`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetUserId: inviteForm.targetUserId || undefined,
          email: inviteForm.email || undefined,
          role: inviteForm.role,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setInvites(json.data || {});
      setInviteForm({ targetUserId: "", email: "", role: "MEMBER" });
    } catch (e: any) {
      setError(e?.message || "Failed to create invite");
    }
  };

  const createProgram = async () => {
    if (!token || !orgId) return;
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgId}/programs`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(programForm),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || "Failed to create program");
    }
  };

  const publishProgram = async (programId: string) => {
    if (!token || !orgId) return;
    try {
      const res = await fetch(`/api/orgs/${orgId}/programs/${programId}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || "Failed to publish program");
    }
  };

  const createMilestone = async () => {
    if (!token || !orgId || !milestoneForm.programId) return;
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgId}/programs/${milestoneForm.programId}/milestones`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          order: Number(milestoneForm.order),
          title: milestoneForm.title,
          description: milestoneForm.description,
          requirements: {},
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      setMilestoneForm({
        programId: milestoneForm.programId,
        order: milestoneForm.order + 1,
        title: "",
        description: "",
      });
    } catch (e: any) {
      setError(e?.message || "Failed to create milestone");
    }
  };

  const reviewSubmission = async (submissionId: string, status: string) => {
    if (!token || !orgId) return;
    try {
      const res = await fetch(`/api/orgs/${orgId}/submissions/${submissionId}/review`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      await loadSubmissions();
    } catch (e: any) {
      setError(e?.message || "Failed to review submission");
    }
  };

  if (error && !orgData) {
    return <div className="text-sm text-textMuted">{error}</div>;
  }

  if (!orgData) {
    return <div className="text-sm text-textMuted">Loading org...</div>;
  }

  if (!isAdmin) {
    return <div className="text-sm text-textMuted">You do not have access to this admin panel.</div>;
  }

  return (
    <div className="space-y-8">
      <ButtonLink href={`/orgs/${handle}`} variant="secondary" size="sm">
        Back to org
      </ButtonLink>

      {error && <div className="text-xs text-danger">{error}</div>}

      <Section title="Invite members" description="Create invite tokens for members or reviewers.">
        <Card>
          <CardBody className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <input
                value={inviteForm.targetUserId}
                onChange={(e) => setInviteForm({ ...inviteForm, targetUserId: e.target.value })}
                placeholder="Target ACHUSR ID"
                className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
              />
              <input
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="Email (optional)"
                className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
              />
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="MEMBER">Member</option>
                <option value="REVIEWER">Reviewer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <Button onClick={createInvite}>Create invite</Button>
            {invites?.token && <CopyField label="Invite token" value={invites.token} />}
          </CardBody>
        </Card>
      </Section>

      <Section title="Programs" description="Manage programs and publishing status.">
        <div className="space-y-3">
          {orgData.programs.map((program) => (
            <Card key={program.id}>
              <CardBody className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{program.title}</div>
                  <div className="text-xs text-textMuted">{program.status}</div>
                </div>
                {program.status !== "LIVE" ? (
                  <Button variant="secondary" size="sm" onClick={() => publishProgram(program.id)}>
                    Publish
                  </Button>
                ) : (
                  <Badge variant="verified">LIVE</Badge>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
        <Card className="mt-4">
          <CardBody className="space-y-3">
            <div className="text-xs text-textMuted">Create program</div>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                value={programForm.slug}
                onChange={(e) => setProgramForm({ ...programForm, slug: e.target.value })}
                placeholder="Slug"
                className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
              />
              <input
                value={programForm.title}
                onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })}
                placeholder="Title"
                className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
              />
              <input
                value={programForm.summary}
                onChange={(e) => setProgramForm({ ...programForm, summary: e.target.value })}
                placeholder="Summary"
                className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
              />
            </div>
            <Button onClick={createProgram}>Create program</Button>
          </CardBody>
        </Card>
      </Section>

      <Section title="Add milestone" description="Define milestones for existing programs.">
        <Card>
          <CardBody className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={milestoneForm.programId}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, programId: e.target.value })}
                className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
              >
                {orgData.programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.title}
                  </option>
                ))}
              </select>
              <input
                value={milestoneForm.order}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, order: Number(e.target.value) })}
                placeholder="Order"
                className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
              />
              <input
                value={milestoneForm.title}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                placeholder="Title"
                className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
              />
            </div>
            <input
              value={milestoneForm.description}
              onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
              placeholder="Description"
              className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
            />
            <Button onClick={createMilestone}>Add milestone</Button>
          </CardBody>
        </Card>
      </Section>

      <Section title="Review queue" description="Pending submissions awaiting review.">
        {loadingSubmissions ? (
          <div className="text-xs text-textMuted">Loading submissions...</div>
        ) : submissions.length ? (
          <div className="space-y-3">
            {submissions.map((item) => (
              <Card key={item.id}>
                <CardBody className="space-y-2 text-sm">
                  <div className="font-semibold">
                    {item.submitter?.displayName || item.userId} ({item.submitter?.username || item.userId})
                  </div>
                  <div className="text-xs text-textMuted">{item.note || "No note"}</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Button size="sm" onClick={() => reviewSubmission(item.id, "APPROVED")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => reviewSubmission(item.id, "REJECTED")}>
                      Reject
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => reviewSubmission(item.id, "REVISION_REQUESTED")}>
                      Request revision
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-xs text-textMuted">No submissions awaiting review.</div>
        )}
      </Section>
    </div>
  );
}
