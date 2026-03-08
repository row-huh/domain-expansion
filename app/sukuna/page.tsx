// ROHA TO USAIB
// setup sukuna here 
// a route for each like /gojo for gojo domain expansion and /sukuna for sukuna's



"use client"

import HandTracker from "@/components/HandTracker"

export default function SukunaDomainExpansion() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-4xl font-bold mb-6">RYOIKI TENKAI</h1>

      <HandTracker
        onGestureDetected={() => {
          console.log("Sukuna Domain Expansion Activated!")
          // Here later you can trigger your animation/effect
        }}
      />
    </div>
  )
}