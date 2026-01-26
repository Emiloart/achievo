"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useBackendAuth } from "../../../hooks/useBackendAuth";
import { useValidatorRequests, type ValidationItem } from "../../../hooks/useValidations";
import { getApiError, getApiErrorMessage } from "../../../lib/apiError";
import { PageHeader } from "../../../components/nav/PageHeader";
import { validatorInboxBreadcrumbs } from "../../../components/nav/breadcrumbs";
import { DegradedHint } from "../../../components/states/DegradedHint";
import { EmptyState } from "../../../components/states/EmptyState";
import { ErrorState } from "../../../components/states/ErrorState";
import { LoadingState } from "../../../components/states/LoadingState";
import { AuthRequired } from "../../../components/states/AuthRequired";
import { Drawer } from "../../../components/ui/Modal";
import {
  Badge,
  Button,
  BulkActionBar,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  Input,
  Select,
  StatusPill,
  TableFilters,
  Textarea,
  uiToast,
} from "../../../components/ui";
import { AttestationWizard } from "../../../components/domain/validators/AttestationWizard";
import { ValidatorInboxTabs } from "../../../components/domain/validators/ValidatorInboxTabs";
import { UI_LABELS } from "../../../lib/uiCopy";
import { setPanel } from "../../../lib/panelRouting";

const API_BASE = "/api";

type ValidatorProfile = {
  walletAddress: string;
  displayName: string;
  type: string;
  bio?: string | null;
  website?: string | null;
  approvals?: number;
  rejections?: number;
  revoked?: number;
};

type RegistrationForm = {
  displayName: string;
  type: string;
  bio: string;
  website: string;
};

