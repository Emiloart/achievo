"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { usePublicProfessionalProfile } from "../../../../hooks/usePublicProfessionalProfile";
import { ipfsToHttp } from "../../../../lib/ipfs";
import { Badge, Card, CardBody, Section } from "../../../../components/ui";

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

export default function ProfessionalProfilePage() {
  const params = useParams<{ handle: string }>();
  const handle = params.handle || "";
  const { data, loading, error } = usePublicProfessionalProfile(handle);

  if (loading) {
    return <div className="text-textMuted text-sm">Loading professional profile...</div>;
  }
  if (error) {
    return <div className="text-textMuted text-sm">This professional profile is not available.</div>;
  }

  const { identity, professional, stats, highlights } = data;

  const backHref = identity.walletAddress ? `/profile/${identity.walletAddress}` : `/profile/${handle}`;

  return (
    <div className="space-y-8">
      <Link href={backHref as Route} className="text-xs text-accent hover:underline">
        Back to profile
      </Link>

      <Card>
        <CardBody className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="h-20 w-20 rounded-full overflow-hidden bg-surface2 border border-border">
            {identity.avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ipfsToHttp(identity.avatar)} alt="avatar" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="text-2xl font-semibold">{identity.displayName || identity.achusrId}</div>
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

      {professional.headline && (
        <Section title="Summary">
          <Card>
            <CardBody className="text-sm text-textMuted whitespace-pre-wrap">{professional.headline}</CardBody>
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
    </div>
  );
}
