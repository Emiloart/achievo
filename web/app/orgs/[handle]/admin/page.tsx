"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useBackendAuth } from "../../../../hooks/useBackendAuth";
import { getApiError, getApiErrorMessage } from "../../../../lib/apiError";
import { PageHeader } from "../../../../components/nav/PageHeader";
import { orgAdminBreadcrumbs } from "../../../../components/nav/breadcrumbs";
import { DegradedHint } from "../../../../components/states/DegradedHint";
import { EmptyState } from "../../../../components/states/EmptyState";
import { ErrorState } from "../../../../components/states/ErrorState";
import { LoadingState } from "../../../../components/states/LoadingState";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CopyField,
  Input,
  Section,
  Select,
  StatusPill,
  uiToast,
} from "../../../../components/ui";
import { OrgAdminTabs } from "../../../../components/domain/orgs/OrgAdminTabs";
import { MilestoneEditorModal, type MilestoneFormState } from "../../../../components/domain/orgs/MilestoneEditorModal";
import { ProgramEditorModal, type ProgramFormState } from "../../../../components/domain/orgs/ProgramEditorModal";
import {
  SubmissionsTable,
  type SubmissionFilters,
  type SubmissionItem,
} from "../../../../components/domain/orgs/SubmissionsTable";
import { UI_LABELS } from "../../../../lib/uiCopy";

const API_BASE = "/api";

type OrgAdminData = {
  org: {
    id: string;
    handle: string;
    displayName: string;
    description?: string | null;
    visibility?: string | null;
    onchainStatus?: string | null;
    onchainCreationTxHash?: string | null;
    onchainChainId?: number | null;
  };
  membership?: { role: string } | null;
  programs: Array<{ id: string; slug: string; title: string; summary?: string | null; status: string }>;
};

type ActionRetry =
  | { type: "createInvite"; payload: { targetUserId?: string; email?: string; role: string } }
  | { type: "createProgram"; payload: ProgramFormState }
  | { type: "editProgram"; payload: { programId: string; data: ProgramFormState } }
  | { type: "publishProgram"; payload: { programId: string } }
  | { type: "createMilestone"; payload: { programId: string; data: MilestoneFormState } }
  | { type: "reviewSubmission"; payload: { submissionId: string; status: string } };

type ErrorStatePayload = {
  message: string;
  requestId?: string | null;
  retry?: ActionRetry | null;
};

