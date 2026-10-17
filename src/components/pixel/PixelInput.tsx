import type {
  CSSProperties,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cx, spriteVars } from "@/lib/sprites";
import styles from "./PixelInput.module.css";

type Forced = { /** Show the focus art (used by the dev kit). */ forceFocus?: boolean };

function fieldProps(
  className: string | undefined,
  style: CSSProperties | undefined,
  forceFocus: boolean | undefined,
) {
  const vars = spriteVars("input", { focus: "inputFocus" });
  return {
    className: cx(
      styles.root,
      !vars && styles.fallback,
      forceFocus && styles.forceFocus,
      className,
    ),
    style: { ...vars, ...style },
  };
}

/** Drop-in <input>. */
export default function PixelInput({
  className,
  style,
  forceFocus,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & Forced) {
  return <input {...fieldProps(className, style, forceFocus)} {...rest} />;
}

/** Drop-in <textarea>. */
export function PixelTextarea({
  className,
  style,
  forceFocus,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & Forced) {
  return <textarea {...fieldProps(className, style, forceFocus)} {...rest} />;
}

/** Drop-in <select>. */
export function PixelSelect({
  className,
  style,
  forceFocus,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & Forced) {
  return <select {...fieldProps(className, style, forceFocus)} {...rest} />;
}
