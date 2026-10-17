import { cx, spriteVars } from "@/lib/sprites";
import styles from "./PixelDivider.module.css";

export type PixelDividerProps = { className?: string };

/** Horizontal rule. Uses SPRITES.divider when it exists, else a 2px ink line. */
export default function PixelDivider({ className }: PixelDividerProps) {
  const vars = spriteVars("divider");
  return (
    <hr
      className={cx(styles.root, !vars && styles.fallback, className)}
      style={vars ?? undefined}
    />
  );
}
