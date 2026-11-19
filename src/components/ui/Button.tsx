import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "warn";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-[var(--alttab)] text-white hover:bg-[var(--alttab-deep)] border border-transparent",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--alttab)]/10 text-[var(--alttab-soft)] hover:bg-[var(--alttab)]/20 hover:text-white",
  ghost:
    "border border-[var(--border)] bg-transparent text-[var(--muted-strong)] hover:bg-white/5 hover:text-white",
  danger:
    "border border-[var(--danger)]/35 bg-[var(--danger)]/10 text-red-100 hover:bg-[var(--danger)]/20",
  warn: "border border-[var(--warn)]/35 bg-[var(--warn)]/10 text-amber-100 hover:bg-[var(--warn)]/20",
};

const sizeClass: Record<Size, string> = {
  sm: "min-h-9 px-3 py-1.5 text-sm",
  md: "min-h-10 px-3.5 py-2 text-sm",
  lg: "min-h-11 px-4 py-2.5 text-base",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

type Common = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type ButtonAsLink = Common & {
  href: string;
  onClick?: () => void;
};

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "md";
  const className = props.className ?? "";
  const classes = `${base} ${variantClass[variant]} ${sizeClass[size]} ${className}`;

  if (props.href) {
    return (
      <Link href={props.href} className={classes} onClick={props.onClick}>
        {props.children}
      </Link>
    );
  }

  const {
    variant: _variant,
    size: _size,
    className: _className,
    children,
    href: _href,
    ...rest
  } = props as ButtonAsButton;

  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
