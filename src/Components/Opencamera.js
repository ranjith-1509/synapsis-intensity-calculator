import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactApexChart from "react-apexcharts";

const DEFAULT_GRID_COLS = 16; // 16 x 8 = 128 grids
const DEFAULT_GRID_ROWS = 8;
const DEFAULT_TARGET_FPS = 10; // throttle processing to avoid UI jank
const DEFAULT_MAX_POINTS = 3000; // keep memory bounded for long recordings

const Opencamera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [seriesData, setSeriesData] = useState([]); // overall average intensity over time
  const intervalRef = useRef(null);
  
  // Editable settings state
  const [gridCols, setGridCols] = useState(DEFAULT_GRID_COLS);
  const [gridRows, setGridRows] = useState(DEFAULT_GRID_ROWS);
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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const processFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    if (width === 0 || height === 0) return;
console.log("hi");
    // Resize canvas to match video
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;

    const cellWidth = Math.floor(width / gridCols);
    const cellHeight = Math.floor(height / gridRows);
    const perGridMeans = new Array(gridCols * gridRows).fill(0);
    const perGridCounts = new Array(gridCols * gridRows).fill(0);

    // Iterate pixels and accumulate grayscale intensity into grid buckets
    for (let y = 0; y < height; y++) {
      const rowIdx = Math.min(Math.floor(y / cellHeight), gridRows - 1);
      for (let x = 0; x < width; x++) {
        const colIdx = Math.min(Math.floor(x / cellWidth), gridCols - 1);
        const gridIdx = rowIdx * gridCols + colIdx;
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Luma (BT.601)
        const intensity = 0.299 * r + 0.587 * g + 0.114 * b;
        perGridMeans[gridIdx] += intensity;
        perGridCounts[gridIdx]++;
      }
    }

    for (let i = 0; i < perGridMeans.length; i++) {
      if (perGridCounts[i] > 0) perGridMeans[i] /= perGridCounts[i];
    }

    // Overall average across 128 grids (keeps chart performant)
    let sum = 0;
    for (let i = 0; i < perGridMeans.length; i++) sum += perGridMeans[i];
    const overallAvg = sum / perGridMeans.length;
    setSeriesData(prev => {
      const next = prev.length >= maxPoints ? prev.slice(prev.length - (maxPoints - 1)) : prev.slice();
      next.push(overallAvg);
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

  const chartOptions = useMemo(() => ({
    chart: {
      id: "intensity-chart",
      animations: { enabled: false },
      zoom: { enabled: false },
      toolbar: { show: false },
      foreColor: "#e0e0e0",
      background: "transparent",
    },
    grid: { 
      strokeDashArray: 4,
      borderColor: "#404040",
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } }
    },
    plotOptions: {
      bar: {
        columnWidth: "70%",
        borderRadius: 3,
      }
    },
    dataLabels: { enabled: false },
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "vertical",
        shadeIntensity: 0.3,
        gradientToColors: ["#6366f1"],
        inverseColors: false,
        opacityFrom: 0.9,
        opacityTo: 0.4,
        stops: [0, 90, 100]
      }
    },
    xaxis: {
      labels: { 
        show: true,
        style: { colors: "#e0e0e0" }
      },
      title: { 
        text: "Time (frames)",
        style: { color: "#e0e0e0" }
      },
      tickAmount: 10,
      axisBorder: { color: "#404040" },
      axisTicks: { color: "#404040" }
    },
    yaxis: {
      min: 0,
      max: 255,
      tickAmount: 5,
      title: { 
        text: "Avg Intensity",
        style: { color: "#e0e0e0" }
      },
      labels: {
        style: { colors: "#e0e0e0" },
        formatter: function (val) {
          return Math.round(val);
        }
      },
      axisBorder: { color: "#404040" },
      axisTicks: { color: "#404040" }
    },
    tooltip: { 
      enabled: true,
      theme: "dark"
    },
    theme: { mode: "dark" }
  }), []);

  const chartSeries = useMemo(() => ([{ name: "Average Intensity", data: seriesData }]), [seriesData]);

  const handleCalculate = () => {
    if (isRecording) {
      // Stop recording if already recording
      stopRecording();
    } else {
      // Start recording and show graph
      setSeriesData([]);
      setShowGraph(true);
      setIsRecording(true);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(processFrame, 1000 / targetFps);
    }
  };

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
            fontSize: "2.5rem",
            fontWeight: "700",
            background: "linear-gradient(45deg, #6366f1, #8b5cf6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Web Camera Intensity Calculator (Accumulated BarChart)
          </h1>
          <p style={{ 
            margin: 0, 
            color: "#a0a0a0", 
            fontSize: "1.1rem",
            fontWeight: "300"
          }}>
            Real-time intensity analysis with 128-grid precision
          </p>
        </div>

        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 1fr", 
          gap: "32px", 
          alignItems: "start",
          marginBottom: "32px"
        }}>
          <div>
            <div style={{ 
              position: "relative", 
              borderRadius: "16px", 
              overflow: "hidden", 
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)", 
              background: "#1a1a2e",
              border: "2px solid #2d3748"
            }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                width="100%" 
                height="auto" 
                style={{ display: "block", maxWidth: "100%" }} 
              />
            </div>
            
          </div>

          <div style={{ 
            background: "rgba(26, 26, 46, 0.8)", 
            borderRadius: "16px", 
            padding: "24px",
            border: "1px solid #2d3748",
            backdropFilter: "blur(10px)"
          }}>
            <h3 style={{ 
              margin: "0 0 16px 0", 
              color: "#e0e0e0",
              fontSize: "1.3rem",
              fontWeight: "600"
            }}>
              📊 Settings
            </h3>
            <div style={{ 
              display: "grid", 
              gap: "16px",
              fontSize: "0.95rem"
            }}>
              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                gap: "8px"
              }}>
                <label style={{ color: "#a0a0a0", fontSize: "0.9rem" }}>Grid Columns:</label>
                <input
                  type="number"
                  min="4"
                  max="32"
                  value={gridCols}
                  onChange={(e) => setGridCols(Math.max(4, Math.min(32, parseInt(e.target.value) || 16)))}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #2d3748",
                    background: "#1a1a2e",
                    color: "#e0e0e0",
                    fontSize: "0.9rem",
                    outline: "none"
                  }}
                />
              </div>
              
              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                gap: "8px"
              }}>
                <label style={{ color: "#a0a0a0", fontSize: "0.9rem" }}>Grid Rows:</label>
                <input
                  type="number"
                  min="4"
                  max="32"
                  value={gridRows}
                  onChange={(e) => setGridRows(Math.max(4, Math.min(32, parseInt(e.target.value) || 8)))}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #2d3748",
                    background: "#1a1a2e",
                    color: "#e0e0e0",
                    fontSize: "0.9rem",
                    outline: "none"
                  }}
                />
              </div>

              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                gap: "8px"
              }}>
                <label style={{ color: "#a0a0a0", fontSize: "0.9rem" }}>Sampling Rate (fps):</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={targetFps}
                  onChange={(e) => setTargetFps(Math.max(1, Math.min(60, parseInt(e.target.value) || 10)))}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #2d3748",
                    background: "#1a1a2e",
                    color: "#e0e0e0",
                    fontSize: "0.9rem",
                    outline: "none"
                  }}
                />
              </div>

              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                gap: "8px"
              }}>
                <label style={{ color: "#a0a0a0", fontSize: "0.9rem" }}>Max Data Points:</label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  step="100"
                  value={maxPoints}
                  onChange={(e) => setMaxPoints(Math.max(100, Math.min(10000, parseInt(e.target.value) || 3000)))}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #2d3748",
                    background: "#1a1a2e",
                    color: "#e0e0e0",
                    fontSize: "0.9rem",
                    outline: "none"
                  }}
                />
              </div>

              <div style={{ 
                padding: "12px 0",
                borderTop: "1px solid #2d3748",
                marginTop: "8px"
              }}>
                <div style={{ 
                  fontSize: "0.85rem", 
                  color: "#a0a0a0", 
                  marginBottom: "12px",
                  textAlign: "center"
                }}>
                  Total Grids: <span style={{ color: "#6366f1", fontWeight: "600" }}>
                    {gridCols} × {gridRows} = {gridCols * gridRows}
                  </span>
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
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    transition: "all 0.3s ease"
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
                  }}
                >
                  {isRecording ? "⏹️ Stop Recording" : "▶️ Calculate Intensity"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {showGraph && (
          <div style={{ 
            background: "rgba(26, 26, 46, 0.8)", 
            borderRadius: "16px", 
            padding: "24px",
            border: "1px solid #2d3748",
            backdropFilter: "blur(10px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)"
          }}>
            <h3 style={{ 
              margin: "0 0 20px 0", 
              color: "#e0e0e0",
              fontSize: "1.3rem",
              fontWeight: "600",
              textAlign: "center"
            }}>
              📈 Intensity Analysis
            </h3>
            <ReactApexChart 
              options={chartOptions} 
              series={chartSeries} 
              type="bar" 
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
