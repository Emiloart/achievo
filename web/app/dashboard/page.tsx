"use client";
import Link from "next/link";

import { getApiErrorMessage } from "../../lib/apiError";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { formatAchievoId } from "../../lib/userId";
import { useIdentityId } from "../../hooks/useIdentity";
import { useProfileInfo } from "../../hooks/useProfileInfo";
import { ProfileEditor } from "../../components/ProfileEditor";
import { ProfessionalProfileEditor } from "../../components/ProfessionalProfileEditor";
import { HighlightsEditor } from "../../components/HighlightsEditor";
import { ShareLinksManager } from "../../components/ShareLinksManager";
import { PrivacySettingsEditor } from "../../components/PrivacySettingsEditor";
import { VisibilityControls } from "../../components/VisibilityControls";
import { ipfsToHttp } from "../../lib/ipfs";
import { StatusPill } from "../../components/StatusPill";
import { useUserTasks, type GoalWithStatus } from "../../hooks/useUserTasks";
import { shortAchievoId } from "../../lib/achievo";
import { useQuests, type QuestRow } from "../../hooks/useQuests";
import { useBackendAuth } from "../../hooks/useBackendAuth";
import { useProfessionalProfile } from "../../hooks/useProfessionalProfile";
import { usePrivacySettings } from "../../hooks/usePrivacySettings";
import { useRiskProfile } from "../../hooks/useRiskProfile";

type BadgeItem = {
  id: number;
  mintedAt?: number;
  visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
  redaction?: "NONE" | "METADATA_ONLY" | "FULL";
  unlistedPublicId?: string | null;
};
type PartyPreview = { id: string; slug: string; name: string; membersCount: number; visibility: string };
type PartyFeedItem = {
  id: string;
  summary: string;
  createdAt: string;
  party?: { slug: string; name: string };
  actor?: { displayName?: string; username?: string };
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "inProgress", label: "In Progress" },
  { id: "verified", label: "Verified" },
  { id: "badged", label: "Badged" },
] as const;

function formatDate(seconds: number) {
  if (!seconds) return "N/A";
  try {
    const date = new Date(seconds * 1000);
    return date.toLocaleDateString();
  } catch {
    return "N/A";
  }
}

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

function GoalListCard({ goal }: { goal: GoalWithStatus }) {
  return (
    <div className="rounded-xl border bg-white p-4 space-y-2 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold">{goal.goalCID || `Goal #${goal.id}`}</div>
          <div className="text-xs text-gray-500">Goal #{goal.id}</div>
          <div className="text-xs text-gray-500">Level {goal.level}</div>
          <div className="text-xs text-gray-500">Created {formatDate(goal.createdAt)}</div>
          {goal.isMigrated && (
            <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">Imported</span>
          )}
        </div>
        <StatusPill status={goal.status} />
      </div>
      {goal.goalCID && <div className="text-xs text-gray-600 truncate">CID: {goal.goalCID}</div>}
      <Link href={`/goals/${goal.id}`} className="text-xs text-brand-600 hover:underline">
        View details
      </Link>
    </div>
  );
}

