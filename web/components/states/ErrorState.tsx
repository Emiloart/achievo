import { assertNormalizedErrorInput, normalizeError } from "../../lib/errorTaxonomy";
import { UI_LABELS } from "../../lib/uiCopy";
import { Badge, Button, Card, CardBody } from "../ui";

export type ErrorStateProps = {
  title?: string;
  message?: string;
  error?: unknown;
  debugId?: string | null;
  requestId?: string | null;
  traceId?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorState({
  title = "Something went wrong",
  message,
  error,
  debugId,
  requestId,
  traceId,
  onRetry,
  retryLabel,
}: ErrorStateProps) {
  assertNormalizedErrorInput(error, "ErrorState");
  const normalized = normalizeError(error || message || "", message || undefined);
  const resolvedDebugId =
    debugId || requestId || traceId || normalized.requestId || (error as { requestId?: string })?.requestId || null;
  const resolvedMessage = message || normalized.message;
  const tone = normalized.severity === "info" ? "info" : normalized.severity === "warning" ? "warning" : "danger";
  if (
    process.env.NODE_ENV !== "production" &&
    !resolvedDebugId &&
    /requestId|traceId/i.test(String(message || resolvedMessage))
  ) {
    // eslint-disable-next-line no-console
    console.warn("ErrorState received a message containing a request id, but no debug id was provided.");
  }
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">{title}</div>
          {resolvedDebugId ? <Badge variant="warning">Ref {resolvedDebugId}</Badge> : null}
        </div>
        <div
          className={`text-sm ${tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-info"}`}
        >
          {resolvedMessage}
        </div>
        {!onRetry && normalized.action.type !== "none" ? (
          <div className="text-xs text-textMuted">Suggested action: {normalized.action.label}</div>
        ) : null}
        {onRetry ? (
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
              {retryLabel || (normalized.action.type === "retry" ? normalized.action.label : undefined) || UI_LABELS.retry}
            </Button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
