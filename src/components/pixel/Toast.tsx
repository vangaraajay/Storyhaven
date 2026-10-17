"use client";

import type { ReactNode } from "react";
import { cx, spriteVars } from "@/lib/sprites";
import styles from "./Toast.module.css";

export type ToastProps = {
  children: ReactNode;
  /** Shows a close button when provided. */
  onClose?: () => void;
  /** Use "alert" for errors; defaults to a polite status. */
  role?: "status" | "alert";
  className?: string;
};

/** Presentational notification. Mounting/timing is up to the caller. */
export default function Toast({
  children,
  onClose,
  role = "status",
  className,
}: ToastProps) {
  const vars = spriteVars("toast");
  return (
    <div
      role={role}
      className={cx(styles.root, !vars && styles.fallback, className)}
      style={vars ?? undefined}
    >
      <span className={styles.message}>{children}</span>
      {onClose ? (
        <button type="button" className={styles.close} onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      ) : null}
    </div>
  );
}
