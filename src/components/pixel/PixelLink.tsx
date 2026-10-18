import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";
import { cx, spriteVars } from "@/lib/sprites";
import styles from "./PixelButton.module.css";

/** A link that looks and behaves like PixelButton. In-app paths use next/link; /auth/* and external use <a>. */
export default function PixelLink({
  className,
  style,
  href,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const vars = spriteVars("button", {
    hover: "buttonHover",
    pressed: "buttonPressed",
  });
  const cls = cx(styles.root, "px-mo-button", !vars && styles.fallback, className);
  const merged = { ...vars, ...style };
  const internal = typeof href === "string" && href.startsWith("/") && !href.startsWith("/auth/");

  if (internal) {
    return <Link href={href} className={cls} style={merged} {...rest} />;
  }
  return <a href={href} className={cls} style={merged} {...rest} />;
}
