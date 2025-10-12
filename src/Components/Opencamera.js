import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import useGestureRecognition from "./GestureRecognizer";
import GestureDisplay from "./GestureDisplay";



const Opencamera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  // Remove all settings and grid state
  // Only keep gesture recognition
  const gestureRecognition = useGestureRecognition({
    videoRef,
    isActive: true
  });
//console.log(gestureRecognition,"gestureRecognition");
  useEffect(() => {
    let isCancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (isCancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    })();
    return () => {
      isCancelled = true;
      const mediaStream = videoRef.current && videoRef.current.srcObject;
      if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ...existing code...

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      color: "#e0e0e0",
      padding: "20px 0"
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{
            margin: 0,
            marginBottom: "8px",
            fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
            fontWeight: "700",
            background: "linear-gradient(45deg, #6366f1, #8b5cf6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Hand Gesture Recognition
          </h1>
          <p style={{
            margin: 0,
            color: "#a0a0a0",
            fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
            fontWeight: "300"
          }}>
            Real-time hand gesture detection using your webcam
          </p>
        </div>
        <div style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: "32px",
          flexWrap: "wrap",
          justifyContent: "center"
        }}>
          <div style={{
            position: "relative",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            background: "#1a1a2e",
            border: "2px solid #2d3748",
            flex: "1 1 400px",
            maxWidth: "800px",
            minWidth: "300px"
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                aspectRatio: "16/9",
                transform: 'scaleX(-1)',
                objectFit: "cover"
              }}
            />
          </div>
          <div style={{
            flex: "1 1 300px",
            maxWidth: "400px",
            minWidth: "280px"
          }}>
            <GestureDisplay
              currentGesture={gestureRecognition.currentGesture}
              gestureCounts={gestureRecognition.gestureCounts}
              isInitialized={gestureRecognition.isInitialized}
              resetCounts={gestureRecognition.resetCounts}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Opencamera;
