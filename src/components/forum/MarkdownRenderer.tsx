"use client";

import React, { useState } from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function SpoilerSpan({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setRevealed((prev) => !prev);
      }}
      title={revealed ? "Click to hide spoiler" : "Click to reveal spoiler"}
      style={{
        backgroundColor: revealed ? "rgba(235, 111, 146, 0.15)" : "#3e2f42",
        color: revealed ? "#eb6f92" : "transparent",
        filter: revealed ? "none" : "blur(4px)",
        userSelect: revealed ? "text" : "none",
        cursor: "pointer",
        padding: "2px 6px",
        borderRadius: "4px",
        transition: "filter 0.2s ease, background-color 0.2s ease",
        display: "inline-block",
      }}
    >
      {text}
    </span>
  );
}

/**
 * Lightweight safe markdown renderer that supports:
 * - Click-to-unblur spoiler tags: >!spoiler content!<
 * - Preserves line breaks and paragraphs
 * - Basic blockquotes (lines starting with > )
 */
export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  // Split by spoiler pattern: >!(.*?)!<
  const renderParagraph = (text: string, pIdx: number) => {
    const isBlockquote = text.startsWith(">") && !text.startsWith(">!");
    const cleanText = isBlockquote ? text.slice(1).trim() : text;

    // Regex to extract >!spoiler!<
    const parts: React.ReactNode[] = [];
    const spoilerRegex = />!(.*?)!</g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = spoilerRegex.exec(cleanText)) !== null) {
      if (match.index > lastIndex) {
        parts.push(cleanText.substring(lastIndex, match.index));
      }
      parts.push(<SpoilerSpan key={`sp-${match.index}`} text={match[1]} />);
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < cleanText.length) {
      parts.push(cleanText.substring(lastIndex));
    }

    if (isBlockquote) {
      return (
        <blockquote
          key={pIdx}
          style={{
            borderLeft: "3px solid #ebbcba",
            paddingLeft: "0.75rem",
            color: "#908caa",
            fontStyle: "italic",
            margin: "0.5rem 0",
          }}
        >
          {parts}
        </blockquote>
      );
    }

    return (
      <p key={pIdx} className="mb-2 last:mb-0 leading-relaxed break-words">
        {parts}
      </p>
    );
  };

  const paragraphs = content.split("\n\n");

  return (
    <div className={`text-sm ${className}`} style={{ color: "#e0def4" }}>
      {paragraphs.map((p, idx) => renderParagraph(p, idx))}
    </div>
  );
}
