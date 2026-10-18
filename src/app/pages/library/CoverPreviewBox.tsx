"use client";

import { useEffect, useRef, useState } from "react";
import { fetchMediaCoverAction } from "./actions";
import type { MediaType } from "@/lib/media-search";
import Icon from "@/components/pixel/Icon";

type CoverPreviewBoxProps = {
  type: MediaType;
  title: string;
  onCoverResolved: (url: string | null) => void;
  resetSignal?: number;
};

export default function CoverPreviewBox({
  type,
  title,
  onCoverResolved,
  resetSignal,
}: CoverPreviewBoxProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchedTitleRef = useRef<string>("");
  const requestIdRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const executeFetch = async (queryTitle: string) => {
    const trimmed = queryTitle.trim();
    if (!trimmed) {
      setCoverUrl(null);
      setIsLoading(false);
      lastFetchedTitleRef.current = "";
      onCoverResolved(null);
      return;
    }

    if (trimmed === lastFetchedTitleRef.current && !isLoading) {
      return;
    }

    lastFetchedTitleRef.current = trimmed;
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);

    try {
      const url = await fetchMediaCoverAction(type, trimmed);
      // Ensure response matches the latest query
      if (currentRequestId === requestIdRef.current) {
        setCoverUrl(url);
        setIsLoading(false);
        onCoverResolved(url);
      }
    } catch {
      if (currentRequestId === requestIdRef.current) {
        setCoverUrl(null);
        setIsLoading(false);
        onCoverResolved(null);
      }
    }
  };

  // Reset when form submits
  useEffect(() => {
    if (resetSignal !== undefined && resetSignal > 0) {
      setCoverUrl(null);
      setIsLoading(false);
      lastFetchedTitleRef.current = "";
      requestIdRef.current++;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    }
  }, [resetSignal]);

  // Handle title changes with 1s debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = title.trim();
    if (!trimmed) {
      setCoverUrl(null);
      setIsLoading(false);
      lastFetchedTitleRef.current = "";
      onCoverResolved(null);
      return;
    }

    if (trimmed === lastFetchedTitleRef.current) {
      return;
    }

    // 1-second debounce
    debounceTimerRef.current = setTimeout(() => {
      executeFetch(trimmed);
    }, 1000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [title]);

  const defaultIcon = (
    <Icon name={type === "book" ? "book" : type === "movie" ? "film" : "vinyl"} size={2} />
  );

  return (
    <div
      className="cover-preview-box"
      title={
        isLoading
          ? "Searching for cover…"
          : coverUrl
            ? "Auto-fetched cover preview"
            : "Cover preview will appear here"
      }
      onBlur={() => {
        // Trigger immediately on blur if not already fetched
        if (title.trim() && title.trim() !== lastFetchedTitleRef.current) {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          executeFetch(title);
        }
      }}
    >
      {isLoading ? (
        <div className="cover-preview-spinner" aria-label="Loading cover…" />
      ) : coverUrl ? (
        <img
          src={coverUrl}
          alt={`Cover preview for ${title}`}
          className="cover-preview-img"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            setCoverUrl(null);
            onCoverResolved(null);
          }}
        />
      ) : (
        <div className="cover-preview-placeholder">
          <span className="cover-preview-icon">{defaultIcon}</span>
          <span className="cover-preview-label">No cover</span>
        </div>
      )}
    </div>
  );
}
