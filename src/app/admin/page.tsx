"use client";

import { useEffect, useState } from "react";
import {
  clearActiveMatchesAction,
  dryRunMatchDropAction,
  getAdminStatusAction,
  triggerMatchDropAction,
  verifyAdminPasswordAction,
} from "./actions";
import type { AdminStatus, MatchDropResult } from "@/lib/match-drop";
import BotGeneratorPanel from "./BotGeneratorPanel";
import "./admin.css";
import Icon from "@/components/pixel/Icon";
import PixelLink from "@/components/pixel/PixelLink";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{
    type: "info" | "error";
    text: string;
  } | null>(null);
  const [roundIdInput, setRoundIdInput] = useState("");
  const [simulation, setSimulation] = useState<MatchDropResult | null>(null);

  // Auto-restore admin session from sessionStorage if previously unlocked
  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? sessionStorage.getItem("storyhaven_admin_token")
        : null;
    if (saved) {
      void (async () => {
        setLoading(true);
        const res = await verifyAdminPasswordAction(saved);
        if (res.success) {
          setPassword(saved);
          setIsAuthenticated(true);
          const statusRes = await getAdminStatusAction(saved);
          if (statusRes.success && statusRes.data) {
            setStatus(statusRes.data);
          }
        } else {
          sessionStorage.removeItem("storyhaven_admin_token");
        }
        setLoading(false);
      })();
    }
  }, []);

  async function handleUnlock(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const passToTest = passwordInput.trim();
    if (!passToTest) return;

    setLoading(true);
    setBanner(null);

    const res = await verifyAdminPasswordAction(passToTest);
    if (!res.success) {
      setBanner({ type: "error", text: res.error || "Authentication failed." });
      setLoading(false);
      return;
    }

    setPassword(passToTest);
    setIsAuthenticated(true);
    setPasswordInput("");
    if (typeof window !== "undefined") {
      sessionStorage.setItem("storyhaven_admin_token", passToTest);
    }

    // Load initial admin status
    const statusRes = await getAdminStatusAction(passToTest);
    if (statusRes.success && statusRes.data) {
      setStatus(statusRes.data);
    } else {
      setBanner({
        type: "error",
        text: statusRes.error || "Failed to load dashboard data.",
      });
    }

    setLoading(false);
  }

  function handleLock() {
    setPassword("");
    setIsAuthenticated(false);
    setStatus(null);
    setBanner(null);
    setSimulation(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("storyhaven_admin_token");
    }
  }

  async function handleTriggerDrop() {
    if (!password) return;
    setLoading(true);
    setBanner(null);
    setSimulation(null);

    const res = await triggerMatchDropAction(
      password,
      roundIdInput.trim() || undefined,
    );
    if (res.success && res.result) {
      setBanner({ type: "info", text: res.result.message });
      setRoundIdInput("");
      // Refresh status
      const updated = await getAdminStatusAction(password);
      if (updated.success && updated.data) {
        setStatus(updated.data);
      }
    } else {
      setBanner({
        type: "error",
        text: res.error || "Failed to trigger match drop.",
      });
    }
    setLoading(false);
  }

  async function handleDryRun() {
    if (!password) return;
    setLoading(true);
    setBanner(null);

    const res = await dryRunMatchDropAction(password);
    if (res.success && res.result) {
      setSimulation(res.result);
      setBanner({
        type: "info",
        text: `Simulation complete: ${res.result.pairsCreated} pairings projected.`,
      });
    } else {
      setBanner({
        type: "error",
        text: res.error || "Failed to execute dry-run simulation.",
      });
    }
    setLoading(false);
  }

  async function handleClearMatches() {
    if (!password) return;
    const confirmed = window.confirm(
      "Are you sure you want to clear active matches? This will revert users to the pre-drop countdown screen.",
    );
    if (!confirmed) return;

    setLoading(true);
    setBanner(null);
    setSimulation(null);

    const res = await clearActiveMatchesAction(password);
    if (res.success) {
      setBanner({
        type: "info",
        text: `Active round cleared (${res.count ?? 0} matches removed). Users are now back to the countdown waiting state.`,
      });
      // Refresh status
      const updated = await getAdminStatusAction(password);
      if (updated.success && updated.data) {
        setStatus(updated.data);
      }
    } else {
      setBanner({
        type: "error",
        text: res.error || "Failed to clear active matches.",
      });
    }
    setLoading(false);
  }

  if (!isAuthenticated) {
    return (
      <main className="admin-viewport">
        <div className="admin-gate-container">
          <div className="admin-gate-card">
            <div className="admin-gate-icon"><Icon name="door" size={2} /></div>
            <h1 className="admin-gate-title">Storyhaven Gatekeeper</h1>
            <p className="admin-gate-subtitle">
              Enter the master admin password to access the Haven Match
              control console.
            </p>

            {banner && (
              <div className={`admin-banner admin-banner-${banner.type}`} style={{ marginBottom: "1rem" }}>
                {banner.text}
              </div>
            )}

            <form
              action="javascript:void(0);"
              onSubmit={(e) => {
                e.preventDefault();
                void handleUnlock();
              }}
              className="admin-gate-form"
            >
              <input
                type="password"
                placeholder="Admin password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleUnlock();
                  }
                }}
                className="admin-input"
                autoFocus
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="admin-gate-button"
              >
                {loading ? "Authenticating…" : <>Enter Console <Icon name="lock" size={1} /></>}
              </button>
            </form>

            <PixelLink href="/pages/friends">
              <Icon name="arrow_left" size={1} /> Return to Friends Lounge
            </PixelLink>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-viewport">
      <header className="admin-header">
        <div className="admin-branding">
          <span><Icon name="door" size={1} /></span>
          <h1>Storyhaven Admin Console</h1>
        </div>
        <button onClick={handleLock} className="admin-lock-btn">
          <Icon name="lock" size={1} /> Lock Console
        </button>
      </header>

      <div className="admin-content">
        {banner && (
          <div className={`admin-banner admin-banner-${banner.type}`}>
            {banner.text}
          </div>
        )}

        {/* Stats Grid */}
        <section className="admin-stats-grid">
          <div className="admin-stat-card">
            <span className="admin-stat-label">Active Round</span>
            <span className="admin-stat-value">
              {status?.latestRoundId ?? "None"}
            </span>
            <span className="admin-stat-subtext">
              {status?.latestRoundCreatedAt
                ? `Started ${new Date(status.latestRoundCreatedAt).toLocaleDateString()}`
                : "No active drops yet"}
            </span>
          </div>

          <div className="admin-stat-card">
            <span className="admin-stat-label">Total Matches</span>
            <span className="admin-stat-value">
              {status?.totalMatches ?? 0}
            </span>
            <span className="admin-stat-subtext">
              {status?.pendingCount ?? 0} pending mutual opt-in
            </span>
          </div>

          <div className="admin-stat-card">
            <span className="admin-stat-label">Connected Pairs</span>
            <span className="admin-stat-value">
              {status?.connectedCount ?? 0}
            </span>
            <span className="admin-stat-subtext">Direct chats unlocked</span>
          </div>

          <div className="admin-stat-card">
            <span className="admin-stat-label">Active Media Readers</span>
            <span className="admin-stat-value">
              {status?.activeLoggersCount ?? 0}
            </span>
            <span className="admin-stat-subtext">Eligible for pairings</span>
          </div>
        </section>

        {/* Autonomous Bot Community Generator Panel */}
        <BotGeneratorPanel adminPassword={password} />

        {/* Controls Toolbar */}
        <section className="admin-panel">
          <h2 className="admin-panel-title">Haven Match Controls</h2>
          <div className="admin-actions-bar">
            <input
              type="text"
              placeholder="Round ID (optional)"
              value={roundIdInput}
              onChange={(e) => setRoundIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleTriggerDrop();
                }
              }}
              className="admin-input admin-round-input"
            />
            <button
              onClick={handleTriggerDrop}
              disabled={loading}
              className="admin-btn admin-btn-primary"
            >
              Trigger Global Match Drop
            </button>
            <button
              onClick={handleDryRun}
              disabled={loading}
              className="admin-btn admin-btn-secondary"
            >
              Simulate / Dry-Run
            </button>
            <button
              onClick={handleClearMatches}
              disabled={loading}
              className="admin-btn admin-btn-danger"
            >
              <Icon name="trash" size={1} /> Clear Active Matches
            </button>
          </div>
        </section>

        {/* Dry-Run Simulation Results */}
        {simulation && (
          <section className="admin-panel">
            <h2 className="admin-panel-title">
              Projected Pairings Simulation ({simulation.pairsCreated} Pairs)
            </h2>
            {simulation.leftoverProfile && (
              <p style={{ color: "#f6c177", fontSize: "0.85rem", margin: 0 }}>
                <Icon name="user" size={1} /> Leftover Haven Scout:{" "}
                <strong>{simulation.leftoverProfile.display_name}</strong> (first
                in line for next cycle).
              </p>
            )}
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Reader A</th>
                    <th>Reader B</th>
                    <th>Match Type</th>
                    <th>Shared Media</th>
                  </tr>
                </thead>
                <tbody>
                  {simulation.pairings.map((p, idx) => (
                    <tr key={idx}>
                      <td>{p.userA.display_name ?? "User A"}</td>
                      <td>{p.userB.display_name ?? "User B"}</td>
                      <td>
                        {p.isDiscovery ? (
                          <span className="admin-status-pill admin-status-pending">
                            Curated Discovery
                          </span>
                        ) : (
                          <span className="admin-status-pill admin-status-connected">
                            Similarity (Score: {p.score})
                          </span>
                        )}
                      </td>
                      <td>
                        {p.sharedTitles.length > 0 ? (
                          p.sharedTitles.map((st, sIdx) => (
                            <span key={sIdx} className="admin-media-pill">
                              {st.type === "book" ? (
                      <Icon name="book" size={1} />
                    ) : st.type === "movie" ? (
                      <Icon name="film" size={1} />
                    ) : (
                      <Icon name="vinyl" size={1} />
                    )}{" "}
                              {st.name}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: "#908caa" }}>None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Live Pairings Table */}
        <section className="admin-panel">
          <h2 className="admin-panel-title">
            Active Pairings Log ({status?.recentMatches.length ?? 0})
          </h2>
          <div className="admin-table-container">
            {status && status.recentMatches.length > 0 ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>Reader A</th>
                    <th>Reader B</th>
                    <th>Status</th>
                    <th>Opt-In State</th>
                    <th>Shared Media</th>
                  </tr>
                </thead>
                <tbody>
                  {status.recentMatches.map((m) => {
                    const optInLabel =
                      m.userAConnected && m.userBConnected
                        ? "Both Connected"
                        : m.userAConnected
                          ? `Waiting on ${m.userB.display_name}`
                          : m.userBConnected
                            ? `Waiting on ${m.userA.display_name}`
                            : "Neither Connected";

                    return (
                      <tr key={m.id}>
                        <td>
                          <code>{m.roundId}</code>
                        </td>
                        <td>{m.userA.display_name ?? "User A"}</td>
                        <td>{m.userB.display_name ?? "User B"}</td>
                        <td>
                          <span
                            className={`admin-status-pill admin-status-${m.status}`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.8rem", color: "#9ccfd8" }}>
                            {optInLabel}
                          </span>
                        </td>
                        <td>
                          {m.sharedTitles.length > 0 ? (
                            m.sharedTitles.map((st, idx) => (
                              <span key={idx} className="admin-media-pill">
                                {st.type === "book" ? (
                      <Icon name="book" size={1} />
                    ) : st.type === "movie" ? (
                      <Icon name="film" size={1} />
                    ) : (
                      <Icon name="vinyl" size={1} />
                    )}{" "}
                                {st.name}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: "#908caa" }}>Discovery</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="admin-empty">
                No match drops recorded yet. Click &quot;Trigger Global Match Drop&quot;
                to create the first round.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
