"use client";
import Link from "next/link";

import { getApiErrorMessage } from "../../lib/apiError";
import { useEffect, useState } from "react";
import { useBackendAuth } from "../../hooks/useBackendAuth";

type PartyCard = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  visibility: string;
  membersCount: number;
};

export default function PartiesPage() {
  const { token } = useBackendAuth();
  const [myParties, setMyParties] = useState<PartyCard[]>([]);
  const [discoverParties, setDiscoverParties] = useState<PartyCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const fetchMyParties = async () => {
      if (!token) {
        setMyParties([]);
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
        setMyParties(Array.isArray(json.data) ? json.data : []);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "Failed to load parties");
      }
    };
    void fetchMyParties();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let active = true;
    const fetchDiscover = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/parties/discover");
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        if (!active) return;
        setDiscoverParties(Array.isArray(json.data) ? json.data : []);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "Failed to load public parties");
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchDiscover();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold">Parties</h2>
          <p className="text-sm text-gray-500">Join crews, share wins, and stay accountable.</p>
        </div>
        <Link href="/parties/new" className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm">
          Create Party
        </Link>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{error}</div>}

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Your Parties</h3>
        {token ? (
          myParties.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {myParties.map((party) => (
                <PartyTile key={party.id} party={party} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">You are not part of any parties yet.</div>
          )
        ) : (
          <div className="text-sm text-gray-500">Sign in to see your parties.</div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Discover Parties</h3>
        {loading ? (
          <div className="text-sm text-gray-500">Loading parties...</div>
        ) : discoverParties.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {discoverParties.map((party) => (
              <PartyTile key={party.id} party={party} />
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">No public parties available yet.</div>
        )}
      </section>
    </div>
  );
}

function PartyTile({ party }: { party: PartyCard }) {
  return (
    <div className="rounded-2xl border bg-white p-5 space-y-2 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold">{party.name}</div>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{party.visibility}</span>
      </div>
      <div className="text-xs text-gray-500">@{party.slug}</div>
      {party.description && <div className="text-sm text-gray-600">{party.description}</div>}
      <div className="text-xs text-gray-500">{party.membersCount} members</div>
      <Link href={`/parties/${party.slug}`} className="text-sm text-brand-600 hover:underline">
        View party
      </Link>
    </div>
  );
}
