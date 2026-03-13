"use client";

import { useRef, useState, useCallback } from "react";

// MediaPipe types (loaded dynamically)
type Landmark = { x: number; y: number; z: number };
type HandLandmarkerResult = { landmarks: Landmark[][] };

// ─── Math helpers ────────────────────────────────────────────────────────────
function dist(a: Landmark, b: Landmark) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
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
    ) *
    (180 / Math.PI)
  );
}

// ─── Gesture detectors ───────────────────────────────────────────────────────
function checkSukuna(landmarks: Landmark[][]): boolean {
  if (landmarks.length < 2) return false;
  const [h1, h2] = landmarks;
  let L: Landmark[], R: Landmark[];
  if (h1[0].x < h2[0].x) {
    L = h2;
    R = h1;
  } else {
    L = h1;
    R = h2;
  }
  let passed = 0;
  if (dist(L[12], R[12]) < 0.1) passed++;
  if (dist(L[16], R[16]) < 0.1) passed++;
  if (dist(L[4], R[4]) < 0.1) passed++;
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

// ─── Result type ─────────────────────────────────────────────────────────────
type GestureResult =
  | { type: "sukuna" }
  | { type: "unlimited_void" }
  | { type: "none"; handsDetected: number };

// ─── Component ───────────────────────────────────────────────────────────────
export default function GestureDetectorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "processing" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [handsCount, setHandsCount] = useState<number | null>(null);
  const [result, setResult] = useState<GestureResult | null>(null);
  const handLandmarkerRef = useRef<unknown>(null);

  // ── Load MediaPipe lazily on first use ────────────────────────────────────
  const ensureLoaded = useCallback(async () => {
    if (handLandmarkerRef.current) return true;
    setStatus("loading");
    try {
      // Dynamic import so Next.js doesn't SSR this
      const vision = await import(
        /* webpackIgnore: true */
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs"
      ) as {
        FilesetResolver: { forVisionTasks: (path: string) => Promise<unknown> };
        HandLandmarker: {
          createFromOptions: (vision: unknown, opts: unknown) => Promise<unknown>;
          HAND_CONNECTIONS: unknown;
        };
        DrawingUtils: new (ctx: CanvasRenderingContext2D) => {
          drawConnectors: (lm: Landmark[], conn: unknown, style: unknown) => void;
          drawLandmarks: (lm: Landmark[], style: unknown) => void;
        };
      };

      const filesetResolver = await vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );

      const hl = await vision.HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "CPU",
        },
        numHands: 2,
        runningMode: "IMAGE",
      });

      handLandmarkerRef.current = hl;
      setStatus("ready");
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setStatus("error");
      return false;
    }
  }, []);

  // ── Handle image upload ───────────────────────────────────────────────────
  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setResult(null);
      setHandsCount(null);

      const ok = await ensureLoaded();
      if (!ok) return;

      setStatus("processing");

      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hl = handLandmarkerRef.current as any;
        const { landmarks } = hl.detect(canvas) as HandLandmarkerResult;

        setHandsCount(landmarks.length);

        // Draw landmarks — re-import cached module
        import(
          /* webpackIgnore: true */
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ).then((vision: any) => {
          const drawUtils = new vision.DrawingUtils(ctx);
          for (const lm of landmarks) {
            drawUtils.drawConnectors(lm, hl.constructor.HAND_CONNECTIONS ?? vision.HandLandmarker.HAND_CONNECTIONS, {
              color: "#00ff88",
              lineWidth: 2,
            });
            drawUtils.drawLandmarks(lm, { color: "#ff0055", lineWidth: 1, radius: 3 });
          }
        });

        // Detect gestures
        if (landmarks.length >= 2 && checkSukuna(landmarks)) {
          setResult({ type: "sukuna" });
        } else if (landmarks.length === 1 && checkCrossed(landmarks[0])) {
          setResult({ type: "unlimited_void" });
        } else {
          setResult({ type: "none", handsDetected: landmarks.length });
        }

        setStatus("ready");
      };

      img.onerror = () => {
        setErrorMsg("Failed to load image.");
        setStatus("error");
      };

      img.src = URL.createObjectURL(file);
    },
    [ensureLoaded]
  );

  // ── UI ────────────────────────────────────────────────────────────────────
  const statusLabel: Record<typeof status, string> = {
    idle: "Click Analyse Image to begin",
    loading: "Loading MediaPipe model…",
    ready: handsCount !== null ? `Detected ${handsCount} hand(s)` : "Ready — upload an image",
    processing: "Analysing…",
    error: `Error: ${errorMsg}`,
  };

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Gesture Detector</h1>
      <p className="text-sm text-gray-500 mb-6">{statusLabel[status]}</p>

      <div className="flex flex-col gap-4">
        {/* File input */}
        <div>
          <label htmlFor="gesture-upload">
            <span className="inline-block px-4 py-2 bg-gray-900 text-white text-sm rounded cursor-pointer hover:bg-gray-700 transition-colors">
              Upload Image
            </span>
          </label>
          <input
            id="gesture-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
            onClick={(e) => ((e.target as HTMLInputElement).value = "")}
            disabled={status === "loading" || status === "processing"}
          />
        </div>

        {/* Result */}
        {result && (
          <div className={`p-4 rounded text-sm ${
            result.type === "sukuna"
              ? "bg-red-50 border border-red-200 text-red-800"
              : result.type === "unlimited_void"
              ? "bg-blue-50 border border-blue-200 text-blue-800"
              : "bg-gray-50 border border-gray-200 text-gray-600"
          }`}>
            {result.type === "sukuna" && (
              <p>⛩️ <strong>MATCHED — Malevolent Shrine</strong><br />
              Summoned by Sukuna &amp; his Unpaid Intern USANNE (who uses email as version control — insane skill issue)</p>
            )}
            {result.type === "unlimited_void" && (
              <p>🌌 <strong>MATCHED — Unlimited Void</strong></p>
            )}
            {result.type === "none" && (
              <p>No gesture detected ({result.handsDetected} hand{result.handsDetected !== 1 ? "s" : ""} found)</p>
            )}
          </div>
        )}

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full rounded border border-gray-200"
          style={{ height: "auto" }}
        />

        {/* Legend */}
        <div className="text-xs text-gray-400 pt-2 border-t border-gray-100 space-y-1">
          <p>⛩️ Malevolent Shrine — 2 hands, mirrored palm gesture</p>
          <p>🌌 Unlimited Void — 1 hand, crossed index + middle finger</p>
        </div>
      </div>
    </main>
  );
}