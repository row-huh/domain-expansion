
# Jujutsu Kaisen Domain Expansion 

## Overview

A Next.js web application that detects anime-inspired hand gestures using MediaPipe hand tracking and triggers cinematic domain expansion effects. This interactive experience brings the mystical cursed techniques from Jujutsu Kaisen to life through real-time hand gesture recognition.

The application features two domain expansions:

•  Unlimited Void (Gojo's Technique) — Triggered by crossing index and middle fingers
•  Malevolent Shrine (Sukuna's Technique) — Triggered by mirroring both hands

## Features

•  Real-time Hand Tracking — Uses MediaPipe to detect and track both hands simultaneously

•  Gesture Recognition — Detects specific hand poses that correspond to Jujutsu Kaisen techniques.

•  Cinematic Effects — Full-screen visual effects triggered upon successful gesture detection.

•  Splash Screen — Immersive intro screen with custom font that launches on app startup

## Technical Features

• Built with Next.js 13+ (App Router)
• TypeScript for type-safe development
• Tailwind CSS for styling
• React Hooks for state management
• Responsive Design — Works on desktop, tablet, and mobile devices
• Performance Optimized — Efficient hand landmark calculations and animation handling


## Project Structure

```

domain-expansion/
├── app/
│   ├── page.tsx                    # Main application page
│   ├── gojo-effects.tsx            # Unlimited Void effect logic
│   ├── sukuna-effects.tsx          # Malevolent Shrine effect logic
│   ├── layout.tsx                  # App root layout
│   └── globals.css                 # Global styles & animations
├── components/
│   ├── CameraWithHandTracker.tsx   # MediaPipe integration & hand detection
│   └── Navbar.tsx
    └── SplashScreen.tsx            # Splash screen with Nerdropol Lattice font
├── public/
│   ├── fonts/
│   │   └── nerdropol-lattice.otf   # Custom font for splash screen
│   ├── pixel-chibis/
│   │   ├── gojo-original.png
│   │   └── gojo.png
|   |   ├── sukuna-original.png
│   │   └── sukuna.png
│   ├── gojo/
│   │   ├── unlimited-void.mp3
│   │   └── unlimited-void.webm     # Unlimited Void effect video
│   ├── sukuna/
│   │   ├── sukuna-audio.mp3
│   │   ├── DE-background.webm      # Malevolent Shrine background
│   │   └── ripple-effect.webm      # Ripple animation
│   └── idle/
|   |   ├── gojo-gimmeyourhand2.mp3
│   |   └── gojo-gimmeyourhand2.webm # Idle animation with audio
├── favicon.ico                      # App icon
└── (config files)

```

## How To Use For Users

• Launch the App — Splash screen appears with "Press Enter to Start"
• Press Enter — Transition to the main application interface
• Allow Camera Access — Grant permissions when prompted
• Perform Gestures:
  • Gojo's Unlimited Void: Cross your index and middle fingers on one hand
  • Sukuna's Malevolent Shrine: Mirror both hands with specific finger poses

• Watch Effects — Full-screen cinematic animations trigger upon successful detection
• Idle State — After 5 seconds of inactivity, Gojo's idle animation plays with subtitles

## Status Indicators

• Top-left: Hands detected count and idle timer status
• Bottom-right: Gesture detection tips
• Center-bottom: Real-time effect notifications

# Gesture Detection Details

## Unlimited Void (Gojo)

• Single hand detected
• Index finger extended (tip above MCP joint)
• Middle finger extended (tip above MCP joint)
• Index and middle tips have inverted X relationship vs their MCPs (crossing)
• Ring and pinky fingers bent (tips at or below PIP joint)


## Malovent Shrine (Sukuna)

• Two hands detected
• Wrists aligned (distance < 0.1)
• Pinky fingers aligned (distance < 0.1)
• Thumbs aligned (distance < 0.1)
• Both middle fingers extended above wrists
• Both pinky fingers extended above wrists
• At least 2 of these conditions must pass









