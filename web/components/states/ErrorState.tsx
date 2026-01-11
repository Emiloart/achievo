import { Badge, Button, Card, CardBody } from "../ui";

export type ErrorStateProps = {
  title?: string;
  message: string;
  debugId?: string | null;
  requestId?: string | null;
  traceId?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorState({
  title = "Something went wrong",
  message,
  debugId,
  requestId,
  traceId,
  onRetry,
  retryLabel,
}: ErrorStateProps) {
  const resolvedDebugId = debugId || requestId || traceId || null;
  if (process.env.NODE_ENV !== "production" && !resolvedDebugId && /requestId|traceId/i.test(message)) {
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
        <div className="text-sm text-danger">{message}</div>
        {onRetry ? (
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
              {retryLabel || "Retry"}
            </Button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
