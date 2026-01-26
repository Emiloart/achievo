"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useBackendAuth } from "../../hooks/useBackendAuth";
import { useValidatorRequests, type ValidationItem } from "../../hooks/useValidations";
import { AuthRequired } from "../states/AuthRequired";
import { DegradedHint } from "../states/DegradedHint";
import { ErrorState } from "../states/ErrorState";
import { LoadingState } from "../states/LoadingState";
import { Card, CardBody, CopyField, StatusPill } from "../ui";

type ValidationRequestPanelProps = {
  requestId: string;
};

function formatClaimant(item: ValidationItem) {
  const claimant = item.claimant || {};
  if (claimant.displayName || claimant.achusrId) {
    return `${claimant.displayName || claimant.achusrId} (@${claimant.username || claimant.achusrId})`;
  }
  return `Claimant ${item.request.claimantUserId}`;
}

export function ValidationRequestPanel({ requestId }: ValidationRequestPanelProps) {
  const { address } = useAccount();
  const { token } = useBackendAuth();
  const { items, state, error, refetch } = useValidatorRequests(address);

  const request = useMemo(() => items.find((item) => item.request.id === requestId) || null, [items, requestId]);

  if (!address || !token) {
    return <AuthRequired title="Validator access" description="Sign in to view validation details." />;
  }

  if (state.status === "loading") {
    return <LoadingState title="Loading request" description="Fetching validation details." rows={2} />;
  }

  if (state.status === "failed") {
    return <ErrorState message={error || "Unable to load validator request."} onRetry={refetch} />;
  }

  if (!request) {
    return <ErrorState message="Validation request not found." />;
  }

  return (
    <div className="space-y-4">
      <DegradedHint />
      <Card>
        <CardBody className="space-y-3">
          <div>
            <div className="text-xs text-textMuted">Request</div>
            <div className="text-sm font-semibold">{request.request.title}</div>
          </div>
          <div className="text-xs text-textMuted">{formatClaimant(request)}</div>
          <div className="flex items-center gap-2">
            <StatusPill status={request.request.status} />
            <span className="text-xs text-textMuted">{request.request.visibility || "PRIVATE"}</span>
          </div>
          <CopyField label="Request ID" value={request.request.id} />
          {request.request.summary ? (
            <div className="text-sm">
              <div className="text-xs text-textMuted">Summary</div>
              <div>{request.request.summary}</div>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
