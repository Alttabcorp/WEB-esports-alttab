import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  inset?: boolean;
  as?: "div" | "section" | "aside" | "header";
};

export function Panel({
  children,
  className = "",
  strong = false,
  inset = false,
  as: Tag = "div",
}: Props) {
  const surface = inset
    ? "panel-inset"
    : strong
      ? "panel-strong"
      : "panel";
  return <Tag className={`${surface} ${className}`}>{children}</Tag>;
}
