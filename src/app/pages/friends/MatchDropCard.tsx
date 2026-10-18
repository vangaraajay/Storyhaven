"use client";

import { useEffect, useState } from "react";
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
import PixelFrame from "@/components/pixel/PixelFrame";
import PixelButton from "@/components/pixel/PixelButton";
import PixelLink from "@/components/pixel/PixelLink";
import Badge from "@/components/pixel/Badge";
import Icon from "@/components/pixel/Icon";
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
        <PixelFrame className="match-drop-card match-drop-card-empty">
          <div className="match-drop-empty-icon">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/candle.png"
              alt="Candle"
              width={32}
              height={32}
              className="px-art"
            />
          </div>
          <h2 className="match-drop-empty-title">Haven Match Lounge</h2>
          <p className="match-drop-empty-desc">
            The Haven elders are consulting the archives. When the drop arrives,
            kindred spirits will be revealed!
          </p>
          <div className="match-drop-countdown">
            <span><Icon name="hourglass" size={1} /> Next Drop in:</span>
            <strong>{countdownText || "Calculating…"}</strong>
          </div>
        </PixelFrame>
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
        <PixelFrame className="match-drop-card match-drop-card-scout">
          <div className="match-drop-scout-icon"><Icon name="user" size={2} /></div>
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
        </PixelFrame>
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
      <PixelFrame className="match-drop-card">
        {/* Header without countdown timer */}
        <div className="match-drop-header">
          <div className="match-drop-title-group">
            <Icon name="sparkle" size={1} />
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
                width={52}
                height={52}
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
                  <Badge key={idx} className="match-drop-pill">
                    {title.type === "book" ? (
                      <Icon name="book" size={1} />
                    ) : title.type === "movie" ? (
                      <Icon name="film" size={1} />
                    ) : (
                      <Icon name="vinyl" size={1} />
                    )}{" "}
                    {title.name}
                  </Badge>
                ))
              ) : (
                <Badge className="match-drop-pill match-drop-pill-discovery">
                  <Icon name="sparkle" size={1} /> Lounge Explorer
                </Badge>
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
            <Icon name="sparkle" size={1} />
            <div>
              <strong>
                {match.partner.display_name ?? "This reader"} clicked Connect!
              </strong>{" "}
              Click Connect below to unlock your direct chat.
            </div>
          </div>
        )}

        {/* Mutual Match Banner */}
        {isMutualConnected && (
          <div className="match-drop-celebration">
            <span><Icon name="sparkle" size={1} /></span>
            <div>
              <strong>It&apos;s a Match!</strong> You and{" "}
              {match.partner.display_name ?? "your match"} are connected.
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="match-drop-actions">
          <div className="match-drop-buttons">
            {isMutualConnected ? (
              <PixelLink
                href={`/pages/friends?with=${encodeURIComponent(match.partner.id)}&draft=${encodeURIComponent(match.icebreaker)}`}
              >
                Open Direct Chat <Icon name="chat" size={1} />
              </PixelLink>
            ) : match.myConnected ? (
              <span className="match-drop-waiting-pill">
                <Icon name="hourglass" size={1} /> Waiting for {match.partner.display_name ?? "them"} to connect back…
              </span>
            ) : (
              <PixelButton
                onClick={handleConnect}
                disabled={loading}
              >
                {loading ? "Connecting…" : <>Connect <Icon name="match" size={1} /></>}
              </PixelButton>
            )}
          </div>

          {!isMutualConnected && (
            <button
              type="button"
              onClick={handleDismiss}
              disabled={loading}
              className="match-drop-btn-pass"
            >
              Pass on this match
            </button>
          )}
        </div>
      </PixelFrame>
    </div>
  );
}