function shortId(value: string) {
  if (!value) return "";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatClaimant(item: ValidationItem) {
  const claimant = item.claimant || {};
  if (claimant.displayName || claimant.achusrId) {
    return `${claimant.displayName || claimant.achusrId} (@${claimant.username || claimant.achusrId})`;
  }
  return `Claimant ${item.request.claimantUserId}`;
}

export default function ValidatorInboxPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const { token } = useBackendAuth();
  const { items, error, state: requestsState, refetch } = useValidatorRequests(address);
  const [profile, setProfile] = useState<ValidatorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<{ message: string; requestId?: string | null } | null>(null);
  const [registration, setRegistration] = useState<RegistrationForm>({
    displayName: "",
    type: "INDIVIDUAL",
    bio: "",
    website: "",
  });
  const [registering, setRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [selectedRequest, setSelectedRequest] = useState<ValidationItem | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const canAct = Boolean(address && token);

  const fetchProfile = useCallback(async () => {
    if (!address) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await fetch(`${API_BASE}/validators/${address}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 404) {
          setProfile(null);
          return;
        }
        const { message, requestId } = await getApiError(res, "Unable to load validator profile");
        throw Object.assign(new Error(message), { requestId });
      }
      const json = await res.json();
      setProfile(json.data as ValidatorProfile);
    } catch (e: any) {
      setProfileError({ message: e?.message || "Unable to load validator profile", requestId: e?.requestId });
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [address, token]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const registerValidator = async () => {
    if (!address) return;
    setRegistering(true);
    setProfileError(null);
    try {
      const payload = {
        walletAddress: address,
        displayName: registration.displayName.trim(),
        type: registration.type,
        bio: registration.bio.trim() || undefined,
        website: registration.website.trim() || undefined,
      };
      const res = await fetch(`${API_BASE}/validators/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      uiToast.success("Validator profile created");
      setRegistration({ displayName: "", type: "INDIVIDUAL", bio: "", website: "" });
      await fetchProfile();
      await refetch();
    } catch (e: any) {
      uiToast.error(e?.message || "Failed to register validator");
    } finally {
      setRegistering(false);
    }
  };

  const pendingRequests = useMemo(() => items || [], [items]);
  const completedRequests = useMemo(
    () => pendingRequests.filter((item) => item.request.status !== "PENDING"),
    [pendingRequests],
  );
  const filteredPending = useMemo(() => {
    if (!filterQuery.trim()) return pendingRequests;
    const query = filterQuery.trim().toLowerCase();
    return pendingRequests.filter((item) => {
      return (
        item.request.title.toLowerCase().includes(query) ||
        item.request.id.toLowerCase().includes(query) ||
        formatClaimant(item).toLowerCase().includes(query)
      );
    });
  }, [filterQuery, pendingRequests]);
  const filteredCompleted = useMemo(() => {
    if (!filterQuery.trim()) return completedRequests;
    const query = filterQuery.trim().toLowerCase();
    return completedRequests.filter((item) => {
      return (
        item.request.title.toLowerCase().includes(query) ||
        item.request.id.toLowerCase().includes(query) ||
        formatClaimant(item).toLowerCase().includes(query)
      );
    });
  }, [completedRequests, filterQuery]);

  useEffect(() => {
    if (!selectedIds.length) return;
    const allowedIds = new Set(filteredPending.map((item) => item.request.id));
    const next = selectedIds.filter((id) => allowedIds.has(id));
    if (next.length !== selectedIds.length) setSelectedIds(next);
  }, [filteredPending, selectedIds]);

  useEffect(() => {
    if (activeTab !== "pending") {
      setSelectedIds([]);
    }
  }, [activeTab]);

  const pendingContent = (() => {
    if (requestsState.status === "loading") {
      return (
        <LoadingState title="Loading requests" description="Fetching validations assigned to your wallet." rows={2} />
      );
    }
    if (requestsState.status === "failed") {
      return <ErrorState message={error || "Unable to load validator requests."} onRetry={refetch} />;
    }
    if (!filteredPending.length) {
      return (
        <EmptyState
          title="No pending requests"
          description="Incoming validations will appear here for review."
          primaryAction={
            !canAct ? { label: "Go to identity", href: "/identity" } : { label: UI_LABELS.refresh, onClick: refetch }
          }
        />
      );
    }

    return (
      <div className="space-y-3">
        <TableFilters>
          <Input
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            placeholder="Search requests"
          />
        </TableFilters>
        <BulkActionBar
          count={selectedIds.length}
          actions={[
            {
              id: "open-wizard",
              label: "Open first in wizard",
              variant: "secondary",
              disabled: !selectedIds.length,
              onClick: () => {
                if (!selectedIds.length) return;
                const first = filteredPending.find((item) => item.request.id === selectedIds[0]);
                if (first) setSelectedRequest(first);
              },
            },
            {
              id: "clear",
              label: "Clear selection",
              variant: "ghost",
              onClick: () => setSelectedIds([]),
            },
          ]}
        />
        <DataTable
          rows={filteredPending}
          columns={[
            {
              key: "title",
              label: "Request",
              render: (row: ValidationItem) => (
                <div>
                  <div className="text-sm font-semibold">{row.request.title}</div>
                  <div className="text-xs text-textMuted">{formatClaimant(row)}</div>
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (row: ValidationItem) => <StatusPill status={row.request.status} />,
            },
            {
              key: "id",
              label: "Request ID",
              render: (row: ValidationItem) => (
                <span className="text-xs text-textMuted">{shortId(row.request.id)}</span>
              ),
            },
            {
              key: "actions",
              label: "Action",
              render: (row: ValidationItem) => (
                <Button size="sm" onClick={() => setSelectedRequest(row)} disabled={!canAct}>
                  {UI_LABELS.review}
                </Button>
              ),
            },
          ]}
          selectable
          selectionLabel="Select validation requests"
          getRowId={(row) => row.request.id}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          onRowClick={(row) => {
            setPanel("validation", { panelId: row.request.id }, { router, pathname, searchParams });
          }}
        />
      </div>
    );
  })();

  const completedContent = filteredCompleted.length ? (
    <div className="space-y-3">
      <TableFilters>
        <Input
          value={filterQuery}
          onChange={(event) => setFilterQuery(event.target.value)}
          placeholder="Search requests"
        />
      </TableFilters>
      <DataTable
        rows={filteredCompleted}
        columns={[
          {
            key: "title",
            label: "Request",
            render: (row: ValidationItem) => (
              <div>
                <div className="text-sm font-semibold">{row.request.title}</div>
                <div className="text-xs text-textMuted">{formatClaimant(row)}</div>
              </div>
            ),
          },
          {
            key: "status",
            label: "Status",
            render: (row: ValidationItem) => <StatusPill status={row.request.status} />,
          },
          {
            key: "link",
            label: "Verification",
            render: (row: ValidationItem) =>
              row.attestation?.id ? (
                <Link href={`/verify/validation/${row.attestation.id}`} className="text-xs text-accent hover:underline">
                  View verification
                </Link>
              ) : (
                <span className="text-xs text-textMuted">-</span>
              ),
          },
        ]}
      />
    </div>
  ) : (
    <EmptyState
      title="No completed validations"
      description="Completed attestations will appear here once requests are finalized."
      primaryAction={{ label: UI_LABELS.refresh, onClick: refetch }}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validator inbox"
        description="Review validation requests and issue attestations with clear, auditable steps."
        breadcrumbs={validatorInboxBreadcrumbs()}
        actions={
          <Link href="/identity" className="text-xs text-accent hover:underline">
            Manage identity
          </Link>
        }
      />

      <DegradedHint />

      {!address ? (
        <AuthRequired title="Validator access" description="Connect your wallet to view validation requests." />
      ) : profileLoading ? (
        <LoadingState title="Loading validator profile" description="Checking your validator registration." rows={2} />
      ) : profileError ? (
        <ErrorState message={profileError.message} requestId={profileError.requestId} onRetry={fetchProfile} />
      ) : !profile ? (
        <Card>
          <CardHeader className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-lg font-semibold">Register as a validator</div>
              <div className="text-sm text-textMuted">
                Validators must register before reviewing requests. Your wallet will be the signing authority.
              </div>
            </div>
            <Badge variant="neutral">Required</Badge>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={registration.displayName}
                onChange={(event) => setRegistration({ ...registration, displayName: event.target.value })}
                placeholder="Display name"
              />
              <Select
                value={registration.type}
                onChange={(event) => setRegistration({ ...registration, type: event.target.value })}
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="ORGANIZATION">Organization</option>
              </Select>
            </div>
            <Input
              value={registration.website}
              onChange={(event) => setRegistration({ ...registration, website: event.target.value })}
              placeholder="Website (optional)"
            />
            <Textarea
              value={registration.bio}
              onChange={(event) => setRegistration({ ...registration, bio: event.target.value })}
              rows={3}
              placeholder="Short bio (optional)"
            />
            <div className="flex items-center gap-2">
              <Button type="button" onClick={registerValidator} disabled={registering || !canAct}>
                {registering ? "Registering..." : UI_LABELS.registerValidator}
              </Button>
              {!canAct ? <span className="text-xs text-textMuted">Sign in to continue.</span> : null}
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardBody className="grid gap-3 md:grid-cols-4 text-sm">
              <div>
                <div className="text-xs text-textMuted">Validator</div>
                <div className="font-semibold">{profile.displayName}</div>
              </div>
              <div>
                <div className="text-xs text-textMuted">Type</div>
                <div className="font-semibold">{profile.type}</div>
              </div>
              <div>
                <div className="text-xs text-textMuted">Approvals</div>
                <div className="font-semibold">{profile.approvals ?? 0}</div>
              </div>
              <div>
                <div className="text-xs text-textMuted">Rejections</div>
                <div className="font-semibold">{profile.rejections ?? 0}</div>
              </div>
            </CardBody>
          </Card>

          <ValidatorInboxTabs
            pending={pendingContent}
            completed={completedContent}
            counts={{ pending: pendingRequests.length, completed: completedRequests.length }}
            initialId={activeTab}
            onTabChange={(id) => setActiveTab(id)}
          />
        </div>
      )}

      <Drawer open={Boolean(selectedRequest)} onClose={() => setSelectedRequest(null)} title="Attestation wizard">
        {selectedRequest ? (
          <AttestationWizard
            item={selectedRequest}
            validatorWallet={address || undefined}
            canAct={canAct}
            onComplete={() => {
              void refetch();
            }}
          />
        ) : null}
      </Drawer>
    </div>
  );
}
