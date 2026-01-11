import type { ReactNode } from "react";
import { Button, ButtonLink, EmptyState as UiEmptyState } from "../ui";

export type EmptyAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
};

export type EmptyStateProps = {
  title: string;
  description?: string;
  primaryAction?: EmptyAction;
  secondaryAction?: EmptyAction;
  footer?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  primaryAction,
  secondaryAction,
  footer,
  className,
}: EmptyStateProps) {
  const renderAction = (action?: EmptyAction) => {
    if (!action) return null;
    if (action.href) {
      return (
        <ButtonLink href={action.href} variant={action.variant || "primary"} size="sm">
          {action.label}
        </ButtonLink>
      );
    }
    if (action.onClick) {
      return (
        <Button type="button" variant={action.variant || "primary"} size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      );
    }
    return null;
  };

  const actionNode =
    primaryAction || secondaryAction ? (
      <div className="flex flex-wrap items-center justify-center gap-2">
        {renderAction(primaryAction)}
        {renderAction(secondaryAction)}
      </div>
    ) : null;

  return (
    <div className="space-y-3">
      <UiEmptyState title={title} description={description} action={actionNode} className={className} />
      {footer ? <div className="text-xs text-textMuted text-center">{footer}</div> : null}
    </div>
  );
}
