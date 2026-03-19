
"use client"

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

export type Landmark = { x: number; y: number; z?: number }
export type HandLandmarks = Landmark[]

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
]

export interface CameraFeedRef {
  videoElement: HTMLVideoElement | null
}

interface Props {
  onHandsDetected?: (hands: HandLandmarks[]) => void
  width?: number
  height?: number
}

const CameraWithHandTracker = forwardRef<CameraFeedRef, Props>(
  ({ onHandsDetected, width = 1280, height = 720 }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const landmarkerRef = useRef<HandLandmarker | null>(null)
    const animFrameRef = useRef<number | null>(null)
    // Keep a ref to the latest callback so the tick loop never goes stale
    const onHandsDetectedRef = useRef(onHandsDetected)

    useImperativeHandle(ref, () => ({ videoElement: videoRef.current }))

    // Keep ref in sync whenever prop changes — no need to restart the loop
    useEffect(() => {
      onHandsDetectedRef.current = onHandsDetected
    }, [onHandsDetected])

    // Start webcam
    useEffect(() => {
      const startWebcam = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          if (videoRef.current) videoRef.current.srcObject = stream
        } catch (err) {
          console.error("Webcam error:", err)
        }
      }
      startWebcam()
      return () => {
        if (videoRef.current?.srcObject) {
          ;(videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
        }
      }
    }, [])

    // Init HandLandmarker
    useEffect(() => {
      let cancelled = false
      const init = async () => {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
        )
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.8,
          minHandPresenceConfidence: 0.8,
          minTrackingConfidence: 0.8,
        })
        if (!cancelled) landmarkerRef.current = landmarker
      }
      init()
      return () => {
        cancelled = true
        landmarkerRef.current?.close()
      }
    }, [])

    // Render loop — starts once video is playing, handles already-playing case
    useEffect(() => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      const ctx = canvas.getContext("2d")!
      let lastTimestamp = -1

      const tick = () => {
        animFrameRef.current = requestAnimationFrame(tick)
        if (!landmarkerRef.current || video.paused || video.ended) return

        const ts = video.currentTime * 1000
        if (ts === lastTimestamp) return
        lastTimestamp = ts

        const result = landmarkerRef.current.detectForVideo(video, performance.now())
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (result.landmarks?.length) {
          result.landmarks.forEach((hand) => {
            ctx.strokeStyle = "white"
            ctx.lineWidth = 2
            HAND_CONNECTIONS.forEach(([start, end]) => {
              const a = hand[start]
              const b = hand[end]
              ctx.beginPath()
              ctx.moveTo(a.x * canvas.width, a.y * canvas.height)
              ctx.lineTo(b.x * canvas.width, b.y * canvas.height)
              ctx.stroke()
            })
            hand.forEach((lm) => {
              ctx.beginPath()
              ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, 2 * Math.PI)
              ctx.fillStyle = "lime"
              ctx.fill()
            })
          })
        }

        // Always fire the callback (even with 0 hands) using the latest ref
        onHandsDetectedRef.current?.(
          (result.landmarks ?? []).map((hand) =>
            hand.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z }))
          )
        )
      }

      const startLoop = () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        lastTimestamp = -1
        animFrameRef.current = requestAnimationFrame(tick)
      }

      // If video is already playing (effect ran late), start immediately
      if (!video.paused && !video.ended && video.readyState >= 3) {
        console.log("[camera] video already playing, starting loop immediately")
        startLoop()
      }

      // Also listen for future play events (initial load, or resume)
      video.addEventListener("playing", startLoop)

      return () => {
        video.removeEventListener("playing", startLoop)
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      }
    }, []) // empty deps — loop is stable, callback is read via ref

    return (
      <div className="fixed inset-0 w-full h-full">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>
    )
  }
)

CameraWithHandTracker.displayName = "CameraWithHandTracker"
export default CameraWithHandTracker