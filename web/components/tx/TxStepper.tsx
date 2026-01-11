import { Badge, Button, Card, CardBody, CopyField } from "../ui";
import type { TxError, TxState } from "./TxTypes";

type Step = { id: "wallet" | "submitted" | "confirming" | "finalized"; label: string };

const STEPS: Step[] = [
  { id: "wallet", label: "Confirm in wallet" },
  { id: "submitted", label: "Submitted" },
  { id: "confirming", label: "Confirming" },
  { id: "finalized", label: "Finalized" },
];

function resolveStepState(state: TxState, step: Step["id"]) {
  if (state === "idle") return step === "wallet" ? "pending" : "pending";
  if (state === "walletPrompt") return step === "wallet" ? "active" : "pending";
  if (state === "submitted") return step === "wallet" ? "done" : step === "submitted" ? "active" : "pending";
  if (state === "confirming") {
    if (step === "wallet") return "done";
    if (step === "submitted") return "done";
    if (step === "confirming") return "active";
    return "pending";
  }
  if (state === "finalized") return "done";
  if (state === "failed" || state === "unknown" || state === "reorged") return "error";
  return "pending";
}

function statusBadge(state: TxState) {
  if (state === "finalized") return <Badge variant="verified">Finalized</Badge>;
  if (state === "confirming") return <Badge variant="info">Confirming</Badge>;
  if (state === "submitted") return <Badge variant="info">Submitted</Badge>;
  if (state === "walletPrompt") return <Badge variant="warning">Awaiting signature</Badge>;
  if (state === "reorged") return <Badge variant="warning">Reorg detected</Badge>;
  if (state === "unknown") return <Badge variant="warning">Unknown</Badge>;
  if (state === "failed") return <Badge variant="danger">Failed</Badge>;
  return <Badge variant="neutral">Idle</Badge>;
}

export type TxStepperProps = {
  state: TxState;
  txHash?: string | null;
  confirmations?: number;
  requiredConfirmations?: number;
  error?: TxError | null;
  onRetry?: () => void;
};

export function TxStepper({
  state,
  txHash,
  confirmations,
  requiredConfirmations,
  error,
  onRetry,
}: TxStepperProps) {
  const safeState = state === "finalized" && !txHash ? "unknown" : state;
  const showRetry = Boolean(onRetry) && (safeState === "failed" || safeState === "unknown" || safeState === "reorged");
  const confirmationText =
    confirmations !== undefined && requiredConfirmations !== undefined
      ? `${confirmations}/${requiredConfirmations} confirmations`
      : null;
  if (process.env.NODE_ENV !== "production" && state === "finalized" && !txHash) {
    // eslint-disable-next-line no-console
    console.error("TxStepper invariant violated: finalized state requires a transaction hash.");
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Transaction status</div>
          {statusBadge(safeState)}
        </div>
        <div className="space-y-2">
          {STEPS.map((step) => {
            const stepState = resolveStepState(safeState, step.id);
            return (
              <div key={step.id} className="flex items-center gap-3 text-xs">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    stepState === "done"
                      ? "bg-status-verified"
                      : stepState === "active"
                        ? "bg-info"
                        : stepState === "error"
                          ? "bg-danger"
                          : "bg-border"
                  }`}
                />
                <span className={stepState === "active" ? "text-text" : "text-textMuted"}>{step.label}</span>
                {step.id === "confirming" && confirmationText ? (
                  <span className="text-textMuted">{confirmationText}</span>
                ) : null}
              </div>
            );
          })}
        </div>
        {txHash ? <CopyField label="Transaction hash" value={txHash} /> : null}
        {error ? <div className="text-xs text-danger">{error.message}</div> : null}
        {showRetry ? (
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </CardBody>
    </Card>
  );
}
