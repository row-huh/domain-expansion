"use client"

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

export type Landmark = { x: number; y: number; z?: number }
export type HandLandmarks = Landmark[]

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

    useImperativeHandle(ref, () => ({ videoElement: videoRef.current }))

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
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
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

    // Render loop — starts once video is playing
    useEffect(() => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      const ctx = canvas.getContext("2d")!

      const onPlaying = () => {
        let lastTimestamp = -1

        const tick = () => {
          animFrameRef.current = requestAnimationFrame(tick)
          if (!landmarkerRef.current || video.paused || video.ended) return

          const ts = video.currentTime * 1000
          if (ts === lastTimestamp) return
          lastTimestamp = ts

          const result = landmarkerRef.current.detectForVideo(video, performance.now())
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          if (!result.landmarks?.length) return

          result.landmarks.forEach((hand) => {
            hand.forEach((lm) => {
              ctx.beginPath()
              ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 5, 0, 2 * Math.PI)
              ctx.fillStyle = "red"
              ctx.fill()
            })
          })

          onHandsDetected?.(
            result.landmarks.map((hand) =>
              hand.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z }))
            )
          )
        }

        animFrameRef.current = requestAnimationFrame(tick)
      }

      video.addEventListener("playing", onPlaying)
      return () => {
        video.removeEventListener("playing", onPlaying)
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      }
    }, [onHandsDetected])

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