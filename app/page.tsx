"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import CameraWithHandTracker, { CameraFeedRef, HandLandmarks } from "@/components/CameraWithHandTracker";
import GojoEffects from "@/app/gojo-effects";

type Landmark = { x: number; y: number; z?: number };

type GestureResult =
  | { type: "sukuna" }
  | { type: "unlimited_void" }
  | { type: "none"; handsDetected: number };

const SUBTITLES = [
  { text: "Give me your hand", start: 0.3, end: 2.1 },
  { text: "Come.", start: 3.5, end: 5.0 },
  { text: "Come now. Come.", start: 6.6, end: 8.9 },
];

const IDLE_TRIGGER_MS = 5000;

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

  const [idleActive, setIdleActive] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleActiveRef = useRef(false);
  const cameraReadyRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const subtitleRafRef = useRef<number | null>(null);

  const startIdle = useCallback(() => {
    console.log("[idle] startIdle called");
    idleActiveRef.current = true;
    setIdleActive(true);
    setCurrentSubtitle(null);

    requestAnimationFrame(() => {
      const vid = videoRef.current;
      const aud = audioRef.current;
      console.log("[idle] vid:", vid, "aud:", aud);
      if (!vid || !aud) return;

      vid.currentTime = 0;
      aud.currentTime = 0;

      vid.play().then(() => console.log("[idle] video playing")).catch((e) => console.error("[idle] video play error:", e));
      aud.play().then(() => console.log("[idle] audio playing")).catch((e) => console.error("[idle] audio play error:", e));

      const tick = () => {
        const t = aud.currentTime;
        const active = SUBTITLES.find((s) => t >= s.start && t <= s.end);
        setCurrentSubtitle(active?.text ?? null);
        if (!aud.ended && !aud.paused) {
          subtitleRafRef.current = requestAnimationFrame(tick);
        } else if (aud.ended) {
          setCurrentSubtitle(null);
        }
      };
      subtitleRafRef.current = requestAnimationFrame(tick);
    });
  }, []);

  const stopIdle = useCallback(() => {
    if (!idleActiveRef.current) return;
    console.log("[idle] stopIdle called");
    idleActiveRef.current = false;
    setIdleActive(false);
    setCurrentSubtitle(null);
    if (subtitleRafRef.current) {
      cancelAnimationFrame(subtitleRafRef.current);
      subtitleRafRef.current = null;
    }
    videoRef.current?.pause();
    audioRef.current?.pause();
  }, []);

  const handleIdleEnded = useCallback(() => {
    console.log("[idle] video ended naturally");
    idleActiveRef.current = false;
    setIdleActive(false);
    setCurrentSubtitle(null);
    if (subtitleRafRef.current) {
      cancelAnimationFrame(subtitleRafRef.current);
      subtitleRafRef.current = null;
    }
  }, []);

  // Stable — deps are startIdle/stopIdle which are also stable
  const handleHands = useCallback((hands: HandLandmarks[]) => {
    if (!cameraReadyRef.current) {
      cameraReadyRef.current = true;
      console.log("[hands] camera ready, scheduling idle in", IDLE_TRIGGER_MS, "ms");
      idleTimerRef.current = setTimeout(() => {
        idleTimerRef.current = null;
        console.log("[hands] idle timer fired (initial)");
        startIdle();
      }, IDLE_TRIGGER_MS);
    }

    if (hands.length >= 2 && checkSukuna(hands)) {
      setResult({ type: "sukuna" });
    } else if (hands.length === 1 && checkCrossed(hands[0])) {
      setResult({ type: "unlimited_void" });
    } else {
      setResult({ type: "none", handsDetected: hands.length });
    }

    if (hands.length > 0) {
      if (idleTimerRef.current) {
        console.log("[hands] hand detected, cancelling idle timer");
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      stopIdle();
    } else {
      if (!idleTimerRef.current && !idleActiveRef.current) {
        console.log("[hands] no hands, scheduling idle in", IDLE_TRIGGER_MS, "ms");
        idleTimerRef.current = setTimeout(() => {
          idleTimerRef.current = null;
          console.log("[hands] idle timer fired");
          startIdle();
        }, IDLE_TRIGGER_MS);
      }
    }
  }, [startIdle, stopIdle]);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (subtitleRafRef.current) cancelAnimationFrame(subtitleRafRef.current);
    };
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
      return null;
    }
    return null;
  })();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <CameraWithHandTracker ref={cameraRef} onHandsDetected={handleHands} />

      {result.type === "unlimited_void" && (
        <GojoEffects videoElement={cameraRef.current?.videoElement ?? null} />
      )}

      {overlayContent && (
        <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-16 px-6">
          <div
            className={`
              bg-gradient-to-br ${overlayContent.color}
              border ${overlayContent.border}
              backdrop-blur-md rounded-2xl px-8 py-5
              flex flex-col items-center gap-1
            `}
            style={{ animation: "fadeSlideUp 0.3s ease-out forwards" }}
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

      {/* Idle overlay */}
      {idleActive && (
        <>
          <video
            ref={videoRef}
            src="/idle/gojo-gimmeyourhand2.webm"
            muted
            playsInline
            onEnded={handleIdleEnded}
            className="absolute bottom-0 left-0 w-[40vw] h-auto pointer-events-none"
          />
          {currentSubtitle && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none px-4">
              <p
                className="text-white text-xl font-bold text-center"
                style={{
                  textShadow: "0 0 8px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,0.8)",
                  animation: "fadeSlideUp 0.15s ease-out forwards",
                }}
              >
                {currentSubtitle}
              </p>
            </div>
          )}

        </>
      )}

      {/* Audio always in DOM */}
      <audio
        ref={audioRef}
        src="/idle/gojo-gimmeyourhand2.webm"
        preload="auto"
        className="hidden"
      />

      {/* Debug bar */}
      <div className="absolute top-4 left-4 pointer-events-none space-y-1">
        <span className="block text-xs text-white/50 font-mono tracking-widest uppercase">
          {result.type === "none"
            ? `${result.handsDetected} hand${result.handsDetected !== 1 ? "s" : ""} detected`
            : ""}
        </span>
        <span className="block text-xs font-mono text-yellow-400/80">
          idle: {idleActive ? "ON" : "off"} | timer: {idleTimerRef.current ? "pending" : "none"}
        </span>
      </div>

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