export default function OrgAdminPage() {
  const params = useParams<{ handle: string }>();
  const searchParams = useSearchParams();
  const handle = params.handle || "";
  const tokenParam = searchParams.get("token");
  const { token } = useBackendAuth();
  const [orgData, setOrgData] = useState<OrgAdminData | null>(null);
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null);
  const [actionError, setActionError] = useState<ErrorStatePayload | null>(null);
  const [invites, setInvites] = useState<{ token?: string } | null>(null);
  const [inviteForm, setInviteForm] = useState({ targetUserId: "", email: "", role: "MEMBER" });
  const [programForm, setProgramForm] = useState<ProgramFormState>({ slug: "", title: "", summary: "" });
  const [milestoneForm, setMilestoneForm] = useState<MilestoneFormState>({
    programId: "",
    order: 0,
    title: "",
    description: "",
  });
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionFilters, setSubmissionFilters] = useState<SubmissionFilters>({
    status: "SUBMITTED",
    programId: "",
    userId: "",
  });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "programs" | "submissions">("overview");
  const [programModal, setProgramModal] = useState<{ open: boolean; mode: "create" | "edit"; programId?: string }>({
    open: false,
    mode: "create",
  });
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [pendingPublish, setPendingPublish] = useState<{ id: string; title: string } | null>(null);

  const isAdmin = orgData?.membership?.role === "OWNER" || orgData?.membership?.role === "ADMIN";

  const programOptions = useMemo(
    () => orgData?.programs?.map((program) => ({ id: program.id, title: program.title })) || [],
    [orgData?.programs],
  );

  const handleActionError = useCallback((message: string, retry?: ActionRetry | null, requestId?: string | null) => {
    setActionError({ message, retry: retry || null, requestId: requestId || null });
    uiToast.error(message);
  }, []);

  const fetchOrg = useCallback(async () => {
    if (!handle) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${handle}${tokenParam ? `?token=${encodeURIComponent(tokenParam)}` : ""}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });
      if (!res.ok) {
        const { message, requestId } = await getApiError(res, "Org not found");
        throw Object.assign(new Error(message), { requestId });
      }
      const json = await res.json();
      setOrgData(json.data as OrgAdminData);
      setOrgId(json.data?.org?.id || "");
      if (json.data?.programs?.length && !milestoneForm.programId) {
        setMilestoneForm((prev) => ({ ...prev, programId: json.data.programs[0].id }));
      }
    } catch (e: any) {
      setError({ message: e?.message || "Org not found", requestId: e?.requestId });
    } finally {
      setLoading(false);
    }
  }, [handle, milestoneForm.programId, token, tokenParam]);

  const loadSubmissions = useCallback(async () => {
    if (!orgId || !token) return;
    setLoadingSubmissions(true);
    setActionError(null);
    try {
      const params = new URLSearchParams();
      if (submissionFilters.status) params.set("status", submissionFilters.status);
      if (submissionFilters.programId) params.set("programId", submissionFilters.programId);
      if (submissionFilters.userId) params.set("userId", submissionFilters.userId);
      const res = await fetch(`/api/orgs/${orgId}/submissions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setSubmissions(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      handleActionError(e?.message || "Failed to load submissions");
    } finally {
      setLoadingSubmissions(false);
    }
  }, [handleActionError, orgId, submissionFilters, token]);

  useEffect(() => {
    void fetchOrg();
  }, [fetchOrg]);

  useEffect(() => {
    if (isAdmin && activeTab === "submissions") void loadSubmissions();
  }, [activeTab, isAdmin, loadSubmissions]);

  const createInvite = async (payload: { targetUserId?: string; email?: string; role: string }) => {
    if (!token || !orgId) return;
    setBusyAction("invite");
    setActionError(null);
    try {
      const res = await fetch(`/api/orgs/${orgId}/invites`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setInvites(json.data || {});
      setInviteForm({ targetUserId: "", email: "", role: "MEMBER" });
      uiToast.success("Invite created");
    } catch (e: any) {
      handleActionError(e?.message || "Failed to create invite", { type: "createInvite", payload });
    } finally {
      setBusyAction(null);
    }
  };

  const createProgram = async (payload: ProgramFormState) => {
    if (!token || !orgId) return;
    setBusyAction("program:create");
    setActionError(null);
    try {
      const res = await fetch(`/api/orgs/${orgId}/programs`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      uiToast.success("Program created");
      setProgramModal({ open: false, mode: "create" });
      setProgramForm({ slug: "", title: "", summary: "" });
      await fetchOrg();
    } catch (e: any) {
      handleActionError(e?.message || "Failed to create program", { type: "createProgram", payload });
    } finally {
      setBusyAction(null);
    }
  };

  const updateProgram = async (programId: string, payload: ProgramFormState) => {
    if (!token || !orgId) return;
    setBusyAction(`program:edit:${programId}`);
    setActionError(null);
    try {
      const res = await fetch(`/api/orgs/${orgId}/programs/${programId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      uiToast.success("Program updated");
      setProgramModal({ open: false, mode: "create" });
      await fetchOrg();
    } catch (e: any) {
      handleActionError(e?.message || "Failed to update program", {
        type: "editProgram",
        payload: { programId, data: payload },
      });
    } finally {
      setBusyAction(null);
    }
  };

  const publishProgram = async (programId: string) => {
    if (!token || !orgId) return;
    setBusyAction(`program:publish:${programId}`);
    setActionError(null);
    try {
      const res = await fetch(`/api/orgs/${orgId}/programs/${programId}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      uiToast.group(`org_program_publish:${programId}`, "success", "Program published");
      await fetchOrg();
    } catch (e: any) {
      handleActionError(e?.message || "Failed to publish program", { type: "publishProgram", payload: { programId } });
    } finally {
      setBusyAction(null);
    }
  };

  const createMilestone = async (programId: string, payload: MilestoneFormState) => {
    if (!token || !orgId) return;
    setBusyAction(`milestone:${programId}`);
    setActionError(null);
    try {
      const res = await fetch(`/api/orgs/${orgId}/programs/${programId}/milestones`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          order: Number(payload.order),
          title: payload.title,
          description: payload.description,
          requirements: {},
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      uiToast.success("Milestone created");
      setMilestoneModalOpen(false);
      setMilestoneForm((prev) => ({
        ...prev,
        order: prev.order + 1,
        title: "",
        description: "",
      }));
    } catch (e: any) {
      handleActionError(e?.message || "Failed to create milestone", {
        type: "createMilestone",
        payload: { programId, data: payload },
      });
    } finally {
      setBusyAction(null);
    }
  };

  const reviewSubmission = async (submissionId: string, status: string) => {
    if (!token || !orgId) return;
    setBusyAction(`submission:${submissionId}`);
    setActionError(null);
    try {
      const res = await fetch(`/api/orgs/${orgId}/submissions/${submissionId}/review`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      uiToast.success(`Submission ${status.toLowerCase().replace(/_/g, " ")}`);
      await loadSubmissions();
    } catch (e: any) {
      handleActionError(e?.message || "Failed to review submission", {
        type: "reviewSubmission",
        payload: { submissionId, status },
      });
    } finally {
      setBusyAction(null);
    }
  };

  const retryAction = async () => {
    if (!actionError?.retry) return;
    const retry = actionError.retry;
    setActionError(null);
    if (retry.type === "createInvite") return createInvite(retry.payload);
    if (retry.type === "createProgram") return createProgram(retry.payload);
    if (retry.type === "editProgram") return updateProgram(retry.payload.programId, retry.payload.data);
    if (retry.type === "publishProgram") return publishProgram(retry.payload.programId);
    if (retry.type === "createMilestone") return createMilestone(retry.payload.programId, retry.payload.data);
    if (retry.type === "reviewSubmission") return reviewSubmission(retry.payload.submissionId, retry.payload.status);
  };

  if (loading) {
    return <LoadingState title="Loading admin workspace" description="Preparing organization details." />;
  }

  if (error) {
    return <ErrorState message={error.message} requestId={error.requestId} onRetry={fetchOrg} />;
  }

  if (!orgData) {
    return (
      <EmptyState
        title="Organization not found"
        description="Double-check the handle or return to the org directory."
        primaryAction={{ label: "Back to orgs", href: "/orgs" }}
      />
    );
  }

  if (!isAdmin) {
    return <ErrorState title="Access denied" message="You do not have access to this admin workspace." />;
  }

  const org = orgData.org;

  const overviewTab = (
    <div className="space-y-6">
      <DegradedHint />
      {actionError ? (
        <ErrorState message={actionError.message} requestId={actionError.requestId} onRetry={retryAction} />
      ) : null}

      <Section title="Organization overview" description="Administrative summary and on-chain status.">
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold">{org.displayName}</div>
                <div className="text-xs text-textMuted">@{org.handle}</div>
              </div>
              {org.visibility ? <Badge variant="neutral">{org.visibility}</Badge> : null}
            </div>
            {org.description ? <div className="text-sm text-textMuted">{org.description}</div> : null}
            <div className="grid gap-3 md:grid-cols-3 text-xs text-textMuted">
              <div>
                <div className="font-semibold text-text">Membership role</div>
                <div>{orgData.membership?.role || "-"}</div>
              </div>
              <div>
                <div className="font-semibold text-text">On-chain status</div>
                <div>{org.onchainStatus || "Not available"}</div>
              </div>
              <div>
                <div className="font-semibold text-text">Chain ID</div>
                <div>{org.onchainChainId ? String(org.onchainChainId) : "-"}</div>
              </div>
            </div>
            {org.onchainCreationTxHash ? <CopyField label="Creation tx" value={org.onchainCreationTxHash} /> : null}
          </CardBody>
        </Card>
      </Section>

      <Section title="Invite members" description="Create invite tokens for members or reviewers.">
        <Card>
          <CardBody className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                value={inviteForm.targetUserId}
                onChange={(e) => setInviteForm({ ...inviteForm, targetUserId: e.target.value })}
                placeholder="Target Achievo ID"
              />
              <Input
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="Email (optional)"
              />
              <Select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}>
                <option value="MEMBER">Member</option>
                <option value="REVIEWER">Reviewer</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </div>
            <Button
              onClick={() =>
                createInvite({
                  targetUserId: inviteForm.targetUserId || undefined,
                  email: inviteForm.email || undefined,
                  role: inviteForm.role,
                })
              }
              disabled={busyAction === "invite"}
            >
              {busyAction === "invite" ? "Creating..." : UI_LABELS.createInvite}
            </Button>
            {invites?.token && <CopyField label="Invite token" value={invites.token} />}
          </CardBody>
        </Card>
      </Section>
    </div>
  );

  const programsTab = (
    <div className="space-y-6">
      {actionError ? (
        <ErrorState message={actionError.message} requestId={actionError.requestId} onRetry={retryAction} />
      ) : null}
      <Section
        title="Programs"
        description="Draft, edit, and publish programs for your organization."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setProgramForm({ slug: "", title: "", summary: "" });
              setProgramModal({ open: true, mode: "create" });
            }}
          >
            {UI_LABELS.createProgram}
          </Button>
        }
      >
        {orgData.programs.length ? (
          <div className="space-y-3">
            {orgData.programs.map((program) => {
              const busy =
                busyAction === `program:publish:${program.id}` || busyAction === `program:edit:${program.id}`;
              return (
                <Card key={program.id}>
                  <CardBody className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{program.title}</div>
                      <div className="text-xs text-textMuted">{program.slug}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={program.status} />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setProgramForm({
                            slug: program.slug,
                            title: program.title,
                            summary: program.summary || "",
                          });
                          setProgramModal({ open: true, mode: "edit", programId: program.id });
                        }}
                      >
                        {UI_LABELS.edit}
                      </Button>
                      {program.status !== "LIVE" ? (
                        <Button
                          size="sm"
                          onClick={() => setPendingPublish({ id: program.id, title: program.title })}
                          disabled={busy}
                        >
                          {busyAction === `program:publish:${program.id}` ? "Publishing..." : UI_LABELS.publish}
                        </Button>
                      ) : null}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No programs yet"
            description="Create a program to start accepting submissions."
            primaryAction={{
              label: UI_LABELS.createProgram,
              onClick: () => setProgramModal({ open: true, mode: "create" }),
            }}
          />
        )}
      </Section>

      <Section
        title="Milestones"
        description="Define milestones for existing programs."
        actions={
          <Button size="sm" variant="secondary" onClick={() => setMilestoneModalOpen(true)}>
            {UI_LABELS.add}
          </Button>
        }
      >
        <div className="text-xs text-textMuted">
          Milestones are added to published or draft programs and can require evidence submissions.
        </div>
      </Section>
    </div>
  );

  const submissionsTab = (
    <div className="space-y-6">
      {actionError ? (
        <ErrorState message={actionError.message} requestId={actionError.requestId} onRetry={retryAction} />
      ) : null}
      <Section
        title="Submissions review"
        description="Review applicant submissions and request revisions or approvals."
        actions={
          <Button size="sm" variant="secondary" onClick={loadSubmissions} disabled={loadingSubmissions}>
            {UI_LABELS.refresh}
          </Button>
        }
      >
        <SubmissionsTable
          submissions={submissions}
          loading={loadingSubmissions}
          filters={submissionFilters}
          programOptions={programOptions}
          onFilterChange={(filters) => setSubmissionFilters(filters)}
          onReview={reviewSubmission}
          onRefresh={loadSubmissions}
          busyId={busyAction?.startsWith("submission:") ? busyAction.replace("submission:", "") : null}
          orgId={orgId}
        />
      </Section>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${org.displayName} admin`}
        description="Administer programs, submissions, and access for this organization."
        breadcrumbs={orgAdminBreadcrumbs(org.handle, org.displayName)}
        workbench={activeTab === "submissions"}
        actions={
          <ButtonLink href={`/orgs/${org.handle}`} variant="secondary" size="sm">
            Back to org
          </ButtonLink>
        }
      />

      <OrgAdminTabs
        overview={overviewTab}
        programs={programsTab}
        submissions={submissionsTab}
        counts={{ programs: orgData.programs.length, submissions: submissions.length }}
        initialId={activeTab}
        onTabChange={(id) => setActiveTab(id)}
      />

      <ProgramEditorModal
        open={programModal.open}
        mode={programModal.mode}
        value={programForm}
        onChange={setProgramForm}
        onClose={() => setProgramModal({ open: false, mode: "create" })}
        onSubmit={() =>
          programModal.mode === "edit" && programModal.programId
            ? updateProgram(programModal.programId, programForm)
            : createProgram(programForm)
        }
        saving={
          busyAction === "program:create" ||
          (programModal.programId ? busyAction === `program:edit:${programModal.programId}` : false)
        }
        footerNote={
          programModal.mode === "edit" ? "Slug is immutable once created." : "Use a URL-safe slug (lowercase, dashes)."
        }
      />

      <MilestoneEditorModal
        open={milestoneModalOpen}
        programs={programOptions}
        value={milestoneForm}
        onChange={setMilestoneForm}
        onClose={() => setMilestoneModalOpen(false)}
        onSubmit={() => createMilestone(milestoneForm.programId, milestoneForm)}
        saving={busyAction?.startsWith("milestone:")}
      />

      <ConfirmDialog
        open={Boolean(pendingPublish)}
        onClose={() => setPendingPublish(null)}
        onConfirm={() => {
          if (pendingPublish) publishProgram(pendingPublish.id);
          setPendingPublish(null);
        }}
        title="Publish program"
        description={`Publishing ${pendingPublish?.title || "this program"} will make it visible to applicants.`}
        confirmPhrase="PUBLISH"
        confirmLabel={UI_LABELS.publish}
      />
    </div>
  );
}
