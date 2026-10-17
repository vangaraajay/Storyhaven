import type { MediaType } from "@/lib/forum";

interface MediaBadgeProps {
  type: MediaType;
  title?: string | null;
  className?: string;
  onClick?: () => void;
}

const BADGE_STYLES: Record<MediaType, { bg: string; text: string; border: string; icon: string }> = {
  book: {
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#6ee7b7",
    border: "rgba(16, 185, 129, 0.3)",
    icon: "📚",
  },
  movie: {
    bg: "rgba(244, 63, 94, 0.12)",
    text: "#fda4af",
    border: "rgba(244, 63, 94, 0.3)",
    icon: "🎬",
  },
  album: {
    bg: "rgba(168, 85, 247, 0.12)",
    text: "#d8b4fe",
    border: "rgba(168, 85, 247, 0.3)",
    icon: "🎵",
  },
  general: {
    bg: "rgba(217, 119, 6, 0.12)",
    text: "#fde68a",
    border: "rgba(217, 119, 6, 0.3)",
    icon: "☕",
  },
};

export default function MediaBadge({ type, title, className = "", onClick }: MediaBadgeProps) {
  const meta = BADGE_STYLES[type] ?? BADGE_STYLES.general;
  const label = title ? `${meta.icon} ${title}` : `${meta.icon} ${type.charAt(0).toUpperCase() + type.slice(1)}`;

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
      {label}
    </span>
  );
}
