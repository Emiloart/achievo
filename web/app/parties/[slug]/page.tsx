"use client";
import { useParams } from "next/navigation";

import { getApiErrorMessage } from "../../../lib/apiError";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useBackendAuth } from "../../../hooks/useBackendAuth";

type PartyInfo = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  visibility: string;
  avatarUrl?: string;
  bannerUrl?: string;
  membersCount: number;
  isMember: boolean;
  role?: string | null;
};

type FeedItem = {
  id: string;
  summary: string;
  createdAt: string;
  actor?: { displayName?: string; username?: string; avatar?: string };
};

type MemberItem = {
  achusrId: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  role?: string;
  xpTotal?: number;
  currentStreak?: number;
};

type LeaderboardRow = {
  rank: number;
  achusrId: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  xpTotal?: number;
  level?: number;
  currentStreak?: number;
};

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

export default function PartyDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const { token } = useBackendAuth();
  const [party, setParty] = useState<PartyInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"feed" | "members" | "leaderboard">("feed");
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [leaderboardXp, setLeaderboardXp] = useState<LeaderboardRow[]>([]);
  const [leaderboardStreak, setLeaderboardStreak] = useState<LeaderboardRow[]>([]);
  const [inviteToken, setInviteToken] = useState("");
  const [inviteInput, setInviteInput] = useState("");

  const fetchParty = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/parties/${slug}`, { headers, credentials: "include" });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setParty(json.data);
    } catch (e: any) {
      setError(e?.message || "Failed to load party");
    } finally {
      setLoading(false);
    }
  }, [slug, token]);

  const fetchFeed = useCallback(async () => {
    if (!slug) return;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`/api/parties/${slug}/feed`, { headers, credentials: "include" });
    const json = res.ok ? await res.json() : { data: [] };
    setFeed(Array.isArray(json.data) ? json.data : []);
  }, [slug, token]);

  const fetchMembers = useCallback(async () => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`/api/parties/${slug}/members`, { headers, credentials: "include" });
    const json = res.ok ? await res.json() : { data: [] };
    setMembers(Array.isArray(json.data) ? json.data : []);
  }, [slug, token]);

  const fetchLeaderboards = useCallback(async () => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const [xpRes, streakRes] = await Promise.all([
      fetch(`/api/parties/${slug}/leaderboard/xp`, { headers, credentials: "include" }),
      fetch(`/api/parties/${slug}/leaderboard/streak`, { headers, credentials: "include" }),
    ]);
    const xpJson = xpRes.ok ? await xpRes.json() : { data: [] };
    const streakJson = streakRes.ok ? await streakRes.json() : { data: [] };
    setLeaderboardXp(Array.isArray(xpJson.data) ? xpJson.data : []);
    setLeaderboardStreak(Array.isArray(streakJson.data) ? streakJson.data : []);
  }, [slug, token]);

  useEffect(() => {
    void fetchParty();
  }, [fetchParty]);

  useEffect(() => {
    if (activeTab === "feed") void fetchFeed();
    if (activeTab === "members") void fetchMembers();
    if (activeTab === "leaderboard") void fetchLeaderboards();
  }, [activeTab, fetchFeed, fetchMembers, fetchLeaderboards]);

  const joinParty = async () => {
    if (!token) return;
    const res = await fetch(`/api/parties/${slug}/join`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (res.ok) await fetchParty();
  };

  const leaveParty = async () => {
    if (!token) return;
    const res = await fetch(`/api/parties/${slug}/leave`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (res.ok) await fetchParty();
  };

  const createInvite = async () => {
    if (!token) return;
    const res = await fetch(`/api/parties/${slug}/invites`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });
    if (!res.ok) return;
    const json = await res.json();
    setInviteToken(json.data?.token || "");
  };

  const acceptInvite = async () => {
    if (!token || !inviteInput.trim()) return;
    const tokenValue = inviteInput.trim();
    const res = await fetch(`/api/parties/invites/${tokenValue}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (res.ok) {
      setInviteInput("");
      await fetchParty();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/parties" className="text-sm text-brand-600 hover:underline">
          Back to parties
        </Link>
      </div>

      {error && <div className="rounded-md border border-danger/20 bg-danger/10 text-danger p-3 text-sm">{error}</div>}

      {loading || !party ? (
        <div className="text-gray-500 text-sm">Loading party...</div>
      ) : (
        <>
          <div className="rounded-3xl border bg-white p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-2xl font-semibold">{party.name}</div>
                <div className="text-xs text-gray-500">@{party.slug}</div>
              </div>
              <div className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{party.visibility}</div>
            </div>
            {party.description && <div className="text-sm text-gray-600">{party.description}</div>}
            <div className="text-sm text-gray-500">{party.membersCount} members</div>
            <div className="flex items-center gap-2">
              {!party.isMember ? (
                party.visibility === "PUBLIC" ? (
                  <button className="px-3 py-1 rounded-md bg-brand-600 text-white text-sm" onClick={joinParty}>
                    Join party
                  </button>
                ) : party.visibility === "INVITE_ONLY" ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={inviteInput}
                      onChange={(e) => setInviteInput(e.target.value)}
                      placeholder="Invite token"
                      className="rounded-md border px-2 py-1 text-sm"
                    />
                    <button className="px-3 py-1 rounded-md bg-brand-600 text-white text-sm" onClick={acceptInvite}>
                      Join with invite
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Private party</div>
                )
              ) : (
                <button className="px-3 py-1 rounded-md border text-sm" onClick={leaveParty}>
                  Leave party
                </button>
              )}
              {party.isMember && (party.role === "OWNER" || party.role === "ADMIN") && (
                <button className="px-3 py-1 rounded-md border text-sm" onClick={createInvite}>
                  Invite members
                </button>
              )}
            </div>
            {inviteToken && (
              <div className="text-xs text-gray-600">
                Invite token: <span className="font-mono">{inviteToken}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            {["feed", "members", "leaderboard"].map((tab) => (
              <button
                key={tab}
                className={`px-3 py-1 rounded-full border ${activeTab === tab ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-700"}`}
                onClick={() => setActiveTab(tab as typeof activeTab)}
              >
                {tab === "feed" ? "Feed" : tab === "members" ? "Members" : "Leaderboard"}
              </button>
            ))}
          </div>

          {activeTab === "feed" && (
            <div className="space-y-3">
              {feed.length ? (
                feed.map((item) => (
                  <div key={item.id} className="rounded-2xl border bg-white p-4 space-y-1">
                    <div className="text-sm font-semibold">
                      {(item.actor?.displayName || item.actor?.username || "Someone") + " " + item.summary}
                    </div>
                    <div className="text-xs text-gray-500">{formatTimeAgo(item.createdAt)}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No activity yet.</div>
              )}
            </div>
          )}

          {activeTab === "members" && (
            <div className="space-y-3">
              {members.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {members.map((member) => (
                    <div key={member.achusrId} className="rounded-2xl border bg-white p-4 space-y-1">
                      <div className="text-sm font-semibold">{member.displayName || member.achusrId}</div>
                      {member.username && <div className="text-xs text-gray-500">@{member.username}</div>}
                      <div className="text-xs text-gray-500">{member.role}</div>
                      <div className="text-xs text-gray-500">
                        XP {member.xpTotal ?? 0} | Streak {member.currentStreak ?? 0}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No members found.</div>
              )}
            </div>
          )}

          {activeTab === "leaderboard" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border bg-white p-4 space-y-2">
                <div className="text-sm font-semibold">XP Leaderboard</div>
                {leaderboardXp.length ? (
                  <div className="space-y-2 text-sm">
                    {leaderboardXp.map((row) => (
                      <div key={row.achusrId} className="flex items-center justify-between">
                        <span>
                          #{row.rank} {row.displayName || row.achusrId}
                        </span>
                        <span className="text-gray-500">
                          {row.xpTotal} XP | Lv {row.level}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No XP data yet.</div>
                )}
              </div>
              <div className="rounded-2xl border bg-white p-4 space-y-2">
                <div className="text-sm font-semibold">Streak Leaderboard</div>
                {leaderboardStreak.length ? (
                  <div className="space-y-2 text-sm">
                    {leaderboardStreak.map((row) => (
                      <div key={row.achusrId} className="flex items-center justify-between">
                        <span>
                          #{row.rank} {row.displayName || row.achusrId}
                        </span>
                        <span className="text-gray-500">{row.currentStreak} days</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No streak data yet.</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
