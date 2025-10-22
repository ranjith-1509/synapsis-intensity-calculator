import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactApexChart from "react-apexcharts";

const DEFAULT_TARGET_FPS = 30;
const DEFAULT_MAX_POINTS = 3000;
const AUTO_SCALE_POINTS = 100; // Number of points to consider for auto-scaling

const Opencamera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [seriesData, setSeriesData] = useState([]);
  const [exportData, setExportData] = useState([]);
  const [theme, setTheme] = useState("light"); // 🌙 new state for theme
  const [isFrontCamera, setIsFrontCamera] = useState(true); // 📷 camera toggle state
  const intervalRef = useRef(null);
  const [targetFps, setTargetFps] = useState(DEFAULT_TARGET_FPS);
  const [maxPoints, setMaxPoints] = useState(DEFAULT_MAX_POINTS);

  // Function to get camera stream with specific facing mode
  const getCameraStream = async (facingMode) => {
    try {
      const constraints = {
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      };
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.error(`Error accessing ${facingMode} camera:`, err);
      // Fallback to any available camera
      try {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (fallbackErr) {
        console.error("Error accessing any camera:", fallbackErr);
        throw fallbackErr;
      }
    }
  };

  // Function to switch camera
  const switchCamera = async () => {
    if (videoRef.current && videoRef.current.srcObject) {
      // Stop current stream
      const currentStream = videoRef.current.srcObject;
      currentStream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const newFacingMode = isFrontCamera ? "environment" : "user";
      const stream = await getCameraStream(newFacingMode);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsFrontCamera(!isFrontCamera);
    } catch (err) {
      console.error("Error switching camera:", err);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    (async () => {
      try {
        const stream = await getCameraStream("user"); // Start with front camera
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
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
  const handleExportJSON = () => {
    if (!exportData || exportData.length === 0) return;
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "intensity_data.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const handleExportCSV = () => {
    if (!exportData || exportData.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,Time,Intensity\n";
    csvContent += exportData.map((val, i) => `${i + 1},${val}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "intensity_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    if (width === 0 || height === 0) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);

    const { data } = ctx.getImageData(0, 0, width, height);

    let totalIntensity = 0;
    const pixelCount = width * height;

    // Compute overall average intensity
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const intensity = 0.299 * r + 0.587 * g + 0.114 * b;
      totalIntensity += intensity;
    }

    const avgIntensity = totalIntensity / pixelCount;
    setExportData((prev) => [...prev, avgIntensity]);
    setSeriesData((prev) => {
      const next =
        prev.length >= maxPoints
          ? prev.slice(prev.length - (maxPoints - 1))
          : prev.slice();
      next.push(avgIntensity);
      return next;
    });
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

 // Inside your component
  const chartOptions = useMemo(() => {
  // Calculate dynamic min/max with ±10 buffer
    let yMin = 0;
    let yMax = 255;
    if (seriesData.length > 0) {
    //i have kept auto sclaing for last 100 poinnts 
    const recentData = seriesData.slice(-AUTO_SCALE_POINTS); // last N points
      const minVal = Math.min(...recentData);
      const maxVal = Math.max(...recentData);
    yMin = Math.max(minVal - 10, 0);   // buffer -10
    yMax = Math.min(maxVal + 10, 255); // buffer +10
    }

    return {
      chart: {
        id: "intensity-line-chart",
        type: "line",
        animations: {
          enabled: true,
          easing: "linear",
          dynamicAnimation: { speed: 200 },
        },
        toolbar: { show: false },
        zoom: { enabled: false },
        foreColor: theme === "dark" ? "#00ff00" : "#000000",
        background: "transparent",
      },
      stroke: {
        curve: "smooth",
        width: 2,
        colors: [theme === "dark" ? "#00ff00" : "#0077ff"],
      },
      grid: {
        borderColor: theme === "dark" ? "#333" : "#ccc",
        strokeDashArray: 3,
      },
      dataLabels: { enabled: false },
      markers: { size: 0 },
      xaxis: {
        title: { text: "Time (frames)" },
        labels: { show: false },
      },
      yaxis: {
        min: yMin,
        max: yMax,
        tickAmount: 5,
        title: { text: "Intensity" },
        labels: { formatter: (val) => Math.round(val) },
      },
      tooltip: { enabled: false },
      theme: { mode: theme },
    };
  }, [seriesData, theme, maxPoints]);

  const chartSeries = useMemo(
    () => [{ name: "Avg Intensity", data: seriesData }],
    [seriesData]
  );
  const handleCalculate = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setSeriesData([]);
      setExportData([]);
      setShowGraph(true);
      setIsRecording(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(processFrame, 1000 / targetFps);
    }
  };

  // 🎨 Theme styles
  const isDark = theme === "dark";
  const bgGradient = isDark
    ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
    : "linear-gradient(135deg, #ffffff 0%, #f3f4f6 50%, #e5e7eb 100%)";
  const textColor = isDark ? "#e0e0e0" : "#111";
  const cardBg = isDark
    ? "rgba(26, 26, 46, 0.8)"
    : "rgba(255, 255, 255, 0.8)";
  const borderColor = isDark ? "#2d3748" : "#ddd";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bgGradient,
        color: textColor,
        padding: "20px 0",
        transition: "all 0.4s ease",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1
         
          >
            Web Camera Intensity Monitor (Single-Frame Avg)
          </h1>
          <p style={{ color: isDark ? "#a0a0a0" : "#333" }}>
            Real-time brightness tracking — useful for PPG/SpO₂ signal
            visualization
          </p>

          {/* 🌗 Theme Switch Button */}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            style={{
              marginTop: "10px",
              padding: "10px 20px",
              borderRadius: "8px",
              border: 0,
              cursor: "pointer",
              background: isDark
                ? "linear-gradient(45deg, #facc15, #f59e0b)"
                : "linear-gradient(45deg, #1e3a8a, #3b82f6)",
              color: "#fff",
              fontWeight: "600",
              transition: "0.3s",
            }}
          >
            {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>

          {/* 📷 Camera Toggle Button */}
          <button
            onClick={switchCamera}
            style={{
              marginTop: "10px",
              marginLeft: "10px",
              padding: "10px",
              borderRadius: "8px",
              border: 0,
              cursor: "pointer",
              background: isDark
                ? "linear-gradient(45deg, #10b981, #059669)"
                : "linear-gradient(45deg, #7c3aed, #5b21b6)",
              color: "#fff",
              fontWeight: "600",
              transition: "0.3s",
            }}
          >

 switch     </button>
        </div>

        {/* 🧩 Layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "32px",
          }}
        >
          <div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              width="100%"
              height="auto"
              style={{
                display: "block",
                borderRadius: "12px",
                border: `2px solid ${borderColor}`,
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              }}
            />
          </div>

          <div
            style={{
              background: cardBg,
              borderRadius: "16px",
              padding: "24px",
              border: `1px solid ${borderColor}`,
              backdropFilter: "blur(10px)",
            }}
          >
            <h3>⚙️ Settings</h3>
            {/* Settings inputs remain same */}
            <div style={{ marginBottom: "16px" }}>
              <label>Sampling Rate (fps): </label>
              <input
                type="number"
                min="1"
                max="60"
                value={targetFps}
                onChange={(e) =>
                  setTargetFps(
                    Math.max(1, Math.min(60, parseInt(e.target.value) || 10))
                  )
                }
                style={{
                  marginLeft: "8px",
                  padding: "6px 10px",
                  background: isDark ? "#1a1a2e" : "#f9fafb",
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  borderRadius: "8px",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label>Max Data Points: </label>
              <input
                type="number"
                min="100"
                max="10000"
                step="100"
                value={maxPoints}
                onChange={(e) =>
                  setMaxPoints(
                    Math.max(
                      100,
                      Math.min(10000, parseInt(e.target.value) || 3000)
                    )
                  )
                }
                style={{
                  marginLeft: "8px",
                  padding: "6px 10px",
                  background: isDark ? "#1a1a2e" : "#f9fafb",
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  borderRadius: "8px",
                }}
              />
            </div>

            <button
              onClick={handleCalculate}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "8px",
                border: 0,
                cursor: "pointer",
                background: isRecording
                  ? "linear-gradient(45deg, #ef4444, #dc2626)"
                  : "linear-gradient(45deg, #6366f1, #4f46e5)",
                color: "#fff",
                fontWeight: "600",
                fontSize: "1rem",
              }}
            >
              {isRecording ? "⏹️ Stop Recording" : "▶️ Start Measurement"}
            </button>

            {/* Export buttons remain same */}
            <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
              <button
                onClick={handleExportCSV}
                disabled={seriesData.length === 0}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "8px",
                  border: 0,
                  cursor:
                    seriesData.length === 0 ? "not-allowed" : "pointer",
                  background:
                    seriesData.length === 0
                      ? "gray"
                      : "linear-gradient(45deg, #6366f1, #4f46e5)",
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: "1rem",
                  opacity: seriesData.length === 0 ? 0.6 : 1,
                }}
              >
                Export CSV
              </button>

              <button
                onClick={handleExportJSON}
                disabled={seriesData.length === 0}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "8px",
                  border: 0,
                  cursor:
                    seriesData.length === 0 ? "not-allowed" : "pointer",
                  background:
                    seriesData.length === 0
                      ? "gray"
                      : "linear-gradient(45deg, #10b981, #059669)",
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: "1rem",
                  opacity: seriesData.length === 0 ? 0.6 : 1,
                }}
              >
                Export JSON
              </button>
            </div>
          </div>
        </div>

        {showGraph && (
          <div
            style={{
              background: cardBg,
              borderRadius: "16px",
              padding: "24px",
              border: `1px solid ${borderColor}`,
              marginTop: "32px",
            }}
          >
            <h3 style={{ textAlign: "center" }}>📈 Intensity Over Time</h3>
            <ReactApexChart
              options={chartOptions}
              series={chartSeries}
              type="line"
              height={400}
            />
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default Opencamera;
