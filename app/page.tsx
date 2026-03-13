"use client";

import { useRef, useState, useCallback } from "react";
import CameraWithHandTracker, { CameraFeedRef, HandLandmarks } from "@/components/CameraWithHandTracker";


type Landmark = { x: number; y: number; z?: number };

type GestureResult =
  | { type: "sukuna" }
  | { type: "unlimited_void" }
  | { type: "none"; handsDetected: number };

function dist(a: Landmark, b: Landmark) {
  return Math.sqrt(
    (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + ((a.z ?? 0) - (b.z ?? 0)) ** 2
  );
}
function sub(a: Landmark, b: Landmark) {
  return { x: a.x - b.x, y: a.y - b.y };
}
function dot(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.x + a.y * b.y;
}
function vecLen(v: { x: number; y: number }) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}
function angle(a: Landmark, vertex: Landmark, b: Landmark) {
  const va = sub(a, vertex);
  const vb = sub(b, vertex);
  return (
    Math.acos(
      Math.max(-1, Math.min(1, dot(va, vb) / (vecLen(va) * vecLen(vb) + 1e-9)))
    ) * (180 / Math.PI)
  );
}

function checkSukuna(landmarks: Landmark[][]): boolean {
  if (landmarks.length < 2) return false;
  const [h1, h2] = landmarks;
  let L: Landmark[], R: Landmark[];
  if (h1[0].x < h2[0].x) { L = h2; R = h1; }
  else { L = h1; R = h2; }

  let passed = 0;
  if (dist(L[12], R[12]) < 0.1) passed++;
  if (dist(L[16], R[16]) < 0.1) passed++;
  if (dist(L[4],  R[4])  < 0.1) passed++;
  if (L[8].y > L[6].y && R[8].y > R[6].y) passed++;
  if (L[20].y > L[18].y && R[20].y > R[18].y) passed++;
  return passed >= 2;
}

function checkCrossed(lm: Landmark[]): boolean {
  const naturalDir = lm[5].x - lm[9].x;
  const tipDir = lm[8].x - lm[12].x;
  const crossed = naturalDir * tipDir < 0 || Math.abs(tipDir) < 0.05;
  const middleStretched =
    angle(lm[12], lm[11], lm[10]) > 140 &&
    angle(lm[11], lm[10], lm[9]) > 140;
  return crossed && middleStretched;
}

export default function LiveGestureDetectorPage() {
  const cameraRef = useRef<CameraFeedRef>(null);
  const [result, setResult] = useState<GestureResult>({ type: "none", handsDetected: 0 });

  const handleHands = useCallback((hands: HandLandmarks[]) => {
    if (hands.length >= 2 && checkSukuna(hands)) {
      setResult({ type: "sukuna" });
    } else if (hands.length === 1 && checkCrossed(hands[0])) {
      setResult({ type: "unlimited_void" });
    } else {
      setResult({ type: "none", handsDetected: hands.length });
    }
  }, []);

  const overlayContent = (() => {
    if (result.type === "sukuna") {
      return {
        emoji: "⛩️",
        label: "MALEVOLENT SHRINE",
        sub: "Cursed Technique: Activated",
        color: "from-red-900/80 to-red-600/60",
        border: "border-red-400/60",
        text: "text-red-100",
      };
    }
    if (result.type === "unlimited_void") {
      return {
        emoji: "🌌",
        label: "UNLIMITED VOID",
        sub: "Domain Expansion: Engaged",
        color: "from-blue-900/80 to-indigo-600/60",
        border: "border-blue-400/60",
        text: "text-blue-100",
      };
    }
    return null;
  })();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Live camera + skeleton overlay */}
      <CameraWithHandTracker ref={cameraRef} onHandsDetected={handleHands} />

      {/* Gesture result overlay — only shown on match */}
      {overlayContent && (
        <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-16 px-6">
          <div
            className={`
              bg-gradient-to-br ${overlayContent.color}
              border ${overlayContent.border}
              backdrop-blur-md rounded-2xl px-8 py-5
              flex flex-col items-center gap-1
              animate-pulse-once
            `}
            style={{
              animation: "fadeSlideUp 0.3s ease-out forwards",
            }}
          >
            <span className="text-4xl">{overlayContent.emoji}</span>
            <span className={`text-2xl font-black tracking-widest uppercase ${overlayContent.text}`}>
              {overlayContent.label}
            </span>
            <span className={`text-sm tracking-wide opacity-80 ${overlayContent.text}`}>
              {overlayContent.sub}
            </span>
          </div>
        </div>
      )}

      {/* Hands count — subtle top-left indicator */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <span className="text-xs text-white/50 font-mono tracking-widest uppercase">
          {result.type === "none"
            ? `${result.handsDetected} hand${result.handsDetected !== 1 ? "s" : ""} detected`
            : ""}
        </span>
      </div>

      {/* Legend — bottom right */}
      <div className="absolute bottom-4 right-4 pointer-events-none text-right space-y-1">
        <p className="text-xs text-white/30 font-mono">⛩️ Malevolent Shrine — 2 hands mirrored</p>
        <p className="text-xs text-white/30 font-mono">🌌 Unlimited Void — crossed index + middle</p>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}