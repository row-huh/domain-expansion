"use client";

import { useEffect, useState } from "react";

export default function PortraitBlocker() {
  const [showBlocker, setShowBlocker] = useState(false);

  useEffect(() => {
    // Only activate on touch-capable devices (phones / tablets)
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    const update = () => {
      setShowBlocker(window.matchMedia("(orientation: portrait)").matches);
    };

    update();

    const mql = window.matchMedia("(orientation: portrait)");
    mql.addEventListener("change", update);
    window.addEventListener("resize", update);

    return () => {
      mql.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (!showBlocker) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        padding: "0 40px",
      }}
    >
      {/* Animated phone icon — tilts from portrait → landscape */}
      <div style={{ animation: "rotateHint 2.4s ease-in-out infinite" }}>
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Phone body */}
          <rect
            x="18"
            y="8"
            width="28"
            height="48"
            rx="4"
            stroke="rgba(167,139,250,0.7)"
            strokeWidth="2"
            fill="none"
          />
          {/* Home indicator */}
          <line
            x1="28"
            y1="50"
            x2="36"
            y2="50"
            stroke="rgba(167,139,250,0.4)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontFamily: "var(--font-geist-sans), sans-serif",
            fontSize: "1.1rem",
            color: "rgba(255,255,255,0.8)",
            letterSpacing: "0.03em",
            margin: "0 0 8px 0",
            fontWeight: 600,
          }}
        >
          Rotate Your Device
        </p>
        <p
          style={{
            fontFamily: "var(--font-geist-sans), sans-serif",
            fontSize: "0.78rem",
            color: "rgba(255,255,255,0.35)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          This experience requires landscape mode
        </p>
      </div>

      {/* Accent line — matches splash screen */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background:
            "linear-gradient(to right, transparent, rgba(167,139,250,0.5), transparent)",
        }}
      />

      <style>{`
        @keyframes rotateHint {
          0%, 15%   { transform: rotate(0deg); }
          40%, 65%  { transform: rotate(-90deg); }
          85%, 100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
