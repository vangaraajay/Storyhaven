export type TypingDotsProps = { label?: string; className?: string };

/** Three-dot "typing" indicator. Hops in steps() when motion is full; static otherwise. */
export default function TypingDots({ label = "Typing", className }: TypingDotsProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={className ? `px-dots px-mo-dots ${className}` : "px-dots px-mo-dots"}
    >
      <span />
      <span />
      <span />
    </span>
  );
}
