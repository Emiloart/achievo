"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Button, DataTable, StatusPill } from "../../ui";
import { EmptyState } from "../../states/EmptyState";
import { ErrorState } from "../../states/ErrorState";
import { LoadingState } from "../../states/LoadingState";
import { UI_LABELS } from "../../../lib/uiCopy";

export type InvoiceItem = {
  id: string;
  number?: string;
  clientName: string;
  currency: string;
  issueDate: string;
  dueDate?: string | null;
  status: string;
  totalAmount: number;
  publicSlug?: string | null;
};

export type InvoiceTableProps = {
  projectSlug: string;
  invoices: InvoiceItem[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onMarkSent: (invoiceId: string) => void;
  onMarkPaid: (invoiceId: string) => void;
  busyId?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function InvoiceTable({
  projectSlug,
  invoices,
  loading,
  error,
  onRetry,
  onMarkSent,
  onMarkPaid,
  busyId,
}: InvoiceTableProps) {
  const columns = useMemo(
    () => [
      {
        key: "invoice",
        label: "Invoice",
        render: (row: InvoiceItem) => (
          <div>
            <div className="text-sm font-semibold">{row.number || row.clientName}</div>
            <div className="text-xs text-textMuted">{row.clientName}</div>
          </div>
        ),
      },
      {
        key: "dates",
        label: "Dates",
        render: (row: InvoiceItem) => (
          <div className="text-xs text-textMuted">
            {formatDate(row.issueDate)}
            {row.dueDate ? ` to ${formatDate(row.dueDate)}` : ""}
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (row: InvoiceItem) => <StatusPill status={row.status} />,
      },
      {
        key: "total",
        label: "Total",
        render: (row: InvoiceItem) => <span className="text-sm">{formatCurrency(row.totalAmount, row.currency)}</span>,
      },
      {
        key: "actions",
        label: "Actions",
        render: (row: InvoiceItem) => (
          <div className="flex flex-wrap gap-2">
            <Link href={`/projects/${projectSlug}/invoices/${row.id}` as Route} className="text-xs text-accent">
              View
            </Link>
            {row.publicSlug ? (
              <button
                type="button"
                className="text-xs text-textMuted"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    void navigator.clipboard.writeText(`${window.location.origin}/invoices/public/${row.publicSlug}`);
                  }
                }}
              >
                Copy link
              </button>
            ) : null}
            {row.status === "DRAFT" ? (
              <Button size="sm" variant="ghost" onClick={() => onMarkSent(row.id)} disabled={busyId === row.id}>
                {UI_LABELS.markSent}
              </Button>
            ) : null}
            {row.status === "SENT" ? (
              <Button size="sm" variant="ghost" onClick={() => onMarkPaid(row.id)} disabled={busyId === row.id}>
                {UI_LABELS.markPaid}
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [busyId, onMarkPaid, onMarkSent, projectSlug],
  );

  if (loading) {
    return <LoadingState title="Loading invoices" description="Fetching invoice history." rows={3} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (!invoices.length) {
    return (
      <EmptyState
        title="No invoices yet"
        description="Create an invoice to track client payments."
        primaryAction={{ label: UI_LABELS.createInvoice, href: `/projects/${projectSlug}/invoices/new` }}
      />
    );
  }

  return <DataTable columns={columns} rows={invoices} />;
}


