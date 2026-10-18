"use client";

import Icon from "./Icon";
import PixelButton from "./PixelButton";
import PixelFrame from "./PixelFrame";
import PixelLink from "./PixelLink";
import styles from "./PixelErrorScreen.module.css";

export type PixelErrorScreenProps = {
  title?: string;
  message?: string;
  /** Retry handler (Next's `reset`). Omit to hide the button. */
  onRetry?: () => void;
  digest?: string;
  /** Sit inside a page instead of covering it. */
  inline?: boolean;
  /** Extra link, e.g. "Back to the library". */
  home?: { href: string; label: string };
};

/** Friendly pixel error / empty-state screen used by error.tsx and not-found.tsx. */
export default function PixelErrorScreen({
  title = "Something broke",
  message = "The haven hit a snag. You can try again, or head back home.",
  onRetry,
  digest,
  inline = false,
  home = { href: "/", label: "Back to the haven" },
}: PixelErrorScreenProps) {
  return (
    <div className={`${styles.screen} ${inline ? styles.inline : ""}`}>
      <PixelFrame className={styles.card} role="alert">
        <Icon name="hourglass" size={2} />
        <h1 className={styles.title}>{title}</h1>
        <p>{message}</p>
        <div className={styles.buttons}>
          {onRetry ? <PixelButton onClick={onRetry}>Try again</PixelButton> : null}
          <PixelLink href={home.href}>
            <Icon name="arrow_left" size={1} /> {home.label}
          </PixelLink>
        </div>
        {digest ? <span className={styles.digest}>Error code: {digest}</span> : null}
      </PixelFrame>
    </div>
  );
}
