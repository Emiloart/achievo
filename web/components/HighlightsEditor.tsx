"use client";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { useBackendAuth } from "../hooks/useBackendAuth";
import { useProfilePins } from "../hooks/useProfilePins";
import { useUserTasks } from "../hooks/useUserTasks";

const API_BASE = "/api";
const MAX_PINS = 6;

type BadgeItem = { id: number };
type PartyItem = { id: string; name: string; slug: string; membersCount: number };

export function HighlightsEditor() {
  const { token } = useBackendAuth();
  const { address } = useAccount();
  const { tasks } = useUserTasks();
  const { pins, setPins, savePins, saving, loading } = useProfilePins();
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [parties, setParties] = useState<PartyItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"goals" | "badges" | "parties">("goals");

  useEffect(() => {
    if (!address) {
      setBadges([]);
      return;
    }
    const fetchBadges = async () => {
      const res = await fetch(`${API_BASE}/achievo/badges/${address}`);
      if (!res.ok) return;
      const json = await res.json();
      const data = Array.isArray(json.data) ? json.data : [];
      setBadges(data.map((id: any) => ({ id: Number(id) })));
    };
    void fetchBadges();
  }, [address]);

  useEffect(() => {
    if (!token) {
      setParties([]);
      return;
    }
    const fetchParties = async () => {
      const res = await fetch(`${API_BASE}/parties/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) return;
      const json = await res.json();
      setParties(Array.isArray(json.data) ? json.data : []);
    };
    void fetchParties();
  }, [token]);

  const verifiedGoals = useMemo(() => {
    return tasks.filter((goal) => goal.status === "VERIFIED" || goal.status === "BADGED");
  }, [tasks]);

  const addPin = (type: string, ref: string) => {
    if (pins.length >= MAX_PINS) {
      toast.error("You can pin up to 6 highlights");
      return;
    }
    if (pins.some((p) => p.type === type && p.ref === ref)) {
      toast.error("Already pinned");
      return;
    }
    setPins((prev) => [...prev, { id: `local-${type}-${ref}`, type, ref, position: prev.length } as any]);
  };

  const movePin = (index: number, direction: number) => {
    setPins((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  const removePin = (index: number) => {
    setPins((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    try {
      const payload = pins.map((pin) => ({ type: pin.type, ref: pin.ref }));
      await savePins(payload);
      toast.success("Highlights updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save highlights");
    }
  };

  if (!token) {
    return <div className="text-sm text-gray-500">Sign in to manage highlights.</div>;
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="text-sm text-gray-500">Loading highlights...</div>
      ) : pins.length ? (
        <div className="space-y-2">
          {pins.map((pin, index) => (
            <div
              key={`${pin.type}-${pin.ref}-${index}`}
              className="rounded-xl border bg-white p-3 flex items-center justify-between gap-2"
            >
              <div>
                <div className="text-sm font-semibold">{pinLabel(pin)}</div>
                <div className="text-xs text-gray-500">{pin.type}</div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="text-xs px-2 py-1 rounded border" onClick={() => movePin(index, -1)}>
                  Up
                </button>
                <button type="button" className="text-xs px-2 py-1 rounded border" onClick={() => movePin(index, 1)}>
                  Down
                </button>
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded border text-danger"
                  onClick={() => removePin(index)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500">No highlights pinned yet.</div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" className="px-3 py-2 rounded-md border" onClick={() => setShowPicker((v) => !v)}>
          {showPicker ? "Close picker" : "Add highlight"}
        </button>
        <button
          type="button"
          className="px-3 py-2 rounded-md bg-brand-600 text-white disabled:opacity-60"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save highlights"}
        </button>
      </div>

      {showPicker && (
        <div className="rounded-2xl border bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            {["goals", "badges", "parties"].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`px-3 py-1 rounded-full border ${activeTab === tab ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-700"}`}
                onClick={() => setActiveTab(tab as typeof activeTab)}
              >
                {tab === "goals" ? "Goals" : tab === "badges" ? "Badges" : "Parties"}
              </button>
            ))}
          </div>
          {activeTab === "goals" && (
            <div className="space-y-2">
              {verifiedGoals.length ? (
                verifiedGoals.map((goal) => (
                  <div key={goal.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{goal.goalCID || `Goal #${goal.id}`}</span>
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded border"
                      onClick={() => addPin("GOAL", String(goal.id))}
                    >
                      Add
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No verified goals yet.</div>
              )}
            </div>
          )}
          {activeTab === "badges" && (
            <div className="space-y-2">
              {badges.length ? (
                badges.map((badge) => (
                  <div key={badge.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>Badge #{badge.id}</span>
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded border"
                      onClick={() => addPin("BADGE", String(badge.id))}
                    >
                      Add
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No badges minted yet.</div>
              )}
            </div>
          )}
          {activeTab === "parties" && (
            <div className="space-y-2">
              {parties.length ? (
                parties.map((party) => (
                  <div key={party.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{party.name}</span>
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded border"
                      onClick={() => addPin("PARTY", party.id)}
                    >
                      Add
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No parties yet.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function pinLabel(pin: any) {
  if (pin.goal?.goalCID) return pin.goal.goalCID;
  if (pin.goal?.goalId) return `Goal #${pin.goal.goalId}`;
  if (pin.badge?.tokenId) return `Badge #${pin.badge.tokenId}`;
  if (pin.party?.name) return pin.party.name;
  return `${pin.type} ${pin.ref}`;
}
