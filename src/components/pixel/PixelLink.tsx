import type { AnchorHTMLAttributes } from "react";
import { cx, spriteVars } from "@/lib/sprites";
import styles from "./PixelButton.module.css";

/** An <a> that looks and behaves like PixelButton (for navigation, incl. /auth/* routes). */
export default function PixelLink({
  className,
  style,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const vars = spriteVars("button", {
    hover: "buttonHover",
    pressed: "buttonPressed",
  });
  return (
    <a
      className={cx(styles.root, "px-mo-button", !vars && styles.fallback, className)}
      style={{ ...vars, ...style }}
      {...rest}
    />
  );
}
