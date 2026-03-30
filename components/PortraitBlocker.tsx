"use client";

import { useEffect, useState } from "react";

const ROASTS = [
  "That's a bold confidence in bad decisions",
  "Your attention span must be as small as your screen",
  "You probably click 'remind me later' on everything",
  "You look like you name your files final_final_v3",
  "You look like someone who loses arguments to Google",
  "You definitely trust yourself way more than you should",
  "That device looks like it struggles to open the calculator",
];

const IMAGES = [
  "/judging/cat1.jpg",
  "/judging/judge-cat.jpg",
  "/judging/judging-face.jpg",
  "/judging/side-eye-dog-suspicious.jpg",
];

export default function PortraitBlocker() {
  const [isMobile, setIsMobile] = useState(false);
  const [roast] = useState(() => ROASTS[Math.floor(Math.random() * ROASTS.length)]);
  const [image] = useState(() => IMAGES[Math.floor(Math.random() * IMAGES.length)]);

  useEffect(() => {
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const small = window.screen.width <= 1024 || window.screen.height <= 1024;
    setIsMobile(touch && small);
  }, []);

  if (!isMobile) return null;

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
        gap: 20,
        padding: "0 36px",
      }}
    >
      {/* Judge cat */}
      <img
        src={image}
        alt="Judging you"
        style={{
          width: 140,
          height: "auto",
          borderRadius: 12,
          opacity: 0.9,
        }}
      />

      <p
        style={{
          fontFamily: "var(--font-geist-sans), sans-serif",
          fontSize: "1.1rem",
          color: "rgba(255,255,255,0.85)",
          textAlign: "center",
          fontWeight: 700,
          margin: 0,
          lineHeight: 1.4,
        }}
      >
        Did you really try to access this website through phone?
      </p>

      <p
        style={{
          fontFamily: "var(--font-geist-sans), sans-serif",
          fontSize: "0.85rem",
          color: "rgba(167,139,250,0.7)",
          textAlign: "center",
          fontStyle: "italic",
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {roast}
      </p>

      {/* Accent line */}
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
    </div>
  );
}
