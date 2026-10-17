import type { ButtonHTMLAttributes } from "react";
import { cx, spriteVars } from "@/lib/sprites";
import styles from "./PixelButton.module.css";

export type PixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Force the pressed look (used by the dev kit). */
  pressed?: boolean;
};

/** Drop-in <button>: same props, plus `pressed`. `type` defaults to "button". */
export default function PixelButton({
  className,
  style,
  pressed,
  type = "button",
  ...rest
}: PixelButtonProps) {
  const vars = spriteVars("button", {
    hover: "buttonHover",
    pressed: "buttonPressed",
  });
  return (
    <button
      type={type}
      className={cx(
        styles.root,
        !vars && styles.fallback,
        pressed && styles.pressed,
        className,
      )}
      style={{ ...vars, ...style }}
      {...rest}
    />
  );
}