function BadgeGrid({
  badges,
  showControls,
  onRefresh,
}: {
  badges: BadgeItem[];
  showControls?: boolean;
  onRefresh?: () => void;
}) {
  if (!badges.length) {
    return <div className="text-gray-500 text-sm">Verify goals to earn your first badge.</div>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {badges.map((b) => (
        <div key={b.id} className="rounded-xl border bg-white p-4 space-y-2 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-200 to-blue-200 flex items-center justify-center text-sm font-semibold text-purple-800">
            #{b.id}
          </div>
          <div className="text-sm font-semibold">Badge #{b.id}</div>
          <div className="text-xs text-gray-500">Minted {b.mintedAt ? formatDate(b.mintedAt) : "-"}</div>
          {showControls && (
            <VisibilityControls
              contentType="BADGE"
              contentId={String(b.id)}
              visibility={b.visibility}
              redaction={b.redaction}
              unlistedPublicId={b.unlistedPublicId}
              onUpdated={onRefresh ? () => onRefresh() : undefined}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl border bg-white ${className}`} />;
}

const QUEST_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-gray-100 text-gray-700",
  COMPLETED: "bg-amber-100 text-amber-800",
  CLAIMED: "bg-green-100 text-green-700",
  EXPIRED: "bg-slate-100 text-slate-600",
};

function QuestStatusPill({ status }: { status: string }) {
  const className = QUEST_STATUS_STYLES[status] || QUEST_STATUS_STYLES.ACTIVE;
  const label = status === "COMPLETED" ? "Ready" : status.charAt(0) + status.slice(1).toLowerCase();
  return <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${className}`}>{label}</span>;
}

function QuestItem({
  quest,
  onClaim,
  claiming,
}: {
  quest: QuestRow;
  onClaim: (id: string) => void;
  claiming: boolean;
}) {
  const progress =
    quest.targetCount > 0 ? Math.min(100, Math.round((quest.currentCount / quest.targetCount) * 100)) : 0;
  const canClaim = quest.status === "COMPLETED" && quest.userQuestId;
  return (
    <div className="rounded-xl border bg-white p-4 space-y-2 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{quest.title}</div>
          <div className="text-xs text-gray-600">{quest.description}</div>
        </div>
        <QuestStatusPill status={quest.status} />
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-brand-600" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {quest.currentCount}/{quest.targetCount} · +{quest.xpReward} XP
        </span>
        {canClaim ? (
          <button
            type="button"
            disabled={claiming}
            onClick={() => quest.userQuestId && onClaim(quest.userQuestId)}
            className="text-xs px-2 py-1 rounded-md bg-brand-600 text-white disabled:opacity-60"
          >
            Claim XP
          </button>
        ) : quest.status === "CLAIMED" ? (
          <span className="text-green-700">Done</span>
        ) : null}
      </div>
    </div>
  );
}

function QuestPanel({
  title,
  quests,
  loading,
  claiming,
  onClaim,
  emptyCopy,
}: {
  title: string;
  quests: QuestRow[];
  loading: boolean;
  claiming: boolean;
  onClaim: (id: string) => void;
  emptyCopy: string;
}) {
  return (
    <div className="rounded-3xl border bg-white p-5 space-y-3 shadow-sm">
      <div className="text-lg font-semibold">{title}</div>
      {loading ? (
        <div className="grid gap-3">
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-24" />
        </div>
      ) : quests.length === 0 ? (
        <div className="text-sm text-gray-500">{emptyCopy}</div>
      ) : (
        <div className="grid gap-3">
          {quests.map((quest) => (
            <QuestItem key={quest.slug} quest={quest} onClaim={onClaim} claiming={claiming} />
          ))}
        </div>
      )}
    </div>
  );
}

function StreakCard({ current, longest }: { current: number; longest: number }) {
  return (
    <div className="rounded-3xl border bg-white p-5 space-y-2 shadow-sm">
      <div className="text-lg font-semibold">Streak</div>
      <div className="text-3xl font-semibold">🔥 {current} day streak</div>
      <div className="text-sm text-gray-500">Best: {longest} days</div>
    </div>
  );
}

function RecentActivity({
  items,
}: {
  items: Array<{ title: string; xpReward: number; claimedAt?: string; completedAt?: string }>;
}) {
  if (!items.length) {
    return (
      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="text-lg font-semibold">Recent activity</div>
        <div className="text-sm text-gray-500 mt-2">No quest activity yet.</div>
      </div>
    );
  }
  return (
    <div className="rounded-3xl border bg-white p-5 space-y-3 shadow-sm">
      <div className="text-lg font-semibold">Recent activity</div>
      <div className="space-y-2 text-sm text-gray-600">
        {items.map((item, idx) => {
          const when = formatTimeAgo(item.claimedAt || item.completedAt);
          return (
            <div key={`${item.title}-${idx}`} className="flex items-start justify-between gap-2">
              <span>
                {item.title}
                {when ? ` (${when})` : ""}
              </span>
              <span className="text-gray-500">+{item.xpReward} XP</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PartyWidget({ parties }: { parties: PartyPreview[] }) {
  if (!parties.length) {
    return (
      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="text-lg font-semibold">Your Parties</div>
        <div className="text-sm text-gray-500 mt-2">You are not in any parties yet.</div>
      </div>
    );
  }
  return (
    <div className="rounded-3xl border bg-white p-5 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Your Parties</div>
        <Link href="/parties" className="text-xs text-brand-600 hover:underline">
          View all
        </Link>
      </div>
      <div className="space-y-2">
        {parties.map((party) => (
          <Link key={party.id} href={`/parties/${party.slug}`} className="block rounded-xl border bg-gray-50 px-3 py-2">
            <div className="text-sm font-semibold">{party.name}</div>
            <div className="text-xs text-gray-500">
              @{party.slug} · {party.membersCount} members
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PartyFeedPreview({ items }: { items: PartyFeedItem[] }) {
  if (!items.length) {
    return (
      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="text-lg font-semibold">From your parties</div>
        <div className="text-sm text-gray-500 mt-2">No party activity yet.</div>
      </div>
    );
  }
  return (
    <div className="rounded-3xl border bg-white p-5 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">From your parties</div>
        <Link href="/parties" className="text-xs text-brand-600 hover:underline">
          View all
        </Link>
      </div>
      <div className="space-y-2 text-sm text-gray-600">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border bg-gray-50 px-3 py-2">
            <div className="font-semibold">
              {(item.actor?.displayName || item.actor?.username || "Someone") + " " + item.summary}
            </div>
            <div className="text-xs text-gray-500">
              {item.party?.name ? `${item.party.name} · ` : ""}
              {formatTimeAgo(item.createdAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address } = useAccount();
  const { token } = useBackendAuth();
  const { userId } = useIdentityId(address as `0x${string}` | undefined);
  const { profile, isLoaded, saveProfile, saveDisplayName, claimUsername, savingProfile, savingDisplayName, reload } =
    useProfileInfo();
  const {
    professional,
    saving: professionalSaving,
    saveProfessional,
    loading: professionalLoading,
  } = useProfessionalProfile();
  const { tasks, loading: tasksLoading, error: tasksError, refetch: refetchTasks } = useUserTasks();
  const {
    settings: privacySettings,
    overridesCount,
    loading: privacyLoading,
    error: privacyError,
    saveSettings: savePrivacySettings,
  } = usePrivacySettings();
  const {
    dailyQuests,
    weeklyQuests,
    milestoneQuests,
    streak,
    recentActivity,
    loading: questsLoading,
    error: questsError,
    claimQuest,
    refetch: refetchQuests,
  } = useQuests();
  const { profile: riskProfile, loading: riskLoading, error: riskError } = useRiskProfile(profile.achievoId);
  const [editing, setEditing] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [badgeError, setBadgeError] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [claimingQuest, setClaimingQuest] = useState(false);
  const [parties, setParties] = useState<PartyPreview[]>([]);
  const [partyFeed, setPartyFeed] = useState<PartyFeedItem[]>([]);
  const [partyError, setPartyError] = useState("");
  const [followStats, setFollowStats] = useState<{ followersCount: number; followingCount: number }>({
    followersCount: 0,
    followingCount: 0,
  });

  const avatarUri = (profile.avatar || "").trim();
  const avatarUrl = avatarUri ? ipfsToHttp(avatarUri) : "";

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  const fetchBadges = useCallback(async () => {
    if (!address) {
      setBadges([]);
      return;
    }
    setBadgesLoading(true);
    setBadgeError("");
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const includePrivacy = token ? "?includePrivacy=1" : "";
      const res = await fetch(`/api/achievo/badges/${address}${includePrivacy}`, { headers, credentials: "include" });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : [];
      const mapped = data.map((entry: any) => {
        if (typeof entry === "number") return { id: Number(entry) };
        return {
          id: Number(entry.tokenId ?? entry.id),
          visibility: entry.visibility,
          redaction: entry.redaction,
          unlistedPublicId: entry.unlistedPublicId,
        } as BadgeItem;
      });
      setBadges(mapped);
    } catch (e: any) {
      setBadgeError(e?.message || "Failed to load badges");
      setBadges([]);
    } finally {
      setBadgesLoading(false);
    }
  }, [address, token]);

  useEffect(() => {
    void fetchBadges();
  }, [fetchBadges]);

  useEffect(() => {
    if (!profile.achievoId) return;
    let active = true;
    const fetchStats = async () => {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/identity/${profile.achievoId}/follow-stats`, { headers, credentials: "include" });
      if (!res.ok) return;
      const json = await res.json();
      if (!active) return;
      setFollowStats({
        followersCount: Number(json.followersCount ?? 0),
        followingCount: Number(json.followingCount ?? 0),
      });
    };
    void fetchStats();
    return () => {
      active = false;
    };
  }, [profile.achievoId, token]);

  const filteredGoals = useMemo(() => {
    if (filter === "inProgress") return tasks.filter((g) => g.status === "SUBMITTED" || g.status === "PENDING_PEER");
    if (filter === "verified") return tasks.filter((g) => g.status === "VERIFIED");
    if (filter === "badged") return tasks.filter((g) => g.status === "BADGED");
    return tasks;
  }, [tasks, filter]);

  useEffect(() => {
    let active = true;
    const fetchParties = async () => {
      if (!token) {
        setParties([]);
        return;
      }
      try {
        const res = await fetch("/api/parties/me", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        if (!active) return;
        setParties(Array.isArray(json.data) ? json.data.slice(0, 3) : []);
      } catch (e: any) {
        if (!active) return;
        setPartyError(e?.message || "Failed to load parties");
      }
    };
    void fetchParties();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let active = true;
    const fetchFeed = async () => {
      if (!token) {
        setPartyFeed([]);
        return;
      }
      try {
        const res = await fetch("/api/parties/feed/me", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        if (!active) return;
        setPartyFeed(Array.isArray(json.data) ? json.data.slice(0, 3) : []);
      } catch (e: any) {
        if (!active) return;
        setPartyError(e?.message || "Failed to load party feed");
      }
    };
    void fetchFeed();
    return () => {
      active = false;
    };
  }, [token]);

  const loadingMetrics = !isLoaded;
  const showError = tasksError || badgeError || questsError || partyError;

  const handleRetry = () => {
    void reload();
    void refetchTasks();
    void refetchQuests();
  };

  // Avoid hydration mismatch between server render (no address) and client render (address available)
  if (!mounted) return null;

  if (!address) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-gray-600">Connect your wallet to see your profile and goals.</p>
      </div>
    );
  }

  const achIdLabel = profile.displayName || profile.achievoId || formatAchievoId(userId) || shortAchievoId(address);

  const handleClaimQuest = async (userQuestId: string) => {
    const toastId = toast.loading("Claiming quest reward...");
    setClaimingQuest(true);
    try {
      const result = await claimQuest(userQuestId);
      const xpGained = Number(result?.xpGained ?? 0);
      toast.success(`+${xpGained} XP`, { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Failed to claim quest", { id: toastId });
    } finally {
      setClaimingQuest(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2 rounded-3xl border bg-white p-6 space-y-3 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border">
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
            <div className="flex flex-col gap-1">
              <div className="text-xl font-semibold">{achIdLabel}</div>
              {profile.username && <div className="text-sm text-gray-600">@{profile.username.replace(/^@/, "")}</div>}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{profile.achievoId || formatAchievoId(userId) || "Unregistered"}</span>
                {profile.achievoId && (
                  <button
                    className="text-brand-600 hover:underline"
                    onClick={() => navigator.clipboard?.writeText(profile.achievoId)}
                    type="button"
                  >
                    Copy
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-500 break-all">{address}</div>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-1">Bio</div>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">
              {profile.bio !== undefined && profile.bio !== ""
                ? profile.bio
                : "No bio yet. Add a short summary in Edit profile."}
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold mb-1">About</div>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">
              {profile.about !== undefined && profile.about !== ""
                ? profile.about
                : "No about section yet. Tell your story in Edit profile."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing((v) => !v)}>
              {editing ? "Close editor" : "Edit profile"}
            </button>
            <Link href="/goals/new" className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm">
              Create new goal
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-4 space-y-3 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            {loadingMetrics ? (
              <>
                <SkeletonCard className="h-20" />
                <SkeletonCard className="h-20" />
                <SkeletonCard className="h-20" />
                <SkeletonCard className="h-20" />
              </>
            ) : (
              <>
                <MetricCard label="Goals" value={profile.goalsCount} subtitle="Total goals" />
                <MetricCard label="Verified" value={profile.verifiedGoalsCount} subtitle="Verified on-chain" />
                <MetricCard label="Badges" value={profile.badgesCount} subtitle="Minted badges" />
                <MetricCard label="Level" value={`Lv ${profile.level}`} subtitle={`${profile.totalXP} XP`} />
              </>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {followStats.followersCount} Followers · {followStats.followingCount} Following
          </div>
        </div>
      </section>

      {editing && isLoaded && (
        <div className="space-y-6">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <ProfileEditor
              profile={profile}
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
          </div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Professional Profile</h3>
              <p className="text-sm text-gray-500">Build a professional summary that powers your share links.</p>
            </div>
            {professionalLoading ? (
              <div className="text-sm text-gray-500">Loading professional profile...</div>
            ) : (
              <ProfessionalProfileEditor
                professional={professional}
                saving={professionalSaving}
                onSave={saveProfessional}
              />
            )}
          </div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm space-y-3">
            <div>
              <h3 className="text-lg font-semibold">Highlights</h3>
              <p className="text-sm text-gray-500">Pin your best goals, badges, and parties.</p>
            </div>
            <HighlightsEditor />
          </div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <ShareLinksManager />
          </div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm space-y-3">
            <div>
              <h3 className="text-lg font-semibold">Privacy</h3>
              <p className="text-sm text-gray-500">
                Control default visibility for your profile, proofs, and achievements.
              </p>
            </div>
            <PrivacySettingsEditor
              settings={privacySettings}
              overridesCount={overridesCount}
              loading={privacyLoading}
              error={privacyError}
              onSave={savePrivacySettings}
            />
          </div>
          <div className="rounded-3xl border bg-white p-6 shadow-sm space-y-3">
            <div>
              <h3 className="text-lg font-semibold">Security & Integrity</h3>
              <p className="text-sm text-gray-500">
                Unusual activity can reduce credibility scores without blocking your account.
              </p>
            </div>
            {!token ? (
              <div className="text-sm text-gray-500">Sign in to view your risk profile.</div>
            ) : riskLoading ? (
              <div className="text-sm text-gray-500">Loading risk profile...</div>
            ) : riskError ? (
              <div className="text-sm text-red-600">{riskError}</div>
            ) : !riskProfile ? (
              <div className="text-sm text-gray-500">Risk profile not available yet.</div>
            ) : !riskProfile.engineEnabled ? (
              <div className="text-sm text-gray-500">Risk engine is currently disabled.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Risk level</div>
                  <div className="text-lg font-semibold">{riskProfile.riskLevel}</div>
                </div>
                <div className="rounded-xl border bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Risk score</div>
                  <div className="text-lg font-semibold">{riskProfile.riskScore}</div>
                </div>
                {riskProfile.lastEvaluatedAt && (
                  <div className="text-xs text-gray-500 sm:col-span-2">
                    Last evaluated {formatTimeAgo(riskProfile.lastEvaluatedAt)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showError && (
        <div className="rounded-xl border bg-red-50 text-red-800 p-4 flex items-center justify-between">
          <div>{tasksError || badgeError || questsError}</div>
          <button className="px-3 py-1 rounded-md border border-red-200 text-sm" onClick={handleRetry}>
            Retry
          </button>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2 space-y-4">
          <QuestPanel
            title="Today's Quests"
            quests={dailyQuests.slice(0, 5)}
            loading={questsLoading}
            claiming={claimingQuest}
            onClaim={handleClaimQuest}
            emptyCopy="No daily quests yet. Check back later."
          />
          <QuestPanel
            title="Weekly Quests"
            quests={weeklyQuests.slice(0, 5)}
            loading={questsLoading}
            claiming={claimingQuest}
            onClaim={handleClaimQuest}
            emptyCopy="No weekly quests yet."
          />
          <QuestPanel
            title="Milestones"
            quests={milestoneQuests.slice(0, 5)}
            loading={questsLoading}
            claiming={claimingQuest}
            onClaim={handleClaimQuest}
            emptyCopy="Milestones will appear as you progress."
          />
        </div>
        <div className="space-y-4">
          <StreakCard current={streak.currentStreak} longest={streak.longestStreak} />
          <RecentActivity items={recentActivity} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2">
          <PartyFeedPreview items={partyFeed} />
        </div>
        <PartyWidget parties={parties} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-xl font-semibold">My Goals</h3>
          <div className="flex items-center gap-2 text-sm">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`rounded-full px-3 py-1 border ${filter === f.id ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-700"}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {tasksLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            <SkeletonCard className="h-32" />
            <SkeletonCard className="h-32" />
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="text-gray-500 text-sm">
            {filter === "inProgress"
              ? "No in-progress goals yet. Create a goal and submit evidence to start progress."
              : filter === "verified"
                ? "No verified goals yet."
                : filter === "badged"
                  ? "No badged goals yet."
                  : "No goals yet. Start by creating one."}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredGoals.map((g) => (
              <GoalListCard key={g.id} goal={g} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Badges</h3>
        </div>
        {badgesLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard className="h-24" />
            <SkeletonCard className="h-24" />
            <SkeletonCard className="h-24" />
          </div>
        ) : (
          <BadgeGrid badges={badges} showControls={Boolean(token)} onRefresh={fetchBadges} />
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, subtitle }: { label: string; value: string | number; subtitle: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  );
}
