"use client";
import Link from "next/link";

import { getApiErrorMessage } from "../lib/apiError";
import { useState, useEffect } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { coreAddress, coreAbi } from "../lib/contracts";
import { formatAchievoId } from "../lib/userId";
import { ipfsToHttp } from "../lib/ipfs";
import { useIdentityId } from "../hooks/useIdentity";
import { shortAchievoId } from "../lib/achievo";
import { Badge, Button, ButtonLink, Card, CardBody, Section } from "../components/ui";

type SearchResult = {
  achusrId: string;
  walletAddress: string;
  username: string;
  displayName: string;
  avatar: string;
  goalsCount?: number;
  badgesCount?: number;
  level?: number;
};

export default function HomePage() {
  const { address } = useAccount();
  const { userId } = useIdentityId(address as `0x${string}` | undefined);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  const { data } = useReadContracts({
    allowFailure: false,
    contracts: [
      { address: coreAddress, abi: coreAbi, functionName: "peerThreshold" },
      { address: coreAddress, abi: coreAbi, functionName: "nextGoalId" },
    ],
  });

  const thresholdRaw = data?.[0] as unknown as bigint | undefined;
  const threshold = thresholdRaw !== undefined ? Number(thresholdRaw) : undefined;
  const nextId = data?.[1] as unknown as bigint | undefined;

  // Avoid hydration mismatch by waiting for client mount before rendering wallet-dependent text
  if (!mounted) {
    return null;
  }

  const search = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Enter a username, Achievo ID, or wallet address");
      return;
    }
    setSearching(true);
    setError("");
    setResults([]);
    try {
      const res = await fetch(`/api/identity/search?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      const data = Array.isArray(json?.results) ? json.results : [];
      setResults(data);
      if (!data.length) {
        setError("No user found. Try a different username, Achievo ID, or wallet address.");
      }
    } catch (err: any) {
      setError(err?.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Badge variant="info">Trust-first credentials</Badge>
          <h1 className="text-4xl font-display leading-tight text-text">
            Achievo turns achievements into verifiable, shareable proof.
          </h1>
          <p className="text-sm text-textMuted">
            Issue canonical hashes, signatures, and optional on-chain anchors for proofs, validations, and exports.
            Build credibility without leaking private details.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/identity">Claim Achievo ID</ButtonLink>
            <ButtonLink href="/verify" variant="secondary">
              Verify a claim
            </ButtonLink>
          </div>
          <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-xs text-textMuted">
            {!address && "Connect your wallet to access dashboard features and mint proofs."}
            {address && !userId && "No Achievo ID for this wallet yet. Claim one to start anchoring."}
            {address && userId > 0n && (
              <span>
                Signed in as {formatAchievoId(userId)}.{" "}
                <Link className="underline text-accent" href="/dashboard">
                  Go to dashboard
                </Link>
              </span>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <Card>
            <CardBody className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-textMuted">Network telemetry</div>
              <div className="text-3xl font-semibold text-text">{threshold !== undefined ? threshold : "-"}</div>
              <div className="text-xs text-textMuted">Peer threshold required to approve a goal.</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-textMuted">Next goal id</div>
              <div className="text-3xl font-semibold text-text">{nextId?.toString() ?? "-"}</div>
              <div className="text-xs text-textMuted">New achievements increment this value.</div>
            </CardBody>
          </Card>
        </div>
      </section>

      <Section title="Lookup a profile" description="Search by @username, Achievo ID (ACHUSR-...), or wallet address.">
        <form
          className="flex flex-col gap-3 md:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by @username, ACHUSR-0000000001, or 0x..."
            className="flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <Button type="submit" disabled={searching}>
            {searching ? "Searching..." : "Search"}
          </Button>
        </form>
        {error && <div className="text-sm text-danger">{error}</div>}
        {results.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((r) => (
              <Card key={r.walletAddress}>
                <CardBody className="flex gap-4">
                  <div className="h-14 w-14 rounded-full border border-border bg-surface2 overflow-hidden">
                    {r.avatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ipfsToHttp(r.avatar)} alt="avatar" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold">
                      {r.displayName || r.username || shortAchievoId(r.walletAddress)}
                    </div>
                    <div className="text-xs text-textMuted">@{r.username || "-"}</div>
                    <div className="text-xs text-textMuted">ID: {r.achusrId || "-"}</div>
                    <div className="text-xs text-textMuted break-all">Wallet: {r.walletAddress}</div>
                    <div className="text-xs text-textMuted">
                      Goals: {r.goalsCount ?? 0} - Badges: {r.badgesCount ?? 0} - Level {r.level ?? 1}
                    </div>
                    <Link href={`/profile/${r.walletAddress}`} className="text-xs text-accent hover:underline">
                      View Profile &rarr;
                    </Link>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
