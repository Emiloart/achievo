"use client";
import { useParams } from "next/navigation";

import { getApiErrorMessage } from "../../../lib/apiError";
import { useEffect, useMemo, useState } from "react";
import { ipfsToHttp } from "../../../lib/ipfs";
import { Badge, Card, CardBody, EmptyState, Section } from "../../../components/ui";

type ShareLinkResponse = {
  link: {
    slug: string;
    title: string;
    description?: string | null;
    theme: string;
    visibility: string;
    sections: Record<string, boolean>;
    expiresAt?: string | null;
  };
  identity: {
    achusrId: string;
    username?: string;
    displayName?: string;
    avatar?: string;
    walletAddress?: string;
  };
  professional: any;
  stats: any;
  highlights: { pinnedItems: any[] };
  sectionsData?: {
    goals?: any[];
    badges?: any[];
    parties?: any[];
    activity?: any[];
  };
};

const API_BASE = "/api";

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

export default function ShareLinkPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const [data, setData] = useState<ShareLinkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const fetchLink = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/share-links/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        if (!active) return;
        setData(json);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "This profile link is not available or has expired.");
        setData(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchLink();
    return () => {
      active = false;
    };
  }, [slug]);

  const themeAttr = useMemo(() => {
    if (!data?.link?.theme || data.link.theme === "AUTO") return undefined;
    if (data.link.theme === "DARK") return "dark";
    return "light";
  }, [data]);

  if (loading) {
    return <div className="text-textMuted text-sm">Loading profile...</div>;
  }
  if (error || !data) {
    return (
      <EmptyState title="Share link not available" description="This profile link is not available or has expired." />
    );
  }

  const { link, identity, professional, stats, highlights, sectionsData } = data;
  const sections = link.sections || {};
  const goals = Array.isArray(sectionsData?.goals) ? sectionsData.goals : [];
  const badges = Array.isArray(sectionsData?.badges) ? sectionsData.badges : [];
  const parties = Array.isArray(sectionsData?.parties) ? sectionsData.parties : [];
  const activity = Array.isArray(sectionsData?.activity) ? sectionsData.activity : [];

  return (
    <div data-theme={themeAttr} className="rounded-3xl border border-border bg-surface p-6 space-y-8">
      <div className="space-y-2">
        <div className="text-xs text-textMuted">Shared profile</div>
        <div className="text-xl font-semibold">{link.title || "Profile share"}</div>
        {link.description && <div className="text-sm text-textMuted">{link.description}</div>}
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-center gap-4">
          <div className="h-16 w-16 rounded-full overflow-hidden border border-border bg-surface2">
            {identity.avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ipfsToHttp(identity.avatar)} alt="avatar" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <div className="text-lg font-semibold">{identity.displayName || identity.achusrId}</div>
            {identity.username && <div className="text-sm text-textMuted">@{identity.username.replace(/^@/, "")}</div>}
            <div className="text-xs text-textMuted">{identity.achusrId}</div>
            {professional.headline && <div className="text-sm text-textMuted">{professional.headline}</div>}
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
          <Badge variant="neutral">{availabilityLabel(professional.availability)}</Badge>
        </CardBody>
      </Card>

      {(sections.summary || sections.streak) && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardBody>
              <div className="text-xs text-textMuted">Level</div>
              <div className="text-lg font-semibold">Lv {stats.level ?? 1}</div>
              <div className="text-xs text-textMuted">{stats.xpTotal ?? 0} XP</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-xs text-textMuted">Streak</div>
              <div className="text-lg font-semibold">{stats.currentStreak ?? 0} days</div>
              <div className="text-xs text-textMuted">Best {stats.longestStreak ?? 0}</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-xs text-textMuted">Goals completed</div>
              <div className="text-lg font-semibold">{stats.goalsCompleted ?? 0}</div>
              <div className="text-xs text-textMuted">{stats.badgesCount ?? 0} badges</div>
            </CardBody>
          </Card>
        </div>
      )}

      {sections.summary && professional.bioShort && (
        <Section title="Summary">
          <Card>
            <CardBody className="text-sm text-textMuted whitespace-pre-wrap">{professional.bioShort}</CardBody>
          </Card>
        </Section>
      )}

      {highlights?.pinnedItems?.length > 0 && (
        <Section title="Highlights">
          <div className="grid gap-3 md:grid-cols-2">
            {highlights.pinnedItems.map((item: any) => (
              <HighlightCard key={`${item.type}-${item.ref}-${item.id}`} item={item} />
            ))}
          </div>
        </Section>
      )}

      {sections.skills && professional.skills?.length > 0 && (
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

      {sections.skills && professional.industries?.length > 0 && (
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

      {sections.goals && goals.length > 0 && (
        <Section title="Verified goals">
          <div className="grid gap-3 md:grid-cols-2">
            {goals.map((goal: any) => (
              <Card key={goal.goalId}>
                <CardBody className="space-y-1">
                  <div className="text-sm font-semibold">{goal.goalCID || `Goal #${goal.goalId}`}</div>
                  <div className="text-xs text-textMuted">Level {goal.level}</div>
                </CardBody>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {sections.badges && badges.length > 0 && (
        <Section title="Badges">
          <div className="grid gap-3 md:grid-cols-3">
            {badges.map((badge: any) => (
              <Card key={badge.tokenId}>
                <CardBody className="text-sm">Badge #{badge.tokenId}</CardBody>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {sections.parties && parties.length > 0 && (
        <Section title="Parties">
          <div className="grid gap-3 md:grid-cols-2">
            {parties.map((party: any) => (
              <Card key={party.id}>
                <CardBody className="space-y-1">
                  <div className="text-sm font-semibold">{party.name}</div>
                  <div className="text-xs text-textMuted">@{party.slug}</div>
                </CardBody>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {sections.activity && activity.length > 0 && (
        <Section title="Recent activity">
          <div className="space-y-2">
            {activity.map((item: any) => (
              <Card key={item.id}>
                <CardBody className="text-sm">
                  <div className="font-semibold">{item.summary}</div>
                </CardBody>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {sections.contact && (
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
    </div>
  );
}
