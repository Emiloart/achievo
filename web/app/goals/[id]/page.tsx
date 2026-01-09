"use client";
import Link from "next/link";

import { getApiErrorMessage } from "../../../lib/apiError";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import toast from "react-hot-toast";
import { coreAddress, coreAbi } from "../../../lib/contracts";
import { ipfsToHttp } from "../../../lib/ipfs";
import { StatusPill } from "../../../components/StatusPill";
import { ProofList } from "../../../components/ProofList";
import { VisibilityControls } from "../../../components/VisibilityControls";
import { useProfileInfo } from "../../../hooks/useProfileInfo";
import { useUserTasks, type GoalWithStatus } from "../../../hooks/useUserTasks";
import { useQuests } from "../../../hooks/useQuests";
import { useBackendAuth } from "../../../hooks/useBackendAuth";
import { useProofs } from "../../../hooks/useProofs";
import { usePublicProfile } from "../../../hooks/usePublicProfile";
import { useUserValidations, useValidationActions } from "../../../hooks/useValidations";
import { useEndorsementActions, useEndorsements } from "../../../hooks/useEndorsements";
import { shortAchievoId } from "../../../lib/achievo";

type TimelineEvent = { title: string; timestamp?: number; description?: string };
type GoalTimeEntry = {
  id: string;
  startedAt: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  note?: string | null;
  billable?: boolean;
};

function formatDate(secs?: number) {
  if (!secs) return "N/A";
  const d = new Date(secs * 1000);
  return d.toLocaleString();
}

function shortenCid(cid: string) {
  if (!cid) return "";
  if (cid.length <= 24) return cid;
  return `${cid.slice(0, 10)}...${cid.slice(-8)}`;
}

function toUrlIfPossible(cid: string) {
  if (!cid) return "";
  if (cid.startsWith("ipfs://")) return ipfsToHttp(cid);
  if (cid.startsWith("http://") || cid.startsWith("https://")) return cid;
  return "";
}

