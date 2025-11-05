import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { calculateHRMetrics } from "../Utils/hrUtils";

const DEFAULT_TARGET_FPS = 30;
const DEFAULT_MAX_POINTS = 100;

const Opencamera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [seriesData, setSeriesData] = useState([]);
  const [intensitySeries, setIntensitySeries] = useState([]);
  const [exportData, setExportData] = useState([]);
  const [theme, setTheme] = useState("light");
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [heartRate, setHeartRate] = useState(0);
  const [hrv, setHrv] = useState(0);
  const [hrSeries,  setHrSeries] = useState([]);
  const [hrvSeries, setHrvSeries] = useState([]);

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

    const now = Date.now();
    if (!startTimeRef.current) startTimeRef.current = now;

    setExportData((p) => [...p, avgIntensity]);

    // Keep a separate time-series for intensity
    setIntensitySeries((prev) => {
      const next = prev.length >= maxPoints ? prev.slice(prev.length - (maxPoints - 1)) : prev.slice();
      next.push({ x: now, y: Number(avgIntensity.toFixed(2)) });
      return next;
    });

    // Maintain raw values for HR detection
    setSeriesData((p) => {
      const next = p.length >= maxPoints ? p.slice(p.length - (maxPoints - 1)) : p.slice();
      next.push(avgIntensity);
      const result = calculateHRMetrics(next, targetFps);
      if (result) {
        setHeartRate(result.heartRate);
        setHrv(result.hrv);

        setHrSeries((prev) => {
          const seriesNext = prev.length >= maxPoints ? prev.slice(prev.length - (maxPoints - 1)) : prev.slice();
          seriesNext.push({ x: now, y: result.heartRate });
          return seriesNext;
        });
        setHrvSeries((prev) => {
          const seriesNext = prev.length >= maxPoints ? prev.slice(prev.length - (maxPoints - 1)) : prev.slice();
          seriesNext.push({ x: now, y: result.hrv });
          return seriesNext;
        });
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
      setIntensitySeries([]);
      setHrSeries([]);
      setHrvSeries([]);
      startTimeRef.current = null;
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

  const intensityOptions = useMemo(() => {
    let yMin = 0, yMax = 255;
    if (intensitySeries.length > 0) {
      const values = intensitySeries.map((p) => p.y);
      const min = Math.min(...values), max = Math.max(...values);
      yMin = Math.max(min - 1, 0);
      yMax = Math.min(max + 1, 255);
    }
    return {
      chart: { type: "line", animations: { enabled: true }, toolbar: { show: false }, zoom: { enabled: false } },
      stroke: { curve: "smooth", width: 2, colors: [theme === "dark" ? "#10b981" : "#14b8a6"] },
      grid: { borderColor: theme === "dark" ? "#333" : "#ddd" },
      dataLabels: { enabled: false },
      xaxis: {
        type: "datetime",
        labels: { style: { colors: theme === "dark" ? "#e5e5e5" : "#111" } },
        title: { text: "Time" },
      },
      yaxis: { min: yMin, max: yMax, title: { text: "Intensity" } },
      theme: { mode: theme },
      tooltip: { theme: theme },
    };
  }, [intensitySeries, theme]);

  const hrvOptions = useMemo(() => {
    let yMin = 0, yMax = 150;
    if (hrvSeries.length > 0) {
      const values = hrvSeries.map((p) => p.y);
      const min = Math.min(...values);
      const max = Math.max(...values);
      yMin = Math.max(min - 5, 0);
      yMax = max + 5;
    }
    return {
      chart: { type: "line", animations: { enabled: true }, toolbar: { show: false }, zoom: { enabled: false } },
      stroke: { curve: "smooth", width: 2, colors: [theme === "dark" ? "#a78bfa" : "#ec4899"] },
      grid: { borderColor: theme === "dark" ? "#333" : "#ddd" },
      dataLabels: { enabled: false },
      xaxis: {
        type: "datetime",
        labels: { style: { colors: theme === "dark" ? "#e5e5e5" : "#111" } },
        title: { text: "Time" },
      },
      yaxis: { min: yMin, max: yMax, title: { text: "HRV (ms)" } },
      theme: { mode: theme },
      tooltip: { theme: theme },
    };
  }, [hrvSeries, theme]);

  const hrOptions = useMemo(() => {
    let yMin = 40, yMax = 180;
    if (hrSeries.length > 0) {
      const values = hrSeries.map((p) => p.y);
      const min = Math.min(...values);
      const max = Math.max(...values);
      yMin = Math.max(min - 5, 40);
      yMax = Math.min(max + 5, 200);
    }
    return {
      chart: { type: "line", animations: { enabled: true }, toolbar: { show: false }, zoom: { enabled: false } },
      stroke: { curve: "smooth", width: 2, colors: [theme === "dark" ? "#22d3ee" : "#3b82f6"] },
      grid: { borderColor: theme === "dark" ? "#333" : "#ddd" },
      dataLabels: { enabled: false },
      xaxis: {
        type: "datetime",
        labels: { style: { colors: theme === "dark" ? "#e5e5e5" : "#111" } },
        title: { text: "Time" },
      },
      yaxis: { min: yMin, max: yMax, title: { text: "Heart Rate (BPM)" } },
      theme: { mode: theme },
      tooltip: { theme: theme },
    };
  }, [hrSeries, theme]);

  const isDark = theme === "dark";
  const textColor = isDark ? "#e5e5e5" : "#111";

  return (
    <div
      className="page-container"
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
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", justifyContent: "center" }}>
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
        <button
          onClick={handleCalculate}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: isRecording ? "#ef4444" : "#2563eb",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          {isRecording ? "⏹️ Stop" : "▶️ Start"}
        </button>
        <button
          onClick={() => handleExport("csv")}
          disabled={!seriesData.length}
          style={{
            padding: "8px 16px",
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
            padding: "8px 16px",
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

      {/* Sticky Camera Preview */}
      <div
        className="sticky-camera"
        style={{
          width: 160,
          height: 160,
          position: "fixed",
          top: 16,
          right: 16,
          borderRadius: "12px",
          overflow: "hidden",
          border: `3px solid ${isDark ? "#22d3ee" : "#3b82f6"}`,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          zIndex: 50,
          background: isDark ? "#0b1220" : "#fff",
        }}
      >
        <video ref={videoRef} autoPlay playsInline muted width="100%" height="100%" style={{ objectFit: "cover" }} />
      </div>

      {/* Metrics */}
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

      {/* Charts */}
      {showGraph && (
        <div className="charts-wrapper" style={{ width: "100%", maxWidth: 1200, margin: "0 auto", display: "grid", gap: 16, gridTemplateColumns: "1fr" }}>
          {/* HR Chart */}
          <div style={{ background: isDark ? "rgba(30,41,59,0.6)" : "#fff", borderRadius: 12, padding: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
            {hrSeries.length === 0 ? (
              <div style={{ height: 280, borderRadius: 8, background: isDark ? "#1f2937" : "#f3f4f6", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, transparent, ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}, transparent)`, transform: "translateX(-100%)", animation: "shimmer 1.5s infinite" }} />
              </div>
            ) : (
              <ReactApexChart options={hrOptions} series={[{ name: "Heart Rate", data: hrSeries }]} type="line" height={300} />
            )}
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8, textAlign: "center" }}>Heart Rate vs Time</div>
          </div>

          {/* HRV Chart */}
          <div style={{ background: isDark ? "rgba(30,41,59,0.6)" : "#fff", borderRadius: 12, padding: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
            {hrvSeries.length === 0 ? (
              <div style={{ height: 280, borderRadius: 8, background: isDark ? "#1f2937" : "#f3f4f6", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, transparent, ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}, transparent)`, transform: "translateX(-100%)", animation: "shimmer 1.5s infinite" }} />
              </div>
            ) : (
              <ReactApexChart options={hrvOptions} series={[{ name: "HRV", data: hrvSeries }]} type="line" height={300} />
            )}
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8, textAlign: "center" }}>HRV vs Time</div>
          </div>

          {/* Intensity Chart */}
          <div style={{ background: isDark ? "rgba(30,41,59,0.6)" : "#fff", borderRadius: 12, padding: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
            {intensitySeries.length === 0 ? (
              <div style={{ height: 280, borderRadius: 8, background: isDark ? "#1f2937" : "#f3f4f6", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, transparent, ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}, transparent)`, transform: "translateX(-100%)", animation: "shimmer 1.5s infinite" }} />
              </div>
            ) : (
              <ReactApexChart options={intensityOptions} series={[{ name: "Intensity", data: intensitySeries }]} type="line" height={300} />
            )}
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8, textAlign: "center" }}>Intensity vs Time</div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Shimmer keyframes */}
      <style>
        {`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
          @media (max-width: 640px) {
            .page-container { padding-right: 112px; }
            .sticky-camera { width: 120px !important; height: 120px !important; top: 12px !important; right: 12px !important; }
            .charts-wrapper { max-width: 100% !important; }
          }
          @media (min-width: 641px) {
            .page-container { padding-right: 192px; }
            .sticky-camera { width: 160px !important; height: 160px !important; }
          }
        `}
      </style>
    </div>
  );
};

export default Opencamera;
