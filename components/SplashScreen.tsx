"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

interface SplashScreenProps {
  onEnter: () => void;
  backgroundImage?: string;
}

const GRAY = "#9ca3af";

export default function SplashScreen({
  onEnter,
  backgroundImage = "/gojo-vs-sukuna.jpg",
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isExiting) {
        setIsExiting(true);
        setTimeout(() => {
          setIsVisible(false);
          onEnter();
        }, 600);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEnter, isExiting]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#000",
        animation: isExiting ? "splashExit 0.6s ease-in forwards" : undefined,
      }}
    >
      <Navbar />

      {/* Background image at 70% opacity */}
      <img
        src={backgroundImage}
        alt="Splash Background"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.7,
        }}
      />

      {/* Dark gradient overlay — left to right */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to right, rgba(0,0,0,0.95), rgba(0,0,0,0.8), rgba(0,0,0,0.6))",
        }}
      />

      {/* Glow circles behind content */}
      <div
        style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 640, height: 640,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,0,0,0.2) 0%, transparent 70%)",
          filter: "blur(50px)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 420, height: 420,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)`,
          filter: "blur(70px)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />

      {/* Floating decorative elements */}
      <div
        style={{
          position: "absolute",
          top: "22%", right: "14%",
          width: 44, height: 44,
          border: "1px solid rgba(167,139,250,0.3)",
          borderRadius: 6,
          animation: "floatPulse 3s ease-in-out infinite",
          zIndex: 6,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "26%", left: "11%",
          width: 28, height: 28,
          border: "1px solid rgba(167,139,250,0.2)",
          borderRadius: "50%",
          animation: "floatPulse 3s ease-in-out infinite 0.5s",
          zIndex: 6,
          pointerEvents: "none",
        }}
      />

      {/* Main content — centered */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          zIndex: 10,
          animation: "fadeInScale 1s ease-out forwards",
          padding: "0 24px",
        }}
      >
        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-geist-sans), sans-serif",
              fontSize: "clamp(3rem, 8vw, 5rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              background: `linear-gradient(to right, #ffffff, ${GRAY})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1,
            }}
          >
            DOMAIN
          </div>
          <div
            style={{
              fontFamily: "var(--font-geist-sans), sans-serif",
              fontSize: "clamp(3rem, 8vw, 5rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#ffffff",
              lineHeight: 1,
            }}
          >
            EXPANSION
          </div>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "var(--font-geist-sans), sans-serif",
            fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
            color: "rgba(255,255,255,0.65)",
            textAlign: "center",
            maxWidth: 480,
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          Detect Gojo and Sukuna&apos;s legendary hand signs in real-time.
        </p>

        {/* Divider bar */}
        <div
          style={{
            width: 80,
            height: 4,
            borderRadius: 99,
            background: `linear-gradient(to right, #000000, ${GRAY})`,
          }}
        />

        {/* CTA */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: "var(--font-geist-sans), sans-serif",
              fontSize: "0.72rem",
              fontWeight: 600,
              color: GRAY,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            Press Enter to Begin
          </span>
        </div>
      </div>

      {/* Bottom subtitle */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 10,
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-geist-sans), sans-serif",
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.05em",
            margin: 0,
            fontWeight: 600,
          }}
        >
          Brought to you by Roha and Usaib
        </p>
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: 2,
          background:
            "linear-gradient(to right, transparent, rgba(167,139,250,0.5), transparent)",
          zIndex: 10,
        }}
      />

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }

        @keyframes floatPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(1.06); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }

        @keyframes splashExit {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}
