import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactApexChart from "react-apexcharts";
import PrimaryButton from "./ui/PrimaryButton";
import { calculateHRMetrics } from "../Utils/hrUtils";
import MetricCard from "./dashboard/MetricCard";

const DEFAULT_TARGET_FPS = 30;
const DEFAULT_MAX_POINTS = 100;
const HeartRateMeasuring = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const theme = "light";
  const [intensitySeries, setIntensitySeries] = useState([]); // {x,y}
  const [heartRate, setHeartRate] = useState("--"); 
  const [, setExportData] = useState([]); // use export data for export as json or csv
  
  const [hrv, setHrv] = useState("--"); 
  const [isCamCollapsed, setIsCamCollapsed] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  const targetFps = DEFAULT_TARGET_FPS;
  const maxPoints = DEFAULT_MAX_POINTS;
  const getCameraStream = async (facingMode) => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch (err) {
      console.error("Camera access error:", err);
    }
  };
  const switchCamera = async () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    const newMode = isFrontCamera ? "environment" : "user";
    const stream = await getCameraStream(newMode);
    if (videoRef.current) videoRef.current.srcObject = stream;
    setIsFrontCamera(!isFrontCamera);
  };

    // Frame processing using the video element from CameraBox
    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
  
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
  
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(video, 0, 0, width, height);
  
      const { data } = ctx.getImageData(0, 0, width, height);
      let totalIntensity = 0;
      const pixelCount = width * height;
      for (let i = 0; i < data.length; i += 4) {
        const intensity =
          0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        totalIntensity += intensity;
      }
  
      const avgIntensity = totalIntensity / pixelCount;
  
      const now = Date.now();
      if (!startTimeRef.current) startTimeRef.current = now;
  
  
      // Keep a separate time-series for intensity
      // Maintain raw values for HR detection
      setIntensitySeries((prev) => {
        return [...prev, { x: now, y: Number(avgIntensity.toFixed(2)) }];
      });
      setExportData((p) => {
        const next = [...p, avgIntensity]; // ✅ keep all data (no slice)
  
        const result = calculateHRMetrics(next, targetFps);
        if (result) {
          setHeartRate(result.heartRate);
          setHrv(result.hrv);
  
        }
  
        return next;
      });
    };
  
    const handleVideoReady = (el) => {
      videoRef.current = el;
      if (intervalRef.current) return;
      intervalRef.current = setInterval(processFrame, 1000 / targetFps);
    };
   
  useEffect(() => {
    if (videoRef.current) {
      handleVideoReady(videoRef.current);
      if (intervalRef.current) return;
      intervalRef.current = setInterval(processFrame, 1000 / targetFps);
    }
  }, [videoRef.current, targetFps, processFrame,handleVideoReady]); //eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    (async () => {
      const stream = await getCameraStream("user");
      if (videoRef.current) videoRef.current.srcObject = stream;
    })();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const stream = videoRef.current?.srcObject;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);



  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
  const intensityOptions = useMemo(() => {
    const lastWindow = intensitySeries.slice(-maxPoints); // ✅ only last 100

    let yMin = 0,
      yMax = 255;
    if (lastWindow.length > 0) {
      const values = lastWindow.map((p) => p.y);
      const min = Math.min(...values),
        max = Math.max(...values);
      yMin = Math.max(min - 1, 0);
      yMax = Math.min(max + 1, 255);
    }
    return {
      chart: {
        type: "line",
        animations: { enabled: true },
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      stroke: {
        curve: "smooth",
        width: 2,
        colors: [theme === "dark" ? "#10b981" : "#14b8a6"],
      },
      grid: { borderColor: theme === "dark" ? "#333" : "#ddd" },
      dataLabels: { enabled: false },
      xaxis: {
        type: "datetime",
        labels: { style: { colors: theme === "dark" ? "#e5e5e5" : "#111" } },
        title: { text: "Time" },
        // Show only the last `maxPoints` on the X-axis.
        // `1000 / targetFps` = time (ms) per frame,
        // so `maxPoints * (1000 / targetFps)` = total visible time window in ms.
        range: maxPoints * (1000 / targetFps),
      },
      yaxis: { min: yMin, max: yMax, title: { text: "Intensity" } },
      theme: { mode: theme },
      tooltip: { theme: theme },
    };
  }, [intensitySeries, theme, maxPoints, targetFps  ]);



  const handleStopMeasuring = () => {
    localStorage.setItem("heartRate", heartRate);
    localStorage.setItem("hrv", hrv);
    navigate("/dashboard");
    clearInterval(intervalRef.current);
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    videoRef.current = null;
    canvasRef.current = null;
    intervalRef.current = null;
    startTimeRef.current = null;
    setIntensitySeries([]);
    setHeartRate("--");
    setHrv("--");
  };
  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>
      {/* Top Navigation */}
      <div
        className="flex items-center gap-4 px-4 py-3"
        style={{ borderBottom: "1px solid #e5e7eb" }}
      >
        <button
          onClick={handleStopMeasuring}
          className="flex items-center justify-center rounded-full"
          style={{
            width: 36,
            height: 36,
            background: "#f3f4f6",
            border: "none",
            cursor: "pointer",
            color: "#6b7280",
            fontSize: 18,
          }}
        >
          ‹
        </button>
        <h1
          className="flex-1 text-center"
          style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            fontSize: 18,
            color: "#111827",
            margin: 0,
          }}
        >
          Heart Rate Measuring
        </h1>
        <div style={{ width: 36 }} /> {/* Spacer for centering */}
      </div>

      <div
        className="px-4 py-6"
        style={{
          paddingBottom: "100px",
          maxHeight: "calc(100vh - 60px)",
          overflowY: "auto",
        }}
      >
        {/* Instructions Card */}
        <div
          className="rounded-xl p-4 mb-6"
          style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}
        >
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 400,
              fontSize: 14,
              lineHeight: "20px",
              color: "#111827",
              margin: 0,
            }}
          >
            Hold your hand steady and apply light pressure with your finger.
          </p>
        </div>

        {/* Scrollable Graphs */}
        <div className="space-y-6 mb-6">
         {/* Metric Cards */}
         <div className="grid grid-cols-2 gap-3 -mt-6 mb-4 relative z-10 mt-3">
          <MetricCard icon="❤️" title="HR" value={heartRate || "--"} unit="bpm" />
          <MetricCard icon="💠" title="HRV" value={hrv || "--"} unit="ms" />
        </div>
     

          {/* Graph 3: Intensity */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <h3
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: 16,
                color: "#111827",
                margin: "0 0 16px 0",
              }}
            >
              Intensity Signal
            </h3>
            <div style={{ height: 250 }}>
              {intensitySeries.length === 0 ? (
                <div
                  style={{
                    height: 280,
                    borderRadius: 8,
                    background: "light" ? "#1f2937" : "#f3f4f6",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(90deg, transparent, ${
                        "light" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
                      }, transparent)`,
                      transform: "translateX(-100%)",
                      animation: "shimmer 1.5s infinite",
                    }}
                  />
                </div>
              ) : (
                <ReactApexChart
                  options={intensityOptions}
                  series={[{ name: "Intensity", data: intensitySeries }]}
                  type="line"
                  height={300}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stop Button - Fixed at bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 p-4"
        style={{
          background: "#ffffff",
          borderTop: "1px solid #e5e7eb",
          boxShadow: "0 -2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <PrimaryButton
          onClick={handleStopMeasuring}
          style={{
            width: "100%",
          }}
        >
          Stop Measuring
        </PrimaryButton>
      </div>

      {/* Floating Camera */}
      {/* <CameraBox onVideoReady={handleVideoReady} /> */}
      {/* Sticky Camera Preview */}
      <div
  className={`sticky-camera ${isCamCollapsed ? "collapsed" : ""}`}
  style={{
    width: isCamCollapsed ? 96 : 160,
    height: isCamCollapsed ? 96 : 160,
    position: "fixed",
    top: 16,
    right: 16,
    borderRadius: "12px",
    overflow: "hidden",
    border: `3px solid ${"light" ? "#22d3ee" : "#3b82f6"}`,
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    zIndex: 40,
    background: "light" ? "#0b1220" : "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted
    width="100%"
    height="100%"
    style={{ objectFit: "cover" }}
  />

  {/* Collapse button — Left */}
  <button
    onClick={() => setIsCamCollapsed((v) => !v)}
    style={{
      position: "absolute",
      top: 6,
      left: 6,
      background: "rgba(0,0,0,0.5)",
      color: "#fff",
      border: "none",
      borderRadius: 6,
      padding: "2px 6px",
      fontSize: 12,
      cursor: "pointer",
    }}
    aria-label={isCamCollapsed ? "Expand camera" : "Collapse camera"}
  >
    {isCamCollapsed ? "↗" : "↘"}
  </button>

  {/* ✅ Switch Camera button — Right */}
  <button
   onClick={switchCamera}
    style={{
      position: "absolute",
      top: 6,
      right: 6,
      background: "rgba(0,0,0,0.5)",
      color: "#fff",
      border: "none",
      borderRadius: 6,
      padding: "2px 6px",
      fontSize: 12,
      cursor: "pointer",
    }}
    aria-label="Switch Camera"
  >
    ↻
  </button>
</div>


      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default HeartRateMeasuring;
