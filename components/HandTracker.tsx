"use client"

import { useEffect, useRef, useState } from "react"

export type Landmark = { x: number; y: number; z?: number }
export type HandLandmarks = Landmark[]

type HandTrackerProps = {
  videoElement?: HTMLVideoElement | null
  onHandsDetected?: (hands: HandLandmarks[]) => void
  width?: number
  height?: number
}

export default function HandTracker({ videoElement, onHandsDetected, width = 1280, height = 720 }: HandTrackerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!videoElement || !canvasRef.current || isProcessing) return

    videoRef.current = videoElement
    setIsProcessing(true)

    let hands: any = null
    let camera: any = null

    const initMediaPipe = async () => {
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

      const cameraUtils = await import("@mediapipe/camera_utils")
      const CameraClass = cameraUtils.Camera

      camera = new CameraClass(videoRef.current!, {
        onFrame: async () => {
          if (hands && videoRef.current) {
            await hands.send({ image: videoRef.current })
          }
        },
        width,
        height,
      })

      camera.start()
    }

    const onResults = (results: any) => {
      if (!canvasRef.current || !results.multiHandLandmarks) return

      const ctx = canvasRef.current.getContext("2d")
      if (!ctx) return

      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

      results.multiHandLandmarks.forEach((landmarks: any) => {
        landmarks.forEach((lm: any) => {
          ctx.beginPath()
          ctx.arc(
            lm.x * canvasRef.current!.width,
            lm.y * canvasRef.current!.height,
            5,
            0,
            2 * Math.PI
          )
          ctx.fillStyle = "red"
          ctx.fill()
        })
      })

      const hands: HandLandmarks[] = results.multiHandLandmarks.map((landmarks: any) =>
        landmarks.map((lm: any) => ({ x: lm.x, y: lm.y, z: lm.z }))
      )

      if (onHandsDetected) {
        onHandsDetected(hands)
      }
    }

    initMediaPipe()

    return () => {
      if (hands) hands.close()
      if (camera) camera.stop()
      setIsProcessing(false)
    }
  }, [videoElement, onHandsDetected, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="fixed inset-0 w-full h-full pointer-events-none"
    />
  )
}
