"use client";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

import { getApiErrorMessage } from "../../../lib/apiError";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useAccount, useChainId, useReadContract, useSignTypedData } from "wagmi";
import { hashTypedData } from "viem";
import { shortAchievoId } from "../../../lib/achievo";
import { useUserTasks } from "../../../hooks/useUserTasks";
import { useProfileInfo } from "../../../hooks/useProfileInfo";
import { usePublicProfile } from "../../../hooks/usePublicProfile";
import { useProfessionalProfile } from "../../../hooks/useProfessionalProfile";
import { usePublicProfessionalProfile } from "../../../hooks/usePublicProfessionalProfile";
import { useShareLinks } from "../../../hooks/useShareLinks";
import { useProofs } from "../../../hooks/useProofs";
import { useUserValidations } from "../../../hooks/useValidations";
import { useProfileExportActions, type ExportBundle } from "../../../hooks/useProfileExports";
import { useConsistency } from "../../../hooks/useConsistency";
import { useEndorsementActions, useEndorsementSummary, useEndorsements } from "../../../hooks/useEndorsements";
import { useSkillActions, useUserSkills } from "../../../hooks/useSkills";
import { coreAddress, coreAbi, usernameRegistryAddress } from "../../../lib/contracts";
import { normalizeUsername, validateUsername } from "../../../lib/username";
import { GoalCard } from "../../../components/GoalCard";
import { ProfileEditor } from "../../../components/ProfileEditor";
import { ProofList } from "../../../components/ProofList";
import { VisibilityControls } from "../../../components/VisibilityControls";
import { AnchorStatusBadge, AnchorTimeline } from "../../../components/domain/AnchorStatus";
import { EmptyState } from "../../../components/states/EmptyState";
import { ErrorState } from "../../../components/states/ErrorState";
import { LoadingState } from "../../../components/states/LoadingState";
import { DegradedHint } from "../../../components/states/DegradedHint";
import { Modal } from "../../../components/ui/Modal";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Checkbox,
  CopyField,
  HashDisplay,
  Input,
  Select,
  Section,
  StatusBadge,
  uiToast,
} from "../../../components/ui";
import { useIdentityId } from "../../../hooks/useIdentity";
import { formatAchievoId } from "../../../lib/userId";
import { ipfsToHttp } from "../../../lib/ipfs";
import { useBackendAuth } from "../../../hooks/useBackendAuth";
import { usePolicy } from "../../../hooks/usePolicy";

type FollowStats = { followersCount: number; followingCount: number; isFollowing: boolean };
type ActivityItem = { id: string; summary: string; createdAt: string };

const QRCode = dynamic(() => import("../../../components/ui").then((mod) => mod.QRCode), { ssr: false });

