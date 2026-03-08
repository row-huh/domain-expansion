// SukunaGestureDetector.tsx
import { useRef } from "react";

export type Landmark = { x: number; y: number; z?: number };
export type HandLandmarks = Landmark[];

// Constants
const REQUIRED_FRAMES = 10;

// Distance helper
const distance = (a: Landmark, b: Landmark) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// React-friendly gesture detector
export function useSukunaGesture() {
  const gestureFrames = useRef(0);

  function detectGesture(hands: HandLandmarks[]): boolean {
    if (hands.length !== 2) {
      gestureFrames.current = 0;
      return false;
    }

    const [left, right] = hands;

    if (left.length < 21 || right.length < 21) return false;

    const handSize = distance(left[0], left[9]);
    const threshold = handSize * 0.4;

    const middleTouch = distance(left[12], right[12]) < threshold;
    const ringTouch = distance(left[16], right[16]) < threshold;
    const thumbTouch = distance(left[4], right[4]) < threshold;

    const indexBentLeft = left[8].y > left[6].y;
    const indexBentRight = right[8].y > right[6].y;
    const pinkyBentLeft = left[20].y > left[18].y;
    const pinkyBentRight = right[20].y > right[18].y;

    const gestureDetected =
      middleTouch &&
      ringTouch &&
      thumbTouch &&
      indexBentLeft &&
      indexBentRight &&
      pinkyBentLeft &&
      pinkyBentRight;

    gestureFrames.current = gestureDetected ? gestureFrames.current + 1 : 0;

    if (gestureFrames.current > REQUIRED_FRAMES) {
      console.log("Sukuna Gesture Detected");
      return true;
    }

    return false;
  }

  return detectGesture;
}