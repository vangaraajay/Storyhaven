import type { HTMLAttributes } from "react";
import { cx, spriteVars } from "@/lib/sprites";
import styles from "./PixelFrame.module.css";

export type PixelFrameProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article" | "aside";
};

/** 9-slice panel/card. Content sits inside the sprite border. */
export default function PixelFrame({
  as: Tag = "div",
  className,
  style,
  ...rest
}: PixelFrameProps) {
  const vars = spriteVars("frame");
  return (
    <Tag
      className={cx(styles.root, "px-mo-frame", !vars && styles.fallback, className)}
      style={{ ...vars, ...style }}
      {...rest}
    />
  );
}
