"use client"

import { useRef, useState } from "react"
import CameraFeed, { CameraFeedRef } from "@/components/CameraFeed"
import HandTracker, { HandLandmarks } from "@/components/HandTracker"



export default function GojoDomainExpansion() {
  const cameraRef = useRef<CameraFeedRef>(null)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [matched, setMatched] = useState(false)

  const handleVideoReady = (video: HTMLVideoElement) => {
    setVideoElement(video)
  }

  const handleHandsDetected = (hands: HandLandmarks[]) => {
    if (hands.length === 0) {
      setMatched(false)
      return
    }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-4xl font-bold mb-6">GOJO RYOIKI TENKAI</h1>

      {matched && (
        <div className="text-4xl font-bold text-green-500 mb-6 animate-pulse">
          MATCHED
        </div>
      )}

      <CameraFeed ref={cameraRef} onVideoReady={handleVideoReady} />
      <HandTracker videoElement={videoElement} onHandsDetected={handleHandsDetected} />
    </div>
  )
}
}
