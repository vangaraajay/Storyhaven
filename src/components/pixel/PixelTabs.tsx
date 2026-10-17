"use client";

import type { ReactNode } from "react";
import { cx, spriteVars } from "@/lib/sprites";
import styles from "./PixelTabs.module.css";

export type PixelTab<T extends string> = {
  id: T;
  label: ReactNode;
  icon?: ReactNode;
};

export type PixelTabsProps<T extends string> = {
  tabs: PixelTab<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  "aria-label"?: string;
};

/** Tab bar: inactive/active sprites swap instantly (no transitions). */
export default function PixelTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
}: PixelTabsProps<T>) {
  const inactiveVars = spriteVars("tab");
  const activeVars = spriteVars("tabActive");

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cx(styles.list, className)}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === value;
        const vars = isActive ? activeVars : inactiveVars;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cx(
              styles.tab,
              !vars && styles.fallback,
              isActive && styles.active,
            )}
            style={vars ?? undefined}
          >
            {tab.icon ? <span aria-hidden>{tab.icon}</span> : null}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
