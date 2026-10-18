"use client";

import { useEffect, useState } from "react";
import { getBotStatsAction, purgeBotsAction } from "./bot-actions";
import type { BotStats } from "@/lib/bot-generator";

type BotGeneratorPanelProps = {
  adminPassword: string;
};

type ProgressState = {
  step: number;
  totalSteps: number;
  message: string;
};

type SummaryState = {
  botsActive: number;
  newBotsCreated: number;
  postsCreated: number;
  commentsCreated: number;
  votesSimulated: number;
};

export default function BotGeneratorPanel({
  adminPassword,
}: BotGeneratorPanelProps) {
  const [stats, setStats] = useState<BotStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Configuration Inputs
  const [botCount, setBotCount] = useState<number>(8);
  const [postCount, setPostCount] = useState<number>(4);
  const [commentCount, setCommentCount] = useState<number>(12);
  const [nestedRatio, setNestedRatio] = useState<number>(40);
  const [simulateVotes, setSimulateVotes] = useState<boolean>(true);

  // Status & Progress State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Purge Modal State
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState<boolean>(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  async function loadStats() {
    setStatsLoading(true);
    const res = await getBotStatsAction(adminPassword);
    if (res.success && res.data) {
      setStats(res.data);
    }
    setStatsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const res = await getBotStatsAction(adminPassword);
      if (!cancelled && res.success && res.data) {
        setStats(res.data);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [adminPassword]);

  async function handleStartGeneration() {
    setIsGenerating(true);
    setProgress({
      step: 1,
      totalSteps: 4,
      message: "Initiating batch generation stream...",
    });
    setSummary(null);
    setErrorMessage(null);
    setPurgeResult(null);

    try {
      const response = await fetch("/api/admin/bots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: adminPassword,
          botCount,
          postCount,
          commentCount,
          nestedRatio: nestedRatio / 100,
          simulateVotes,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json();
        throw new Error(errorJson.error || "Generation request failed.");
      }

      if (!response.body) {
        throw new Error("No response body received from generation stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          try {
            const data = JSON.parse(trimmed.slice(5).trim());

            if (data.type === "progress") {
              setProgress({
                step: data.step,
                totalSteps: data.totalSteps,
                message: data.message,
              });
            } else if (data.type === "complete") {
              setSummary(data.summary);
              setProgress(null);
              loadStats();
            } else if (data.type === "error") {
              setErrorMessage(data.error);
              setProgress(null);
            }
          } catch (jsonErr) {
            console.error("SSE parse error:", jsonErr);
          }
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to generate bot content.";
      setErrorMessage(message);
      setProgress(null);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handlePurge() {
    setShowPurgeConfirm(false);
    setIsPurging(true);
    setErrorMessage(null);
    setSummary(null);

    const res = await purgeBotsAction(adminPassword);
    if (res.success) {
      setPurgeResult(
        `Successfully wiped ${res.count ?? 0} bot accounts and all associated posts, comments, votes, and catalog logs.`,
      );
      loadStats();
    } else {
      setErrorMessage(res.error || "Failed to purge bots.");
    }

    setIsPurging(false);
  }

  return (
    <section className="admin-panel">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h2 className="admin-panel-title" style={{ margin: 0 }}>
            🤖 Autonomous Bot Community Engine (Gemma 4 31B)
          </h2>
          <p
            style={{
              fontSize: "0.85rem",
              color: "#908caa",
              margin: "0.25rem 0 0",
            }}
          >
            Generate authentic community patrons, forum posts, threaded discussions, catalog logs, and simulated votes in few, large batches.
          </p>
        </div>

        <button
          onClick={loadStats}
          disabled={statsLoading || isGenerating}
          className="admin-btn admin-btn-secondary"
          style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
        >
          {statsLoading ? "Refreshing..." : "🔄 Refresh Stats"}
        </button>
      </div>

      {/* Live Bot Statistics Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <div className="admin-stat-card">
          <div className="admin-stat-number" style={{ color: "#c4a7e7" }}>
            {stats ? stats.botProfilesCount : "—"}
          </div>
          <div className="admin-stat-label">Active Bots</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-number" style={{ color: "#9ccfd8" }}>
            {stats ? stats.botPostsCount : "—"}
          </div>
          <div className="admin-stat-label">Bot Forum Posts</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-number" style={{ color: "#f6c177" }}>
            {stats ? stats.botCommentsCount : "—"}
          </div>
          <div className="admin-stat-label">Bot Comments</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-number" style={{ color: "#eb6f92" }}>
            {stats ? stats.botVotesCount : "—"}
          </div>
          <div className="admin-stat-label">Simulated Votes</div>
        </div>
      </div>

      {/* Purge Notification */}
      {purgeResult && (
        <div
          className="admin-banner admin-banner-info"
          style={{ marginBottom: "1rem" }}
        >
          <span>🧹 {purgeResult}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div
          className="admin-banner admin-banner-error"
          style={{ marginBottom: "1rem" }}
        >
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Completion Summary Card */}
      {summary && (
        <div
          style={{
            background: "rgba(156, 207, 216, 0.12)",
            border: "1px solid rgba(156, 207, 216, 0.35)",
            borderRadius: "12px",
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: "#9ccfd8",
              fontSize: "1rem",
              marginBottom: "0.5rem",
            }}
          >
            ✨ Batch Generation Complete!
          </div>
          <p
            style={{
              fontSize: "0.85rem",
              color: "#e0def4",
              margin: "0 0 0.75rem",
            }}
          >
            Storyhaven&apos;s forum, member directory, and library catalogs are now populated with lively discussion:
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              fontSize: "0.85rem",
              color: "#f6c177",
            }}
          >
            <span>
              👥 <strong>{summary.botsActive}</strong> Active Bots{" "}
              {summary.newBotsCreated > 0 &&
                `(${summary.newBotsCreated} newly generated)`}
            </span>
            <span>
              📝 <strong>{summary.postsCreated}</strong> Forum Posts + Catalogs
            </span>
            <span>
              💬 <strong>{summary.commentsCreated}</strong> Threaded Comments
            </span>
            <span>
              🗳️ <strong>{summary.votesSimulated}</strong> Community Votes
            </span>
          </div>
        </div>
      )}

      {/* Live Stepper Feedback */}
      {progress && (
        <div
          style={{
            background: "#26233a",
            border: "1px solid rgba(246, 193, 119, 0.3)",
            borderRadius: "12px",
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.5rem",
              fontSize: "0.85rem",
            }}
          >
            <span style={{ color: "#f6c177", fontWeight: 700 }}>
              Step {progress.step} of {progress.totalSteps}
            </span>
            <span style={{ color: "#908caa" }}>
              {Math.round((progress.step / progress.totalSteps) * 100)}%
            </span>
          </div>

          <div
            style={{
              width: "100%",
              height: "6px",
              background: "#191724",
              borderRadius: "4px",
              overflow: "hidden",
              marginBottom: "0.75rem",
            }}
          >
            <div
              style={{
                width: `${(progress.step / progress.totalSteps) * 100}%`,
                height: "100%",
                background: "linear-gradient(90deg, #eb6f92, #f6c177)",
                transition: "width 0.4s ease",
              }}
            />
          </div>

          <div
            style={{
              fontSize: "0.9rem",
              color: "#e0def4",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span className="admin-spinner" style={{ width: 14, height: 14 }} />
            {progress.message}
          </div>
        </div>
      )}

      {/* Generation Configuration Controls */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#c4a7e7",
              marginBottom: "0.35rem",
            }}
          >
            Bot Pool Size ({botCount})
          </label>
          <input
            type="number"
            min={2}
            max={50}
            value={botCount}
            disabled={isGenerating}
            onChange={(e) => setBotCount(Math.max(2, Math.min(50, Number(e.target.value) || 2)))}
            className="admin-input"
          />
          <span style={{ fontSize: "0.75rem", color: "#908caa", display: "block", marginTop: "0.25rem" }}>
            Reuses existing bots first; prompts Gemma only for delta.
          </span>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#9ccfd8",
              marginBottom: "0.35rem",
            }}
          >
            Forum Posts ({postCount})
          </label>
          <input
            type="number"
            min={1}
            max={25}
            value={postCount}
            disabled={isGenerating}
            onChange={(e) => setPostCount(Math.max(1, Math.min(25, Number(e.target.value) || 1)))}
            className="admin-input"
          />
          <span style={{ fontSize: "0.75rem", color: "#908caa", display: "block", marginTop: "0.25rem" }}>
            Covers books, movies, albums, and general haven reflections.
          </span>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#f6c177",
              marginBottom: "0.35rem",
            }}
          >
            Comments & Replies ({commentCount})
          </label>
          <input
            type="number"
            min={2}
            max={80}
            value={commentCount}
            disabled={isGenerating}
            onChange={(e) => setCommentCount(Math.max(2, Math.min(80, Number(e.target.value) || 2)))}
            className="admin-input"
          />
          <span style={{ fontSize: "0.75rem", color: "#908caa", display: "block", marginTop: "0.25rem" }}>
            Distributed thoughtfully across generated posts.
          </span>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#ebbcba",
              marginBottom: "0.35rem",
            }}
          >
            Nested Reply Ratio ({nestedRatio}%)
          </label>
          <input
            type="range"
            min={0}
            max={70}
            step={5}
            value={nestedRatio}
            disabled={isGenerating}
            onChange={(e) => setNestedRatio(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#eb6f92", cursor: "pointer" }}
          />
          <span style={{ fontSize: "0.75rem", color: "#908caa", display: "block", marginTop: "0.25rem" }}>
            Proportion of comments responding directly to other comments.
          </span>
        </div>
      </div>

      {/* Voting simulation toggle */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.9rem",
            color: "#e0def4",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={simulateVotes}
            disabled={isGenerating}
            onChange={(e) => setSimulateVotes(e.target.checked)}
            style={{ accentColor: "#eb6f92", width: 16, height: 16 }}
          />
          <span>Simulate realistic community voting (90% upvotes, 10% downvotes from bot pool)</span>
        </label>
      </div>

      {/* Action Buttons Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
        <button
          onClick={handleStartGeneration}
          disabled={isGenerating || isPurging}
          className="admin-btn admin-btn-primary"
          style={{ minWidth: 220 }}
        >
          {isGenerating ? "⚡ Generating via Gemma 4 31B..." : "⚡ Generate Bots & Content"}
        </button>

        <button
          onClick={() => setShowPurgeConfirm(true)}
          disabled={isGenerating || isPurging}
          className="admin-btn admin-btn-danger"
          style={{ marginLeft: "auto" }}
        >
          {isPurging ? "🧹 Purging..." : "🗑️ Purge All Bot Content"}
        </button>
      </div>

      {/* Purge Confirmation Modal */}
      {showPurgeConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#1f1d2e",
              border: "1px solid rgba(235, 111, 146, 0.4)",
              borderRadius: "16px",
              padding: "2rem",
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚠️</div>
            <h3 style={{ color: "#eb6f92", margin: "0 0 0.75rem", fontSize: "1.3rem" }}>
              Purge All Bot Content?
            </h3>
            <p style={{ color: "#e0def4", fontSize: "0.9rem", lineHeight: 1.5, margin: "0 0 1.5rem" }}>
              This will permanently delete all bot accounts (<code>b075...</code> UUIDs), cascading to their forum posts, comments, community votes, catalog logs, and friendships.
              <br /><br />
              <strong style={{ color: "#f6c177" }}>Real human user accounts and posts will NOT be touched.</strong>
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={() => setShowPurgeConfirm(false)}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handlePurge}
                className="admin-btn admin-btn-danger"
              >
                Yes, Purge Bot Content
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
