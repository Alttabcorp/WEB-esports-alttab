"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type Props = {
  label: string;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
};

export function Menu({
  label,
  children,
  align = "right",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative z-50 ${className}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-9 items-center rounded-lg border px-3 py-1.5 text-sm transition ${
          open
            ? "border-[var(--border-strong)] text-white"
            : "border-[var(--border)] text-[var(--muted-strong)] hover:text-white"
        }`}
      >
        {label}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={`absolute z-50 mt-1 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-1 shadow-2xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({
  children,
  href,
  onClick,
  className = "",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const classes = `block w-full px-3 py-2.5 text-left text-sm text-[var(--muted-strong)] hover:bg-white/5 hover:text-white ${className}`;
  if (href) {
    return (
      <a role="menuitem" href={href} className={classes} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" role="menuitem" className={classes} onClick={onClick}>
      {children}
    </button>
  );
}
