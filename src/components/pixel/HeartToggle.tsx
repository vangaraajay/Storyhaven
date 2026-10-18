"use client";

import { useState } from "react";
import { cx } from "@/lib/sprites";
import Icon from "./Icon";
import styles from "./HeartToggle.module.css";

export type HeartToggleProps = {
  /** Submits "on" under this name when liked (same as a checkbox). */
  name?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  className?: string;
};

/**
 * Favorite toggle: a small grey heart that grows into a full-size red one when clicked.
 * Pixel-art friendly: the grow is a hard size swap (24px -> 48px), plus a stepped hop when motion is full.
 */
export default function HeartToggle({
  name,
  defaultChecked = false,
  checked,
  onChange,
  label = "Favorite",
  className,
}: HeartToggleProps) {
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;

  function toggle() {
    const next = !on;
    if (checked === undefined) setInner(next);
    onChange?.(next);
  }

  return (
    <>
      {name && on ? <input type="hidden" name={name} value="on" /> : null}
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={cx(styles.heart, on && styles.on, className)}
      onClick={toggle}
    >
      <span className={styles.art} aria-hidden>
        <Icon name="heart" size={on ? 2 : 1} className={cx(styles.icon, on && "px-mo-heart")} />
      </span>
      <span className={styles.label}>{label}</span>
    </button>
    </>
  );
}
