"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { cx } from "@/lib/sprites";
import Icon from "./Icon";
import styles from "./StarRating.module.css";

export type StarRatingProps = {
  /** When set, a hidden input with this name submits the value ("" if unrated). */
  name?: string;
  defaultValue?: number | null;
  /** Controlled mode. */
  value?: number | null;
  onChange?: (value: number | null) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

const STARS = [1, 2, 3, 4, 5] as const;

/**
 * 5-star rating as a radio group of buttons. Whole stars only (half ratings
 * already stored are shown rounded down and are kept until the user changes
 * them). Click the selected star, or press Backspace/Delete, to clear.
 * Arrows/Home/End move the selection.
 */
export default function StarRating({
  name,
  defaultValue = null,
  value: controlled,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel = "Rating",
}: StarRatingProps) {
  const [inner, setInner] = useState<number | null>(defaultValue);
  const [touched, setTouched] = useState(false);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : inner;
  const shown = value ? Math.floor(value) : 0;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function commit(next: number | null) {
    setTouched(true);
    if (!isControlled) setInner(next);
    onChange?.(next);
  }

  function focusStar(n: number) {
    refs.current[n - 1]?.focus();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (disabled) return;
    const current = shown || 0;
    let next: number | null | undefined;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = Math.min(5, current + 1);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = Math.max(1, current - 1);
        break;
      case "Home":
        next = 1;
        break;
      case "End":
        next = 5;
        break;
      case "Backspace":
      case "Delete":
        next = null;
        break;
      default:
        return;
    }
    e.preventDefault();
    commit(next);
    if (next) focusStar(next);
  }

  // Keep an untouched stored half-rating (e.g. 3.5) intact on submit.
  const submitted = value == null ? "" : String(touched ? Math.floor(value) : value);
  // Roving tabindex: the checked star, else the first.
  const tabStop = shown || 1;

  return (
    <span
      role="radiogroup"
      aria-label={ariaLabel}
      className={cx(styles.group, disabled && styles.disabled, className)}
      onKeyDown={onKeyDown}
    >
      {name ? <input type="hidden" name={name} value={submitted} /> : null}
      {STARS.map((n) => (
        <button
          key={n}
          ref={(el) => {
            refs.current[n - 1] = el;
          }}
          type="button"
          role="radio"
          aria-checked={shown === n}
          aria-label={`Rate ${n} of 5`}
          tabIndex={n === tabStop ? 0 : -1}
          disabled={disabled}
          className={cx(styles.star, "px-mo-star")}
          onClick={() => commit(shown === n ? null : n)}
        >
          <Icon name={n <= shown ? "star_full" : "star_empty"} size={2} />
        </button>
      ))}
    </span>
  );
}
