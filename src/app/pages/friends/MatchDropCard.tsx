"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  connectMatchDropAction,
  dismissMatchDropAction,
  pollHavenMatchStateAction,
} from "./actions";
import {
  getNextDropTarget,
  type HavenMatchState,
} from "@/lib/match-drop";
import "./match-drop.css";

type MatchDropCardProps = {
  initialState?: HavenMatchState;
  myId: string;
};

function formatCountdown(target: Date, now: Date) {
  let diff = target.getTime() - now.getTime();
  if (diff < 0) {
    diff = 0;
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export default function MatchDropCard({
  initialState,
}: MatchDropCardProps) {
  const [state, setState] = useState<HavenMatchState>(
    initialState ?? { mode: "waiting", match: null },
  );
  const [targetDate, setTargetDate] = useState<Date>(() => getNextDropTarget());
  const [countdownText, setCountdownText] = useState("");
  const [loading, setLoading] = useState(false);

  // Synchronize state when initialState prop updates from parent
  const [prevState, setPrevState] = useState(initialState);
  if (initialState !== prevState) {
    setPrevState(initialState);
    setState(initialState ?? { mode: "waiting", match: null });
  }

  // Live countdown timer — ONLY active during the 'waiting' mode
  useEffect(() => {
    if (state.mode !== "waiting") return;

    function tick() {
      const now = new Date();
      if (now.getTime() >= targetDate.getTime()) {
        const next = new Date(targetDate);
        next.setDate(next.getDate() + 7);
        setTargetDate(next);
        setCountdownText(formatCountdown(next, now));
      } else {
        setCountdownText(formatCountdown(targetDate, now));
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [state.mode, targetDate]);

  // Periodic poll to detect partner connection or state transitions (e.g. drop triggered or matches cleared)
  useEffect(() => {
    let isMounted = true;
    const pollInterval = setInterval(async () => {
      const res = await pollHavenMatchStateAction();
      if (isMounted && res.state) {
        setState(res.state);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  async function handleConnect() {
    if (state.mode !== "active" || !state.hasMatch || !state.match) return;
    setLoading(true);

    const res = await connectMatchDropAction(state.match.matchId);
    if (res.success) {
      if (res.isMutual) {
        setState((prev) =>
          prev.mode === "active" && prev.hasMatch && prev.match
            ? {
                mode: "active",
                hasMatch: true,
                match: {
                  ...prev.match,
                  status: "connected",
                  myConnected: true,
                  otherConnected: true,
                },
              }
            : prev,
        );
      } else {
        setState((prev) =>
          prev.mode === "active" && prev.hasMatch && prev.match
            ? {
                mode: "active",
                hasMatch: true,
                match: {
                  ...prev.match,
                  myConnected: true,
                },
              }
            : prev,
        );
      }
    }
    setLoading(false);
  }

  async function handleDismiss() {
    if (state.mode !== "active" || !state.hasMatch || !state.match) return;
    const partnerName = state.match.partner.display_name ?? "this reader";
    const confirmPass = window.confirm(
      `Pass on connecting with ${partnerName} for this cycle?`,
    );
    if (!confirmPass) return;

    setLoading(true);
    const res = await dismissMatchDropAction(state.match.matchId);
    if (res.success) {
      setState({ mode: "active", hasMatch: false, match: null });
    }
    setLoading(false);
  }

  // ==========================================
  // STATE 1: WAITING MODE (No active matches)
  // Shows countdown timer until the next drop
  // ==========================================
  if (state.mode === "waiting") {
    return (
      <div className="match-drop-container">
        <div className="match-drop-card match-drop-card-empty">
          <div className="match-drop-empty-icon">🕯️</div>
          <h2 className="match-drop-empty-title">Haven Match Lounge</h2>
          <p className="match-drop-empty-desc">
            The Haven elders are consulting the archives. When the drop arrives,
            kindred spirits will be revealed!
          </p>
          <div className="match-drop-countdown">
            <span>⏱️ Next Drop in:</span>
            <strong>{countdownText || "Calculating…"}</strong>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // STATE 2A: ACTIVE MODE — UNMATCHED USER (Haven Scout)
  // Reassuring lounge message. NO countdown timer displayed.
  // ========================================================
  if (!state.hasMatch || !state.match) {
    return (
      <div className="match-drop-container">
        <div className="match-drop-card match-drop-card-scout">
          <div className="match-drop-scout-icon">🏕️</div>
          <div className="match-drop-scout-content">
            <h2 className="match-drop-scout-title">Haven Lounge Scout</h2>
            <p className="match-drop-scout-body">
              The library elders couldn&apos;t find an unacquainted kindred spirit
              for you in this drop, but your place is reserved at the front of the
              lounge for next week&apos;s gathering.
            </p>
            <p className="match-drop-scout-subtext">
              All other active readers in Storyhaven are currently in your circle of
              friends. Explore the library catalogs or check back when new travelers arrive!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // STATE 2B: ACTIVE MODE — MATCHED USER
  // Displays kindred spirit profile. NO countdown timer.
  // ========================================================
  const match = state.match;
  const isMutualConnected =
    match.status === "connected" || (match.myConnected && match.otherConnected);

  return (
    <div className="match-drop-container">
      <div className="match-drop-card">
        {/* Header without countdown timer */}
        <div className="match-drop-header">
          <div className="match-drop-title-group">
            <span className="match-drop-sparkle">✨</span>
            <h2 className="match-drop-title">Haven Match Drop</h2>
          </div>
        </div>

        {/* Kindred Spirit Profile */}
        <div className="match-drop-profile-row">
          <div className="match-drop-avatar-wrap">
            {match.partner.avatar_url ? (
              <Image
                src={match.partner.avatar_url}
                alt={match.partner.display_name ?? "Partner"}
                width={54}
                height={54}
                className="match-drop-avatar"
              />
            ) : (
              <div className="match-drop-avatar-placeholder">
                {(match.partner.display_name?.[0] ?? "K").toUpperCase()}
              </div>
            )}
          </div>

          <div className="match-drop-details">
            <h3 className="match-drop-name">
              Meet {match.partner.display_name ?? "Kindred Spirit"}
            </h3>
            <p className="match-drop-subline">
              {match.isDiscovery
                ? "Curated Discovery • Paired by our lounge elders"
                : `Kindred Spirit • Shared media similarity score: ${match.score}`}
            </p>

            <div className="match-drop-media-list">
              {match.sharedTitles.length > 0 ? (
                match.sharedTitles.map((title, idx) => (
                  <span key={idx} className="match-drop-pill">
                    {title.type === "book"
                      ? "📚"
                      : title.type === "movie"
                        ? "🎬"
                        : "🎵"}{" "}
                    {title.name}
                  </span>
                ))
              ) : (
                <span className="match-drop-pill match-drop-pill-discovery">
                  🌟 Lounge Explorer
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Icebreaker Prompt */}
        <div className="match-drop-icebreaker">
          <span className="match-drop-icebreaker-label">Suggested Icebreaker</span>
          &ldquo;{match.icebreaker}&rdquo;
        </div>

        {/* Inbound Notice if partner connected first */}
        {!match.myConnected && match.otherConnected && (
          <div className="match-drop-inbound-banner">
            <span>✨</span>
            <strong>
              {match.partner.display_name ?? "This reader"} clicked Connect!
            </strong>{" "}
            Click Connect below to unlock your direct chat.
          </div>
        )}

        {/* Mutual Match Banner */}
        {isMutualConnected && (
          <div className="match-drop-celebration">
            <span>🎉</span>
            <strong>It&apos;s a Match!</strong> You and{" "}
            {match.partner.display_name ?? "your match"} are connected.
          </div>
        )}

        {/* Actions */}
        <div className="match-drop-actions">
          <div className="match-drop-buttons">
            {isMutualConnected ? (
              <Link
                href={`/pages/friends?with=${encodeURIComponent(match.partner.id)}&draft=${encodeURIComponent(match.icebreaker)}`}
                className="match-drop-btn-chat"
              >
                Open Direct Chat 💬
              </Link>
            ) : match.myConnected ? (
              <span className="match-drop-waiting-pill">
                ⏳ Waiting for {match.partner.display_name ?? "them"} to connect back…
              </span>
            ) : (
              <button
                onClick={handleConnect}
                disabled={loading}
                className="match-drop-btn-connect"
              >
                {loading ? "Connecting…" : "Connect 👋"}
              </button>
            )}
          </div>

          {!isMutualConnected && (
            <button
              onClick={handleDismiss}
              disabled={loading}
              className="match-drop-btn-pass"
            >
              Pass on this match
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