function formatMinutes(minutes?: number | null) {
  if (!minutes) return "0h";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const goalIdNum = useMemo(() => {
    const n = Number(params.id);
    return Number.isFinite(n) ? n : null;
  }, [params.id]);

  const { address } = useAccount();
  const { profile, isLoaded: profileLoaded } = useProfileInfo();
  const { tasks, loading: tasksLoading, refetch: refetchTasks } = useUserTasks();
  const { dailyQuests, weeklyQuests, milestoneQuests } = useQuests();
  const { token, user } = useBackendAuth();
  const [goal, setGoal] = useState<GoalWithStatus | null>(null);
  const { profile: goalOwnerProfile } = usePublicProfile(goal?.creator || "");
  const [evidenceInput, setEvidenceInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [minting, setMinting] = useState(false);
  const [linkedProjects, setLinkedProjects] = useState<Array<{ id: string; slug: string; name: string }>>([]);
  const [myProjects, setMyProjects] = useState<Array<{ id: string; slug: string; name: string }>>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [projectBusy, setProjectBusy] = useState(false);
  const [timeProjectSlug, setTimeProjectSlug] = useState("");
  const [goalTimeEntries, setGoalTimeEntries] = useState<GoalTimeEntry[]>([]);
  const [timeNote, setTimeNote] = useState("");
  const [timeBillable, setTimeBillable] = useState(true);
  const [timeBusy, setTimeBusy] = useState(false);
  const claimantAchusrId = goalOwnerProfile.achusrId || user?.userId || profile.achievoId || "";
  const proofUserId = goalOwnerProfile.achusrId || user?.userId || profile.achievoId || "";
  const {
    proofs,
    loading: proofsLoading,
    error: proofsError,
    uploadFile,
    addUrlProof,
    anchorProof,
    refetch: refetchProofs,
  } = useProofs({
    userId: proofUserId,
    achievementId: goalIdNum !== null ? String(goalIdNum) : undefined,
  });
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofTab, setProofTab] = useState<"file" | "url">("file");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofTitle, setProofTitle] = useState("");
  const [proofDescription, setProofDescription] = useState("");
  const [proofBusy, setProofBusy] = useState(false);
  const [anchoringId, setAnchoringId] = useState<string | null>(null);
  const {
    items: validations,
    loading: validationsLoading,
    refetch: refetchValidations,
  } = useUserValidations(claimantAchusrId, {
    achievementId: goalIdNum !== null ? String(goalIdNum) : undefined,
  });
  const { requestValidation } = useValidationActions();
  const {
    items: goalEndorsements,
    aggregates: goalEndorsementAggregates,
    decision: goalEndorsementDecision,
    loading: goalEndorsementsLoading,
    error: goalEndorsementsError,
    refetch: refetchGoalEndorsements,
  } = useEndorsements(claimantAchusrId, {
    targetType: "ACHIEVEMENT",
    targetId: goalIdNum !== null ? String(goalIdNum) : undefined,
  });
  const { createEndorsement, revokeEndorsement } = useEndorsementActions();
  const [endorseNote, setEndorseNote] = useState("");
  const [endorseBusy, setEndorseBusy] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validatorWallet, setValidatorWallet] = useState("");
  const [validationTitle, setValidationTitle] = useState("");
  const [validationSummary, setValidationSummary] = useState("");
  const [validationEvidence, setValidationEvidence] = useState("");
  const [validationBusy, setValidationBusy] = useState(false);
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: waitingTx } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!tasksLoading && goalIdNum !== null) {
      const found = tasks.find((g) => Number(g.id) === goalIdNum);
      setGoal(found ?? null);
    }
  }, [tasksLoading, tasks, goalIdNum]);

  useEffect(() => {
    let active = true;
    const fetchProjects = async () => {
      if (!token || goalIdNum === null) {
        setLinkedProjects([]);
        return;
      }
      try {
        const res = await fetch(`/api/projects/by-goal/${goalIdNum}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        const json = res.ok ? await res.json() : { data: [] };
        if (!active) return;
        setLinkedProjects(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (active) setLinkedProjects([]);
      }
    };
    void fetchProjects();
    return () => {
      active = false;
    };
  }, [token, goalIdNum]);

  useEffect(() => {
    let active = true;
    const fetchMyProjects = async () => {
      if (!token) {
        setMyProjects([]);
        return;
      }
      try {
        const res = await fetch(`/api/projects`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        const json = res.ok ? await res.json() : { data: [] };
        if (!active) return;
        const list = Array.isArray(json.data) ? json.data : [];
        setMyProjects(list.map((item: any) => item.project));
      } catch {
        if (active) setMyProjects([]);
      }
    };
    void fetchMyProjects();
    return () => {
      active = false;
    };
  }, [token]);

  const isOwner =
    goal && profile.walletAddress
      ? goal.creator.toLowerCase() === profile.walletAddress.toLowerCase()
      : goal && address
        ? goal.creator.toLowerCase() === address.toLowerCase()
        : false;

  const timeline: TimelineEvent[] = [];
  if (goal) {
    timeline.push({ title: "Goal created", timestamp: goal.createdAt });
    if (goal.isMigrated) timeline.push({ title: "Imported from v1" });
    if (goal.evidenceCID) timeline.push({ title: "Evidence submitted" });
    if (goal.verified) timeline.push({ title: "Verified" });
    if (goal.badgeMinted) timeline.push({ title: "Badge minted" });
  }

  const submitEvidence = async () => {
    if (!goal || goalIdNum === null) return;
    if (!evidenceInput.trim()) {
      toast.error("Add an evidence link or CID first");
      return;
    }
    setSubmitting(true);
    try {
      await writeContract({
        address: coreAddress,
        abi: coreAbi,
        functionName: "submitProof",
        args: [BigInt(goalIdNum), evidenceInput.trim()],
      });
      toast.success("Evidence submitted on-chain");
      setEvidenceInput("");
      await refetchTasks();
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to submit evidence");
    } finally {
      setSubmitting(false);
    }
  };

  const resetProofForm = () => {
    setProofFile(null);
    setProofUrl("");
    setProofTitle("");
    setProofDescription("");
    setProofTab("file");
  };

  const submitProofFile = async () => {
    if (goalIdNum === null || !proofFile) {
      toast.error("Select a file first");
      return;
    }
    setProofBusy(true);
    try {
      await uploadFile({
        file: proofFile,
        title: proofTitle || undefined,
        description: proofDescription || undefined,
        achievementId: String(goalIdNum),
      });
      toast.success("Proof uploaded");
      resetProofForm();
      setShowProofModal(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to upload proof");
    } finally {
      setProofBusy(false);
    }
  };

  const submitProofUrl = async () => {
    if (goalIdNum === null || !proofUrl.trim()) {
      toast.error("Enter a proof link");
      return;
    }
    setProofBusy(true);
    try {
      await addUrlProof({
        sourceUrl: proofUrl.trim(),
        title: proofTitle || undefined,
        description: proofDescription || undefined,
        achievementId: String(goalIdNum),
      });
      toast.success("Proof link added");
      resetProofForm();
      setShowProofModal(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to add proof");
    } finally {
      setProofBusy(false);
    }
  };

  const handleAnchor = async (id: string) => {
    setAnchoringId(id);
    try {
      await anchorProof(id);
      toast.success("Proof anchored on-chain");
    } catch (e: any) {
      toast.error(e?.message || "Failed to anchor proof");
    } finally {
      setAnchoringId(null);
    }
  };

  const submitValidationRequest = async () => {
    if (!goalIdNum) return;
    if (!validatorWallet.trim()) {
      toast.error("Enter validator wallet");
      return;
    }
    const title = validationTitle.trim() || `Goal #${goalIdNum} validation`;
    const evidence = validationEvidence
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
    setValidationBusy(true);
    try {
      await requestValidation({
        title,
        summary: validationSummary.trim() || undefined,
        achievementId: String(goalIdNum),
        requestedValidatorWallet: validatorWallet.trim(),
        evidenceLinks: evidence.length ? evidence : undefined,
      });
      toast.success("Validation request sent");
      setValidatorWallet("");
      setValidationTitle("");
      setValidationSummary("");
      setValidationEvidence("");
      setShowValidationModal(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to request validation");
    } finally {
      setValidationBusy(false);
    }
  };

  const handleEndorseGoal = async () => {
    if (!token) {
      toast.error("Sign in to endorse");
      return;
    }
    if (!goalIdNum) return;
    setEndorseBusy(true);
    try {
      await createEndorsement({
        targetUserId: claimantAchusrId,
        targetType: "ACHIEVEMENT",
        targetId: String(goalIdNum),
        message: endorseNote.trim() || undefined,
      });
      setEndorseNote("");
      toast.success("Endorsed goal");
      await refetchGoalEndorsements();
    } catch (e: any) {
      toast.error(e?.message || "Failed to endorse goal");
    } finally {
      setEndorseBusy(false);
    }
  };

  const handleRevokeGoalEndorsement = async () => {
    if (!token || !myGoalEndorsement?.id) return;
    setEndorseBusy(true);
    try {
      await revokeEndorsement(myGoalEndorsement.id);
      toast.success("Endorsement revoked");
      await refetchGoalEndorsements();
    } catch (e: any) {
      toast.error(e?.message || "Failed to revoke endorsement");
    } finally {
      setEndorseBusy(false);
    }
  };

  const mintBadge = async () => {
    if (!goal || goalIdNum === null) return;
    setMinting(true);
    try {
      await writeContract({
        address: coreAddress,
        abi: coreAbi,
        functionName: "mintBadge",
        args: [BigInt(goalIdNum), goal.goalCID || ""],
      });
      toast.success("Minting badge...");
      await refetchTasks();
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to mint badge");
    } finally {
      setMinting(false);
    }
  };

  const attachToProject = async () => {
    if (!token || !selectedProject || goalIdNum === null) return;
    setProjectBusy(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject}/goals`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ goalIds: [String(goalIdNum)] }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      await res.json().catch(() => {});
      const linkRes = await fetch(`/api/projects/by-goal/${goalIdNum}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const linkJson = linkRes.ok ? await linkRes.json() : { data: [] };
      setLinkedProjects(Array.isArray(linkJson.data) ? linkJson.data : []);
      setSelectedProject("");
      toast.success("Goal attached to project");
    } catch (e: any) {
      toast.error(e?.message || "Failed to attach goal");
    } finally {
      setProjectBusy(false);
    }
  };

  useEffect(() => {
    if (timeProjectSlug) return;
    const preferred = linkedProjects[0]?.slug || myProjects[0]?.slug || "";
    if (preferred) setTimeProjectSlug(preferred);
  }, [linkedProjects, myProjects, timeProjectSlug]);

  useEffect(() => {
    let active = true;
    const fetchGoalTimeEntries = async () => {
      if (!token || !timeProjectSlug || goalIdNum === null) {
        setGoalTimeEntries([]);
        return;
      }
      try {
        const from = new Date(Date.now() - 30 * 86400000).toISOString();
        const params = new URLSearchParams({
          goalId: String(goalIdNum),
          mine: "true",
          from,
        });
        const res = await fetch(`/api/projects/${timeProjectSlug}/time-entries?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        const json = res.ok ? await res.json() : { data: { entries: [] } };
        if (!active) return;
        setGoalTimeEntries(Array.isArray(json.data?.entries) ? json.data.entries : []);
      } catch {
        if (active) setGoalTimeEntries([]);
      }
    };
    void fetchGoalTimeEntries();
    return () => {
      active = false;
    };
  }, [token, timeProjectSlug, goalIdNum]);

  const startGoalTimer = async () => {
    if (!token || !timeProjectSlug || goalIdNum === null) return;
    setTimeBusy(true);
    try {
      const res = await fetch(`/api/projects/${timeProjectSlug}/time-entries/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ goalId: String(goalIdNum), note: timeNote || undefined, billable: timeBillable }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      setTimeNote("");
      const refresh = await fetch(`/api/projects/${timeProjectSlug}/time-entries?goalId=${goalIdNum}&mine=true`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const refreshJson = refresh.ok ? await refresh.json() : { data: { entries: [] } };
      setGoalTimeEntries(Array.isArray(refreshJson.data?.entries) ? refreshJson.data.entries : []);
      toast.success("Timer started");
    } catch (e: any) {
      toast.error(e?.message || "Failed to start timer");
    } finally {
      setTimeBusy(false);
    }
  };

  const stopGoalTimer = async (entryId: string) => {
    if (!token || !timeProjectSlug) return;
    setTimeBusy(true);
    try {
      const res = await fetch(`/api/projects/${timeProjectSlug}/time-entries/${entryId}/stop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const refresh = await fetch(`/api/projects/${timeProjectSlug}/time-entries?goalId=${goalIdNum}&mine=true`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const refreshJson = refresh.ok ? await refresh.json() : { data: { entries: [] } };
      setGoalTimeEntries(Array.isArray(refreshJson.data?.entries) ? refreshJson.data.entries : []);
      toast.success("Timer stopped");
    } catch (e: any) {
      toast.error(e?.message || "Failed to stop timer");
    } finally {
      setTimeBusy(false);
    }
  };

  const legacyLink =
    goal?.legacyTxHash && goal.legacyTxHash !== "0x" ? `https://sepolia.basescan.org/tx/${goal.legacyTxHash}` : "";

  const status = goal?.status;
  const myGoalEndorsement = goalEndorsements.find(
    (item) => item.endorserUserId === user?.userId && item.status === "ACTIVE",
  );
  const goalEndorsementCount = goalEndorsementAggregates?.countActive ?? 0;
  const goalEndorsementWeight = goalEndorsementAggregates?.totalWeight ?? 0;

  const questHint = useMemo(() => {
    if (!goal || goal.verified || goal.badgeMinted) return null;
    const activeQuests = [...dailyQuests, ...weeklyQuests, ...milestoneQuests];
    const related = activeQuests.find((q) => q.status === "ACTIVE" && q.triggerEvent === "GOAL_VERIFIED");
    if (!related) return null;
    return `Completing this goal will progress your quest: ${related.title}`;
  }, [goal, dailyQuests, weeklyQuests, milestoneQuests]);

  const approvalsInfo =
    goal?.approvals !== undefined
      ? `${goal.approvals} approvals${goal.approvals === 1 ? "" : ""}`
      : "Approvals unavailable";

  if (goalIdNum === null) {
    return (
      <div className="max-w-4xl mx-auto py-6 space-y-3">
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
          Back to dashboard
        </Link>
        <div className="text-red-600">Invalid goal id.</div>
      </div>
    );
  }

  const renderContent = () => {
    if (tasksLoading || !profileLoaded) {
      return (
        <div className="space-y-4">
          <div className="animate-pulse h-6 w-40 bg-gray-200 rounded" />
          <div className="animate-pulse h-32 bg-gray-200 rounded-2xl" />
          <div className="animate-pulse h-40 bg-gray-200 rounded-2xl" />
        </div>
      );
    }
    if (!goal) {
      return (
        <div className="space-y-3">
          <div className="text-xl font-semibold">Goal not found</div>
          <p className="text-gray-600">
            We couldn&apos;t find a goal with ID {goalIdNum}. Check the ID or go back to your dashboard.
          </p>
          <Link href="/dashboard" className="text-brand-600 hover:underline text-sm">
            Back to dashboard
          </Link>
        </div>
      );
    }

    const goalTitle = goal.goalCID ? goal.goalCID : `Goal #${goal.id}`;
    const cidUrl = toUrlIfPossible(goal.goalCID);
    const evidenceUrl = toUrlIfPossible(goal.evidenceCID);
    const availableProjects = myProjects.filter(
      (project) => !linkedProjects.some((linked) => linked.id === project.id),
    );
    const runningGoalEntry = goalTimeEntries.find((entry) => !entry.endedAt);

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="text-2xl font-semibold">{goalTitle}</div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <StatusPill status={status!} />
              <span className="px-2 py-1 rounded-full bg-gray-100 text-xs">Level {goal.level}</span>
              <span className="text-xs text-gray-500">Created {formatDate(goal.createdAt)}</span>
              {goal.isMigrated && (
                <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-700">Imported from v1</span>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-500">ID: {goal.id}</div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3 items-start">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl border bg-white p-5 space-y-3 shadow-sm">
              <div className="text-lg font-semibold">Details</div>
              <div className="text-sm text-gray-600 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Goal CID:</span>
                  {cidUrl ? (
                    <a href={cidUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                      {shortenCid(goal.goalCID)}
                    </a>
                  ) : (
                    <span className="font-mono break-all">{goal.goalCID}</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Creator:</span>{" "}
                  <span className="font-mono">{shortAchievoId(goal.creator)}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Approvals:</span> {approvalsInfo}
                </div>
                {questHint && <div className="text-xs text-brand-600">{questHint}</div>}
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-5 space-y-3 shadow-sm">
              <div className="text-lg font-semibold">Evidence</div>
              {goal.evidenceCID ? (
                <div className="text-sm text-gray-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Evidence CID:</span>
                    {evidenceUrl ? (
                      <a href={evidenceUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                        {shortenCid(goal.evidenceCID)}
                      </a>
                    ) : (
                      <span className="font-mono break-all">{goal.evidenceCID}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-sm text-brand-600 hover:underline"
                    onClick={() => evidenceUrl && window.open(evidenceUrl, "_blank")}
                  >
                    Open evidence
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-600 space-y-2">
                  <div>You haven&apos;t added any evidence yet.</div>
                  {isOwner && (
                    <button
                      type="button"
                      className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm"
                      onClick={() => {
                        const el = document.getElementById("evidence-action");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Add evidence
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-3xl border bg-white p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="text-lg font-semibold">Proofs</div>
                {isOwner && token && (
                  <button
                    type="button"
                    className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm"
                    onClick={() => setShowProofModal(true)}
                  >
                    Add proof
                  </button>
                )}
              </div>
              {proofsLoading ? (
                <div className="text-sm text-gray-500">Loading proofs...</div>
              ) : proofsError ? (
                <div className="text-sm text-red-600">{proofsError}</div>
              ) : (
                <ProofList
                  proofs={proofs}
                  onAnchor={handleAnchor}
                  anchoringId={anchoringId}
                  showAnchor={Boolean(isOwner && token)}
                  showControls={Boolean(isOwner && token)}
                  onRefresh={refetchProofs}
                />
              )}
            </div>

            <div className="rounded-3xl border bg-white p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="text-lg font-semibold">Validations</div>
                {isOwner && token && (
                  <button
                    type="button"
                    className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm"
                    onClick={() => setShowValidationModal(true)}
                  >
                    Request validation
                  </button>
                )}
              </div>
              {validationsLoading ? (
                <div className="text-sm text-gray-500">Loading validations...</div>
              ) : validations.length ? (
                <div className="space-y-3">
                  {validations.map((item) => {
                    const redaction = item.request.redaction || "NONE";
                    const metadataHidden = !isOwner && redaction !== "NONE";
                    return (
                      <div key={item.request.id} className="rounded-xl border bg-white p-3 text-sm space-y-1">
                        <div className="font-semibold">{item.request.title}</div>
                        <div className="text-xs text-gray-500">Status: {item.request.status}</div>
                        {item.attestation?.validator?.displayName ? (
                          <div className="text-xs text-gray-600">
                            Validator: {item.attestation.validator.displayName}
                          </div>
                        ) : item.attestation?.validatorWallet ? (
                          <div className="text-xs text-gray-600">Validator: {item.attestation.validatorWallet}</div>
                        ) : null}
                        {metadataHidden && <div className="text-xs text-gray-500">Validation details hidden</div>}
                        {isOwner && token && (
                          <VisibilityControls
                            contentType="VALIDATION"
                            contentId={item.request.id}
                            visibility={item.request.visibility}
                            redaction={item.request.redaction}
                            showRedaction
                            unlistedPublicId={item.request.unlistedPublicId}
                            onUpdated={() => refetchValidations()}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No validations yet.</div>
              )}
            </div>

            <div className="rounded-3xl border bg-white p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="text-lg font-semibold">Endorsements</div>
                {isOwner && token && goalIdNum !== null && (
                  <VisibilityControls
                    contentType="ENDORSEMENTS"
                    contentId={`ACHIEVEMENT:${goalIdNum}`}
                    visibility={goalEndorsementDecision?.visibility}
                    redaction={goalEndorsementDecision?.redaction}
                    showRedaction
                    unlistedPublicId={goalEndorsementDecision?.unlistedPublicId}
                    onUpdated={() => refetchGoalEndorsements()}
                  />
                )}
              </div>
              {goalEndorsementsLoading ? (
                <div className="text-sm text-gray-500">Loading endorsements...</div>
              ) : goalEndorsementsError ? (
                <div className="text-sm text-red-600">{goalEndorsementsError}</div>
              ) : (
                <div className="space-y-2 text-sm text-gray-600">
                  <div>Weighted reputation: {goalEndorsementWeight}</div>
                  <div>{goalEndorsementCount} endorsements</div>
                  {goalEndorsements.length ? (
                    <div className="space-y-1 text-xs text-gray-500">
                      {goalEndorsements.slice(0, 3).map((item) => (
                        <div key={item.id}>
                          {item.endorser?.displayName || item.endorser?.username || shortAchievoId(item.endorserUserId)}{" "}
                          · {item.computedWeight}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">No endorsements yet.</div>
                  )}
                </div>
              )}
              {!isOwner && (
                <div className="space-y-2">
                  <textarea
                    value={endorseNote}
                    onChange={(e) => setEndorseNote(e.target.value)}
                    placeholder="Optional note (max 280 chars)"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    rows={2}
                    maxLength={280}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm disabled:opacity-60"
                      onClick={handleEndorseGoal}
                      disabled={!token || endorseBusy}
                    >
                      {myGoalEndorsement ? "Endorsed" : endorseBusy ? "Endorsing..." : "Endorse goal"}
                    </button>
                    {myGoalEndorsement && (
                      <button
                        type="button"
                        className="px-3 py-2 rounded-md border text-sm"
                        onClick={handleRevokeGoalEndorsement}
                        disabled={!token || endorseBusy}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                  {!token && <div className="text-xs text-gray-500">Sign in to endorse this goal.</div>}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border bg-white p-5 space-y-4 shadow-sm">
              <div className="text-lg font-semibold">Progress timeline</div>
              <div className="space-y-3">
                {timeline.map((ev, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-brand-600" />
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold">{ev.title}</div>
                      {ev.timestamp && <div className="text-xs text-gray-500">{formatDate(ev.timestamp)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-5 space-y-3 shadow-sm">
              <div className="text-lg font-semibold">Projects</div>
              {linkedProjects.length ? (
                <div className="space-y-2">
                  {linkedProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.slug}` as Route}
                      className="block text-sm text-brand-600 hover:underline"
                    >
                      {project.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">This goal is not attached to any project.</div>
              )}
              {token && availableProjects.length > 0 && (
                <div className="space-y-2">
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full border rounded-md px-2 py-1 text-sm"
                  >
                    <option value="">Select a project</option>
                    {availableProjects.map((project) => (
                      <option key={project.id} value={project.slug}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={attachToProject}
                    disabled={!selectedProject || projectBusy}
                    className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm disabled:opacity-60"
                  >
                    {projectBusy ? "Attaching..." : "Attach to project"}
                  </button>
                </div>
              )}
            </div>

            {token && (
              <div className="rounded-3xl border bg-white p-5 space-y-3 shadow-sm">
                <div className="text-lg font-semibold">Time</div>
                <div className="space-y-3 text-sm">
                  <div className="grid gap-2 md:grid-cols-2">
                    <select
                      value={timeProjectSlug}
                      onChange={(e) => setTimeProjectSlug(e.target.value)}
                      className="border rounded-md px-2 py-1 text-sm"
                    >
                      <option value="">Select a project</option>
                      {myProjects.map((project) => (
                        <option key={project.id} value={project.slug}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={timeNote}
                      onChange={(e) => setTimeNote(e.target.value)}
                      placeholder="Optional note"
                      className="border rounded-md px-2 py-1 text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input type="checkbox" checked={timeBillable} onChange={(e) => setTimeBillable(e.target.checked)} />
                    Billable
                  </label>
                  {runningGoalEntry ? (
                    <button
                      type="button"
                      onClick={() => stopGoalTimer(runningGoalEntry.id)}
                      disabled={timeBusy}
                      className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm"
                    >
                      Stop timer ({formatMinutes(runningGoalEntry.durationMinutes || 0)})
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startGoalTimer}
                      disabled={!timeProjectSlug || timeBusy}
                      className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm disabled:opacity-60"
                    >
                      Start timer on this goal
                    </button>
                  )}

                  {goalTimeEntries.length ? (
                    <div className="space-y-2 text-xs text-gray-600">
                      {goalTimeEntries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold">{formatMinutes(entry.durationMinutes)}</div>
                            <div>{new Date(entry.startedAt).toLocaleString()}</div>
                          </div>
                          <div>{entry.billable ? "Billable" : "Non-billable"}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">No time entries for this goal yet.</div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-3xl border bg-white p-5 space-y-4 shadow-sm">
              <div className="text-lg font-semibold">On-chain</div>
              <div className="text-sm text-gray-700 space-y-2">
                {legacyLink && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Legacy tx:</span>
                    <a href={legacyLink} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                      {shortenCid(goal.legacyTxHash)}
                    </a>
                  </div>
                )}
                {!legacyLink && <div className="text-xs text-gray-500">Legacy tx not available</div>}
              </div>
            </div>
          </div>
        </div>

        {isOwner ? (
          <div className="grid gap-4 lg:grid-cols-3 items-start">
            <div id="evidence-action" className="rounded-3xl border bg-white p-5 space-y-3 shadow-sm lg:col-span-2">
              <div className="text-lg font-semibold">{status === "DRAFT" ? "Add evidence" : "Update evidence"}</div>
              <textarea
                value={evidenceInput}
                onChange={(e) => setEvidenceInput(e.target.value)}
                placeholder="Paste evidence CID or URL"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                rows={3}
              />
              <button
                type="button"
                disabled={submitting || isPending || waitingTx}
                className="px-4 py-2 rounded-md bg-brand-600 text-white text-sm disabled:opacity-60"
                onClick={submitEvidence}
              >
                {submitting || isPending || waitingTx ? "Submitting..." : "Submit evidence"}
              </button>
              {status === "SUBMITTED" || status === "PENDING_PEER" ? (
                <div className="text-xs text-gray-600">
                  Your evidence has been submitted. Share your approval link with peers or refresh status.
                </div>
              ) : null}
              <div className="text-xs text-gray-500">
                Approvals link:{" "}
                <Link href={`/approve?goalId=${goal.id}`} className="text-brand-600 hover:underline">
                  /approve?goalId={goal.id}
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-5 space-y-3 shadow-sm">
              <div className="text-lg font-semibold">Badge</div>
              {status === "VERIFIED" && !goal.badgeMinted ? (
                <button
                  type="button"
                  disabled={minting || isPending || waitingTx}
                  className="px-4 py-2 rounded-md bg-brand-600 text-white text-sm disabled:opacity-60"
                  onClick={mintBadge}
                >
                  {minting || isPending || waitingTx ? "Minting..." : "Mint badge"}
                </button>
              ) : status === "BADGED" ? (
                <div className="text-sm text-green-700">This goal is verified and your badge has been minted.</div>
              ) : (
                <div className="text-xs text-gray-600">Badge minting becomes available after verification.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border bg-white p-5 text-sm text-gray-600 shadow-sm">
            You are viewing this goal as a visitor. Actions are available to the goal owner only.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-4">
      <button onClick={() => router.push("/dashboard")} className="text-sm text-brand-600 hover:underline">
        Back to dashboard
      </button>
      {renderContent()}
      {showProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Add proof</div>
              <button type="button" className="text-sm text-gray-500" onClick={() => setShowProofModal(false)}>
                Close
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                className={`px-3 py-1 rounded-full border ${
                  proofTab === "file" ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600"
                }`}
                onClick={() => setProofTab("file")}
              >
                Upload file
              </button>
              <button
                type="button"
                className={`px-3 py-1 rounded-full border ${
                  proofTab === "url" ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600"
                }`}
                onClick={() => setProofTab("url")}
              >
                Link URL
              </button>
            </div>
            <div className="space-y-3 text-sm">
              {proofTab === "file" ? (
                <input
                  type="file"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
              ) : (
                <input
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://example.com/proof"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              )}
              <input
                value={proofTitle}
                onChange={(e) => setProofTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <textarea
                value={proofDescription}
                onChange={(e) => setProofDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full rounded-md border px-3 py-2 text-sm"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-md border text-sm"
                onClick={() => {
                  resetProofForm();
                  setShowProofModal(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm disabled:opacity-60"
                disabled={proofBusy}
                onClick={proofTab === "file" ? submitProofFile : submitProofUrl}
              >
                {proofBusy ? "Saving..." : "Save proof"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Request validation</div>
              <button type="button" className="text-sm text-gray-500" onClick={() => setShowValidationModal(false)}>
                Close
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <input
                value={validatorWallet}
                onChange={(e) => setValidatorWallet(e.target.value)}
                placeholder="Validator wallet address"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <input
                value={validationTitle}
                onChange={(e) => setValidationTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <textarea
                value={validationSummary}
                onChange={(e) => setValidationSummary(e.target.value)}
                placeholder="Summary (optional)"
                className="w-full rounded-md border px-3 py-2 text-sm"
                rows={3}
              />
              <textarea
                value={validationEvidence}
                onChange={(e) => setValidationEvidence(e.target.value)}
                placeholder="Evidence links or proof IDs (comma or newline separated)"
                className="w-full rounded-md border px-3 py-2 text-sm"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-md border text-sm"
                onClick={() => setShowValidationModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm disabled:opacity-60"
                disabled={validationBusy}
                onClick={submitValidationRequest}
              >
                {validationBusy ? "Sending..." : "Send request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
