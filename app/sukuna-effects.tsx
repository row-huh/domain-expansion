"use client";

import { useEffect, useRef } from "react";
import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";

interface Props {
  videoElement: HTMLVideoElement | null;
  onComplete?: () => void;
}

export default function SukunaEffects({ videoElement, onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const introVideoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const shatterCanvasRef = useRef<HTMLCanvasElement>(null);
  const slashCanvasRef = useRef<HTMLCanvasElement>(null);
  const freezeCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgFreezeCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  const segRafRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const introVideo = introVideoRef.current;
    const bgVideo = bgVideoRef.current;
    const audio = audioRef.current;

    const shatterCv = shatterCanvasRef.current;
    const slashCv = slashCanvasRef.current;
    const freezeCv = freezeCanvasRef.current;
    const bgFreezeCv = bgFreezeCanvasRef.current;
    const outputCv = outputCanvasRef.current;

    if (
      !container || !introVideo || !bgVideo || !audio ||
      !shatterCv || !slashCv || !freezeCv || !bgFreezeCv || !outputCv
    ) return;

    const W = window.innerWidth;
    const H = window.innerHeight;

    [shatterCv, slashCv, freezeCv, bgFreezeCv, outputCv].forEach(cv => {
      cv.width = W;
      cv.height = H;
    });

    const sCtx = shatterCv.getContext("2d")!;
    const slCtx = slashCv.getContext("2d")!;
    const fCtx = freezeCv.getContext("2d")!;
    const bfCtx = bgFreezeCv.getContext("2d")!;
    const outCtx = outputCv.getContext("2d")!;

    // ---------- START FLOW ----------

    introVideo.currentTime = 0;
    introVideo.play().catch(() => {});

    introVideo.addEventListener("ended", () => {
      // Freeze frame
      fCtx.drawImage(introVideo, 0, 0, W, H);
      introVideo.style.display = "none";
      freezeCv.style.display = "block";

      // Start audio
      audio.currentTime = 0;
      audio.play().catch(() => {});

      const stopSlashes = continuousPreSlashes(slCtx, W, H);

      let triggered = false;

      const onTick = () => {
        if (!triggered && audio.currentTime >= 10) {
          triggered = true;
          audio.removeEventListener("timeupdate", onTick);
          stopSlashes();

          shatterFrameEffect(sCtx, freezeCv, W, H, () => {
            freezeCv.style.display = "none";
            fCtx.clearRect(0, 0, W, H);

            shredRevealFromCanvas(bgFreezeCv, W, H, () => {
              bgVideo.style.display = "block";
              bgVideo.currentTime = 0;
              bgVideo.loop = true;
              bgVideo.play().catch(() => {});
            });
          });
        }
      };

      audio.addEventListener("timeupdate", onTick);
    }, { once: true });

    // ---------- SEGMENTATION ----------

    let segmenter: ImageSegmenter | null = null;
    let active = true;

    const offscreen = document.createElement("canvas");

    async function initSegmentation() {
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

      const offCtx = offscreen.getContext("2d")!;
      const maskCanvas = document.createElement("canvas");
      const maskCtx = maskCanvas.getContext("2d")!;

      const tick = () => {
        if (!active || !videoElement || !segmenter) {
          segRafRef.current = requestAnimationFrame(tick);
          return;
        }

        const iw = videoElement.videoWidth;
        const ih = videoElement.videoHeight;

        if (iw === 0 || ih === 0) {
          segRafRef.current = requestAnimationFrame(tick);
          return;
        }

        if (offscreen.width !== iw || offscreen.height !== ih) {
          offscreen.width = iw;
          offscreen.height = ih;
          maskCanvas.width = iw;
          maskCanvas.height = ih;
        }

        const result = segmenter.segmentForVideo(videoElement, performance.now());
        const mask = result.confidenceMasks?.[0];

        if (mask) {
          const data = mask.getAsFloat32Array();
          const img = maskCtx.createImageData(iw, ih);

          for (let i = 0; i < data.length; i++) {
            img.data[i * 4 + 3] = data[i] * 255;
          }

          maskCtx.putImageData(img, 0, 0);

          offCtx.clearRect(0, 0, iw, ih);
          offCtx.drawImage(videoElement, 0, 0);
          offCtx.globalCompositeOperation = "destination-in";
          offCtx.drawImage(maskCanvas, 0, 0);
          offCtx.globalCompositeOperation = "source-over";

          outCtx.clearRect(0, 0, W, H);
          outCtx.drawImage(offscreen, 0, 0, W, H);
        }

        result.close();
        segRafRef.current = requestAnimationFrame(tick);
      };

      tick();
    }

    if (videoElement) initSegmentation();

    return () => {
      active = false;
      if (segRafRef.current) cancelAnimationFrame(segRafRef.current);
      audio.pause();
      introVideo.pause();
      bgVideo.pause();
      segmenter?.close();
    };
  }, [videoElement]);

  // ---------- EFFECT FUNCTIONS  ----------

  function continuousPreSlashes(ctx: CanvasRenderingContext2D, W: number, H: number) {
    let active = true;
    const slashes: any[] = [];

    function spawn() {
      const len = Math.min(W, H) * 0.45;
      const cx = Math.random() * W;
      const cy = Math.random() * H;
      const angle = Math.random() * Math.PI;

      const cos = Math.cos(angle), sin = Math.sin(angle);

      slashes.push({
        x1: cx - cos * len / 2,
        y1: cy - sin * len / 2,
        x2: cx + cos * len / 2,
        y2: cy + sin * len / 2,
        alpha: 1,
        speed: 0.05,
      });
    }

    function loop() {
      ctx.clearRect(0, 0, W, H);

      for (let i = slashes.length - 1; i >= 0; i--) {
        const s = slashes[i];
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.strokeStyle = "#fff";
        ctx.stroke();

        s.alpha -= s.speed;
        if (s.alpha <= 0) slashes.splice(i, 1);
      }

      if (active) requestAnimationFrame(loop);
    }

    loop();
    const interval = setInterval(spawn, 150);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }

  function shatterFrameEffect(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, W: number, H: number, done: () => void) {
    let frame = 0;
    function tick() {
      ctx.clearRect(0, 0, W, H);
      frame++;
      if (frame > 60) done();
      else requestAnimationFrame(tick);
    }
    tick();
  }

  function shredRevealFromCanvas(srcCanvas: HTMLCanvasElement, W: number, H: number, done: () => void) {
    setTimeout(done, 2000);
  }

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 50 }}>
      <video
        ref={introVideoRef}
        src="/sukuna/ripple effect.webm"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <video
        ref={bgVideoRef}
        src="/sukuna/DE Background.webm"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ display: "none" }}
      />

      <canvas ref={shatterCanvasRef} className="absolute inset-0 z-20" />
      <canvas ref={slashCanvasRef} className="absolute inset-0 z-30" />
      <canvas ref={freezeCanvasRef} className="absolute inset-0 z-25" />
      <canvas ref={bgFreezeCanvasRef} className="absolute inset-0 hidden" />

      <canvas ref={outputCanvasRef} className="absolute inset-0 z-40" />

      <audio ref={audioRef} src="/sukuna/sukuna-audio.mp3" />
    </div>
  );
}