// ROHA TO USAIB
// setup sukuna here 
// a route for each like /gojo for gojo domain expansion and /sukuna for sukuna's



"use client"

import { useRef, useState } from "react"
import CameraFeed, { CameraFeedRef } from "@/components/CameraFeed"
import HandTracker, { HandLandmarks } from "@/components/HandTracker"
import { useSukunaGesture } from "./gestureDetect"

export default function SukunaDomainExpansion() {
  const cameraRef = useRef<CameraFeedRef>(null)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const detectGesture = useSukunaGesture()

  const handleVideoReady = (video: HTMLVideoElement) => {
    setVideoElement(video)
  }

  const handleHandsDetected = (hands: HandLandmarks[]) => {
    const gestureDetected = detectGesture(hands)
    if (gestureDetected) {
      console.log("Sukuna Domain Expansion Activated!")
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-4xl font-bold mb-6">RYOIKI TENKAI</h1>

      <CameraFeed ref={cameraRef} onVideoReady={handleVideoReady} />
      <HandTracker videoElement={videoElement} onHandsDetected={handleHandsDetected} />
    </div>
  )
}
