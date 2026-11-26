import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "warn";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-[var(--alttab)] text-white hover:bg-[var(--alttab-deep)] border border-transparent",
  secondary:
    "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--muted-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
  danger:
    "border border-[var(--danger)]/30 bg-[var(--danger)]/8 text-[var(--danger)] hover:bg-[var(--danger)]/12",
  warn: "border border-[var(--warn)]/30 bg-[var(--warn)]/8 text-[var(--warn)] hover:bg-[var(--warn)]/12",
};

const sizeClass: Record<Size, string> = {
  sm: "min-h-9 px-3 py-1.5 text-sm",
  md: "min-h-10 px-3.5 py-2 text-sm",
  lg: "min-h-11 px-4 py-2.5 text-base",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-semibold transition-[background-color,border-color,color,opacity] duration-150 disabled:cursor-not-allowed disabled:opacity-50 [touch-action:manipulation]";

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
  type?: never;
  onClick?: never;
  disabled?: never;
};

type Props = ButtonAsButton | ButtonAsLink;

export function Button(props: Props) {
  const {
    variant = "primary",
    size = "md",
    className = "",
    children,
  } = props;
  const cls = `${base} ${variantClass[variant]} ${sizeClass[size]} ${className}`;

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={cls}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...rest } = props as ButtonAsButton;
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
