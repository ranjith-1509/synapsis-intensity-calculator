import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { calculateHRMetrics } from "../Utils/hrUtils";

const DEFAULT_TARGET_FPS = 30;
const DEFAULT_MAX_POINTS = 3000;
const AUTO_SCALE_POINTS = 100;

const Opencamera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [seriesData, setSeriesData] = useState([]);
  const [exportData, setExportData] = useState([]);
  const [theme, setTheme] = useState("light");
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [heartRate, setHeartRate] = useState(0);
  const [hrv, setHrv] = useState(0);

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
      const intensity = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      totalIntensity += intensity;
    }

    const avgIntensity = totalIntensity / pixelCount;
    setExportData((p) => [...p, avgIntensity]);
    setSeriesData((p) => {
      const next = p.length >= maxPoints ? p.slice(p.length - (maxPoints - 1)) : p.slice();
      next.push(avgIntensity);
      const result = calculateHRMetrics(next, targetFps);
      if (result) {
        setHeartRate(result.heartRate);
        setHrv(result.hrv);
      }
      return next;
    });
  };

  const handleCalculate = () => {
    if (isRecording) {
      clearInterval(intervalRef.current);
      setIsRecording(false);
    } else {
      setSeriesData([]);
      setExportData([]);
      setShowGraph(true);
      setIsRecording(true);
      intervalRef.current = setInterval(processFrame, 1000 / targetFps);
    }
  };

  const handleExport = (type) => {
    if (!exportData.length) return;
    const dataStr =
      type === "csv"
        ? "data:text/csv;charset=utf-8,Time,Intensity\n" +
          exportData.map((v, i) => `${i + 1},${v}`).join("\n")
        : "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const link = document.createElement("a");
    link.href = dataStr;
    link.download = type === "csv" ? "data.csv" : "data.json";
    link.click();
  };

  const chartOptions = useMemo(() => {
    let yMin = 0,
      yMax = 255;
    if (seriesData.length > 0) {
      const recent = seriesData.slice(-AUTO_SCALE_POINTS);
      const min = Math.min(...recent),
        max = Math.max(...recent);
      yMin = Math.max(min - 5, 0);
      yMax = Math.min(max + 5, 255);
    }
    return {
      chart: { type: "line", animations: { enabled: true }, toolbar: { show: false }, zoom: { enabled: false } },
      stroke: { curve: "smooth", width: 2, colors: [theme === "dark" ? "#22d3ee" : "#3b82f6"] },
      grid: { borderColor: theme === "dark" ? "#333" : "#ddd" },
      dataLabels: { enabled: false },
      xaxis: { labels: { show: false } },
      yaxis: { min: yMin, max: yMax, title: { text: "Intensity" } },
      theme: { mode: theme },
    };
  }, [seriesData, theme]);

  const isDark = theme === "dark";
  const textColor = isDark ? "#e5e5e5" : "#111";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: isDark
          ? "linear-gradient(135deg,#0f172a,#1e293b)"
          : "linear-gradient(135deg,#ffffff,#f1f5f9)",
        color: textColor,
        padding: "16px",
        transition: "all 0.3s ease",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h2 style={{ marginBottom: 8, textAlign: "center" }}>💓 Heart Rate Monitor</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: isDark ? "#facc15" : "#2563eb",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          {isDark ? "☀️ Light" : "🌙 Dark"}
        </button>
        <button
          onClick={switchCamera}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: isDark ? "#10b981" : "#7c3aed",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          🔄 Switch Camera
        </button>
      </div>

      {/* Camera Preview (minimal circle view) */}
      <div
        style={{
          width: 160,
          height: 160,
          borderRadius: "50%",
          overflow: "hidden",
          border: `3px solid ${isDark ? "#22d3ee" : "#3b82f6"}`,
          boxShadow: "0 0 20px rgba(0,0,0,0.3)",
          marginBottom: 24,
        }}
      >
        <video ref={videoRef} autoPlay playsInline muted width="100%" height="100%" style={{ objectFit: "cover" }} />
      </div>

      {/* Heart Rate Display */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 20,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: isDark ? "rgba(30,41,59,0.8)" : "rgba(255,255,255,0.8)",
            padding: "16px 24px",
            borderRadius: 12,
            minWidth: 120,
            textAlign: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          }}
        >
          <h3 style={{ margin: 0 }}>❤️ HR</h3>
          <p style={{ fontSize: "1.5rem", margin: "8px 0", color: "#ef4444" }}>
            {heartRate ? `${heartRate} bpm` : "--"}
          </p>
        </div>
        <div
          style={{
            background: isDark ? "rgba(30,41,59,0.8)" : "rgba(255,255,255,0.8)",
            padding: "16px 24px",
            borderRadius: 12,
            minWidth: 120,
            textAlign: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          }}
        >
          <h3 style={{ margin: 0 }}>💠 HRV</h3>
          <p style={{ fontSize: "1.5rem", margin: "8px 0", color: "#3b82f6" }}>
            {hrv ? `${hrv} ms` : "--"}
          </p>
        </div>
      </div>

      {/* Buttons */}
      <button
        onClick={handleCalculate}
        style={{
          padding: "14px 32px",
          borderRadius: 8,
          border: "none",
          background: isRecording ? "#ef4444" : "#2563eb",
          color: "#fff",
          fontWeight: 600,
          fontSize: "1rem",
          marginBottom: 20,
        }}
      >
        {isRecording ? "⏹️ Stop" : "▶️ Start"}
      </button>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={() => handleExport("csv")}
          disabled={!seriesData.length}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: seriesData.length ? "#3b82f6" : "#9ca3af",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          Export CSV
        </button>
        <button
          onClick={() => handleExport("json")}
          disabled={!seriesData.length}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: seriesData.length ? "#10b981" : "#9ca3af",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          Export JSON
        </button>
      </div>

      {showGraph && (
        <div style={{ width: "100%", maxWidth: 600, marginTop: 24 }}>
          <ReactApexChart options={chartOptions} series={[{ data: seriesData.map(v => Number(v.toFixed(2))) }]}
 type="line" height={300} />
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default Opencamera;
