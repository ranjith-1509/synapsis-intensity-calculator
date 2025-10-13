import React, { useRef,useEffect } from "react";
import useBlinkDetection from "./BlinkRecognizer";
import BlinkCounter from "./BlinkCounter";

const Opencamera = () => {
  const videoRef = useRef(null);
  const { blinkCount, isBlinking, isInitialized } = useBlinkDetection({
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
            <BlinkCounter
              blinkCount={blinkCount}
              isBlinking={isBlinking}
              isInitialized={isInitialized}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Opencamera;
