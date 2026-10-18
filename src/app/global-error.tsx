"use client";

/** Last-resort boundary: replaces the root layout, so it brings its own <html>/<body> and plain styles. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#2b1d14",
          color: "#f3e6c8",
          fontFamily: "ui-monospace, monospace",
          textAlign: "center",
        }}
      >
        <div style={{ padding: 24 }}>
          <h1>Storyhaven hit a snag</h1>
          <p>Something went wrong loading the app.</p>
          {error.digest ? <p style={{ opacity: 0.7, fontSize: 12 }}>Error code: {error.digest}</p> : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 12,
              padding: "8px 16px",
              font: "inherit",
              background: "#d9a36a",
              color: "#2a202a",
              border: "2px solid #2a202a",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
