import { ICONS, type IconName } from "@/lib/sprites";

export type IconProps = {
  name: IconName;
  /** 1 = 16px, 2 = 32px. */
  size?: 1 | 2;
  /** Accessible name. Without it the icon is decorative (alt="", aria-hidden). */
  label?: string;
  className?: string;
};

/** 16x16 pixel icon, drawn crisp at 16 * size px. */
export default function Icon({ name, size = 2, label, className }: IconProps) {
  const px = 16 * size;
  return (
    // Plain <img>: the optimizer would resample the sprite.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ICONS[name]}
      width={px}
      height={px}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      className={className ? `px-art ${className}` : "px-art"}
      draggable={false}
    />
  );
}
