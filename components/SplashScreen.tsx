"use client";

import { useEffect, useState } from "react";

interface SplashScreenProps {
  onEnter: () => void;
  backgroundImage?: string;
}

export default function SplashScreen({
  onEnter,
  backgroundImage = "/splash2.jpg",
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  // ✅ Typewriter state
  const fullText = "A Piece of Work Presented By Roha & Usaib";
  const [typedText, setTypedText] = useState("");
  const [typingDone, setTypingDone] = useState(false);

  // ✅ Transition state
  const [pushTransition, setPushTransition] = useState(false);

  // ✅ Enter key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        setPushTransition(true);

        setTimeout(() => {
          setIsVisible(false);
          onEnter();
        }, 800); // match animation duration
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEnter]);

  // ✅ Typewriter effect
  useEffect(() => {
    let index = 0;

    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, index + 1));
      index++;

      if (index === fullText.length) {
        clearInterval(interval);
        setTypingDone(true);
      }
    }, 90);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden transition-opacity duration-300">

      {/* Splash Screen */}
      <div className={`absolute inset-0 ${pushTransition ? "push-out" : ""}`}>
        {/* Background Image */}
        <img
          src={backgroundImage}
          alt="Splash Background"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            animation: "slow-zoom 8s ease-in-out infinite alternate",
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Press Enter Text */}
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-10"
          style={{
            bottom: "calc(2.5in + 2rem)",
            fontSize: "25px",
            fontFamily: '"Nerdropol Lattice", sans-serif',
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            letterSpacing: "0.05em",
            textShadow:
              "0 0 20px rgba(255, 255, 255, 0.6), 0 0 40px rgba(255, 255, 255, 0.3)",
            animation: "pulse-glow 2s ease-in-out infinite",
          }}
        >
          Press Enter Key to Start
        </div>

        {/* Typewriter Text */}
        <div
          className="absolute left-1/2 -translate-x-1/2 text-white text-center pointer-events-none z-10"
          style={{
            bottom: "2rem",
            fontSize: "30px",
            fontFamily: '"Nerdropol Lattice", sans-serif',
            fontWeight: 700,
            letterSpacing: "0.05em",
            textShadow: typingDone
              ? "0 0 20px rgba(255, 255, 255, 0.6), 0 0 40px rgba(255, 255, 255, 0.3)"
              : "none",
            
          }}
        >
          {typedText}
          {!typingDone && <span className="animate-pulse">|</span>}
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @font-face {
          font-family: "Nerdropol Lattice";
          src: url("/nerdropol-lattice.otf") format("opentype");
          font-weight: 700;
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.7;
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.6), 0 0 40px rgba(255, 255, 255, 0.3);
          }
          50% {
            opacity: 1;
            text-shadow: 0 0 30px rgba(255, 255, 255, 0.8), 0 0 60px rgba(255, 255, 255, 0.5);
          }
        }

        @keyframes slow-zoom {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }

        /* ✅ PowerPoint-style Push animation */
        .push-out {
          animation: push-slide 0.8s ease-in-out forwards;
        }

        @keyframes push-slide {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}