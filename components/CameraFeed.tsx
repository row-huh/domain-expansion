'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface CameraFeedRef {
  videoElement: HTMLVideoElement | null;
}

interface CameraFeedProps {
  onVideoReady?: (video: HTMLVideoElement) => void;
}

const CameraFeed = forwardRef<CameraFeedRef, CameraFeedProps>(({ onVideoReady }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    videoElement: videoRef.current,
  }));

  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          if (onVideoReady) {
            onVideoReady(videoRef.current);
          }
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
  }, [onVideoReady]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="fixed inset-0 w-full h-full object-cover"
    />
  );
});

CameraFeed.displayName = 'CameraFeed';

export default CameraFeed;
