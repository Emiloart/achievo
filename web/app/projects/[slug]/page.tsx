"use client";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "../../../lib/apiError";
import { useBackendAuth } from "../../../hooks/useBackendAuth";
import { useUserTasks } from "../../../hooks/useUserTasks";
import { PageHeader } from "../../../components/nav/PageHeader";
import { projectBreadcrumbs } from "../../../components/nav/breadcrumbs";
import { DegradedHint } from "../../../components/states/DegradedHint";
import { EmptyState } from "../../../components/states/EmptyState";
import { ErrorState } from "../../../components/states/ErrorState";
import { LoadingState } from "../../../components/states/LoadingState";
import { AuthRequired } from "../../../components/states/AuthRequired";
import { ProjectTabs } from "../../../components/domain/projects/ProjectTabs";
import { InvoiceTable, type InvoiceItem as InvoiceRow } from "../../../components/domain/projects/InvoiceTable";
import {
  ProjectShareLinksManager,
  type ProjectShareLink,
  type ShareLinkPayload,
} from "../../../components/domain/projects/ProjectShareLinksManager";
import { TimeEntryTable, type TimeEntryItem as TimeEntryRow } from "../../../components/domain/projects/TimeEntryTable";
import { Button, Card, CardBody, Input, Select, Section, StatusPill, TableFilters, Textarea, uiToast } from "../../../components/ui";
import { UI_LABELS } from "../../../lib/uiCopy";

const API_BASE = "/api";

type ProjectInfo = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  status: string;
  visibility: string;
  clientName?: string | null;
  clientReference?: string | null;
  dueDate?: string | null;
  linkedPartyId?: string | null;
  ownerAchusrId: string;
};

type ProjectResponse = {
  project: ProjectInfo;
  membership: { role: string; status: string } | null;
  stats: { goalsTotal: number; goalsVerified: number; completionPercent: number; membersCount?: number };
};

type ProjectGoal = {
  goalId: string;
  creator: string;
  goalCID: string;
  level: number;
  createdAt: number;
  verifiedAt: number;
  status: string;
};

type TimeSummary = {
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
};

type BillingSettings = {
  billingModel: string;
  currency: string;
  hourlyRateAmount: number | null;
  fixedFeeAmount: number | null;
  taxPercent: number | null;
  defaultDueDays: number | null;
  notes: string;
};

type MemberItem = {
  achusrId: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  role?: string;
  xpTotal?: number;
  level?: number;
  currentStreak?: number;
};

type ActivityItem = {
  id: string;
  summary: string;
  createdAt: string;
  actor?: { displayName?: string; username?: string; avatar?: string };
};

const TAB_LIST = ["overview", "time", "invoices", "share"] as const;

type TabKey = (typeof TAB_LIST)[number];

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

