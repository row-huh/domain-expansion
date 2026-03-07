// todos 
// setup constraints such that camera feed on mobile only shows
// up if the phone is horizontal - otherwise show a 'rotate your phone' popup
// bcoz a very thin,slim ish domain expansion would look like ass and if we're using 1920x1080
// vid then how do you convert it into 9:16 without creating a visual abomination


'use client';

import { useEffect, useRef } from 'react';

export default function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
      }
    };

    startWebcam();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="fixed inset-0 w-full h-full object-cover"
    />
  );
}
