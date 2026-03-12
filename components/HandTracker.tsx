"use client"

import { useEffect, useRef, useState } from "react"
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

export type Landmark = { x: number; y: number; z?: number }
export type HandLandmarks = Landmark[]

type HandTrackerProps = {
  videoElement?: HTMLVideoElement | null
  onHandsDetected?: (hands: HandLandmarks[]) => void
  width?: number
  height?: number
}

export default function HandTracker({
  videoElement,
  onHandsDetected,
  width = 1280,
  height = 720,
}: HandTrackerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const [ready, setReady] = useState(false)

  // Initialize HandLandmarker once on mount
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      // Points to the WASM bundle hosted on jsDelivr
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      )

      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU", // falls back to CPU automatically
        },
        runningMode: "VIDEO",   // ← needed for per-frame detection
        numHands: 2,
        minHandDetectionConfidence: 0.8,
        minHandPresenceConfidence: 0.8,
        minTrackingConfidence: 0.8,
      })

      if (!cancelled) {
        landmarkerRef.current = landmarker
        setReady(true)
      }
    }

    init()
    return () => {
      cancelled = true
      landmarkerRef.current?.close()
    }
  }, [])

  //  Start the render loop once both the landmarker and video are ready
  useEffect(() => {
    if (!ready || !videoElement || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")!
    let lastTimestamp = -1

    const tick = () => {
      animFrameRef.current = requestAnimationFrame(tick)

      // Only process a new frame when the video timestamp has advanced
      const ts = videoElement.currentTime * 1000  // ms
      if (ts === lastTimestamp || videoElement.paused || videoElement.ended) return
      lastTimestamp = ts

      // Detect — pass the timestamp so the tracker can interpolate
      const result = landmarkerRef.current!.detectForVideo(videoElement, performance.now())

      // Clear previous overlay
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (!result.landmarks?.length) return

      //  Draw landmarks
      result.landmarks.forEach((hand) => {
        hand.forEach((lm) => {
          ctx.beginPath()
          ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 5, 0, 2 * Math.PI)
          ctx.fillStyle = "red"
          ctx.fill()
        })
      })

      // Forward normalised landmarks to parent
      if (onHandsDetected) {
        const mapped: HandLandmarks[] = result.landmarks.map((hand) =>
          hand.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z }))
        )
        onHandsDetected(mapped)
      }
    }

    animFrameRef.current = requestAnimationFrame(tick)

    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current)
    }
  }, [ready, videoElement, onHandsDetected, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="fixed inset-0 w-full h-full pointer-events-none"
    />
  )
}