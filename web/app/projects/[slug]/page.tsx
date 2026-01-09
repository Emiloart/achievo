"use client";
import Link from "next/link";

import { getApiErrorMessage } from "../../../lib/apiError";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useBackendAuth } from "../../../hooks/useBackendAuth";
import { useUserTasks } from "../../../hooks/useUserTasks";

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

type TimeEntryItem = {
  id: string;
  projectId: string;
  achusrId: string;
  goalId?: string | null;
  startedAt: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  note?: string | null;
  billable: boolean;
  invoiceId?: string | null;
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

type InvoiceItem = {
  id: string;
  number?: string;
  clientName: string;
  currency: string;
  issueDate: string;
  dueDate?: string | null;
  status: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  publicSlug?: string | null;
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

type ShareLink = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  visibility: string;
  theme: string;
  sections: Record<string, boolean>;
  isPrimary: boolean;
};

const TAB_LIST = ["overview", "goals", "activity", "team", "time", "settings"] as const;

type TabKey = (typeof TAB_LIST)[number];

const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  goals: "Goals",
  activity: "Activity",
  team: "Team",
  time: "Time & Billing",
  settings: "Settings",
};

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
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryItem[]>([]);
  const [timeSummary, setTimeSummary] = useState<TimeSummary>({
    totalMinutes: 0,
    billableMinutes: 0,
    nonBillableMinutes: 0,
  });
  const [timeLoading, setTimeLoading] = useState(false);
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);
  const [billingSaving, setBillingSaving] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
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

  const [shareForm, setShareForm] = useState({
    slug: "",
    title: "",
    description: "",
    visibility: "UNLISTED",
    theme: "AUTO",
    isPrimary: false,
    sections: {
      summary: true,
      goals: true,
      activity: true,
      team: true,
      clientNotes: true,
    },
  });
  const [editingShare, setEditingShare] = useState<ShareLink | null>(null);
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
      const res = await fetch(`${API_BASE}/projects/${slug}/share-links`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setShareLinks(Array.isArray(json.data) ? json.data : []);
    } catch {
      setShareLinks([]);
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
    }
  };

  const openManualForm = (entry?: TimeEntryItem) => {
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
    }
  };

  useEffect(() => {
    if (slug) void fetchProject();
  }, [fetchProject, slug]);

  useEffect(() => {
    if (activeTab === "goals" || activeTab === "time") void fetchGoals();
    if (activeTab === "team") void fetchMembers();
    if (activeTab === "activity") void fetchActivity();
    if (activeTab === "settings" && isOwner) void fetchShareLinks();
    if (activeTab === "overview") {
      void fetchInvoices();
      void fetchTimeEntries();
    }
    if (activeTab === "time") {
      void fetchTimeEntries();
      void fetchBillingSettings();
      void fetchInvoices();
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
    if (activeTab === "time") {
      void fetchTimeEntries();
    }
  }, [activeTab, fetchTimeEntries]);

  useEffect(() => {
    if (!isOwner && activeTab === "settings") {
      setActiveTab("overview");
    }
  }, [isOwner, activeTab]);

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

  const saveShareLink = async () => {
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        slug: shareForm.slug,
        title: shareForm.title,
        description: shareForm.description || null,
        visibility: shareForm.visibility,
        theme: shareForm.theme,
        isPrimary: shareForm.isPrimary,
        sections: shareForm.sections,
      };
      const endpoint = editingShare
        ? `${API_BASE}/projects/${slug}/share-links/${editingShare.id}`
        : `${API_BASE}/projects/${slug}/share-links`;
      const method = editingShare ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      setEditingShare(null);
      setShareForm({
        slug: "",
        title: "",
        description: "",
        visibility: "UNLISTED",
        theme: "AUTO",
        isPrimary: false,
        sections: {
          summary: true,
          goals: true,
          activity: true,
          team: true,
          clientNotes: true,
        },
      });
      await fetchShareLinks();
    } catch (e: any) {
      setError(e?.message || "Failed to save share link");
    } finally {
      setSaving(false);
    }
  };

  const deleteShareLink = async (id: string) => {
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/projects/${slug}/share-links/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      await fetchShareLinks();
    } catch (e: any) {
      setError(e?.message || "Failed to delete share link");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading project...</div>;
  }

  if (!projectData) {
    return <div className="text-sm text-gray-500">Project not found.</div>;
  }

  const { project, stats, membership } = projectData;
  const isClient = membership?.role === "CLIENT";
  const linkedGoalSet = new Set(goals.map((goal) => goal.goalId));
  const availableGoals = tasks.filter((task) => !linkedGoalSet.has(String(task.id)));
  const openInvoices = invoices.filter((inv) => inv.status !== "PAID" && inv.status !== "CANCELLED");
  const openInvoiceTotal = openInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  const tabs = isOwner ? TAB_LIST : TAB_LIST.filter((tab) => tab !== "settings" && (!isClient || tab !== "time"));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs text-gray-500">@{project.slug}</div>
          <h2 className="text-2xl font-semibold">{project.name}</h2>
          {project.description && <p className="text-sm text-gray-600">{project.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">{project.status}</span>
          <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">{project.visibility}</span>
          {membership?.role && (
            <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">{membership.role}</span>
          )}
        </div>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap gap-2 text-sm">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-full border ${activeTab === tab ? "bg-gray-900 text-white" : "bg-white text-gray-700"}`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-xs text-gray-500">Goals verified</div>
              <div className="text-lg font-semibold">
                {stats.goalsVerified}/{stats.goalsTotal}
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-xs text-gray-500">Completion</div>
              <div className="text-lg font-semibold">{stats.completionPercent}%</div>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-xs text-gray-500">Members</div>
              <div className="text-lg font-semibold">{stats.membersCount ?? 0}</div>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-xs text-gray-500">Billing snapshot</div>
              <div className="text-sm font-semibold">{formatMinutes(timeSummary.billableMinutes)} billable</div>
              <div className="text-xs text-gray-500">
                {openInvoices.length} open - {formatCurrency(openInvoiceTotal, billingSettings?.currency || "USD")}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4 space-y-2">
            <div className="text-sm font-semibold">Client summary</div>
            <div className="text-sm text-gray-600 space-y-1">
              {project.clientName && <div>Client: {project.clientName}</div>}
              {project.clientReference && <div>Reference: {project.clientReference}</div>}
              {project.dueDate && <div>Due: {formatDate(project.dueDate)}</div>}
            </div>
            <div className="text-sm text-gray-500">Manage share links in the Settings tab.</div>
          </div>
        </div>
      )}

      {activeTab === "goals" && (
        <div className="space-y-4">
          {canEditGoals && (
            <div className="rounded-2xl border bg-white p-4 space-y-3">
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
                      <span>{goal.goalCID || `Goal #${goal.id}`}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No available goals to attach.</div>
              )}
              <button
                onClick={attachSelectedGoals}
                disabled={!selectedGoalIds.length || saving}
                className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm"
              >
                Attach selected goals
              </button>
            </div>
          )}

          <div className="space-y-3">
            {goals.length ? (
              goals.map((goal) => (
                <div
                  key={goal.goalId}
                  className="rounded-2xl border bg-white p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold">{goal.goalCID || `Goal #${goal.goalId}`}</div>
                    <div className="text-xs text-gray-500">
                      Level {goal.level} ? {goal.status}
                    </div>
                    <div className="text-xs text-gray-500">Created {formatTimestamp(goal.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/goals/${goal.goalId}` as Route} className="text-sm text-brand-600 hover:underline">
                      View goal
                    </Link>
                    {canEditGoals && (
                      <button onClick={() => detachGoal(goal.goalId)} className="text-sm text-red-600">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">No goals attached yet.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="space-y-3">
          {activity.length ? (
            activity.map((item) => (
              <div key={item.id} className="rounded-2xl border bg-white p-4">
                <div className="text-sm font-semibold">{item.summary}</div>
                <div className="text-xs text-gray-500">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">No activity yet.</div>
          )}
        </div>
      )}

      {activeTab === "team" && (
        <div className="space-y-4">
          {isOwner && (
            <div className="rounded-2xl border bg-white p-4 space-y-2">
              <div className="text-sm font-semibold">Add member</div>
              <div className="flex flex-wrap gap-2">
                <input
                  value={memberHandle}
                  onChange={(e) => setMemberHandle(e.target.value)}
                  placeholder="@username or ACHUSR"
                  className="border rounded-md px-3 py-2 text-sm flex-1"
                />
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="border rounded-md px-2 py-2 text-sm"
                >
                  <option value="COLLABORATOR">Collaborator</option>
                  <option value="VIEWER">Viewer</option>
                  <option value="CLIENT">Client</option>
                  <option value="OWNER">Owner</option>
                </select>
                <button
                  onClick={() => {
                    if (memberHandle.trim()) void addMember(memberHandle.trim(), memberRole);
                  }}
                  className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {members.length ? (
            members.map((member) => (
              <div
                key={member.achusrId}
                className="rounded-2xl border bg-white p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="font-semibold">{member.displayName || member.achusrId}</div>
                  <div className="text-xs text-gray-500">@{member.username || member.achusrId}</div>
                  <div className="text-xs text-gray-500">
                    XP {member.xpTotal ?? 0} ? Streak {member.currentStreak ?? 0}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOwner ? (
                    <select
                      value={member.role}
                      onChange={(e) => updateMemberRole(member.achusrId, e.target.value)}
                      className="border rounded-md px-2 py-1 text-sm"
                    >
                      <option value="OWNER">Owner</option>
                      <option value="COLLABORATOR">Collaborator</option>
                      <option value="VIEWER">Viewer</option>
                      <option value="CLIENT">Client</option>
                    </select>
                  ) : (
                    <span className="text-xs text-gray-500">{member.role}</span>
                  )}
                  {isOwner && (
                    <button onClick={() => removeMember(member.achusrId)} className="text-sm text-red-600">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">No members yet.</div>
          )}
        </div>
      )}

      {activeTab === "time" && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold">Time tracking</div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    <span>Total {formatMinutes(timeSummary.totalMinutes)}</span>
                    <span>Billable {formatMinutes(timeSummary.billableMinutes)}</span>
                    <span>Non-billable {formatMinutes(timeSummary.nonBillableMinutes)}</span>
                  </div>
                </div>

                {timeLoading ? (
                  <div className="text-sm text-gray-500">Loading time entries...</div>
                ) : (
                  <>
                    <div className="rounded-xl border bg-gray-50 p-3 space-y-2">
                      <div className="text-xs text-gray-500">Current timer</div>
                      {timeEntries.find((entry) => !entry.endedAt) ? (
                        (() => {
                          const running = timeEntries.find((entry) => !entry.endedAt);
                          if (!running) return null;
                          const elapsed = Math.max(
                            0,
                            Math.round((Date.now() - new Date(running.startedAt).getTime()) / 60000),
                          );
                          return (
                            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                              <div>
                                <div className="font-semibold">Running {formatMinutes(elapsed)}</div>
                                <div className="text-xs text-gray-500">
                                  {running.goalId ? `Goal #${running.goalId}` : "General"}
                                  {running.note ? ` - ${running.note}` : ""}
                                </div>
                              </div>
                              <button
                                onClick={() => stopTimer(running.id)}
                                className="px-3 py-1 rounded-md bg-gray-900 text-white text-xs"
                              >
                                Stop
                              </button>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="space-y-2">
                          <div className="grid gap-2 md:grid-cols-3">
                            <select
                              value={timerForm.goalId}
                              onChange={(e) => setTimerForm({ ...timerForm, goalId: e.target.value })}
                              className="border rounded-md px-2 py-2 text-sm"
                            >
                              <option value="">No goal</option>
                              {goals.map((goal) => (
                                <option key={goal.goalId} value={goal.goalId}>
                                  Goal #{goal.goalId}
                                </option>
                              ))}
                            </select>
                            <input
                              value={timerForm.note}
                              onChange={(e) => setTimerForm({ ...timerForm, note: e.target.value })}
                              placeholder="What are you working on?"
                              className="border rounded-md px-2 py-2 text-sm md:col-span-2"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-xs text-gray-600">
                              <input
                                type="checkbox"
                                checked={timerForm.billable}
                                onChange={(e) => setTimerForm({ ...timerForm, billable: e.target.checked })}
                              />
                              Billable
                            </label>
                            <button
                              onClick={startTimer}
                              className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm"
                            >
                              Start timer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border bg-white p-3 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold">Recent entries</div>
                        <button onClick={() => openManualForm()} className="px-3 py-1 rounded-md border text-xs">
                          Log time manually
                        </button>
                      </div>
                      <div className="grid gap-2 md:grid-cols-4">
                        <input
                          type="date"
                          value={timeFilters.from}
                          onChange={(e) => setTimeFilters({ ...timeFilters, from: e.target.value })}
                          className="border rounded-md px-2 py-1 text-xs"
                        />
                        <input
                          type="date"
                          value={timeFilters.to}
                          onChange={(e) => setTimeFilters({ ...timeFilters, to: e.target.value })}
                          className="border rounded-md px-2 py-1 text-xs"
                        />
                        <select
                          value={String(timeFilters.mine)}
                          onChange={(e) => setTimeFilters({ ...timeFilters, mine: e.target.value === "true" })}
                          className="border rounded-md px-2 py-1 text-xs"
                          disabled={membership?.role === "VIEWER"}
                        >
                          <option value="true">Mine only</option>
                          <option value="false">All members</option>
                        </select>
                        <select
                          value={timeFilters.billable}
                          onChange={(e) => setTimeFilters({ ...timeFilters, billable: e.target.value })}
                          className="border rounded-md px-2 py-1 text-xs"
                        >
                          <option value="">All entries</option>
                          <option value="true">Billable</option>
                          <option value="false">Non-billable</option>
                        </select>
                      </div>

                      {showManualForm && (
                        <div className="rounded-xl border bg-gray-50 p-3 space-y-2">
                          <div className="text-xs text-gray-500">
                            {manualForm.id ? "Edit entry" : "New manual entry"}
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            <input
                              type="datetime-local"
                              value={manualForm.startedAt}
                              onChange={(e) => setManualForm({ ...manualForm, startedAt: e.target.value })}
                              className="border rounded-md px-2 py-1 text-xs"
                            />
                            <input
                              type="datetime-local"
                              value={manualForm.endedAt}
                              onChange={(e) => setManualForm({ ...manualForm, endedAt: e.target.value })}
                              className="border rounded-md px-2 py-1 text-xs"
                            />
                          </div>
                          <div className="grid gap-2 md:grid-cols-3">
                            <select
                              value={manualForm.goalId}
                              onChange={(e) => setManualForm({ ...manualForm, goalId: e.target.value })}
                              className="border rounded-md px-2 py-1 text-xs"
                            >
                              <option value="">No goal</option>
                              {goals.map((goal) => (
                                <option key={goal.goalId} value={goal.goalId}>
                                  Goal #{goal.goalId}
                                </option>
                              ))}
                            </select>
                            <input
                              value={manualForm.note}
                              onChange={(e) => setManualForm({ ...manualForm, note: e.target.value })}
                              placeholder="Session note"
                              className="border rounded-md px-2 py-1 text-xs md:col-span-2"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-xs text-gray-600">
                              <input
                                type="checkbox"
                                checked={manualForm.billable}
                                onChange={(e) => setManualForm({ ...manualForm, billable: e.target.checked })}
                              />
                              Billable
                            </label>
                            <button
                              onClick={saveManualEntry}
                              className="px-3 py-1 rounded-md bg-gray-900 text-white text-xs"
                            >
                              Save entry
                            </button>
                            <button onClick={() => setShowManualForm(false)} className="text-xs text-gray-500">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {!timeEntries.length ? (
                        <div className="text-xs text-gray-500">No time entries yet.</div>
                      ) : (
                        <div className="space-y-2 text-xs">
                          {timeEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="rounded-lg border bg-white px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                            >
                              <div>
                                <div className="font-semibold">
                                  {entry.goalId ? `Goal #${entry.goalId}` : "General"} -{" "}
                                  {formatMinutes(entry.durationMinutes)}
                                </div>
                                <div className="text-gray-500">
                                  {new Date(entry.startedAt).toLocaleString()}
                                  {entry.endedAt ? ` - ${new Date(entry.endedAt).toLocaleString()}` : ""}
                                </div>
                                {entry.note && <div className="text-gray-500">{entry.note}</div>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">{entry.billable ? "Billable" : "Non-billable"}</span>
                                {entry.invoiceId ? (
                                  <span className="text-gray-400">Invoiced</span>
                                ) : (
                                  <>
                                    <button onClick={() => openManualForm(entry)} className="text-xs text-brand-600">
                                      Edit
                                    </button>
                                    <button onClick={() => deleteTimeEntry(entry.id)} className="text-xs text-red-600">
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border bg-white p-4 space-y-3">
                <div className="text-sm font-semibold">Billing settings</div>
                {billingSettings ? (
                  <div className="grid gap-3 text-sm">
                    <select
                      value={billingSettings.billingModel}
                      onChange={(e) => setBillingSettings({ ...billingSettings, billingModel: e.target.value })}
                      className="border rounded-md px-2 py-2 text-sm"
                      disabled={!isOwner}
                    >
                      <option value="HOURLY">Hourly</option>
                      <option value="FIXED_FEE">Fixed fee</option>
                      <option value="HYBRID">Hybrid</option>
                    </select>
                    <input
                      value={billingSettings.currency}
                      onChange={(e) => setBillingSettings({ ...billingSettings, currency: e.target.value })}
                      className="border rounded-md px-2 py-2 text-sm"
                      placeholder="Currency"
                      disabled={!isOwner}
                    />
                    <input
                      value={billingSettings.hourlyRateAmount ?? ""}
                      onChange={(e) =>
                        setBillingSettings({
                          ...billingSettings,
                          hourlyRateAmount: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="border rounded-md px-2 py-2 text-sm"
                      placeholder="Hourly rate"
                      disabled={!isOwner}
                    />
                    <input
                      value={billingSettings.fixedFeeAmount ?? ""}
                      onChange={(e) =>
                        setBillingSettings({
                          ...billingSettings,
                          fixedFeeAmount: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="border rounded-md px-2 py-2 text-sm"
                      placeholder="Fixed fee"
                      disabled={!isOwner}
                    />
                    <input
                      value={billingSettings.taxPercent ?? ""}
                      onChange={(e) =>
                        setBillingSettings({
                          ...billingSettings,
                          taxPercent: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="border rounded-md px-2 py-2 text-sm"
                      placeholder="Tax percent"
                      disabled={!isOwner}
                    />
                    <input
                      value={billingSettings.defaultDueDays ?? ""}
                      onChange={(e) =>
                        setBillingSettings({
                          ...billingSettings,
                          defaultDueDays: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="border rounded-md px-2 py-2 text-sm"
                      placeholder="Default due days"
                      disabled={!isOwner}
                    />
                    <textarea
                      value={billingSettings.notes}
                      onChange={(e) => setBillingSettings({ ...billingSettings, notes: e.target.value })}
                      className="border rounded-md px-2 py-2 text-sm"
                      placeholder="Internal notes"
                      disabled={!isOwner}
                    />
                    {isOwner && (
                      <button
                        onClick={saveBillingSettings}
                        disabled={billingSaving}
                        className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm"
                      >
                        Save billing settings
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">Billing settings not available.</div>
                )}
              </div>

              {(membership?.role === "OWNER" || membership?.role === "COLLABORATOR") && (
                <div className="rounded-2xl border bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Invoices</div>
                    <div className="flex gap-2">
                      <Link
                        href={`/projects/${slug}/invoices/new` as Route}
                        className="text-xs px-2 py-1 rounded-md border"
                      >
                        Create invoice
                      </Link>
                    </div>
                  </div>

                  {invoiceError && <div className="text-xs text-red-600">{invoiceError}</div>}
                  {invoiceLoading ? (
                    <div className="text-xs text-gray-500">Loading invoices...</div>
                  ) : invoices.length ? (
                    <div className="space-y-2 text-xs">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="rounded-lg border bg-white px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-semibold">{invoice.number || invoice.clientName}</div>
                            <div className="text-gray-500">{invoice.clientName}</div>
                            <div className="text-gray-500">
                              {formatDate(invoice.issueDate)} - {invoice.status}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(invoice.totalAmount, invoice.currency)}</div>
                            <div className="flex items-center gap-2 justify-end">
                              <Link
                                href={`/projects/${slug}/invoices/${invoice.id}` as Route}
                                className="text-brand-600"
                              >
                                View
                              </Link>
                              {invoice.publicSlug && (
                                <button
                                  onClick={() => {
                                    if (typeof window !== "undefined") {
                                      void navigator.clipboard.writeText(
                                        `${window.location.origin}/invoices/public/${invoice.publicSlug}`,
                                      );
                                    }
                                  }}
                                  className="text-xs text-gray-500"
                                >
                                  Copy link
                                </button>
                              )}
                              {invoice.status === "DRAFT" && (
                                <button
                                  onClick={() => updateInvoiceStatus(invoice.id, "SENT")}
                                  className="text-xs text-gray-600"
                                >
                                  Mark sent
                                </button>
                              )}
                              {invoice.status === "SENT" && (
                                <button
                                  onClick={() => updateInvoiceStatus(invoice.id, "PAID")}
                                  className="text-xs text-green-700"
                                >
                                  Mark paid
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">No invoices yet.</div>
                  )}

                  <div className="rounded-xl border bg-gray-50 p-3 space-y-2">
                    <div className="text-xs font-semibold">Generate from time</div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <input
                        type="date"
                        value={generateForm.from}
                        onChange={(e) => setGenerateForm({ ...generateForm, from: e.target.value })}
                        className="border rounded-md px-2 py-1 text-xs"
                      />
                      <input
                        type="date"
                        value={generateForm.to}
                        onChange={(e) => setGenerateForm({ ...generateForm, to: e.target.value })}
                        className="border rounded-md px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <select
                        value={generateForm.grouping}
                        onChange={(e) => setGenerateForm({ ...generateForm, grouping: e.target.value })}
                        className="border rounded-md px-2 py-1 text-xs"
                      >
                        <option value="SINGLE_LINE">Single line</option>
                        <option value="BY_DAY">By day</option>
                        <option value="BY_GOAL">By goal</option>
                      </select>
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={generateForm.onlyBillable}
                          onChange={(e) => setGenerateForm({ ...generateForm, onlyBillable: e.target.checked })}
                        />
                        Billable only
                      </label>
                    </div>
                    <button
                      onClick={generateInvoice}
                      disabled={generatingInvoice}
                      className="px-3 py-2 rounded-md bg-gray-900 text-white text-xs"
                    >
                      Generate invoice
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "settings" && isOwner && (
        <div className="space-y-6">
          <div className="rounded-2xl border bg-white p-4 space-y-3">
            <div className="text-sm font-semibold">Project settings</div>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={settingsForm.name}
                onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                placeholder="Name"
                className="border rounded-md px-3 py-2 text-sm"
              />
              <input
                value={settingsForm.description}
                onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                placeholder="Description"
                className="border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={settingsForm.status}
                onChange={(e) => setSettingsForm({ ...settingsForm, status: e.target.value })}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <select
                value={settingsForm.visibility}
                onChange={(e) => setSettingsForm({ ...settingsForm, visibility: e.target.value })}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="PRIVATE">Private</option>
                <option value="INVITE_ONLY">Invite only</option>
                <option value="PUBLIC">Public</option>
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={settingsForm.clientName}
                onChange={(e) => setSettingsForm({ ...settingsForm, clientName: e.target.value })}
                placeholder="Client name"
                className="border rounded-md px-3 py-2 text-sm"
              />
              <input
                value={settingsForm.clientReference}
                onChange={(e) => setSettingsForm({ ...settingsForm, clientReference: e.target.value })}
                placeholder="Client reference"
                className="border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={settingsForm.dueDate}
                onChange={(e) => setSettingsForm({ ...settingsForm, dueDate: e.target.value })}
                className="border rounded-md px-3 py-2 text-sm"
              />
              <button
                onClick={updateProject}
                className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm"
                disabled={saving}
              >
                Save changes
              </button>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 space-y-4">
            <div className="text-sm font-semibold">Share links</div>
            <div className="grid gap-3">
              {shareLinks.map((link) => (
                <div key={link.id} className="border rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{link.title}</div>
                    <div className="text-xs text-gray-500">/{link.slug}</div>
                    <div className="text-xs text-gray-500">{link.visibility}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          void navigator.clipboard.writeText(`${window.location.origin}/projects/share/${link.slug}`);
                        }
                      }}
                      className="text-sm text-gray-600"
                    >
                      Copy link
                    </button>
                    <button
                      onClick={() => {
                        setEditingShare(link);
                        setShareForm({
                          slug: link.slug,
                          title: link.title,
                          description: link.description || "",
                          visibility: link.visibility,
                          theme: link.theme,
                          isPrimary: link.isPrimary,
                          sections: {
                            summary: Boolean(link.sections?.summary),
                            goals: Boolean(link.sections?.goals),
                            activity: Boolean(link.sections?.activity),
                            team: Boolean(link.sections?.team),
                            clientNotes: Boolean(link.sections?.clientNotes),
                          },
                        });
                      }}
                      className="text-sm text-brand-600"
                    >
                      Edit
                    </button>
                    <button onClick={() => deleteShareLink(link.id)} className="text-sm text-red-600">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {!shareLinks.length && <div className="text-sm text-gray-500">No share links yet.</div>}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="text-sm font-semibold">{editingShare ? "Edit share link" : "Create share link"}</div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={shareForm.slug}
                  onChange={(e) => setShareForm({ ...shareForm, slug: e.target.value })}
                  placeholder="Slug"
                  className="border rounded-md px-3 py-2 text-sm"
                />
                <input
                  value={shareForm.title}
                  onChange={(e) => setShareForm({ ...shareForm, title: e.target.value })}
                  placeholder="Title"
                  className="border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <input
                value={shareForm.description}
                onChange={(e) => setShareForm({ ...shareForm, description: e.target.value })}
                placeholder="Description"
                className="border rounded-md px-3 py-2 text-sm"
              />
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  value={shareForm.visibility}
                  onChange={(e) => setShareForm({ ...shareForm, visibility: e.target.value })}
                  className="border rounded-md px-3 py-2 text-sm"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="UNLISTED">Unlisted</option>
                  <option value="DISABLED">Disabled</option>
                </select>
                <select
                  value={shareForm.theme}
                  onChange={(e) => setShareForm({ ...shareForm, theme: e.target.value })}
                  className="border rounded-md px-3 py-2 text-sm"
                >
                  <option value="AUTO">Auto</option>
                  <option value="LIGHT">Light</option>
                  <option value="DARK">Dark</option>
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={shareForm.isPrimary}
                    onChange={(e) => setShareForm({ ...shareForm, isPrimary: e.target.checked })}
                  />
                  Primary
                </label>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {Object.entries(shareForm.sections).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) =>
                        setShareForm({
                          ...shareForm,
                          sections: { ...shareForm.sections, [key]: e.target.checked },
                        })
                      }
                    />
                    {key}
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveShareLink}
                  className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm"
                  disabled={saving}
                >
                  {editingShare ? "Update" : "Create"}
                </button>
                {editingShare && (
                  <button
                    onClick={() => {
                      setEditingShare(null);
                      setShareForm({
                        slug: "",
                        title: "",
                        description: "",
                        visibility: "UNLISTED",
                        theme: "AUTO",
                        isPrimary: false,
                        sections: {
                          summary: true,
                          goals: true,
                          activity: true,
                          team: true,
                          clientNotes: true,
                        },
                      });
                    }}
                    className="text-sm text-gray-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
