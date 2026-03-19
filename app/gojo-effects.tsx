"use client";

import { useEffect, useRef } from "react";
import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";

interface Props {
  videoElement: HTMLVideoElement | null;
  onComplete?: () => void;
}

export default function GojoEffects({ videoElement, onComplete }: Props) {
  const onCompleteRef  = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const containerRef   = useRef<HTMLDivElement>(null);
  const bgVideoRef     = useRef<HTMLVideoElement>(null);
  const circleCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef       = useRef<HTMLAudioElement>(null);
  const phaseRafRef    = useRef<number | null>(null);
  const segRafRef      = useRef<number | null>(null);

  useEffect(() => {
    const audio        = audioRef.current;
    const bgVideo      = bgVideoRef.current;
    const circleCanvas = circleCanvasRef.current;
    const outputCanvas = outputCanvasRef.current;
    const container    = containerRef.current;
    if (!audio || !bgVideo || !circleCanvas || !outputCanvas || !container) return;

    const W = window.innerWidth;
    const H = window.innerHeight;

    circleCanvas.width  = W;
    circleCanvas.height = H;
    outputCanvas.width  = W;
    outputCanvas.height = H;

    const CX = W / 2;
    const CY = H / 2;
    const MAX_RADIUS    = Math.sqrt(W * W + H * H) / 2 + 10;
    const CIRCLE_DURATION = 600;

    const circleCtx = circleCanvas.getContext("2d")!;
    const outCtx    = outputCanvas.getContext("2d")!;

    // offscreen canvas at native video resolution for cheap pixel loop
    const offscreen = document.createElement("canvas");

    /* ── phase tracking ── */
    let phase          = 0;
    let circleAnimStart: number | null = null;
    let circleComplete = false;

    function animateCircle(ts: number) {
      if (!circleAnimStart) circleAnimStart = ts;
      const progress = Math.min((ts - circleAnimStart) / CIRCLE_DURATION, 1);
      const eased    =
        progress < 0.5
          ? 4 * progress ** 3
          : 1 - (-2 * progress + 2) ** 3 / 2;

      circleCtx.clearRect(0, 0, W, H);
      circleCtx.beginPath();
      circleCtx.arc(CX, CY, eased * MAX_RADIUS, 0, Math.PI * 2);
      circleCtx.fillStyle = "#ffffff";
      circleCtx.fill();

      if (progress < 1) requestAnimationFrame(animateCircle);
      else circleComplete = true;
    }

    function revealVoid() {
      bgVideo!.play().catch(() => {});
      bgVideo!.style.opacity = "1";
      container!.classList.add("gojo-shaking");

      let fadeStart: number | null = null;
      const FADE_DURATION = 350;

      function fadeCircle(ts: number) {
        if (!fadeStart) fadeStart = ts;
        const fp = Math.min((ts - fadeStart) / FADE_DURATION, 1);
        circleCanvas!.style.opacity = String(1 - fp);
        if (fp < 1) {
          requestAnimationFrame(fadeCircle);
        } else {
          circleCanvas!.style.opacity = "0";
          setTimeout(() => container!.classList.remove("gojo-shaking"), 800);
        }
      }
      requestAnimationFrame(fadeCircle);
    }

    function phaseTick() {
      const t = audio!.currentTime;
      if (phase === 0 && t >= 1.8) { phase = 1; requestAnimationFrame(animateCircle); }
      if (phase === 1 && circleComplete && t >= 6.9) { phase = 2; revealVoid(); }
      if (phase < 2) phaseRafRef.current = requestAnimationFrame(phaseTick);
    }

    audio.currentTime = 0;
    audio.addEventListener("ended", () => onCompleteRef.current?.());
    audio.play().then(() => {
      phaseRafRef.current = requestAnimationFrame(phaseTick);
    }).catch(() => {});

    /* ── selfie segmentation ── */
    let segmenter: ImageSegmenter | null = null;
    let segActive = true;

    async function initSegmenter() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
      );
      segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        outputConfidenceMasks: true,
      });

      if (!segActive || !videoElement) return;

      // offscreen holds the camera frame; maskOffscreen holds the alpha mask
      const offCtx  = offscreen.getContext("2d")!;
      const maskOffscreen = document.createElement("canvas");
      const maskCtx = maskOffscreen.getContext("2d")!;

      const segTick = () => {
        if (
          !segActive ||
          !videoElement ||
          videoElement.paused ||
          videoElement.ended ||
          !segmenter
        ) {
          segRafRef.current = requestAnimationFrame(segTick);
          return;
        }

        const iw = videoElement.videoWidth;
        const ih = videoElement.videoHeight;

        if (iw === 0 || ih === 0) {
          segRafRef.current = requestAnimationFrame(segTick);
          return;
        }

        if (offscreen.width !== iw || offscreen.height !== ih) {
          offscreen.width     = iw;
          offscreen.height    = ih;
          maskOffscreen.width  = iw;
          maskOffscreen.height = ih;
        }

        const result = segmenter.segmentForVideo(videoElement, performance.now());

        // confidenceMasks[0] is person confidence: 1.0 = definitely person, 0.0 = background.
        // Replicate the HTML's destination-in approach: draw camera, then clip to mask.
        const mask = result.confidenceMasks?.[0];

        if (mask) {
          const maskData    = mask.getAsFloat32Array();
          const maskImgData = maskCtx.createImageData(iw, ih);

          // Only the alpha channel matters for destination-in
          for (let i = 0; i < maskData.length; i++) {
            maskImgData.data[i * 4 + 3] = Math.round(maskData[i] * 255);
          }
          maskCtx.putImageData(maskImgData, 0, 0);

          // Draw camera frame, then punch out background via destination-in (same as HTML)
          offCtx.clearRect(0, 0, iw, ih);
          offCtx.drawImage(videoElement, 0, 0, iw, ih);
          offCtx.globalCompositeOperation = "destination-in";
          offCtx.drawImage(maskOffscreen, 0, 0);
          offCtx.globalCompositeOperation = "source-over";

          outCtx.clearRect(0, 0, W, H);
          outCtx.drawImage(offscreen, 0, 0, W, H);
        }

        result.close();
        segRafRef.current = requestAnimationFrame(segTick);
      };

      segRafRef.current = requestAnimationFrame(segTick);
    }

    if (videoElement) initSegmenter();

    return () => {
      segActive = false;
      if (phaseRafRef.current) cancelAnimationFrame(phaseRafRef.current);
      if (segRafRef.current)   cancelAnimationFrame(segRafRef.current);
      audio.pause();
      bgVideo.pause();
      container.classList.remove("gojo-shaking");
      segmenter?.close();
    };
  }, [videoElement]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 20 }}
    >
      {/* unlimited void background video */}
      <video
        ref={bgVideoRef}
        src="/gojo/unlimited-void.webm"
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0, transition: "opacity 0.4s ease", zIndex: 1 }}
      />

      {/* expanding white circle */}
      <canvas
        ref={circleCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 2 }}
      />

      {/* person cutout — always on top */}
      <canvas
        ref={outputCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 10 }}
      />

      <audio ref={audioRef} src="/gojo/unlimited-void.mp3" preload="auto" className="hidden" />

      <style>{`
        @keyframes gojoShake {
          0%   { transform: translate(0,0) rotate(0deg); }
          10%  { transform: translate(-4px,-3px) rotate(-0.4deg); }
          20%  { transform: translate(5px,2px) rotate(0.3deg); }
          30%  { transform: translate(-5px,3px) rotate(0.5deg); }
          40%  { transform: translate(4px,-4px) rotate(-0.3deg); }
          50%  { transform: translate(-3px,5px) rotate(0.4deg); }
          60%  { transform: translate(5px,-2px) rotate(-0.5deg); }
          70%  { transform: translate(-4px,4px) rotate(0.2deg); }
          80%  { transform: translate(3px,-3px) rotate(-0.3deg); }
          90%  { transform: translate(-3px,2px) rotate(0.3deg); }
          100% { transform: translate(0,0) rotate(0deg); }
        }
        .gojo-shaking { animation: gojoShake 0.12s linear infinite; }
      `}</style>
    </div>
  );
}
