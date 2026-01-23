"use client";
import Link from "next/link";

import { getApiErrorMessage } from "../../../../../lib/apiError";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useBackendAuth } from "../../../../../hooks/useBackendAuth";

const API_BASE = "/api";

type InvoiceDetail = {
  invoice: {
    id: string;
    projectId: string;
    clientName: string;
    clientEmail?: string | null;
    clientAddress?: string | null;
    currency: string;
    issueDate: string;
    dueDate?: string | null;
    status: string;
    number?: string;
    subtotalAmount: number;
    taxAmount: number;
    totalAmount: number;
    publicSlug?: string | null;
    publicVisibility: string;
    publicTheme: string;
    publicExpiresAt?: string | null;
  };
  project: { slug: string; name: string };
  lineItems: Array<{
    id: string;
    description: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    linkedType?: string | null;
    linkedRef?: string | null;
  }>;
  timeEntries: Array<{
    id: string;
    goalId?: string | null;
    startedAt: string;
    endedAt?: string | null;
    durationMinutes?: number | null;
    note?: string | null;
    billable: boolean;
  }>;
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function InvoiceDetailPage() {
  const params = useParams<{ slug: string; invoiceId: string }>();
  const slug = params.slug || "";
  const invoiceId = params.invoiceId || "";
  const { token } = useBackendAuth();
  const [data, setData] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [publicForm, setPublicForm] = useState({
    slug: "",
    visibility: "UNLISTED",
    theme: "AUTO",
    expiresAt: "",
  });

  const fetchInvoice = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/projects/${slug}/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setData(json.data as InvoiceDetail);
      const invoice = json.data?.invoice;
      setPublicForm({
        slug: invoice?.publicSlug || "",
        visibility: invoice?.publicVisibility || "UNLISTED",
        theme: invoice?.publicTheme || "AUTO",
        expiresAt: invoice?.publicExpiresAt ? new Date(invoice.publicExpiresAt).toISOString().slice(0, 10) : "",
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [invoiceId, slug, token]);

  useEffect(() => {
    void fetchInvoice();
  }, [fetchInvoice]);

  const updateStatus = async (status: "SENT" | "PAID") => {
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/projects/${slug}/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      await fetchInvoice();
    } catch (e: any) {
      setError(e?.message || "Failed to update invoice");
    } finally {
      setSaving(false);
    }
  };

  const savePublic = async () => {
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        publicSlug: publicForm.slug || null,
        publicVisibility: publicForm.visibility,
        publicTheme: publicForm.theme,
        publicExpiresAt: publicForm.expiresAt ? new Date(publicForm.expiresAt).toISOString() : null,
      };
      const res = await fetch(`${API_BASE}/projects/${slug}/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      await fetchInvoice();
    } catch (e: any) {
      setError(e?.message || "Failed to update public link");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading invoice...</div>;
  }

  if (!data) {
    return <div className="text-sm text-gray-500">Invoice not found.</div>;
  }

  const { invoice, project, lineItems, timeEntries } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs text-gray-500">@{project.slug}</div>
          <h2 className="text-2xl font-semibold">Invoice {invoice.number || ""}</h2>
          <div className="text-sm text-gray-600">Status: {invoice.status}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/projects/${project.slug}` as Route} className="text-sm text-brand-600 hover:underline">
            Back to project
          </Link>
          {invoice.status === "DRAFT" && (
            <button
              onClick={() => updateStatus("SENT")}
              className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm"
            >
              Mark sent
            </button>
          )}
          {invoice.status === "SENT" && (
            <button
              onClick={() => updateStatus("PAID")}
              className="px-3 py-2 rounded-md bg-success text-onAccent text-sm"
            >
              Mark paid
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger">{error}</div>}

      <div className="rounded-2xl border bg-white p-5 space-y-3">
        <div className="text-sm font-semibold">Client</div>
        <div className="text-sm text-gray-700">
          <div>{invoice.clientName}</div>
          {invoice.clientEmail && <div>{invoice.clientEmail}</div>}
          {invoice.clientAddress && <div>{invoice.clientAddress}</div>}
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 space-y-3">
        <div className="text-sm font-semibold">Line items</div>
        <div className="space-y-2 text-sm">
          {lineItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{item.description}</div>
                <div className="text-xs text-gray-500">
                  {item.quantity} x {formatCurrency(item.unitAmount, invoice.currency)}
                </div>
              </div>
              <div className="font-semibold">{formatCurrency(item.totalAmount, invoice.currency)}</div>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 text-sm space-y-1 text-right">
          <div>Subtotal: {formatCurrency(invoice.subtotalAmount, invoice.currency)}</div>
          <div>Tax: {formatCurrency(invoice.taxAmount, invoice.currency)}</div>
          <div className="font-semibold">Total: {formatCurrency(invoice.totalAmount, invoice.currency)}</div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 space-y-3">
        <div className="text-sm font-semibold">Public link</div>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={publicForm.slug}
            onChange={(e) => setPublicForm({ ...publicForm, slug: e.target.value })}
            placeholder="Public slug"
            className="border rounded-md px-3 py-2 text-sm"
          />
          <select
            value={publicForm.visibility}
            onChange={(e) => setPublicForm({ ...publicForm, visibility: e.target.value })}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="UNLISTED">Unlisted</option>
            <option value="DISABLED">Disabled</option>
          </select>
          <select
            value={publicForm.theme}
            onChange={(e) => setPublicForm({ ...publicForm, theme: e.target.value })}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="AUTO">Auto</option>
            <option value="LIGHT">Light</option>
            <option value="DARK">Dark</option>
          </select>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="date"
            value={publicForm.expiresAt}
            onChange={(e) => setPublicForm({ ...publicForm, expiresAt: e.target.value })}
            className="border rounded-md px-3 py-2 text-sm"
          />
          {invoice.publicSlug && (
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  void navigator.clipboard.writeText(`${window.location.origin}/invoices/public/${invoice.publicSlug}`);
                }
              }}
              className="text-sm text-gray-600"
            >
              Copy public link
            </button>
          )}
        </div>
        <button onClick={savePublic} disabled={saving} className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm">
          Save public settings
        </button>
      </div>

      {timeEntries.length > 0 && (
        <div className="rounded-2xl border bg-white p-5 space-y-3">
          <div className="text-sm font-semibold">Linked time entries</div>
          <div className="space-y-2 text-xs text-gray-600">
            {timeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{entry.goalId ? `Goal #${entry.goalId}` : "General"}</div>
                  <div>{new Date(entry.startedAt).toLocaleString()}</div>
                </div>
                <div>{entry.durationMinutes ? `${entry.durationMinutes}m` : "-"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