function formatTimestamp(epoch?: number) {
  if (!epoch) return "";
  const date = new Date(epoch * 1000);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function formatMinutes(totalMinutes?: number | null) {
  if (!totalMinutes) return "0h";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatCurrency(amount: number | null | undefined, currency: string) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "-";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function ProjectDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const { token } = useBackendAuth();
  const { tasks } = useUserTasks();
  const [projectData, setProjectData] = useState<ProjectResponse | null>(null);
  const [goals, setGoals] = useState<ProjectGoal[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [shareLinks, setShareLinks] = useState<ProjectShareLink[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryRow[]>([]);
  const [timeSummary, setTimeSummary] = useState<TimeSummary>({
    totalMinutes: 0,
    billableMinutes: 0,
    nonBillableMinutes: 0,
  });
  const [timeLoading, setTimeLoading] = useState(false);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);
  const [billingSaving, setBillingSaving] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [busyInvoiceId, setBusyInvoiceId] = useState<string | null>(null);
  const [timeFilters, setTimeFilters] = useState({
    from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    mine: true,
    billable: "",
  });
  const [timerForm, setTimerForm] = useState({ goalId: "", note: "", billable: true });
  const [manualForm, setManualForm] = useState({
    id: "",
    goalId: "",
    startedAt: "",
    endedAt: "",
    note: "",
    billable: true,
  });
  const [showManualForm, setShowManualForm] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    from: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    onlyBillable: true,
    grouping: "SINGLE_LINE",
  });

  const [settingsForm, setSettingsForm] = useState({
    name: "",
    description: "",
    status: "ACTIVE",
    visibility: "PRIVATE",
    clientName: "",
    clientReference: "",
    dueDate: "",
  });

  const [shareActionError, setShareActionError] = useState("");
  const [memberHandle, setMemberHandle] = useState("");
  const [memberRole, setMemberRole] = useState("COLLABORATOR");

  const isOwner = projectData?.membership?.role === "OWNER";
  const canEditGoals = projectData?.membership?.role === "OWNER" || projectData?.membership?.role === "COLLABORATOR";

  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/projects/${slug}`, { headers, credentials: "include" });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      const data = json.data as ProjectResponse;
      setProjectData(data);
      setSettingsForm({
        name: data.project.name || "",
        description: data.project.description || "",
        status: data.project.status || "ACTIVE",
        visibility: data.project.visibility || "PRIVATE",
        clientName: data.project.clientName || "",
        clientReference: data.project.clientReference || "",
        dueDate: data.project.dueDate ? data.project.dueDate.slice(0, 10) : "",
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load project");
      setProjectData(null);
    } finally {
      setLoading(false);
    }
  }, [slug, token]);

  const fetchGoals = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/projects/${slug}/goals`, { headers, credentials: "include" });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      const data = Array.isArray(json.data?.goals) ? json.data.goals : [];
      setGoals(data);
    } catch {
      setGoals([]);
    }
  }, [slug, token]);

  const fetchMembers = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/projects/${slug}/members`, { headers, credentials: "include" });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setMembers(Array.isArray(json.data) ? json.data : []);
    } catch {
      setMembers([]);
    }
  }, [slug, token]);

  const fetchActivity = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/projects/${slug}/activity`, { headers, credentials: "include" });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setActivity(Array.isArray(json.data) ? json.data : []);
    } catch {
      setActivity([]);
    }
  }, [slug, token]);

  const fetchShareLinks = useCallback(async () => {
    if (!token) return;
    try {
      setShareActionError("");
      const res = await fetch(`${API_BASE}/projects/${slug}/share-links`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setShareLinks(Array.isArray(json.data) ? json.data : []);
    } catch {
      setShareLinks([]);
      setShareActionError("Unable to load share links.");
    }
  }, [slug, token]);

  const fetchTimeEntries = useCallback(async () => {
    if (!token) return;
    setTimeLoading(true);
    try {
      const params = new URLSearchParams();
      if (timeFilters.from) params.set("from", new Date(`${timeFilters.from}T00:00:00Z`).toISOString());
      if (timeFilters.to) params.set("to", new Date(`${timeFilters.to}T23:59:59Z`).toISOString());
      params.set("mine", timeFilters.mine ? "true" : "false");
      if (timeFilters.billable) params.set("billable", timeFilters.billable);
      const res = await fetch(`${API_BASE}/projects/${slug}/time-entries?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      const data = json.data || {};
      setTimeEntries(Array.isArray(data.entries) ? data.entries : []);
      setTimeSummary(data.summary || { totalMinutes: 0, billableMinutes: 0, nonBillableMinutes: 0 });
    } catch (e: any) {
      setTimeEntries([]);
      setTimeSummary({ totalMinutes: 0, billableMinutes: 0, nonBillableMinutes: 0 });
      setInvoiceError(e?.message || "Failed to load time entries");
    } finally {
      setTimeLoading(false);
    }
  }, [slug, timeFilters, token]);

  const fetchBillingSettings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/projects/${slug}/billing/settings`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setBillingSettings(json.data as BillingSettings);
    } catch {
      setBillingSettings(null);
    }
  }, [slug, token]);

  const fetchInvoices = useCallback(async () => {
    if (!token) return;
    setInvoiceLoading(true);
    setInvoiceError("");
    try {
      const res = await fetch(`${API_BASE}/projects/${slug}/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setInvoices(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setInvoices([]);
      setInvoiceError(e?.message || "Failed to load invoices");
    } finally {
      setInvoiceLoading(false);
    }
  }, [slug, token]);

  const startTimer = async () => {
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      const payload: any = {
        note: timerForm.note || undefined,
        billable: timerForm.billable,
      };
      if (timerForm.goalId) payload.goalId = timerForm.goalId;
      const res = await fetch(`${API_BASE}/projects/${slug}/time-entries/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      setTimerForm({ goalId: "", note: "", billable: true });
      await fetchTimeEntries();
    } catch (e: any) {
      setError(e?.message || "Failed to start timer");
    } finally {
      setSaving(false);
    }
  };

  const stopTimer = async (entryId: string) => {
    if (!token) return;
    setSaving(true);
    setBusyEntryId(entryId);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/projects/${slug}/time-entries/${entryId}/stop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      await fetchTimeEntries();
    } catch (e: any) {
      setError(e?.message || "Failed to stop timer");
    } finally {
      setSaving(false);
      setBusyEntryId(null);
    }
  };

  const openManualForm = (entry?: TimeEntryRow) => {
    if (entry) {
      setManualForm({
        id: entry.id,
        goalId: entry.goalId || "",
        startedAt: entry.startedAt ? new Date(entry.startedAt).toISOString().slice(0, 16) : "",
        endedAt: entry.endedAt ? new Date(entry.endedAt).toISOString().slice(0, 16) : "",
        note: entry.note || "",
        billable: entry.billable,
      });
    } else {
      setManualForm({
        id: "",
        goalId: "",
        startedAt: "",
        endedAt: "",
        note: "",
        billable: true,
      });
    }
    setShowManualForm(true);
  };

  const saveManualEntry = async () => {
    if (!token) return;
    if (!manualForm.startedAt || !manualForm.endedAt) {
      setError("Start and end times are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: any = {
        goalId: manualForm.goalId || undefined,
        startedAt: new Date(manualForm.startedAt).toISOString(),
        endedAt: new Date(manualForm.endedAt).toISOString(),
        note: manualForm.note || undefined,
        billable: manualForm.billable,
      };
      const endpoint = manualForm.id
        ? `${API_BASE}/projects/${slug}/time-entries/${manualForm.id}`
        : `${API_BASE}/projects/${slug}/time-entries`;
      const method = manualForm.id ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      setShowManualForm(false);
      setManualForm({ id: "", goalId: "", startedAt: "", endedAt: "", note: "", billable: true });
      await fetchTimeEntries();
    } catch (e: any) {
      setError(e?.message || "Failed to save time entry");
    } finally {
      setSaving(false);
    }
  };

  const deleteTimeEntry = async (entryId: string) => {
    if (!token) return;
    setSaving(true);
    setBusyEntryId(entryId);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/projects/${slug}/time-entries/${entryId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      await fetchTimeEntries();
    } catch (e: any) {
      setError(e?.message || "Failed to delete time entry");
    } finally {
      setSaving(false);
      setBusyEntryId(null);
    }
  };

  const saveBillingSettings = async () => {
    if (!token || !billingSettings) return;
    setBillingSaving(true);
    setError("");
    try {
      const payload = {
        billingModel: billingSettings.billingModel,
        currency: billingSettings.currency,
        hourlyRateAmount: billingSettings.hourlyRateAmount,
        fixedFeeAmount: billingSettings.fixedFeeAmount,
        taxPercent: billingSettings.taxPercent,
        defaultDueDays: billingSettings.defaultDueDays,
        notes: billingSettings.notes,
      };
      const res = await fetch(`${API_BASE}/projects/${slug}/billing/settings`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setBillingSettings(json.data as BillingSettings);
    } catch (e: any) {
      setError(e?.message || "Failed to update billing settings");
    } finally {
      setBillingSaving(false);
    }
  };

  const generateInvoice = async () => {
    if (!token) return;
    setGeneratingInvoice(true);
    setInvoiceError("");
    try {
      const payload = {
        from: new Date(`${generateForm.from}T00:00:00Z`).toISOString(),
        to: new Date(`${generateForm.to}T23:59:59Z`).toISOString(),
        onlyBillable: generateForm.onlyBillable,
        grouping: generateForm.grouping,
      };
      const res = await fetch(`${API_BASE}/projects/${slug}/invoices/generate-from-time`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      await fetchInvoices();
      if (json.data?.invoice?.id) {
        window.location.href = `/projects/${slug}/invoices/${json.data.invoice.id}` as Route;
      }
    } catch (e: any) {
      setInvoiceError(e?.message || "Failed to generate invoice");
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, status: "SENT" | "PAID") => {
    if (!token) return;
    setSaving(true);
    setBusyInvoiceId(invoiceId);
    setInvoiceError("");
    try {
      const res = await fetch(`${API_BASE}/projects/${slug}/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      await fetchInvoices();
    } catch (e: any) {
      setInvoiceError(e?.message || "Failed to update invoice status");
    } finally {
      setSaving(false);
      setBusyInvoiceId(null);
    }
  };

  useEffect(() => {
    if (slug) void fetchProject();
  }, [fetchProject, slug]);

  useEffect(() => {
    if (activeTab === "overview") {
      void fetchGoals();
      void fetchMembers();
      void fetchActivity();
      void fetchInvoices();
      void fetchTimeEntries();
    }
    if (activeTab === "time") {
      void fetchGoals();
      void fetchTimeEntries();
      void fetchBillingSettings();
    }
    if (activeTab === "invoices") {
      void fetchInvoices();
    }
    if (activeTab === "share" && isOwner) {
      void fetchShareLinks();
    }
  }, [
    activeTab,
    fetchActivity,
    fetchBillingSettings,
    fetchGoals,
    fetchInvoices,
    fetchMembers,
    fetchShareLinks,
    fetchTimeEntries,
    isOwner,
  ]);

  useEffect(() => {
    if (activeTab === "time") void fetchTimeEntries();
  }, [activeTab, fetchTimeEntries]);

  const toggleGoal = (goalId: string) => {
    setSelectedGoalIds((prev) => (prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]));
  };

  const attachSelectedGoals = async () => {
    if (!token || !selectedGoalIds.length) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${slug}/goals`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ goalIds: selectedGoalIds }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      await fetchGoals();
      setSelectedGoalIds([]);
    } catch (e: any) {
      setError(e?.message || "Failed to attach goals");
    } finally {
      setSaving(false);
    }
  };

  const detachGoal = async (goalId: string) => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${slug}/goals/${goalId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      await fetchGoals();
    } catch (e: any) {
      setError(e?.message || "Failed to remove goal");
    } finally {
      setSaving(false);
    }
  };

  const addMember = async (handle: string, role: string) => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${slug}/members`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ handle, role }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      await fetchMembers();
      setMemberHandle("");
    } catch (e: any) {
      setError(e?.message || "Failed to add member");
    } finally {
      setSaving(false);
    }
  };

  const updateMemberRole = async (achusrId: string, role: string) => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${slug}/members/${achusrId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      await fetchMembers();
    } catch (e: any) {
      setError(e?.message || "Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (achusrId: string) => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${slug}/members/${achusrId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      await fetchMembers();
    } catch (e: any) {
      setError(e?.message || "Failed to remove member");
    } finally {
      setSaving(false);
    }
  };

  const updateProject = async () => {
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      const payload: any = {
        name: settingsForm.name,
        description: settingsForm.description,
        status: settingsForm.status,
        visibility: settingsForm.visibility,
        clientName: settingsForm.clientName || null,
        clientReference: settingsForm.clientReference || null,
      };
      if (settingsForm.dueDate) {
        const date = new Date(settingsForm.dueDate);
        payload.dueDate = Number.isNaN(date.getTime()) ? null : date.toISOString();
      }
      const res = await fetch(`${API_BASE}/projects/${slug}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      await fetchProject();
    } catch (e: any) {
      setError(e?.message || "Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  const createShareLink = async (payload: ShareLinkPayload) => {
    if (!token) return;
    setSaving(true);
    setShareActionError("");
    try {
      const res = await fetch(`${API_BASE}/projects/${slug}/share-links`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      uiToast.success("Share link created");
      await fetchShareLinks();
    } catch (e: any) {
      setShareActionError(e?.message || "Failed to create share link");
      uiToast.error(e?.message || "Failed to create share link");
    } finally {
      setSaving(false);
    }
  };

  const updateShareLink = async (id: string, payload: ShareLinkPayload) => {
    if (!token) return;
    setSaving(true);
    setShareActionError("");
    try {
      const res = await fetch(`${API_BASE}/projects/${slug}/share-links/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      uiToast.success("Share link updated");
      await fetchShareLinks();
    } catch (e: any) {
      setShareActionError(e?.message || "Failed to update share link");
      uiToast.error(e?.message || "Failed to update share link");
    } finally {
      setSaving(false);
    }
  };

  const deleteShareLink = async (id: string) => {
    if (!token) return;
    setSaving(true);
    setShareActionError("");
    try {
      const res = await fetch(`${API_BASE}/projects/${slug}/share-links/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      uiToast.success("Share link revoked");
      await fetchShareLinks();
    } catch (e: any) {
      setShareActionError(e?.message || "Failed to delete share link");
      uiToast.error(e?.message || "Failed to delete share link");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState title="Loading project" description="Fetching project workspace." />;
  }

  if (!projectData) {
    return (
      <EmptyState
        title="Project not found"
        description="We couldn't find that project. Double-check the slug."
        primaryAction={{ label: "Back to projects", href: "/projects" }}
      />
    );
  }

  const { project, stats, membership } = projectData;
  const linkedGoalSet = new Set(goals.map((goal) => goal.goalId));
  const availableGoals = tasks.filter((task) => !linkedGoalSet.has(String(task.id)));
  const openInvoices = invoices.filter((inv) => inv.status !== "PAID" && inv.status !== "CANCELLED");
  const openInvoiceTotal = openInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  const overviewContent = (
    <div className="space-y-6">
      {error ? <ErrorState message={error} onRetry={fetchProject} /> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardBody className="space-y-1">
            <div className="text-xs text-textMuted">Goals verified</div>
            <div className="text-lg font-semibold">
              {stats.goalsVerified}/{stats.goalsTotal}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <div className="text-xs text-textMuted">Completion</div>
            <div className="text-lg font-semibold">{stats.completionPercent}%</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <div className="text-xs text-textMuted">Members</div>
            <div className="text-lg font-semibold">{stats.membersCount ?? 0}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-1">
            <div className="text-xs text-textMuted">Billing snapshot</div>
            <div className="text-sm font-semibold">{formatMinutes(timeSummary.billableMinutes)} billable</div>
            <div className="text-xs text-textMuted">
              {openInvoices.length} open - {formatCurrency(openInvoiceTotal, billingSettings?.currency || "USD")}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="space-y-2">
          <div className="text-sm font-semibold">Client summary</div>
          <div className="text-sm text-textMuted space-y-1">
            {project.clientName ? <div>Client: {project.clientName}</div> : null}
            {project.clientReference ? <div>Reference: {project.clientReference}</div> : null}
            {project.dueDate ? <div>Due: {formatDate(project.dueDate)}</div> : null}
          </div>
          <div className="text-xs text-textMuted">Share links are managed in the Share links tab.</div>
        </CardBody>
      </Card>

      <Section title="Goals">
        {canEditGoals ? (
          <Card>
            <CardBody className="space-y-3">
              <div className="text-sm font-semibold">Attach goals</div>
              {availableGoals.length ? (
                <div className="grid gap-2">
                  {availableGoals.map((goal) => (
                    <label key={goal.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedGoalIds.includes(String(goal.id))}
                        onChange={() => toggleGoal(String(goal.id))}
                      />
                      {goal.goalCID || String(goal.id)}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-textMuted">No available goals found.</div>
              )}
              <Button onClick={attachSelectedGoals} disabled={!selectedGoalIds.length || saving}>
                Attach selected goals
              </Button>
            </CardBody>
          </Card>
        ) : null}

        {goals.length ? (
          <div className="space-y-3">
            {goals.map((goal) => (
              <Card key={goal.goalId}>
                <CardBody className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{goal.goalCID}</div>
                    <div className="text-xs text-textMuted">{goal.status}</div>
                    <div className="text-xs text-textMuted">Created {formatTimestamp(goal.createdAt)}</div>
                  </div>
                  {canEditGoals ? (
                    <Button variant="ghost" size="sm" onClick={() => detachGoal(goal.goalId)} disabled={saving}>
                      Remove
                    </Button>
                  ) : null}
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No goals attached" description="Attach goals to track progress." />
        )}
      </Section>

      <Section title="Activity">
        {activity.length ? (
          <div className="space-y-3">
            {activity.map((item) => (
              <Card key={item.id}>
                <CardBody className="space-y-1">
                  <div className="text-sm font-semibold">{item.summary}</div>
                  <div className="text-xs text-textMuted">{formatDate(item.createdAt)}</div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No activity yet" description="Activity will appear as members log work." />
        )}
      </Section>

      <Section title="Team">
        {isOwner ? (
          <Card>
            <CardBody className="space-y-3">
              <div className="text-sm font-semibold">Add member</div>
              <div className="flex flex-wrap gap-2">
                <Input
                  value={memberHandle}
                  onChange={(e) => setMemberHandle(e.target.value)}
                  placeholder="@username or Achievo ID"
                />
                <Select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
                  <option value="COLLABORATOR">Collaborator</option>
                  <option value="VIEWER">Viewer</option>
                  <option value="CLIENT">Client</option>
                </Select>
                <Button
                  onClick={() => {
                    if (memberHandle.trim()) void addMember(memberHandle.trim(), memberRole);
                  }}
                  disabled={saving}
                >
                  Add member
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : null}

        {members.length ? (
          <div className="space-y-3">
            {members.map((member) => (
              <Card key={member.achusrId}>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{member.displayName || member.achusrId}</div>
                    <div className="text-xs text-textMuted">@{member.username || member.achusrId}</div>
                    <div className="text-xs text-textMuted">
                      XP {member.xpTotal ?? 0} · Streak {member.currentStreak ?? 0}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {isOwner ? (
                      <Select value={member.role} onChange={(e) => updateMemberRole(member.achusrId, e.target.value)}>
                        <option value="OWNER">Owner</option>
                        <option value="COLLABORATOR">Collaborator</option>
                        <option value="VIEWER">Viewer</option>
                        <option value="CLIENT">Client</option>
                      </Select>
                    ) : (
                      <span className="text-xs text-textMuted">{member.role}</span>
                    )}
                    {isOwner ? (
                      <Button variant="ghost" size="sm" onClick={() => removeMember(member.achusrId)}>
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No members yet" description="Invite collaborators to get started." />
        )}
      </Section>

      {isOwner ? (
        <Section title="Project settings">
          <Card>
            <CardBody className="space-y-3">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  placeholder="Name"
                />
                <Input
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                  placeholder="Description"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  value={settingsForm.status}
                  onChange={(e) => setSettingsForm({ ...settingsForm, status: e.target.value })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </Select>
                <Select
                  value={settingsForm.visibility}
                  onChange={(e) => setSettingsForm({ ...settingsForm, visibility: e.target.value })}
                >
                  <option value="PRIVATE">Private</option>
                  <option value="INVITE_ONLY">Invite only</option>
                  <option value="PUBLIC">Public</option>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  value={settingsForm.clientName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, clientName: e.target.value })}
                  placeholder="Client name"
                />
                <Input
                  value={settingsForm.clientReference}
                  onChange={(e) => setSettingsForm({ ...settingsForm, clientReference: e.target.value })}
                  placeholder="Client reference"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  type="date"
                  value={settingsForm.dueDate}
                  onChange={(e) => setSettingsForm({ ...settingsForm, dueDate: e.target.value })}
                />
                <Button onClick={updateProject} disabled={saving}>
                  {UI_LABELS.saveChanges}
                </Button>
              </div>
            </CardBody>
          </Card>
        </Section>
      ) : null}
    </div>
  );

  const timeContent = (
    <div className="space-y-6">
      {error ? <ErrorState message={error} /> : null}
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Time entries</div>
            <div className="text-xs text-textMuted">{formatMinutes(timeSummary.totalMinutes)} total</div>
          </div>
          <TableFilters>
            <Input
              type="date"
              value={timeFilters.from}
              onChange={(e) => setTimeFilters({ ...timeFilters, from: e.target.value })}
            />
            <Input
              type="date"
              value={timeFilters.to}
              onChange={(e) => setTimeFilters({ ...timeFilters, to: e.target.value })}
            />
            <Select
              value={timeFilters.mine ? "true" : "false"}
              onChange={(e) => setTimeFilters({ ...timeFilters, mine: e.target.value === "true" })}
              disabled={membership?.role === "VIEWER"}
            >
              <option value="true">Mine only</option>
              <option value="false">All members</option>
            </Select>
            <Select
              value={timeFilters.billable}
              onChange={(e) => setTimeFilters({ ...timeFilters, billable: e.target.value })}
            >
              <option value="">All</option>
              <option value="true">Billable</option>
              <option value="false">Non billable</option>
            </Select>
          </TableFilters>
          <TimeEntryTable
            entries={timeEntries}
            loading={timeLoading}
            error={invoiceError || undefined}
            onRetry={fetchTimeEntries}
            onStop={stopTimer}
            onEdit={openManualForm}
            onDelete={deleteTimeEntry}
            busyId={busyEntryId}
            busy={saving}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowManualForm(true)}
            disabled={membership?.role === "VIEWER"}
          >
            {UI_LABELS.addManualEntry}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <div className="text-sm font-semibold">Start timer</div>
          <Select value={timerForm.goalId} onChange={(e) => setTimerForm({ ...timerForm, goalId: e.target.value })}>
            <option value="">No goal</option>
            {goals.map((goal) => (
              <option key={goal.goalId} value={goal.goalId}>
                {goal.goalCID}
              </option>
            ))}
          </Select>
          <Textarea
            value={timerForm.note}
            onChange={(e) => setTimerForm({ ...timerForm, note: e.target.value })}
            placeholder="What are you working on?"
          />
          <label className="flex items-center gap-2 text-xs text-textMuted">
            <input
              type="checkbox"
              checked={timerForm.billable}
              onChange={(e) => setTimerForm({ ...timerForm, billable: e.target.checked })}
            />
            Billable
          </label>
          <Button onClick={startTimer} disabled={saving}>
            {UI_LABELS.start} timer
          </Button>
        </CardBody>
      </Card>

      {showManualForm ? (
        <Card>
          <CardBody className="space-y-3">
            <div className="text-sm font-semibold">{manualForm.id ? "Edit time entry" : "Manual time entry"}</div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                type="datetime-local"
                value={manualForm.startedAt}
                onChange={(e) => setManualForm({ ...manualForm, startedAt: e.target.value })}
              />
              <Input
                type="datetime-local"
                value={manualForm.endedAt}
                onChange={(e) => setManualForm({ ...manualForm, endedAt: e.target.value })}
              />
            </div>
            <Input
              value={manualForm.goalId}
              onChange={(e) => setManualForm({ ...manualForm, goalId: e.target.value })}
              placeholder="Goal ID (optional)"
            />
            <Textarea
              value={manualForm.note}
              onChange={(e) => setManualForm({ ...manualForm, note: e.target.value })}
              placeholder="Note"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={manualForm.billable}
                onChange={(e) => setManualForm({ ...manualForm, billable: e.target.checked })}
              />
              Billable
            </label>
            <div className="flex items-center gap-2">
              <Button onClick={saveManualEntry} disabled={saving}>
                {manualForm.id ? UI_LABELS.saveChanges : UI_LABELS.create}
              </Button>
              <Button variant="ghost" onClick={() => setShowManualForm(false)}>
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {billingSettings ? (
        <Card>
          <CardBody className="space-y-3">
            <div className="text-sm font-semibold">Billing settings</div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                value={billingSettings.billingModel}
                onChange={(e) => setBillingSettings({ ...billingSettings, billingModel: e.target.value })}
                placeholder="Billing model"
                disabled={!isOwner}
              />
              <Input
                value={billingSettings.currency}
                onChange={(e) => setBillingSettings({ ...billingSettings, currency: e.target.value })}
                placeholder="Currency"
                disabled={!isOwner}
              />
              <Input
                value={billingSettings.hourlyRateAmount ?? ""}
                onChange={(e) =>
                  setBillingSettings({
                    ...billingSettings,
                    hourlyRateAmount: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="Hourly rate"
                disabled={!isOwner}
              />
              <Input
                value={billingSettings.fixedFeeAmount ?? ""}
                onChange={(e) =>
                  setBillingSettings({
                    ...billingSettings,
                    fixedFeeAmount: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="Fixed fee"
                disabled={!isOwner}
              />
              <Input
                value={billingSettings.taxPercent ?? ""}
                onChange={(e) =>
                  setBillingSettings({
                    ...billingSettings,
                    taxPercent: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="Tax percent"
                disabled={!isOwner}
              />
              <Input
                value={billingSettings.defaultDueDays ?? ""}
                onChange={(e) =>
                  setBillingSettings({
                    ...billingSettings,
                    defaultDueDays: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="Default due days"
                disabled={!isOwner}
              />
              <Textarea
                value={billingSettings.notes}
                onChange={(e) => setBillingSettings({ ...billingSettings, notes: e.target.value })}
                placeholder="Internal notes"
                disabled={!isOwner}
              />
              {isOwner ? (
                <Button onClick={saveBillingSettings} disabled={billingSaving}>
                  Save billing settings
                </Button>
              ) : null}
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );

  const invoicesContent = (
    <div className="space-y-6">
      {invoiceError ? <ErrorState message={invoiceError} onRetry={fetchInvoices} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold">Invoices</div>
        <Button variant="secondary" size="sm" onClick={() => (window.location.href = `/projects/${slug}/invoices/new`)}>
          {UI_LABELS.createInvoice}
        </Button>
      </div>
      <InvoiceTable
        projectSlug={slug}
        invoices={invoices}
        loading={invoiceLoading}
        error={invoiceError || undefined}
        onRetry={fetchInvoices}
        onMarkSent={(id) => updateInvoiceStatus(id, "SENT")}
        onMarkPaid={(id) => updateInvoiceStatus(id, "PAID")}
        busyId={busyInvoiceId}
      />
      <Card>
        <CardBody className="space-y-3">
          <div className="text-sm font-semibold">Generate from time</div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              type="date"
              value={generateForm.from}
              onChange={(e) => setGenerateForm({ ...generateForm, from: e.target.value })}
            />
            <Input
              type="date"
              value={generateForm.to}
              onChange={(e) => setGenerateForm({ ...generateForm, to: e.target.value })}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Select
              value={generateForm.grouping}
              onChange={(e) => setGenerateForm({ ...generateForm, grouping: e.target.value })}
            >
              <option value="SINGLE_LINE">Single line</option>
              <option value="BY_DAY">By day</option>
              <option value="BY_GOAL">By goal</option>
            </Select>
            <label className="flex items-center gap-2 text-xs text-textMuted">
              <input
                type="checkbox"
                checked={generateForm.onlyBillable}
                onChange={(e) => setGenerateForm({ ...generateForm, onlyBillable: e.target.checked })}
              />
              Billable only
            </label>
          </div>
          <Button onClick={generateInvoice} disabled={generatingInvoice}>
            {generatingInvoice ? "Generating..." : UI_LABELS.generateInvoice}
          </Button>
        </CardBody>
      </Card>
    </div>
  );

  const shareContent = (
    <div className="space-y-6">
      {shareActionError ? <ErrorState message={shareActionError} /> : null}
      {!token ? (
        <AuthRequired title="Sign in required" description="Sign in to manage project share links." />
      ) : !isOwner ? (
        <EmptyState title="Owner access required" description="Only project owners can manage share links." />
      ) : (
        <ProjectShareLinksManager
          links={shareLinks}
          onCreate={createShareLink}
          onUpdate={updateShareLink}
          onDelete={deleteShareLink}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={project.description || "Project workspace overview."}
        breadcrumbs={projectBreadcrumbs(project.slug, project.name)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={project.status} />
            <StatusPill status={project.visibility} />
            {membership?.role ? <StatusPill status={membership.role} /> : null}
          </div>
        }
      />
      <DegradedHint />

      <ProjectTabs
        overview={overviewContent}
        timeTracking={timeContent}
        invoices={invoicesContent}
        shareLinks={shareContent}
        initialId={activeTab}
        onTabChange={(id) => setActiveTab(id)}
      />
    </div>
  );
}
