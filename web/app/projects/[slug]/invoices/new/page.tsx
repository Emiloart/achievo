"use client";
import Link from "next/link";

import { getApiErrorMessage } from "../../../../../lib/apiError";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useBackendAuth } from "../../../../../hooks/useBackendAuth";

const API_BASE = "/api";

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitAmount: number;
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function NewInvoicePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug || "";
  const { token } = useBackendAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [publicVisibility, setPublicVisibility] = useState("UNLISTED");
  const [publicTheme, setPublicTheme] = useState("AUTO");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "line-1", description: "", quantity: 1, unitAmount: 0 },
  ]);

  useEffect(() => {
    let active = true;
    const loadBilling = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/projects/${slug}/billing/settings`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!active) return;
        const data = json.data || {};
        if (data.currency) setCurrency(data.currency);
        if (data.defaultDueDays) {
          const due = new Date(Date.now() + Number(data.defaultDueDays) * 86400000);
          setDueDate(due.toISOString().slice(0, 10));
        }
      } catch {
        // ignore defaults
      }
    };
    void loadBilling();
    return () => {
      active = false;
    };
  }, [token, slug]);

  const updateLineItem = (id: string, patch: Partial<LineItem>) => {
    setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { id: `line-${prev.length + 1}`, description: "", quantity: 1, unitAmount: 0 }]);
  };

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totals = lineItems.reduce((sum, item) => sum + item.quantity * item.unitAmount, 0);

  const createInvoice = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const payload = {
        clientName,
        clientEmail: clientEmail || null,
        clientAddress: clientAddress || null,
        currency,
        issueDate: issueDate ? new Date(issueDate).toISOString() : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        notes,
        publicSlug: publicSlug || null,
        publicVisibility,
        publicTheme,
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitAmount: item.unitAmount,
          linkedType: "CUSTOM",
        })),
      };
      const res = await fetch(`${API_BASE}/projects/${slug}/invoices`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      if (json.data?.invoice?.id) {
        router.push(`/projects/${slug}/invoices/${json.data.invoice.id}` as Route);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">@{slug}</div>
          <h2 className="text-2xl font-semibold">Create invoice</h2>
        </div>
        <Link href={`/projects/${slug}` as Route} className="text-sm text-brand-600 hover:underline">
          Back to project
        </Link>
      </div>

      {error && <div className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger">{error}</div>}

      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="text-sm font-semibold">Client</div>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Client name"
            className="border rounded-md px-3 py-2 text-sm"
          />
          <input
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="Client email"
            className="border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={clientAddress}
          onChange={(e) => setClientAddress(e.target.value)}
          placeholder="Client address"
          className="border rounded-md px-3 py-2 text-sm"
          rows={2}
        />
      </div>

      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="text-sm font-semibold">Invoice details</div>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="Currency"
            className="border rounded-md px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes"
          className="border rounded-md px-3 py-2 text-sm"
          rows={2}
        />
      </div>

      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Line items</div>
          <button onClick={addLineItem} className="text-xs px-2 py-1 rounded-md border">
            Add line
          </button>
        </div>
        <div className="space-y-3">
          {lineItems.map((item) => (
            <div key={item.id} className="grid gap-2 md:grid-cols-12 items-center">
              <input
                value={item.description}
                onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                placeholder="Description"
                className="border rounded-md px-2 py-2 text-sm md:col-span-6"
              />
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateLineItem(item.id, { quantity: Number(e.target.value) })}
                className="border rounded-md px-2 py-2 text-sm md:col-span-2"
              />
              <input
                type="number"
                value={item.unitAmount}
                onChange={(e) => updateLineItem(item.id, { unitAmount: Number(e.target.value) })}
                className="border rounded-md px-2 py-2 text-sm md:col-span-2"
              />
              <div className="text-sm md:col-span-1">{formatCurrency(item.quantity * item.unitAmount, currency)}</div>
              <button onClick={() => removeLineItem(item.id)} className="text-xs text-danger md:col-span-1">
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="text-right text-sm font-semibold">Subtotal: {formatCurrency(totals, currency)}</div>
      </div>

      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="text-sm font-semibold">Public link</div>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={publicSlug}
            onChange={(e) => setPublicSlug(e.target.value)}
            placeholder="Public slug"
            className="border rounded-md px-3 py-2 text-sm"
          />
          <select
            value={publicVisibility}
            onChange={(e) => setPublicVisibility(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="UNLISTED">Unlisted</option>
            <option value="DISABLED">Disabled</option>
          </select>
          <select
            value={publicTheme}
            onChange={(e) => setPublicTheme(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="AUTO">Auto</option>
            <option value="LIGHT">Light</option>
            <option value="DARK">Dark</option>
          </select>
        </div>
      </div>

      <button
        onClick={createInvoice}
        disabled={loading}
        className="px-4 py-2 rounded-md bg-brand-600 text-white text-sm"
      >
        {loading ? "Creating..." : "Create invoice"}
      </button>
    </div>
  );
}
