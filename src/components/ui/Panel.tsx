import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  as?: "div" | "section" | "aside" | "header";
};

export function Panel({
  children,
  className = "",
  strong = false,
  as: Tag = "div",
}: Props) {
  return (
    <Tag className={`${strong ? "panel-strong" : "panel"} ${className}`}>
      {children}
    </Tag>
  );
}
