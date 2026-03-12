"use client"

import CameraWithHandTracker from "@/components/CameraWithHandTracker"

export default function Page() {
  return <CameraWithHandTracker onHandsDetected={(hands) => console.log(hands)} />
}