function formatTimeAgo(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(Math.round(diffMs / 60000), 0);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function shortWallet(addr?: string) {
  if (!addr) return "";
  const normalized = addr.trim();
  if (normalized.length <= 12) return normalized;
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

function explorerTx(chainId?: number | null, txHash?: string | null) {
  if (!txHash) return "";
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${txHash}`;
  return `https://sepolia.basescan.org/tx/${txHash}`;
}

function availabilityLabel(value?: string) {
  switch (value) {
    case "OPEN_TO_WORK":
      return "Open to work";
    case "OPEN_TO_COLLAB":
      return "Open to collaborate";
    case "NOT_AVAILABLE":
      return "Not available";
    default:
      return "Unspecified";
  }
}

function HighlightCard({ item }: { item: any }) {
  if (item.type === "GOAL" && item.goal) {
    return (
      <Card>
        <CardBody className="space-y-1">
          <div className="text-sm font-semibold">{item.goal.goalCID || `Goal #${item.goal.goalId}`}</div>
          <div className="text-xs text-textMuted">Level {item.goal.level}</div>
        </CardBody>
      </Card>
    );
  }
  if (item.type === "BADGE" && item.badge) {
    return (
      <Card>
        <CardBody className="space-y-1">
          <div className="text-sm font-semibold">Badge #{item.badge.tokenId}</div>
          <div className="text-xs text-textMuted">Achievement badge</div>
        </CardBody>
      </Card>
    );
  }
  if (item.type === "PARTY" && item.party) {
    return (
      <Card>
        <CardBody className="space-y-1">
          <div className="text-sm font-semibold">{item.party.name}</div>
          <div className="text-xs text-textMuted">@{item.party.slug}</div>
        </CardBody>
      </Card>
    );
  }
  return (
    <Card>
      <CardBody className="space-y-1">
        <div className="text-sm font-semibold">{item.type}</div>
        <div className="text-xs text-textMuted">{item.ref}</div>
      </CardBody>
    </Card>
  );
}

function ProfessionalPanel({
  data,
  loading,
  error,
  isOwner,
  primaryShareSlug,
  handle,
}: {
  data: any;
  loading: boolean;
  error: string;
  isOwner: boolean;
  primaryShareSlug?: string | null;
  handle: string;
}) {
  if (loading) {
    return <div className="text-textMuted text-sm">Loading professional profile...</div>;
  }
  if (!isOwner && error) {
    return <div className="text-textMuted text-sm">This user has not set up a professional profile yet.</div>;
  }

  const professional = data?.professional || {};
  const identity = data?.identity || {};
  const stats = data?.stats || {};
  const highlights = data?.highlights?.pinnedItems || [];
  const hasContent =
    professional.headline ||
    professional.currentRole ||
    professional.bioShort ||
    professional.skills?.length ||
    professional.industries?.length ||
    highlights.length;

  if (!hasContent && !isOwner) {
    return <div className="text-textMuted text-sm">This user has not set up a professional profile yet.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="h-16 w-16 rounded-full overflow-hidden border border-border bg-surface2">
            {identity.avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ipfsToHttp(identity.avatar)} alt="avatar" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="text-xl font-semibold">{identity.displayName || identity.achusrId}</div>
            {identity.username && <div className="text-sm text-textMuted">@{identity.username.replace(/^@/, "")}</div>}
            <div className="text-xs text-textMuted">{identity.achusrId}</div>
            <div className="flex flex-wrap gap-2 text-xs text-textMuted">
              {(professional.currentRole || professional.currentOrg) && (
                <span>
                  {professional.currentRole || "Role"} {professional.currentOrg ? `@ ${professional.currentOrg}` : ""}
                </span>
              )}
              {professional.location && <span>{professional.location}</span>}
              {professional.timezone && <span>{professional.timezone}</span>}
            </div>
          </div>
          <Badge variant={professional.availability === "NOT_AVAILABLE" ? "unverified" : "verified"}>
            {availabilityLabel(professional.availability)}
          </Badge>
        </CardBody>
      </Card>

      {(professional.headline || professional.bioShort) && (
        <Section title="Summary">
          <Card>
            <CardBody className="space-y-2 text-sm text-textMuted">
              {professional.headline && <div>{professional.headline}</div>}
              {professional.bioShort && <div className="whitespace-pre-wrap">{professional.bioShort}</div>}
            </CardBody>
          </Card>
        </Section>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardBody className="space-y-2">
            <div className="text-xs text-textMuted">Level</div>
            <div className="text-lg font-semibold">Lv {stats.level ?? 1}</div>
            <div className="text-xs text-textMuted">{stats.xpTotal ?? 0} XP</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <div className="text-xs text-textMuted">Streak</div>
            <div className="text-lg font-semibold">{stats.currentStreak ?? 0} days</div>
            <div className="text-xs text-textMuted">Best {stats.longestStreak ?? 0}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <div className="text-xs text-textMuted">Goals completed</div>
            <div className="text-lg font-semibold">{stats.goalsCompleted ?? 0}</div>
            <div className="text-xs text-textMuted">{stats.badgesCount ?? 0} badges</div>
          </CardBody>
        </Card>
      </div>

      {highlights.length > 0 && (
        <Section title="Highlights">
          <div className="grid gap-3 md:grid-cols-2">
            {highlights.map((item: any) => (
              <HighlightCard key={`${item.type}-${item.ref}-${item.id}`} item={item} />
            ))}
          </div>
        </Section>
      )}

      {professional.skills?.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-2">
            {professional.skills.map((skill: string) => (
              <Badge key={skill} variant="neutral">
                {skill}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {professional.industries?.length > 0 && (
        <Section title="Industries">
          <div className="flex flex-wrap gap-2">
            {professional.industries.map((industry: string) => (
              <Badge key={industry} variant="neutral">
                {industry}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {(professional.websiteUrl ||
        professional.githubUrl ||
        professional.linkedinUrl ||
        professional.xUrl ||
        professional.portfolioUrl) && (
        <Section title="Contact">
          <div className="flex flex-wrap gap-3 text-sm">
            {professional.websiteUrl && (
              <a
                className="text-accent hover:underline"
                href={professional.websiteUrl}
                target="_blank"
                rel="noreferrer"
              >
                Website
              </a>
            )}
            {professional.githubUrl && (
              <a className="text-accent hover:underline" href={professional.githubUrl} target="_blank" rel="noreferrer">
                GitHub
              </a>
            )}
            {professional.linkedinUrl && (
              <a
                className="text-accent hover:underline"
                href={professional.linkedinUrl}
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn
              </a>
            )}
            {professional.xUrl && (
              <a className="text-accent hover:underline" href={professional.xUrl} target="_blank" rel="noreferrer">
                X
              </a>
            )}
            {professional.portfolioUrl && (
              <a
                className="text-accent hover:underline"
                href={professional.portfolioUrl}
                target="_blank"
                rel="noreferrer"
              >
                Portfolio
              </a>
            )}
          </div>
        </Section>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {primaryShareSlug ? (
          <Link href={`/s/${primaryShareSlug}`} className="px-4 py-2 rounded-full bg-accent text-white text-sm">
            View full professional profile
          </Link>
        ) : (
          <Link
            href={`/profile/professional/${handle}`}
            className="px-4 py-2 rounded-full bg-accent text-white text-sm"
          >
            View full professional profile
          </Link>
        )}
        {isOwner && (
          <>
            <Link href="/dashboard" className="px-4 py-2 rounded-full border border-border text-sm">
              Edit Professional Profile
            </Link>
            <Link href="/dashboard" className="px-4 py-2 rounded-full border border-border text-sm">
              Manage Share Links
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function ProfileContent() {
  const params = useParams<{ address: string }>();
  const addr = (params.address as string) || "";
  const { address } = useAccount();
  const chainId = useChainId();
  const isOwner = Boolean(address && addr && address.toLowerCase() === addr.toLowerCase());
  const {
    profile: ownerProfile,
    isLoaded,
    saveProfile,
    saveDisplayName,
    claimUsername,
    savingProfile,
    savingDisplayName,
  } = useProfileInfo();
  const { profile: publicProfile } = usePublicProfile(addr);
  const { tasks: userTasks, loading: tasksLoading, error: tasksError, refetch: refetchTasks } = useUserTasks(addr);
  const { data: thresholdRaw } = useReadContract({ address: coreAddress, abi: coreAbi, functionName: "peerThreshold" });
  const threshold = Number(thresholdRaw ?? 5);
  const { userId } = useIdentityId(addr as `0x${string}`);
  const { token, user } = useBackendAuth();
  const { policy } = usePolicy();
  const { signTypedDataAsync } = useSignTypedData();
  const showRiskSignals = policy.displayPolicies.showRiskSignalsToPublic || isOwner;
  const { data: professionalMe, loading: professionalMeLoading } = useProfessionalProfile();
  const {
    data: professionalPublic,
    loading: professionalPublicLoading,
    error: professionalPublicError,
  } = usePublicProfessionalProfile(addr);
  const { links: shareLinks } = useShareLinks();
  const [askPrice, setAskPrice] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askSubmitting, setAskSubmitting] = useState(false);
  const [askError, setAskError] = useState("");
  const [ask, setAsk] = useState<any | null>(null);
  const [askPreviewOpen, setAskPreviewOpen] = useState(false);
  const [askPreview, setAskPreview] = useState<{
    normalized: string;
    priceWei: string;
    expiresAt?: string;
    orderHash: string;
    typedData: any;
  } | null>(null);
  const [followStats, setFollowStats] = useState<FollowStats>({
    followersCount: 0,
    followingCount: 0,
    isFollowing: false,
  });
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "professional">("overview");
  const [proofFilter, setProofFilter] = useState<"all" | "goal" | "badge">("all");
  const [showConsistencyDetails, setShowConsistencyDetails] = useState(false);
  const [exportFormat, setExportFormat] = useState<"JSON" | "JSONLD" | "PDF">("PDF");
  const [exportAnchor, setExportAnchor] = useState(false);
  const [exportResult, setExportResult] = useState<ExportBundle | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [skillBusy, setSkillBusy] = useState(false);
  const [skillError, setSkillError] = useState("");
  const [endorseMessage, setEndorseMessage] = useState("");
  const [endorseBusy, setEndorseBusy] = useState(false);

  const profile = isOwner ? ownerProfile : publicProfile;
  const achusrId = (profile as any).achusrId || (profile as any).achievoId || formatAchievoId(userId) || "";
  const professionalData = isOwner && user ? professionalMe : professionalPublic;
  const professionalLoading = isOwner && user ? professionalMeLoading : professionalPublicLoading;
  const professionalError = isOwner && user ? "" : professionalPublicError;
  const primaryShare = isOwner ? shareLinks.find((link) => link.isPrimary) : null;
  const {
    score: consistencyScore,
    summary: consistencySummary,
    hidden: consistencyHidden,
    loading: consistencyLoading,
    error: consistencyError,
  } = useConsistency(achusrId);
  const { proofs, error: proofsError, state: proofsState, refetch: refetchProofs } = useProofs({ userId: achusrId });
  const { createExport, loading: exportLoading, error: exportError, state: exportState } = useProfileExportActions();
  const {
    items: approvedValidations,
    error: validationsError,
    state: validationsState,
    refetch: refetchValidations,
  } = useUserValidations(achusrId, { status: "APPROVED" });
  const {
    items: profileEndorsements,
    aggregates: profileEndorseAggregates,
    decision: profileEndorseDecision,
    loading: profileEndorsementsLoading,
    error: profileEndorsementsError,
    refetch: refetchProfileEndorsements,
  } = useEndorsements(achusrId, { targetType: "PROFILE" });
  const {
    summary: endorsementSummary,
    loading: endorsementSummaryLoading,
    error: endorsementSummaryError,
    refetch: refetchEndorsementSummary,
  } = useEndorsementSummary(achusrId);
  const {
    skills,
    loading: skillsLoading,
    error: skillsError,
    addSkill,
    removeSkill,
    refetch: refetchSkills,
  } = useUserSkills(achusrId);
  const { createSkill } = useSkillActions();
  const { createEndorsement, revokeEndorsement } = useEndorsementActions();

  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarUri = (profile.avatar || "").trim();
  const avatarUrl = avatarUri ? ipfsToHttp(avatarUri) : "";

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  const userGoals = userTasks;
  const minted = userGoals.filter((g) => g.badgeMinted);
  const filteredProofs = proofs.filter((proof) => {
    if (proofFilter === "goal") return Boolean(proof.achievementId);
    if (proofFilter === "badge") return Boolean(proof.badgeTokenId);
    return true;
  });
  const weeklyActivity = consistencySummary?.weekly || [];
  const weeklyMax = Math.max(1, ...weeklyActivity.map((week) => week.activeDays || 0));
  const anomalyNotes = Array.isArray(consistencyScore?.explanations?.anomalies)
    ? (consistencyScore?.explanations?.anomalies as string[])
    : [];
  const riskPenalty = Number(consistencyScore?.explanations?.risk?.riskPenalty ?? 0);
  const riskScore = Number(consistencyScore?.explanations?.risk?.riskScore ?? 0);
  const exportPath = exportResult ? `/exports/${exportResult.publicId}?token=${exportResult.publicId}` : "";
  const downloadPath = exportResult?.downloadUrl ? `${exportResult.downloadUrl}?token=${exportResult.publicId}` : "";
  const myProfileEndorsement = profileEndorsements.find(
    (item) => item.endorserUserId === user?.userId && item.status === "ACTIVE",
  );
  const endorsementTotalWeight = endorsementSummary?.totalWeight ?? profileEndorseAggregates?.totalWeight ?? 0;
  const endorsementCount = endorsementSummary?.countActive ?? profileEndorseAggregates?.countActive ?? 0;
  const topEndorsedSkills = Array.isArray(endorsementSummary?.topSkills) ? endorsementSummary?.topSkills : [];

  useEffect(() => {
    if (!profile.username) {
      setAsk(null);
      return;
    }
    let active = true;
    const fetchAsk = async () => {
      try {
        const res = await fetch(
          `/api/usernames/orders?handle=${encodeURIComponent(profile.username)}&type=ASK&status=OPEN&limit=1`,
        );
        const json = await res.json();
        if (!active) return;
        const first = Array.isArray(json?.data) ? json.data[0] : null;
        setAsk(first || null);
      } catch {
        if (!active) return;
        setAsk(null);
      }
    };
    void fetchAsk();
    return () => {
      active = false;
    };
  }, [profile.username]);

  useEffect(() => {
    if (!achusrId) return;
    let active = true;
    const fetchStats = async () => {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/identity/${achusrId}/follow-stats`, { headers, credentials: "include" });
      if (!res.ok) return;
      const json = await res.json();
      if (!active) return;
      setFollowStats({
        followersCount: Number(json.followersCount ?? 0),
        followingCount: Number(json.followingCount ?? 0),
        isFollowing: Boolean(json.isFollowing),
      });
    };
    void fetchStats();
    return () => {
      active = false;
    };
  }, [achusrId, token]);

  useEffect(() => {
    if (!achusrId || !showFollowers) return;
    let active = true;
    const loadFollowers = async () => {
      const res = await fetch(`/api/identity/${achusrId}/followers`);
      if (!res.ok) return;
      const json = await res.json();
      if (!active) return;
      setFollowers(Array.isArray(json.data) ? json.data : []);
    };
    void loadFollowers();
    return () => {
      active = false;
    };
  }, [achusrId, showFollowers]);

  useEffect(() => {
    if (!achusrId || !showFollowing) return;
    let active = true;
    const loadFollowing = async () => {
      const res = await fetch(`/api/identity/${achusrId}/following`);
      if (!res.ok) return;
      const json = await res.json();
      if (!active) return;
      setFollowing(Array.isArray(json.data) ? json.data : []);
    };
    void loadFollowing();
    return () => {
      active = false;
    };
  }, [achusrId, showFollowing]);

  useEffect(() => {
    if (!achusrId || activeTab !== "activity") return;
    let active = true;
    const loadActivity = async () => {
      setActivityLoading(true);
      const res = await fetch(`/api/identity/${achusrId}/activity`);
      const json = res.ok ? await res.json() : { data: [] };
      if (!active) return;
      setActivity(Array.isArray(json.data) ? json.data : []);
      setActivityLoading(false);
    };
    void loadActivity();
    return () => {
      active = false;
    };
  }, [achusrId, activeTab]);

  const listUsername = async () => {
    if (!user) {
      setAskError("Sign in to list a username");
      return;
    }
    if (!profile.username) {
      setAskError("Set a username before listing");
      return;
    }
    const cleaned = profile.username.trim().startsWith("@")
      ? profile.username.trim().slice(1)
      : profile.username.trim();
    const normalized = normalizeUsername(cleaned).normalized;
    const validation = validateUsername(normalized);
    if (!validation.valid) {
      setAskError("Username is invalid");
      return;
    }
    const priceRaw = askPrice.trim();
    if (!/^\d+$/.test(priceRaw) || BigInt(priceRaw) <= 0n) {
      setAskError("Enter a valid price");
      return;
    }
    setAskError("");
    setAskLoading(true);
    try {
      const prepare = await fetch("/api/usernames/orders/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "ASK", name: cleaned, priceWei: priceRaw }),
      });
      if (!prepare.ok) throw new Error(await prepare.text());
      const prepareJson = await prepare.json();
      const typedData = prepareJson?.data?.typedData;
      if (!typedData?.message) throw new Error("Failed to prepare order");
      const message = typedData.message || {};
      const preparedMessage = {
        ...message,
        priceWei: BigInt(String(message.priceWei)),
        nonce: BigInt(String(message.nonce)),
        salt: BigInt(String(message.salt)),
        expiresAt: BigInt(String(message.expiresAt)),
      };
      const orderHash = hashTypedData({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: preparedMessage,
      });
      const expiresAtSeconds = Number(message.expiresAt || 0);
      const expiresAtLabel = expiresAtSeconds > 0 ? new Date(expiresAtSeconds * 1000).toLocaleString() : undefined;
      setAskPreview({
        normalized,
        priceWei: priceRaw,
        expiresAt: expiresAtLabel,
        orderHash,
        typedData: { ...typedData, message: preparedMessage },
      });
      setAskPreviewOpen(true);
    } catch (e: any) {
      setAskError(e?.message || "Failed to list username");
    } finally {
      setAskLoading(false);
    }
  };

  const submitListing = async () => {
    if (!askPreview) return;
    setAskSubmitting(true);
    setAskError("");
    try {
      const signature = await signTypedDataAsync({
        domain: askPreview.typedData.domain,
        types: askPreview.typedData.types,
        primaryType: askPreview.typedData.primaryType,
        message: askPreview.typedData.message,
      });
      const res = await fetch("/api/usernames/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: askPreview.normalized, typedData: askPreview.typedData, signature }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setAsk(json.data);
      setAskPrice("");
      setAskPreview(null);
      setAskPreviewOpen(false);
    } catch (e: any) {
      setAskError(e?.message || "Failed to list username");
    } finally {
      setAskSubmitting(false);
    }
  };

  const closeAskPreview = () => {
    setAskPreviewOpen(false);
    setAskPreview(null);
  };

  const cancelListing = async () => {
    if (!user || !ask?.id) return;
    if (!ask?.orderHash || !ask?.nonce || !ask?.makerAddress) {
      setAskError("Missing order data for cancellation");
      return;
    }
    if (!chainId || !usernameRegistryAddress) {
      setAskError("Connect to the correct network before canceling");
      return;
    }
    setAskLoading(true);
    setAskError("");
    try {
      const signature = await signTypedDataAsync({
        domain: {
          name: "AchievoUsernameMarket",
          version: "1",
          chainId,
          verifyingContract: usernameRegistryAddress,
        },
        types: {
          Cancel: [
            { name: "orderHash", type: "bytes32" },
            { name: "maker", type: "address" },
            { name: "nonce", type: "uint256" },
          ],
        },
        primaryType: "Cancel",
        message: {
          orderHash: ask.orderHash,
          maker: ask.makerAddress,
          nonce: BigInt(String(ask.nonce)),
        },
      });
      const res = await fetch(`/api/usernames/orders/${ask.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ signature }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setAsk(json.data);
    } catch (e: any) {
      setAskError(e?.message || "Failed to cancel listing");
    } finally {
      setAskLoading(false);
    }
  };

  const handleExport = async () => {
    if (!token) {
      uiToast.error("Sign in to export profile");
      return;
    }
    try {
      const data = await createExport(exportFormat, exportAnchor);
      setExportResult(data);
      uiToast.success("Profile export created");
    } catch (e: any) {
      uiToast.error(e?.message || "Failed to export profile");
    }
  };

  const handleFollow = async () => {
    if (!token || !achusrId) return;
    const res = await fetch(`/api/identity/${achusrId}/follow`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (res.ok) {
      setFollowStats((prev) => ({ ...prev, isFollowing: true, followersCount: prev.followersCount + 1 }));
      uiToast.success("Followed");
    } else {
      uiToast.error("Failed to follow");
    }
  };

  const handleUnfollow = async () => {
    if (!token || !achusrId) return;
    const res = await fetch(`/api/identity/${achusrId}/unfollow`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (res.ok) {
      setFollowStats((prev) => ({ ...prev, isFollowing: false, followersCount: Math.max(prev.followersCount - 1, 0) }));
      uiToast.success("Unfollowed");
    } else {
      uiToast.error("Failed to unfollow");
    }
  };

  const handleAddSkill = async () => {
    if (!token) {
      uiToast.error("Sign in to add skills");
      return;
    }
    const label = skillInput.trim();
    if (!label) {
      setSkillError("Enter a skill name");
      return;
    }
    setSkillError("");
    setSkillBusy(true);
    try {
      const tag = await createSkill(label);
      await addSkill(tag.id);
      setSkillInput("");
      await refetchSkills();
      await refetchEndorsementSummary();
    } catch (e: any) {
      setSkillError(e?.message || "Failed to add skill");
    } finally {
      setSkillBusy(false);
    }
  };

  const handleRemoveSkill = async (skillTagId: string) => {
    if (!token) return;
    try {
      await removeSkill(skillTagId);
      await refetchEndorsementSummary();
    } catch (e: any) {
      uiToast.error(e?.message || "Failed to remove skill");
    }
  };

  const handleEndorseProfile = async () => {
    if (!token) {
      uiToast.error("Sign in to endorse");
      return;
    }
    if (!achusrId) return;
    setEndorseBusy(true);
    try {
      await createEndorsement({
        targetUserId: achusrId,
        targetType: "PROFILE",
        message: endorseMessage.trim() || undefined,
      });
      setEndorseMessage("");
      uiToast.success("Endorsed profile");
      await refetchProfileEndorsements();
      await refetchEndorsementSummary();
    } catch (e: any) {
      uiToast.error(e?.message || "Failed to endorse profile");
    } finally {
      setEndorseBusy(false);
    }
  };

  const handleRevokeProfileEndorsement = async () => {
    if (!token || !myProfileEndorsement?.id) return;
    setEndorseBusy(true);
    try {
      await revokeEndorsement(myProfileEndorsement.id);
      uiToast.success("Endorsement revoked");
      await refetchProfileEndorsements();
      await refetchEndorsementSummary();
    } catch (e: any) {
      uiToast.error(e?.message || "Failed to revoke endorsement");
    } finally {
      setEndorseBusy(false);
    }
  };

  const handleEndorseSkill = async (skillTagId: string) => {
    if (!token) {
      uiToast.error("Sign in to endorse");
      return;
    }
    setEndorseBusy(true);
    try {
      await createEndorsement({
        targetUserId: achusrId,
        targetType: "SKILL",
        targetId: skillTagId,
      });
      uiToast.success("Endorsed skill");
      await refetchSkills();
      await refetchEndorsementSummary();
    } catch (e: any) {
      uiToast.error(e?.message || "Failed to endorse skill");
    } finally {
      setEndorseBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <DegradedHint />
        <h2 className="text-2xl font-semibold">Profile</h2>
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-surface2 border border-border">
                {avatarUrl && !avatarFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-sm text-textMuted">Achievo ID</div>
                <div className="text-xl font-semibold">
                  {profile.displayName || formatAchievoId(userId) || shortAchievoId(addr)}
                </div>
                {profile.username && (
                  <div className="text-sm text-textMuted">@{profile.username.replace(/^@/, "")}</div>
                )}
                <div className="text-xs text-textMuted">Address: {addr}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-textMuted">
              <button type="button" className="hover:text-text" onClick={() => setShowFollowers((v) => !v)}>
                {followStats.followersCount} Followers
              </button>
              <button type="button" className="hover:text-text" onClick={() => setShowFollowing((v) => !v)}>
                {followStats.followingCount} Following
              </button>
              {!isOwner && token && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="ml-auto"
                  onClick={followStats.isFollowing ? handleUnfollow : handleFollow}
                >
                  {followStats.isFollowing ? "Unfollow" : "Follow"}
                </Button>
              )}
            </div>
            {showFollowers && (
              <div className="text-sm text-textMuted">
                {followers.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {followers.map((f) => (
                      <Card key={f.achusrId}>
                        <CardBody className="space-y-1">
                          <div className="font-semibold">{f.displayName || f.achusrId}</div>
                          {f.username && <div className="text-xs text-textMuted">@{f.username}</div>}
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div>No followers yet.</div>
                )}
              </div>
            )}
            {showFollowing && (
              <div className="text-sm text-textMuted">
                {following.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {following.map((f) => (
                      <Card key={f.achusrId}>
                        <CardBody className="space-y-1">
                          <div className="font-semibold">{f.displayName || f.achusrId}</div>
                          {f.username && <div className="text-xs text-textMuted">@{f.username}</div>}
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div>Not following anyone yet.</div>
                )}
              </div>
            )}
            {profile.bio && <p className="text-textMuted text-sm">{profile.bio}</p>}
            {profile.about && (
              <div>
                <div className="text-sm font-semibold mb-1">About</div>
                <p className="text-textMuted text-sm whitespace-pre-wrap">{profile.about}</p>
              </div>
            )}
          </CardBody>
        </Card>
        <div className="flex items-center gap-2 text-sm">
          {["overview", "activity", "professional"].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveTab(tab as "overview" | "activity" | "professional")}
            >
              {tab === "overview" ? "Overview" : tab === "activity" ? "Activity" : "Professional"}
            </Button>
          ))}
        </div>

        {activeTab === "overview" && isOwner && isLoaded && (
          <Section title="Edit profile">
            <Card>
              <CardBody>
                <ProfileEditor
                  profile={ownerProfile}
                  savingProfile={savingProfile}
                  savingDisplayName={savingDisplayName}
                  onClaimUsername={async (username) => {
                    await claimUsername(username);
                  }}
                  onSaveProfile={async (next) => {
                    await saveProfile(next);
                  }}
                  onSaveDisplayName={async (name) => {
                    await saveDisplayName(name);
                  }}
                />
              </CardBody>
            </Card>
          </Section>
        )}
        {activeTab === "overview" && isOwner && ownerProfile.username && (
          <Section title="List username for sale">
            <Card>
              <CardBody className="space-y-3">
                {ask?.status === "OPEN" ? (
                  <div className="text-sm text-textMuted">
                    Current listing: @{ownerProfile.username} for {String(ask.priceWei || ask.price)} {ask.currency}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      value={askPrice}
                      onChange={(e) => setAskPrice(e.target.value)}
                      placeholder="Price (wei)"
                      className="w-32"
                    />
                    <Button onClick={listUsername} disabled={askLoading}>
                      {askLoading ? "Listing..." : "Create listing"}
                    </Button>
                  </div>
                )}
                {ask?.status === "OPEN" && (
                  <Button variant="ghost" onClick={cancelListing} disabled={askLoading}>
                    Cancel listing
                  </Button>
                )}
                {askError && <div className="text-sm text-danger">{askError}</div>}
              </CardBody>
            </Card>
          </Section>
        )}
      </div>

      {activeTab === "overview" ? (
        <>
          <Section
            title="Consistency"
            actions={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowConsistencyDetails((value) => !value)}
              >
                {showConsistencyDetails ? "Hide details" : "How it is calculated"}
              </Button>
            }
          >
            {consistencyLoading ? (
              <div className="text-sm text-textMuted">Loading consistency score...</div>
            ) : consistencyError ? (
              <div className="text-sm text-danger">{consistencyError}</div>
            ) : consistencyHidden ? (
              <div className="text-sm text-textMuted">Consistency metrics are private.</div>
            ) : !consistencyScore ? (
              <div className="text-sm text-textMuted">No activity data yet.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardBody className="space-y-2">
                      <div className="text-xs text-textMuted">Credibility</div>
                      <div className="text-2xl font-semibold">{consistencyScore.credibilityScore}</div>
                      <div className="text-xs text-textMuted">out of 100</div>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody className="space-y-2">
                      <div className="text-xs text-textMuted">Current streak</div>
                      <div className="text-2xl font-semibold">{consistencyScore.streakDays}</div>
                      <div className="text-xs text-textMuted">days</div>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody className="space-y-2">
                      <div className="text-xs text-textMuted">Best streak</div>
                      <div className="text-2xl font-semibold">{consistencyScore.bestStreakDays}</div>
                      <div className="text-xs text-textMuted">days</div>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody className="space-y-2">
                      <div className="text-xs text-textMuted">Reliability</div>
                      <div className="text-2xl font-semibold">{consistencyScore.reliabilityScore}</div>
                      <div className="text-xs text-textMuted">score</div>
                    </CardBody>
                  </Card>
                </div>

                <Card>
                  <CardBody className="space-y-2">
                    <div className="text-xs text-textMuted">Active days (last 8 weeks)</div>
                    {weeklyActivity.length ? (
                      <div className="flex items-end gap-2 h-20">
                        {weeklyActivity.map((week) => (
                          <div key={week.weekKey} className="flex flex-col items-center flex-1">
                            <div
                              className="w-full rounded-md bg-accent"
                              style={{ height: `${Math.max((week.activeDays / weeklyMax) * 100, 8)}%` }}
                            />
                            <div className="text-xs text-textMuted">{week.weekKey.split("-W")[1]}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-textMuted">No recent activity yet.</div>
                    )}
                  </CardBody>
                </Card>

                {showRiskSignals && consistencyScore.anomalyScore >= 70 && (
                  <div className="rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                    Unusual activity detected; credibility score reduced.
                  </div>
                )}
                {showRiskSignals && riskPenalty > 0 && (
                  <div className="rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                    Risk signals reduced credibility by {riskPenalty} points (risk score {riskScore}).
                  </div>
                )}

                {showConsistencyDetails && (
                  <Card>
                    <CardBody className="space-y-2 text-sm text-textMuted">
                      <div>Streak score: {consistencyScore.streakScore} / 100</div>
                      <div>
                        Reliability inputs: {consistencyScore.explanations?.reliability?.completedEvents ?? 0} completed
                        vs {consistencyScore.explanations?.reliability?.startedEvents ?? 0} started
                      </div>
                      {showRiskSignals ? (
                        <>
                          <div>Anomaly score: {consistencyScore.anomalyScore} / 100</div>
                          {riskPenalty > 0 && (
                            <div>
                              Risk penalty: -{riskPenalty} (risk score {riskScore})
                            </div>
                          )}
                          {anomalyNotes.length ? (
                            <div className="space-y-1">
                              {anomalyNotes.map((note, index) => (
                                <div key={`${index}-${note}`}>- {note}</div>
                              ))}
                            </div>
                          ) : (
                            <div>No anomaly signals detected.</div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-textMuted">Risk signals are hidden by policy.</div>
                      )}
                    </CardBody>
                  </Card>
                )}
              </div>
            )}
          </Section>

          <Section title="Goals">
            {tasksLoading ? (
              <div className="text-textMuted text-sm">Loading goals...</div>
            ) : tasksError ? (
              <div className="text-sm text-danger">{tasksError}</div>
            ) : userGoals.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {userGoals.map((goal) => (
                  <GoalCard
                    key={goal.id.toString()}
                    goal={goal}
                    threshold={threshold}
                    showCreator={false}
                    showShareLink={!goal.verified}
                    showPrivacyControls={Boolean(isOwner && token)}
                    onPrivacyUpdated={refetchTasks}
                  />
                ))}
              </div>
            ) : (
              <div className="text-textMuted text-sm">No goals found in recent history.</div>
            )}
          </Section>

          <Section title="Badges">
            {minted.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {minted.map((goal) => (
                  <GoalCard
                    key={`badge-${goal.id.toString()}`}
                    goal={goal}
                    threshold={threshold}
                    showCreator={false}
                    showPrivacyControls={Boolean(isOwner && token)}
                    onPrivacyUpdated={refetchTasks}
                  />
                ))}
              </div>
            ) : (
              <div className="text-textMuted text-sm">No badges minted yet.</div>
            )}
          </Section>

          <Section
            title="Proofs"
            actions={
              <div className="flex items-center gap-2 text-xs">
                {(["all", "goal", "badge"] as const).map((filter) => (
                  <Button
                    key={filter}
                    type="button"
                    size="sm"
                    variant={proofFilter === filter ? "primary" : "secondary"}
                    onClick={() => setProofFilter(filter)}
                  >
                    {filter === "all" ? "All" : filter === "goal" ? "Goals" : "Badges"}
                  </Button>
                ))}
              </div>
            }
          >
            {proofsState.status === "loading" ? (
              <LoadingState title="Loading proofs" description="Fetching proof artifacts for this profile." rows={2} />
            ) : proofsState.status === "failed" ? (
              <ErrorState message={proofsError || "Unable to load proofs."} onRetry={refetchProofs} />
            ) : filteredProofs.length ? (
              <ProofList proofs={filteredProofs} showControls={Boolean(isOwner && token)} onRefresh={refetchProofs} />
            ) : (
              <EmptyState title="No proofs yet" description="Proof artifacts will appear here once added." />
            )}
          </Section>

          {isOwner && (
            <Section title="Export profile" description="Create a signed snapshot for third-party verification.">
              <Card>
                <CardBody className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <label className="text-xs text-textMuted">Format</label>
                    <Select
                      className="w-fit"
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as "JSON" | "JSONLD" | "PDF")}
                    >
                      <option value="JSON">JSON</option>
                      <option value="JSONLD">JSON-LD</option>
                      <option value="PDF">PDF</option>
                    </Select>
                    <label className="flex items-center gap-2 text-xs text-textMuted">
                      <Checkbox checked={exportAnchor} onChange={(e) => setExportAnchor(e.target.checked)} />
                      Anchor on-chain
                    </label>
                    <Button type="button" onClick={handleExport} disabled={exportLoading}>
                      {exportLoading ? "Exporting..." : "Create export"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {exportState.status === "loading" && <StatusBadge tone="info">Creating export</StatusBadge>}
                    {exportState.status === "failed" && <StatusBadge tone="danger">Export failed</StatusBadge>}
                    {exportState.status === "confirmed" && <StatusBadge tone="success">Export ready</StatusBadge>}
                  </div>
                  {exportError && <div className="text-sm text-danger">{exportError}</div>}
                  {exportResult && (
                    <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
                      <Card>
                        <CardBody className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold">Export ready</div>
                            {exportResult.anchor?.txHash ? (
                              <AnchorStatusBadge
                                txHash={exportResult.anchor.txHash}
                                anchoredAt={exportResult.anchor.anchoredAt}
                              />
                            ) : exportAnchor ? (
                              <StatusBadge tone="warning">Anchoring queued</StatusBadge>
                            ) : null}
                          </div>
                          <CopyField label="Public link" value={`${window.location.origin}${exportPath}`} />
                          <CopyField label="Snapshot hash" value={exportResult.snapshotHash} />
                          <CopyField label="Signature" value={exportResult.signature} />
                          {exportResult.anchor?.txHash ? (
                            <>
                              <HashDisplay
                                label="Anchor tx"
                                value={exportResult.anchor.txHash}
                                href={explorerTx(exportResult.anchor.chainId, exportResult.anchor.txHash)}
                              />
                              <AnchorTimeline
                                txHash={exportResult.anchor.txHash}
                                anchoredAt={exportResult.anchor.anchoredAt}
                              />
                            </>
                          ) : null}
                          {downloadPath && (
                            <a
                              href={downloadPath}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-accent hover:underline"
                            >
                              Download PDF
                            </a>
                          )}
                        </CardBody>
                      </Card>
                      <Card>
                        <CardBody className="flex flex-col items-center justify-center gap-3">
                          <div className="text-xs text-textMuted">Share QR</div>
                          <QRCode value={`${window.location.origin}${exportPath}`} size={120} />
                          <Link
                            href={{
                              pathname: "/exports/[publicId]",
                              query: { publicId: exportResult?.publicId ?? "", token: exportResult?.publicId ?? "" },
                            }}
                            className="text-xs text-accent hover:underline"
                          >
                            Open verification page
                          </Link>
                        </CardBody>
                      </Card>
                    </div>
                  )}
                </CardBody>
              </Card>
            </Section>
          )}

          <Section title="Validated achievements">
            {validationsState.status === "loading" ? (
              <LoadingState title="Loading validations" description="Fetching validated achievements." rows={2} />
            ) : validationsState.status === "failed" ? (
              <ErrorState message={validationsError || "Unable to load validations."} onRetry={refetchValidations} />
            ) : approvedValidations.length ? (
              <div className="space-y-3">
                {approvedValidations.map((item) => {
                  const attestation = item.attestation;
                  const anchorUrl = explorerTx(attestation?.chainId, attestation?.anchorTxHash);
                  const redaction = item.request.redaction || "NONE";
                  const metadataHidden = !isOwner && redaction !== "NONE";
                  return (
                    <Card key={item.request.id}>
                      <CardBody className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold">{item.request.title}</div>
                          {attestation?.anchorTxHash ? (
                            <AnchorStatusBadge txHash={attestation.anchorTxHash} anchoredAt={attestation.anchoredAt} />
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-textMuted">
                          {item.request.achievementId && <span>Goal #{item.request.achievementId}</span>}
                          {item.request.badgeTokenId && <span>Badge #{item.request.badgeTokenId}</span>}
                          {attestation?.issuedAt && <span>{formatTimeAgo(attestation.issuedAt)}</span>}
                        </div>
                        <div className="text-xs text-textMuted">
                          Validator:{" "}
                          {attestation?.validator?.displayName ||
                            shortWallet(attestation?.validatorWallet) ||
                            shortWallet(item.request.requestedValidatorWallet)}
                        </div>
                        {attestation?.message && !metadataHidden && (
                          <div className="text-textMuted">{attestation.message}</div>
                        )}
                        {metadataHidden && <Badge variant="private">Validation details hidden</Badge>}
                        {attestation?.anchorTxHash ? (
                          <>
                            <HashDisplay label="Anchor tx" value={attestation.anchorTxHash} href={anchorUrl} />
                            <AnchorTimeline txHash={attestation.anchorTxHash} anchoredAt={attestation.anchoredAt} />
                          </>
                        ) : null}
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
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No validated achievements yet"
                description="Validated achievements will appear here once approved."
              />
            )}
          </Section>

          <Section
            title="Endorsements"
            actions={
              isOwner && token ? (
                <VisibilityControls
                  contentType="ENDORSEMENTS"
                  contentId="PROFILE"
                  visibility={profileEndorseDecision?.visibility}
                  redaction={profileEndorseDecision?.redaction}
                  showRedaction
                  unlistedPublicId={profileEndorseDecision?.unlistedPublicId}
                  onUpdated={() => refetchProfileEndorsements()}
                />
              ) : null
            }
          >
            {!policy.featureFlags.endorsementsEnabled ? (
              <Alert tone="warning">Endorsements are currently disabled by policy.</Alert>
            ) : endorsementSummaryLoading || profileEndorsementsLoading ? (
              <div className="text-textMuted text-sm">Loading endorsements...</div>
            ) : endorsementSummaryError || profileEndorsementsError ? (
              <div className="text-sm text-danger">{endorsementSummaryError || profileEndorsementsError}</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardBody className="space-y-2">
                    <div className="text-xs text-textMuted">Weighted reputation</div>
                    <div className="text-2xl font-semibold">{endorsementTotalWeight}</div>
                    <div className="text-xs text-textMuted">{endorsementCount} endorsements</div>
                  </CardBody>
                </Card>
                <Card className="md:col-span-2">
                  <CardBody>
                    <div className="text-xs text-textMuted">Top skills</div>
                    {topEndorsedSkills.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {topEndorsedSkills.map((skill: any) => (
                          <Badge key={skill.skillTagId} variant="neutral">
                            {skill.displayName} ({skill.totalWeight})
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-textMuted mt-2">No endorsements yet.</div>
                    )}
                  </CardBody>
                </Card>
              </div>
            )}

            {!isOwner && policy.featureFlags.endorsementsEnabled && (
              <Card>
                <CardBody className="space-y-3 text-sm">
                  <div className="text-xs text-textMuted">Endorse this profile</div>
                  <textarea
                    value={endorseMessage}
                    onChange={(e) => setEndorseMessage(e.target.value)}
                    placeholder="Optional note (max 280 chars)"
                    className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
                    rows={2}
                    maxLength={280}
                  />
                  <div className="flex items-center gap-2">
                    <Button type="button" onClick={handleEndorseProfile} disabled={!token || endorseBusy}>
                      {myProfileEndorsement ? "Endorsed" : endorseBusy ? "Endorsing..." : "Endorse profile"}
                    </Button>
                    {myProfileEndorsement && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleRevokeProfileEndorsement}
                        disabled={!token || endorseBusy}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                  {!token && <div className="text-xs text-textMuted">Sign in to endorse this profile.</div>}
                </CardBody>
              </Card>
            )}
          </Section>

          <Section
            title="Skills"
            actions={
              isOwner && token ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Add a skill"
                    className="w-40"
                  />
                  <Button type="button" onClick={handleAddSkill} disabled={skillBusy}>
                    {skillBusy ? "Adding..." : "Add"}
                  </Button>
                </div>
              ) : null
            }
          >
            {skillError && <div className="text-sm text-danger">{skillError}</div>}
            {skillsLoading ? (
              <div className="text-sm text-textMuted">Loading skills...</div>
            ) : skillsError ? (
              <div className="text-sm text-danger">{skillsError}</div>
            ) : skills.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {skills.map((skill) => (
                  <Card key={skill.skillTagId}>
                    <CardBody className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold">{skill.displayName}</div>
                          <div className="text-xs text-textMuted">@{skill.slug}</div>
                        </div>
                        {isOwner && token && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSkill(skill.skillTagId)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      {skill.proficiency && (
                        <div className="text-xs text-textMuted">Proficiency: {skill.proficiency}/5</div>
                      )}
                      <div className="text-xs text-textMuted">
                        Endorsements: {skill.endorsementsCount} - Weight {skill.endorsementsWeight}
                      </div>
                      {!isOwner && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEndorseSkill(skill.skillTagId)}
                          disabled={!token || endorseBusy}
                        >
                          Endorse skill
                        </Button>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState title="No skills yet" description="Add skills to highlight expertise." />
            )}
          </Section>
        </>
      ) : activeTab === "activity" ? (
        <Section title="Activity">
          {activityLoading ? (
            <div className="text-textMuted text-sm">Loading activity...</div>
          ) : activity.length ? (
            <div className="space-y-2">
              {activity.map((item) => (
                <Card key={item.id}>
                  <CardBody className="text-sm text-text">
                    <div className="font-semibold">You {item.summary}</div>
                    <div className="text-xs text-textMuted">{formatTimeAgo(item.createdAt)}</div>
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-textMuted text-sm">No activity yet.</div>
          )}
        </Section>
      ) : (
        <Section title="Professional">
          <ProfessionalPanel
            data={professionalData}
            loading={professionalLoading}
            error={professionalError}
            isOwner={isOwner}
            primaryShareSlug={primaryShare?.slug || null}
            handle={addr}
          />
        </Section>
      )}
      <Modal open={askPreviewOpen} onClose={closeAskPreview} title="Review username listing">
        {askPreview ? (
          <div className="space-y-4">
            <div className="text-sm text-textMuted">Review the listing details before signing the order.</div>
            <div className="grid gap-3 md:grid-cols-2">
              <CopyField label="Handle" value={`@${askPreview.normalized}`} />
              <CopyField label="Price (wei)" value={askPreview.priceWei} />
              {askPreview.expiresAt ? <CopyField label="Expires at" value={askPreview.expiresAt} /> : null}
              <CopyField label="Order hash" value={askPreview.orderHash} />
              {askPreview.typedData?.domain?.chainId ? (
                <CopyField label="Chain ID" value={String(askPreview.typedData.domain.chainId)} />
              ) : null}
              {askPreview.typedData?.domain?.verifyingContract ? (
                <CopyField label="Registry" value={askPreview.typedData.domain.verifyingContract} />
              ) : null}
            </div>
            <div className="text-xs text-textMuted">
              Signing authorizes this listing until the expiry. You can revoke by signing a cancel message from your
              profile.
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeAskPreview}>
                Cancel
              </Button>
              <Button type="button" onClick={submitListing} disabled={askSubmitting}>
                {askSubmitting ? "Signing..." : "Sign order"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="text-textMuted">Loading profile...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
