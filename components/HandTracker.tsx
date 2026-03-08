"use client"

import { useEffect, useRef, useState } from "react"
import { useSukunaGesture, HandLandmarks } from "../app/sukuna/gestureDetect"

type HandTrackerProps = {
  onGestureDetected?: () => void
}

export default function HandTracker({ onGestureDetected }: HandTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [handsModule, setHandsModule] = useState<any>(null)
  const [isLandscape, setIsLandscape] = useState(true)

  const detectGesture = useSukunaGesture()

  // --- Orientation check ---
  useEffect(() => {
    const checkOrientation = () => setIsLandscape(window.innerWidth > window.innerHeight)
    checkOrientation()
    window.addEventListener("resize", checkOrientation)
    window.addEventListener("orientationchange", checkOrientation)
    return () => {
      window.removeEventListener("resize", checkOrientation)
      window.removeEventListener("orientationchange", checkOrientation)
    }
  }, [])

  // --- Dynamic import of Hands and Camera ---
  useEffect(() => {
    if (!videoRef.current) return

    let hands: any = null
    let camera: any = null

    const loadMediaPipe = async () => {
      // Dynamically import Hands
      const handsModuleImport = await import("@mediapipe/hands")
      const HandsClass = handsModuleImport.Hands || (handsModuleImport as any).default

      hands = new HandsClass({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      })

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.8,
        minTrackingConfidence: 0.8,
      })

      hands.onResults(onResults)
      setHandsModule(hands)

      // Dynamically import Camera
      const cameraUtils = await import("@mediapipe/camera_utils")
      const CameraClass = cameraUtils.Camera

      camera = new CameraClass(videoRef.current!, {
        onFrame: async () => {
          if (hands && videoRef.current) {
            await hands.send({ image: videoRef.current })
          }
        },
        width: 1280,
        height: 720,
      })

      camera.start()
    }

    loadMediaPipe()

    return () => {
      if (hands) hands.close()
      if (camera) camera.stop()
    }
  }, [])

  // --- Handle results from MediaPipe ---
  const onResults = (results: any) => {
    if (!canvasRef.current || !results.multiHandLandmarks) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // --- Draw video frame on canvas ---
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    ctx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height)

    // --- Draw landmarks ---
    results.multiHandLandmarks.forEach((landmarks: any) => {
      landmarks.forEach((lm: any) => {
        ctx.beginPath()
        ctx.arc(lm.x * canvasRef.current!.width, lm.y * canvasRef.current!.height, 5, 0, 2 * Math.PI)
        ctx.fillStyle = "red"
        ctx.fill()
      })
    })

    // --- Convert landmarks to our format and detect gesture ---
    const hands: HandLandmarks[] = results.multiHandLandmarks.map((landmarks: any) =>
      landmarks.map((lm: any) => ({ x: lm.x, y: lm.y, z: lm.z }))
    )

    const gestureDetected = detectGesture(hands)
    if (gestureDetected && onGestureDetected) {
      console.log("Sukuna Gesture Detected!")
      onGestureDetected()
    }

    // --- Later: Add domain expansion animation here ---
  }

  // --- Rotate phone message ---
  if (!isLandscape) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white text-center p-4">
        <p>Please rotate your phone to landscape for best experience</p>
      </div>
    )
  }

  // --- Render canvas only (video is hidden) ---
  return (
    <div className="fixed inset-0 w-full h-full">
      <video ref={videoRef} autoPlay playsInline muted style={{ display: "none" }} />
      <canvas ref={canvasRef} width={1280} height={720} className="fixed inset-0 w-full h-full" />
    </div>
  )
}
