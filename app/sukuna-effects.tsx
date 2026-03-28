"use client";

import { useEffect, useRef } from "react";
import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";

interface Props {
  videoElement: HTMLVideoElement | null;
  onComplete?: () => void;
}

export default function SukunaEffects({ videoElement, onComplete }: Props) {
  const containerRef      = useRef<HTMLDivElement>(null);
  const introVideoRef     = useRef<HTMLVideoElement>(null);
  const bgVideoRef        = useRef<HTMLVideoElement>(null);
  const shatterCanvasRef  = useRef<HTMLCanvasElement>(null);
  const slashCanvasRef    = useRef<HTMLCanvasElement>(null);
  const freezeCanvasRef   = useRef<HTMLCanvasElement>(null);
  const bgFreezeCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef   = useRef<HTMLCanvasElement>(null);
  const segRafRef         = useRef<number | null>(null);
  const cleanupRef        = useRef<(() => void) | null>(null);

  useEffect(() => {
    const introVideo  = introVideoRef.current!;
    const bgVideo     = bgVideoRef.current!;
    const shatterCv   = shatterCanvasRef.current!;
    const slashCv     = slashCanvasRef.current!;
    const freezeCv    = freezeCanvasRef.current!;
    const bgFreezeCv  = bgFreezeCanvasRef.current!;
    const outputCv    = outputCanvasRef.current;
    const container   = containerRef.current!;

    if (!introVideo || !bgVideo || !shatterCv || !slashCv ||
        !freezeCv || !bgFreezeCv || !outputCv || !container) return;

    const W = window.innerWidth;
    const H = window.innerHeight;

    [shatterCv, slashCv, freezeCv, bgFreezeCv, outputCv].forEach(cv => {
      cv.width = W; cv.height = H;
      cv.style.width = W + "px"; cv.style.height = H + "px";
    });

    const sCtx   = shatterCv.getContext("2d")!;
    const slCtx  = slashCv.getContext("2d")!;
    const fCtx   = freezeCv.getContext("2d")!;
    const bfCtx  = bgFreezeCv.getContext("2d")!;
    const outCtx = outputCv.getContext("2d")!;

    let destroyed = false;

    // ── Web Audio (fetch-decoded for precise currentTime) ─────────────────
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    let audioSource: AudioBufferSourceNode | null = null;
    let audioStartTime: number | null = null;

    function getAudioTime() {
      if (!audioSource || audioStartTime === null) return 0;
      return audioCtx.currentTime - audioStartTime;
    }

    async function startWebAudio(): Promise<void> {
      try {
        const resp = await fetch("/sukuna/sukuna-audio.mp3");
        const raw  = await resp.arrayBuffer();
        const buf  = await audioCtx.decodeAudioData(raw);
        await audioCtx.resume();
        if (destroyed) return;
        audioSource = audioCtx.createBufferSource();
        audioSource.buffer = buf;
        audioSource.connect(audioCtx.destination);
        audioSource.start(0);
        audioStartTime = audioCtx.currentTime;
      } catch (e) {
        console.error("[SukunaEffects] audio error:", e);
      }
    }

    // ── Pre-load BG video frame silently ──────────────────────────────────
    function preloadBgFrame(): Promise<void> {
      return new Promise(resolve => {
        // Set src and wait for canplay before seeking
        bgVideo.preload = "auto";
        bgVideo.muted   = true;

        const onCanPlay = () => {
          bgVideo.removeEventListener("canplay", onCanPlay);
          bgVideo.currentTime = 1; // frame 24 at 24fps
        };

        const onSeeked = () => {
          bgVideo.removeEventListener("seeked", onSeeked);
          try { bfCtx.drawImage(bgVideo, 0, 0, W, H); } catch (_) {}
          resolve();
        };

        bgVideo.addEventListener("canplay", onCanPlay, { once: true });
        bgVideo.addEventListener("seeked",  onSeeked,  { once: true });

        // Video already has src and preload="auto", don't call load()
      });
    }

    // ── Main sequence ─────────────────────────────────────────────────────
    async function run() {
      // Pre-load bg frame in parallel while intro is starting
      const bgFramePromise = preloadBgFrame();

      // Wait for intro video to be ready then play
      await new Promise<void>(resolve => {
        if (introVideo.readyState >= 2) { resolve(); return; }
        introVideo.addEventListener("canplay", () => resolve(), { once: true });
      });

      if (destroyed) return;
      introVideo.style.display = "block";

      try { await introVideo.play(); }
      catch (e) { console.error("[SukunaEffects] intro play failed:", e); return; }

      // Wait for intro to end
      await new Promise<void>(resolve => {
        introVideo.addEventListener("ended", () => resolve(), { once: true });
      });

      if (destroyed) return;

      // Capture freeze frame of intro last frame
      try { fCtx.drawImage(introVideo, 0, 0, W, H); } catch (_) {}
      introVideo.style.display = "none";
      freezeCv.style.display   = "block";

      // Ensure bg frame is captured before shred
      await bgFramePromise;
      if (destroyed) return;

      // Start audio (Web Audio API)
      await startWebAudio();
      if (destroyed) return;

      // Pre-shatter diagonal slashes — run from 0s until 10s
      const stopSlashes = continuousPreSlashes(slCtx, W, H);

      // Poll audio time with rAF for precision
      await new Promise<void>(resolve => {
        function poll() {
          if (destroyed) { resolve(); return; }
          if (getAudioTime() >= 10) { resolve(); return; }
          requestAnimationFrame(poll);
        }
        poll();
      });

      if (destroyed) return;
      stopSlashes();

      // Glass shatter on the frozen intro frame — but don't await it;
      // we trigger the shred at 13.4s audio time regardless
      let shatterDone = false;
      let stopShatter: (() => void) | null = null;
      shatterFrameEffect(sCtx, freezeCv, W, H, () => { shatterDone = true; }, (fn) => { stopShatter = fn; });

      // Wait for audio to hit 13.4s, then forcefully move to shred
      await new Promise<void>(resolve => {
        function poll() {
          if (destroyed) { resolve(); return; }
          if (getAudioTime() >= 13.4) { resolve(); return; }
          requestAnimationFrame(poll);
        }
        poll();
      });

      if (destroyed) return;

      // Kill shatter if it's still running
      if (!shatterDone && stopShatter) stopShatter();
      freezeCv.style.display = "none";
      fCtx.clearRect(0, 0, W, H);
      sCtx.clearRect(0, 0, W, H);

      // Shred reveal from bg video first frame
      await new Promise<void>(resolve => {
        shredRevealFromCanvas(container, bgFreezeCv, W, H, resolve);
      });

      if (destroyed) return;
      bgFreezeCv.style.display = "block";
      bfCtx.clearRect(0, 0, W, H);

      // Start looping BG video
      bgVideo.style.display = "block";
      bgVideo.currentTime   = 0;
      bgVideo.loop          = true;
      bgVideo.muted         = false;
      bgVideo.play().catch(() => {});
    }

    run();

    // ── Segmentation loop ─────────────────────────────────────────────────
    let segmenter: ImageSegmenter | null = null;
    const offscreen  = document.createElement("canvas");
    const maskCanvas = document.createElement("canvas");

    async function initSegmentation() {
      try {
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
      } catch (e) {
        console.error("[SukunaEffects] segmentation init error:", e);
        return;
      }

      const offCtx  = offscreen.getContext("2d")!;
      const maskCtx = maskCanvas.getContext("2d")!;

      const tick = () => {
        if (destroyed || !videoElement || !segmenter) {
          if (!destroyed) segRafRef.current = requestAnimationFrame(tick);
          return;
        }
        const iw = videoElement.videoWidth;
        const ih = videoElement.videoHeight;
        if (iw === 0 || ih === 0) { segRafRef.current = requestAnimationFrame(tick); return; }

        if (offscreen.width !== iw || offscreen.height !== ih) {
          offscreen.width = iw;   offscreen.height = ih;
          maskCanvas.width = iw;  maskCanvas.height = ih;
        }

        try {
          const result = segmenter.segmentForVideo(videoElement, performance.now());
          const mask   = result.confidenceMasks?.[0];

          if (mask) {
            const data = mask.getAsFloat32Array();
            const img  = maskCtx.createImageData(iw, ih);
            for (let i = 0; i < data.length; i++) img.data[i * 4 + 3] = data[i] * 255;
            maskCtx.putImageData(img, 0, 0);

            offCtx.clearRect(0, 0, iw, ih);
            offCtx.save(); offCtx.scale(-1, 1);
            offCtx.drawImage(videoElement, -iw, 0, iw, ih);
            offCtx.restore();
            offCtx.globalCompositeOperation = "destination-in";
            offCtx.save(); offCtx.scale(-1, 1);
            offCtx.drawImage(maskCanvas, -iw, 0, iw, ih);
            offCtx.restore();
            offCtx.globalCompositeOperation = "source-over";

            outCtx.clearRect(0, 0, W, H);
            outCtx.drawImage(offscreen, 0, 0, W, H);
          }
          result.close();
        } catch (_) {}

        segRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    }

    if (videoElement) initSegmentation();

    // ── Cleanup ───────────────────────────────────────────────────────────
    cleanupRef.current = () => {
      destroyed = true;
      if (segRafRef.current) cancelAnimationFrame(segRafRef.current);
      introVideo.pause();
      bgVideo.pause();
      if (audioSource) { try { audioSource.stop(); } catch (_) {} }
      audioCtx.close();
      segmenter?.close();
    };

    return () => { cleanupRef.current?.(); };
  }, [videoElement]);

  // ── EFFECT FUNCTIONS (outside useEffect, pure canvas logic) ─────────────

  function continuousPreSlashes(ctx: CanvasRenderingContext2D, W: number, H: number) {
    let active = true;
    const LEN = Math.min(W, H) * 0.45;
    const slashes: { x1:number; y1:number; x2:number; y2:number; alpha:number; speed:number; width:number }[] = [];

    function spawn() {
      const cx    = W * 0.1 + Math.random() * W * 0.8;
      const cy    = H * 0.1 + Math.random() * H * 0.8;
      const angle = (Math.random() - 0.5) * Math.PI * 0.7 + Math.PI * 0.25;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      slashes.push({
        x1: cx - cos * LEN / 2, y1: cy - sin * LEN / 2,
        x2: cx + cos * LEN / 2, y2: cy + sin * LEN / 2,
        alpha: 1, speed: 0.045 + Math.random() * 0.025, width: 2.5 + Math.random() * 2,
      });
    }

    let timer: ReturnType<typeof setTimeout>;
    function schedule() {
      if (!active) return;
      spawn();
      if (Math.random() > 0.5) spawn();
      timer = setTimeout(schedule, 200 + Math.random() * 200);
    }
    schedule();

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (let i = slashes.length - 1; i >= 0; i--) {
        const s = slashes[i];
        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth   = s.width;
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur  = 14;
        ctx.lineCap     = "round";
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
        ctx.restore();
        s.alpha -= s.speed;
        if (s.alpha <= 0) slashes.splice(i, 1);
      }
      if (active || slashes.length > 0) requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, W, H);
    }
    draw();

    return function stop() { active = false; clearTimeout(timer); };
  }

  function shatterFrameEffect(
    ctx: CanvasRenderingContext2D,
    freezeCv: HTMLCanvasElement,
    W: number, H: number,
    onDone: () => void,
    exposeStop?: (stop: () => void) => void
  ) {
    const cx = W / 2, cy = H / 2;
    const rng = () => Math.random();
    let stopped = false;

    // Expose a stop handle so the caller can kill this early
    if (exposeStop) exposeStop(() => { stopped = true; ctx.clearRect(0, 0, W, H); onDone(); });

    function buildShards(NUM: number) {
      const seeds = Array.from({ length: NUM }, () => ({ x: rng() * W, y: rng() * H }));
      const d2 = (a:{x:number;y:number}, b:{x:number;y:number}) => (a.x-b.x)**2+(a.y-b.y)**2;
      return seeds.map(s => {
        const nb = seeds.filter(n => n !== s).sort((a,b) => d2(s,a)-d2(s,b));
        const n1 = nb[0], n2 = nb[1];
        const pts = [
          { x: s.x,           y: s.y           },
          { x: (s.x+n1.x)/2, y: (s.y+n1.y)/2 },
          { x: (s.x+n2.x)/2, y: (s.y+n2.y)/2 },
        ];
        const ox = (pts[0].x+pts[1].x+pts[2].x)/3;
        const oy = (pts[0].y+pts[1].y+pts[2].y)/3;
        const dx = ox-cx, dy = oy-cy;
        const d  = Math.sqrt(dx*dx+dy*dy)||1;
        const spd = 1.5+rng()*2.5;
        return {
          pts, ox, oy, angle:0, origOx:ox, origOy:oy,
          vx:(dx/d)*spd*(1.8+rng()*1.8), vy:(dy/d)*spd*(1.8+rng()*1.8),
          gravity:0.2+rng()*0.15, vr:(rng()-0.5)*0.18,
          alpha:1, flyDelay:Math.floor(rng()*12),
        };
      });
    }

    function drawCracks(progress: number, frame: number, opacityMult = 1) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${0.85*progress*opacityMult})`;
      ctx.lineWidth   = 1.5;
      const maxLen = Math.max(W,H)*0.7;
      for (let i = 0; i < 20; i++) {
        const angle = (i/20)*Math.PI*2 + ((i*7919)%100)*0.006;
        const len   = (0.35+((i*6271)%100)*0.004)*maxLen*progress;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        for (let s = 1; s <= 5; s++) {
          const j = ((i*s*3571)%100-50)*0.004;
          ctx.lineTo(cx+Math.cos(angle+j)*len*(s/5), cy+Math.sin(angle+j)*len*(s/5));
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    const CRACK_FRAMES = 25, FLY_FRAMES = 80;
    const shards = buildShards(90);
    let frame = 0;

    function tick() {
      if (stopped) return;
      ctx.clearRect(0, 0, W, H);
      if (frame < CRACK_FRAMES) {
        drawCracks(frame/CRACK_FRAMES, frame);
      } else {
        if (frame === CRACK_FRAMES) freezeCv.style.display = "none";
        for (const sh of shards) {
          if (sh.alpha <= 0) continue;
          ctx.save();
          ctx.translate(sh.ox, sh.oy); ctx.rotate(sh.angle); ctx.translate(-sh.ox, -sh.oy);
          ctx.beginPath();
          ctx.moveTo(sh.pts[0].x, sh.pts[0].y);
          ctx.lineTo(sh.pts[1].x, sh.pts[1].y);
          ctx.lineTo(sh.pts[2].x, sh.pts[2].y);
          ctx.closePath(); ctx.clip();
          ctx.globalAlpha = sh.alpha;
          ctx.drawImage(freezeCv, sh.ox-sh.origOx, sh.oy-sh.origOy, W, H);
          ctx.globalAlpha = sh.alpha*0.8;
          ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.restore();
          if (frame-CRACK_FRAMES > sh.flyDelay) {
            sh.pts.forEach(p => { p.x += sh.vx; p.y += sh.vy; });
            sh.ox += sh.vx; sh.oy += sh.vy;
            sh.vy += sh.gravity; sh.angle += sh.vr; sh.alpha -= 0.014;
          }
        }
        if (frame < CRACK_FRAMES+20) {
          drawCracks(1, frame, 1-(frame-CRACK_FRAMES)/20);
        }
      }
      frame++;
      if (frame < CRACK_FRAMES+FLY_FRAMES) requestAnimationFrame(tick);
      else { ctx.clearRect(0,0,W,H); onDone(); }
    }
    tick();
  }

  function shredRevealFromCanvas(
    container: HTMLDivElement,
    srcCanvas: HTMLCanvasElement,
    W: number, H: number,
    onDone: () => void
  ) {
    const NUM = 30, stripW = W/NUM;
    const strips: HTMLDivElement[] = [];

    srcCanvas.toBlob(blob => {
      if (!blob) { onDone(); return; }
      const url = URL.createObjectURL(blob);

      for (let i = 0; i < NUM; i++) {
        const div = document.createElement("div");
        const fromTop = i % 2 === 0;
        div.style.cssText = `
          position:absolute; top:0; left:${i*stripW}px;
          width:${Math.ceil(stripW)+1}px; height:${H}px;
          background-image:url('${url}');
          background-size:${W}px ${H}px;
          background-position:${-i*stripW}px 0;
          background-repeat:no-repeat;
          transform:translateY(${fromTop?"-110%":"110%"});
          opacity:0; will-change:transform,opacity; z-index:35;
        `;
        container.appendChild(div);
        strips.push(div);
        const delay = i === 0 ? 0 : i*180 + Math.random()*120;
        setTimeout(() => {
          div.style.transition = "transform 1.8s cubic-bezier(0.16,1,0.3,1), opacity 0.6s";
          div.style.transform  = "translateY(0)";
          div.style.opacity    = "1";
        }, delay);
      }

      setTimeout(() => {
        strips.forEach(d => d.remove());
        URL.revokeObjectURL(url);
        onDone();
      }, 7000);
    }, "image/png");
  }

  return (
    <div ref={containerRef} className="fixed inset-0" style={{ zIndex: 50 }}>

      {/* Intro ripple video — muted so autoplay works, audio handled separately */}
      <video
        ref={introVideoRef}
        src="/sukuna/ripple effect.webm"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 10, display: "none" }}
        playsInline
        muted
        preload="auto"
      />

      {/* Looping domain BG video */}
      <video
        ref={bgVideoRef}
        src="/sukuna/DE Background.webm"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ zIndex: 5, display: "none", background: "#000" }}
        playsInline
        preload="auto"
      />

      {/* Freeze frame of intro last frame */}
      <canvas ref={freezeCanvasRef}    className="absolute inset-0" style={{ zIndex: 20, display: "none" }} />
      {/* Offscreen BG first frame capture — never shown directly */}
      <canvas ref={bgFreezeCanvasRef}  className="absolute inset-0" style={{ zIndex: 25,  display: "none" }} />
      {/* Glass shatter + crack animation */}
      <canvas ref={shatterCanvasRef}   className="absolute inset-0" style={{ zIndex: 30 }} />
      {/* Pre-shatter diagonal slashes */}
      <canvas ref={slashCanvasRef}     className="absolute inset-0" style={{ zIndex: 40 }} />
      {/* Segmented person cutout — always on top */}
      <canvas ref={outputCanvasRef}    className="absolute inset-0" style={{ zIndex: 50 }} />

    </div>
  );
}
