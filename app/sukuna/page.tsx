"use client"
import { useRef } from "react"
import CameraWithHandTracker, { CameraFeedRef } from "@/components/CameraWithHandTracker"
import { HandLandmarks } from "@/components/CameraWithHandTracker"
import { useSukunaGesture } from "./gestureDetect"

export default function SukunaDomainExpansion() {
  const cameraRef = useRef<CameraFeedRef>(null)
  const detectGesture = useSukunaGesture()

  const handleHandsDetected = (hands: HandLandmarks[]) => {
    const gestureDetected = detectGesture(hands)
    if (gestureDetected) {
      console.log("Sukuna Domain Expansion Activated!")
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-4xl font-bold mb-6">RYOIKI TENKAI</h1>
      <CameraWithHandTracker ref={cameraRef} onHandsDetected={handleHandsDetected} />
    </div>
  )
}