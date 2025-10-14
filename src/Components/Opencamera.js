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
  const intervalRef = useRef(null);

  const [targetFps, setTargetFps] = useState(DEFAULT_TARGET_FPS);
  const [maxPoints, setMaxPoints] = useState(DEFAULT_MAX_POINTS);

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
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
const handleExportJSON = () => {
  if (!seriesData || seriesData.length === 0) return;

  // Convert seriesData to JSON string
  const jsonData = JSON.stringify(seriesData, null, 2); // pretty print

  // Create a blob
  const blob = new Blob([jsonData], { type: "application/json" });

  // Create a link and trigger download
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "intensity_data.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


const handleExportCSV = () => {

  if (!seriesData || seriesData.length === 0) return;

  // Create CSV header and rows
  let csvContent = "data:text/csv;charset=utf-8,Time,Intensity\n";
  csvContent += seriesData.map((val, i) => `${i + 1},${val}`).join("\n");

  // Create a download link and trigger it
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

    setSeriesData(prev => {
      const next = prev.length >= maxPoints ? prev.slice(prev.length - (maxPoints - 1)) : prev.slice();
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

  console.log("Y-Axis Range:", yMin, yMax);

  return {
    chart: {
      id: "intensity-line-chart",
      type: "line",
      animations: { enabled: true, easing: "linear", dynamicAnimation: { speed: 200 } },
      toolbar: { show: false },
      zoom: { enabled: false },
      foreColor: "#00ff00",
      background: "transparent",
    },
    stroke: { curve: "smooth", width: 2, colors: ["#00ff00"] },
    grid: { borderColor: "#333", strokeDashArray: 3 },
    dataLabels: { enabled: false },
    markers: { size: 0 },
    xaxis: {
      title: { text: "Time (frames)", style: { color: "#ccc" } },
      labels: { show: false, style: { colors: "#ccc" } },
    },
    yaxis: {
      min: yMin,
      max: yMax,
      tickAmount: 5,
      title: { text: "Intensity", style: { color: "#ccc" } },
      labels: { formatter: (val) => Math.round(val), style: { colors: "#ccc" } },
    },
    tooltip: { enabled: false },
    theme: { mode: "dark" },
  };
}, [seriesData, maxPoints]);


  const chartSeries = useMemo(
    () => [{ name: "Avg Intensity", data: seriesData }],
    [seriesData]
  );
  const handleCalculate = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setSeriesData([]);
      setShowGraph(true);
      setIsRecording(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(processFrame, 1000 / targetFps);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        color: "#e0e0e0",
        padding: "20px 0",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1
            style={{
              margin: 0,
              marginBottom: "8px",
              fontSize: "2.5rem",
              fontWeight: "700",
              background: "linear-gradient(45deg, #6366f1, #8b5cf6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Web Camera Intensity Monitor (Single-Frame Avg)
          </h1>
          <p style={{ color: "#a0a0a0" }}>
            Real-time overall brightness tracking — useful for PPG/SpO₂ signal visualization
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
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
                border: "2px solid #2d3748",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              }}
            />
          </div>

          <div
            style={{
              background: "rgba(26, 26, 46, 0.8)",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid #2d3748",
              backdropFilter: "blur(10px)",
            }}
          >
            <h3>⚙️ Settings</h3>
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
                  background: "#1a1a2e",
                  border: "1px solid #2d3748",
                  color: "#e0e0e0",
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
                    Math.max(100, Math.min(10000, parseInt(e.target.value) || 3000))
                  )
                }
                style={{
                  marginLeft: "8px",
                  padding: "6px 10px",
                  background: "#1a1a2e",
                  border: "1px solid #2d3748",
                  color: "#e0e0e0",
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

<div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
  <button
    onClick={handleExportCSV}
    disabled={seriesData.length === 0}
    style={{
      flex: 1,
      padding: "14px",
      borderRadius: "8px",
      border: 0,
      cursor: seriesData.length === 0 ? "not-allowed" : "pointer",
      background: seriesData.length === 0
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
      cursor: seriesData.length === 0 ? "not-allowed" : "pointer",
      background: seriesData.length === 0
        ? "gray"
        : "linear-gradient(45deg, #10b981, #059669)", // green gradient
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
              background: "rgba(26, 26, 46, 0.8)",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid #2d3748",
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
