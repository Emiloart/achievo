"use client";
import { useParams } from "next/navigation";

import { getApiErrorMessage } from "../../../../lib/apiError";
import { useEffect, useState } from "react";

const API_BASE = "/api";

type PublicInvoice = {
  invoice: {
    clientName: string;
    clientEmail?: string | null;
    clientAddress?: string | null;
    currency: string;
    issueDate: string;
    dueDate?: string | null;
    status: string;
    subtotalAmount: number;
    taxAmount: number;
    totalAmount: number;
    publicSlug?: string | null;
    publicTheme?: string | null;
  };
  project: { name: string };
  owner: {
    displayName: string;
    username?: string;
    achusrId: string;
    professionalProfile?: {
      headline?: string;
      location?: string;
      websiteUrl?: string;
      githubUrl?: string;
      xUrl?: string;
    };
  };
  lineItems: Array<{ description: string; quantity: number; unitAmount: number; totalAmount: number }>;
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function PublicInvoicePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const [data, setData] = useState<PublicInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const fetchInvoice = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/invoices/public/${slug}`, { credentials: "include" });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        if (!active) return;
        setData(json.data as PublicInvoice);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "Invoice not available");
      } finally {
        if (active) setLoading(false);
      }
    };
    if (slug) void fetchInvoice();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) return <div className="text-sm text-gray-500">Loading invoice...</div>;
  if (error) return <div className="text-sm text-gray-500">This invoice is not available or has expired.</div>;
  if (!data) return null;

  const theme = data.invoice.publicTheme || "AUTO";
  const themeClass =
    theme === "DARK"
      ? "bg-slate-900 text-slate-100"
      : theme === "LIGHT"
        ? "bg-white text-slate-900"
        : "bg-gray-50 text-slate-900";

  return (
    <div className={`min-h-screen ${themeClass}`}>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500">Invoice</div>
            <h1 className="text-2xl font-semibold">{data.project.name}</h1>
            <div className="text-sm text-gray-600">Status: {data.invoice.status}</div>
          </div>
          <div className="text-right text-sm text-gray-600">
            <div>Issue: {new Date(data.invoice.issueDate).toLocaleDateString()}</div>
            {data.invoice.dueDate && <div>Due: {new Date(data.invoice.dueDate).toLocaleDateString()}</div>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-4 text-sm text-gray-700">
            <div className="text-xs text-gray-500">From</div>
            <div className="font-semibold">{data.owner.displayName}</div>
            {data.owner.username && <div>@{data.owner.username}</div>}
            {data.owner.professionalProfile?.headline && <div>{data.owner.professionalProfile.headline}</div>}
            {data.owner.professionalProfile?.location && <div>{data.owner.professionalProfile.location}</div>}
          </div>
          <div className="rounded-2xl border bg-white p-4 text-sm text-gray-700">
            <div className="text-xs text-gray-500">Bill to</div>
            <div className="font-semibold">{data.invoice.clientName}</div>
            {data.invoice.clientEmail && <div>{data.invoice.clientEmail}</div>}
            {data.invoice.clientAddress && <div>{data.invoice.clientAddress}</div>}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm font-semibold mb-3">Line items</div>
          <div className="space-y-2 text-sm">
            {data.lineItems.map((item, idx) => (
              <div key={`${item.description}-${idx}`} className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{item.description}</div>
                  <div className="text-xs text-gray-500">
                    {item.quantity} x {formatCurrency(item.unitAmount, data.invoice.currency)}
                  </div>
                </div>
                <div className="font-semibold">{formatCurrency(item.totalAmount, data.invoice.currency)}</div>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-3 text-sm text-right space-y-1">
            <div>Subtotal: {formatCurrency(data.invoice.subtotalAmount, data.invoice.currency)}</div>
            <div>Tax: {formatCurrency(data.invoice.taxAmount, data.invoice.currency)}</div>
            <div className="font-semibold">
              Total: {formatCurrency(data.invoice.totalAmount, data.invoice.currency)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
