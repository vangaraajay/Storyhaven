import type { ReactNode } from "react";
import Icon from "@/components/pixel/Icon";
import type { MediaType } from "@/lib/forum";

interface MediaBadgeProps {
  type: MediaType;
  title?: string | null;
  className?: string;
  onClick?: () => void;
}

const BADGE_STYLES: Record<MediaType, { bg: string; text: string; border: string; icon: ReactNode }> = {
  book: {
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#3e5a2a",
    border: "rgba(16, 185, 129, 0.3)",
    icon: <Icon name="book" size={1} />,
  },
  movie: {
    bg: "rgba(244, 63, 94, 0.12)",
    text: "#8f2f3e",
    border: "rgba(244, 63, 94, 0.3)",
    icon: <Icon name="film" size={1} />,
  },
  album: {
    bg: "rgba(232, 201, 160, 0.12)",
    text: "#7a4a1e",
    border: "rgba(232, 201, 160, 0.3)",
    icon: <Icon name="vinyl" size={1} />,
  },
  general: {
    bg: "rgba(217, 119, 6, 0.12)",
    text: "#8a5a1e",
    border: "rgba(217, 119, 6, 0.3)",
    icon: <Icon name="mug" size={1} />,
  },
};

export default function MediaBadge({ type, title, className = "", onClick }: MediaBadgeProps) {
  const meta = BADGE_STYLES[type] ?? BADGE_STYLES.general;
  const label = title || type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <span
      onClick={onClick}
      style={{
        backgroundColor: meta.bg,
        color: meta.text,
        borderColor: meta.border,
      }}
      className={`forum-badge ${onClick ? "clickable" : ""} ${className}`}
    >
      {meta.icon} {label}
    </span>
  );
}
