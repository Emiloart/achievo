import { forwardRef, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

const base =
  "relative isolate inline-flex items-center justify-center gap-2 rounded-full font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none";

const variantStyles: Record<Variant, string> = {
  primary: "bg-accent text-onAccent shadow-soft hover:shadow-card gradient-border glow-primary",
  secondary: "bg-surface2 text-text border border-border hover:border-accent/40",
  ghost: "bg-transparent text-text hover:bg-surface2",
  destructive: "bg-danger text-onAccent shadow-soft hover:shadow-card",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      aria-busy={loading ? "true" : undefined}
      disabled={disabled || loading}
      className={clsx(base, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {loading ? (
        <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  label: string;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "ghost", size = "sm", label, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      className={clsx(base, "p-0", variantStyles[variant], sizeStyles[size], className)}
      {...props}
    />
  ),
);
IconButton.displayName = "IconButton";

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
}: {
  href: ComponentProps<typeof Link>["href"] | string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const resolvedHref = href as ComponentProps<typeof Link>["href"];
  return (
    <Link href={resolvedHref} className={clsx(base, variantStyles[variant], sizeStyles[size], className)}>
      {children}
    </Link>
  );
}
