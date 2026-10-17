"use client";

import type { ReactNode } from "react";
import { cx, spriteVars } from "@/lib/sprites";
import styles from "./Badge.module.css";

export type BadgeProps = {
  children: ReactNode;
  className?: string;
  /** When set, renders a <button>; otherwise a <span>. */
  onClick?: () => void;
};

/** Small label pill (9-slice, 3px corners). */
export default function Badge({ children, className, onClick }: BadgeProps) {
  const vars = spriteVars("badge");
  const cls = cx(styles.root, !vars && styles.fallback, className);

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls} style={vars ?? undefined}>
        {children}
      </button>
    );
  }
  return (
    <span className={cls} style={vars ?? undefined}>
      {children}
    </span>
  );
}
