import React, { useEffect, useRef, useState, useMemo } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import ReactApexChart from "react-apexcharts";

const SMOOTHING_ALPHA = 0.25;
const AUTO_SCALE_POINTS = 1000; // Number of recent points to use for auto-scaling

export default function GazeTracker() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const landmarkerRef = useRef(null);
  const startTimeRef = useRef(null);
  const lastGazeRef = useRef({ x: null, y: null });
  const stoppedRef = useRef(false);
  const lastPupilRef = useRef(null); // 👁️ store last pupil size

  const [gaze, setGaze] = useState({ x: null, y: null });
  const [samples, setSamples] = useState([]);
  const [pupilSamples, setPupilSamples] = useState([]); // 👁️ pupil dilation graph data
  const [duration, setDuration] = useState(30000);
  const [isTracking, setIsTracking] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const getStream = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    };
    getStream();
  }, [isTracking]);

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  const getCenter = (points) => {
    if (!points || points.length === 0) return null;
    let sx = 0,
      sy = 0;
    for (let i = 0; i < points.length; i++) {
      sx += points[i].x;
      sy += points[i].y;
    }
    return { x: sx / points.length, y: sy / points.length };
  };

  const getEyeBox = (landmarks, idxs) => {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (let i = 0; i < idxs.length; i++) {
      const p = landmarks[idxs[i]];
      if (!p) continue;
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY))
      return null;
    return { minX, minY, maxX, maxY };
  };

  const mapToScreen = (irisCenterNorm, eyeBoxNorm) => {
    if (!irisCenterNorm || !eyeBoxNorm) return null;
    const { innerWidth, innerHeight } = window;
    const nx = clamp01(
      (irisCenterNorm.x - eyeBoxNorm.minX) / Math.max(1e-6, eyeBoxNorm.maxX - eyeBoxNorm.minX)
    );
    const ny = clamp01(
      (irisCenterNorm.y - eyeBoxNorm.minY) / Math.max(1e-6, eyeBoxNorm.maxY - eyeBoxNorm.minY)
    );
    const screenX = (1 - nx) * innerWidth;
    const screenY = ny * innerHeight;
    return { x: Math.round(screenX), y: Math.round(screenY) };
  };

  const smooth = (prev, next) => {
    if (!prev || prev.x == null || prev.y == null) return next;
    return {
      x: Math.round(prev.x + SMOOTHING_ALPHA * (next.x - prev.x)),
      y: Math.round(prev.y + SMOOTHING_ALPHA * (next.y - prev.y)),
    };
  };
  // 👁️ helper: compute iris radius (avg distance from iris center)
  const getIrisRadius = (irisPoints, center) => {
    if (!center || !irisPoints?.length) return null;
    let total = 0;
    for (const p of irisPoints) {
      const dx = p.x - center.x;
      const dy = p.y - center.y;
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return total / irisPoints.length;
  };

  const setupAndStart = async () => {
    console.log("▶️ Start button clicked");
    
    // Reset state
    setSamples([]);
    setPupilSamples([]);
    setGaze({ x: null, y: null });
    lastGazeRef.current = { x: null, y: null };
    lastPupilRef.current = null;
    stoppedRef.current = false;
  
    try {
      setIsInitializing(true);
      // 🔁 if landmarker already exists, close it before recreating
      if (landmarkerRef.current) {
        try {
          await landmarkerRef.current.close();
        } catch (e) {
          console.warn("Previous landmarker close failed:", e);
        }
        landmarkerRef.current = null;
      }
    
      const fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
    
      landmarkerRef.current = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        },
        numFaces: 1,
        runningMode: "VIDEO",
      });
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        console.error("Video or canvas ref is null");
        return;
      }
      
      // Wait for video to be ready if needed
      if (!video.videoWidth || !video.videoHeight) {
        await new Promise((resolve) => {
          const checkVideo = () => {
            if (video.videoWidth && video.videoHeight) {
              resolve();
            } else {
              setTimeout(checkVideo, 100);
            }
          };
          checkVideo();
        });
      }
    
      canvas.width = video.videoWidth || 360;
      canvas.height = video.videoHeight || 640;
    
      startTimeRef.current = performance.now();
      setIsTracking(true);
      
      // Start the loop
      rafRef.current = requestAnimationFrame(loop);
      console.log("✅ Tracking started successfully");
      
    } catch (e) {
      console.error("Model creation or setup failed:", e);
      setIsTracking(false);
      stoppedRef.current = true;
    } finally {
      setIsInitializing(false);
    }
  };

  // Build exportable dataset: align gaze samples with pupil dilation (by index)
  const buildExportRows = () => {
    const len = Math.min(samples.length, pupilSamples.length || 0) || samples.length;
    const rows = [];
    for (let i = 0; i < len; i += 1) {
      const s = samples[i];
      const pd = pupilSamples[i]?.y ?? null;
      rows.push({ x: s?.x ?? null, y: s?.y ?? null, pupilDilation: pd });
    }
    return rows;
  };

  const handleExportJSON = () => {
    const rows = buildExportRows();
    if (!rows.length) return;
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gaze-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const rows = buildExportRows();
    if (!rows.length) return;
    const header = ["x", "y", "pupilDilation"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([r.x, r.y, r.pupilDilation].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gaze-data-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  

  const stopTracking = async () => {
    console.log("🛑 Stop button clicked");
    setIsTracking(false);
    stoppedRef.current = true;
    
    // Cancel animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    // Close landmarker first to prevent further detection attempts
    if (landmarkerRef.current) {
      try {
        await landmarkerRef.current.close();
        landmarkerRef.current = null;
      } catch (e) {
        console.warn("Landmarker close error:", e);
      }
    }
    
    // Then stop camera
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    
    // Log final fixation
    if (lastGazeRef.current && lastGazeRef.current.x != null) {
      console.log(`Final fixation: (x: ${lastGazeRef.current.x}, y: ${lastGazeRef.current.y})`);
    }
  };
  const loop = () => {
    if (!videoRef.current || !canvasRef.current || !landmarkerRef.current || stoppedRef.current)
      return;

    const now = performance.now();
    const elapsed = now - (startTimeRef.current || now);
    const shouldStop = elapsed >= duration && duration !== Infinity;

    // Guard: Check if video has valid dimensions before detection
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight || video.videoWidth === 0 || video.videoHeight === 0) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    let result = null;
    try {
      result = landmarkerRef.current.detectForVideo(video, now);
    } catch (error) {
      console.warn("Detection frame skipped:", error);
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const ctx = canvasRef.current.getContext("2d");
    ctx.save();
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

    let currentGaze = null;

    if (result?.faceLandmarks?.[0]) {
      const lm = result.faceLandmarks[0];
      const leftIrisIdx = [468, 469, 470, 471, 472];
      const rightIrisIdx = [473, 474, 475, 476, 477];
      const leftEyeLidIdx = [33, 133, 159, 145, 158, 153];
      const rightEyeLidIdx = [362, 263, 386, 374, 385, 380];

      const leftIrisCenter = getCenter(leftIrisIdx.map((i) => lm[i]));
      const rightIrisCenter = getCenter(rightIrisIdx.map((i) => lm[i]));
      const leftEyeBox = getEyeBox(lm, leftEyeLidIdx);
      const rightEyeBox = getEyeBox(lm, rightEyeLidIdx);

      const leftScreen = mapToScreen(leftIrisCenter, leftEyeBox);
      const rightScreen = mapToScreen(rightIrisCenter, rightEyeBox);

      if (leftScreen && rightScreen) {
        currentGaze = {
          x: Math.round((leftScreen.x + rightScreen.x) / 2),
          y: Math.round((leftScreen.y + rightScreen.y) / 2),
        };
      } else currentGaze = leftScreen || rightScreen || null;

      // 👁️ Pupil dilation calculation
      const leftRadius = getIrisRadius(leftIrisIdx.map((i) => lm[i]), leftIrisCenter);
      const rightRadius = getIrisRadius(rightIrisIdx.map((i) => lm[i]), rightIrisCenter);
      const avgRadius = (leftRadius + rightRadius) / 2;

      // normalize by eye width
      const leftEyeWidth = leftEyeBox ? leftEyeBox.maxX - leftEyeBox.minX : 1;
      const normalizedPupil = avgRadius / leftEyeWidth;

      // compute change (dilation)
      if (lastPupilRef.current != null) {
        const dilation = normalizedPupil - lastPupilRef.current;
        setPupilSamples((prev) =>
          prev.concat({ x: (elapsed / 1000).toFixed(2), y: dilation.toFixed(2)})
        );
      }
      lastPupilRef.current = normalizedPupil;
    }

    if (currentGaze) {
      const smoothed = smooth(lastGazeRef.current, currentGaze);
      lastGazeRef.current = smoothed;
      setGaze(smoothed);
      setSamples((prev) => prev.concat({ x: smoothed.x, y: smoothed.y }));
    }

    ctx.restore();

    if (shouldStop) {
      stopTracking();
      return;
    }

    // Only continue loop if not stopped
    if (!stoppedRef.current) {
      rafRef.current = requestAnimationFrame(loop);
    }
  };

  // Auto-scale x and y axes based on recent data points
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    if (samples.length === 0) {
      return {
        xMin: 0,
        xMax: window.innerWidth,
        yMin: 0,
        yMax: window.innerHeight,
      };
    }

    const recentData = samples.slice(-AUTO_SCALE_POINTS);
    const xValues = recentData.map((s) => s.x).filter((v) => v != null);
    const yValues = recentData.map((s) => s.y).filter((v) => v != null);

    if (xValues.length === 0 || yValues.length === 0) {
      return {
        xMin: 0,
        xMax: window.innerWidth,
        yMin: 0,
        yMax: window.innerHeight,
      };
    }

    const xMinVal = Math.min(...xValues);
    const xMaxVal = Math.max(...xValues);
    const yMinVal = Math.min(...yValues);
    const yMaxVal = Math.max(...yValues);


    return {
      xMin: Math.max(xMinVal - 100, 0),
      xMax: Math.min(xMaxVal + 100, window.innerWidth),
      yMin: Math.max(yMinVal - 100, 0),
      yMax: Math.min(yMaxVal + 100, window.innerHeight),
    };
  }, [samples]);

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(to bottom right, #f8f9fa, #e9ecef)",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Top Control Bar */}
      <div style={{
        background: "white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", flex: "1 1 auto" }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: "clamp(18px, 4vw, 24px)", 
            fontWeight: 700, 
            color: "#1a202c",
            letterSpacing: "-0.5px",
          }}>
            Gaze Tracker
          </h1>
          
          <button
            onClick={isTracking ? stopTracking : setupAndStart}
            disabled={isInitializing}
            style={{
              background: isInitializing ? "#cbd5e0" : isTracking ? "#e53e3e" : "#48bb78",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: 8,
              cursor: isInitializing ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "clamp(12px, 2vw, 14px)",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {isInitializing ? "Loading..." : isTracking ? "Stop" : "Start"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: "clamp(12px, 2vw, 14px)", fontWeight: 600, color: "#4a5568", display: "none" }}>Duration:</span>
          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: "clamp(12px, 2vw, 14px)" }}>
            <input
              type="radio"
              name="duration"
              value="30000"
              checked={duration === 30000}
              onChange={() => setDuration(30000)}
              disabled={isTracking}
              style={{ cursor: isTracking ? "not-allowed" : "pointer" }}
            />
            <span style={{ color: "#2d3748" }}>30s</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: "clamp(12px, 2vw, 14px)" }}>
            <input
              type="radio"
              name="duration"
              value="60000"
              checked={duration === 60000}
              onChange={() => setDuration(60000)}
              disabled={isTracking}
              style={{ cursor: isTracking ? "not-allowed" : "pointer" }}
            />
            <span style={{ color: "#2d3748" }}>1m</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: "clamp(12px, 2vw, 14px)" }}>
            <input
              type="radio"
              name="duration"
              value="infinite"
              checked={duration === Infinity}
              onChange={() => setDuration(Infinity)}
              disabled={isTracking}
              style={{ cursor: isTracking ? "not-allowed" : "pointer" }}
            />
            <span style={{ color: "#2d3748" }}>∞</span>
          </label>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        padding: "clamp(12px, 2vw, 24px)", 
        display: "flex", 
        gap: "clamp(12px, 2vw, 20px)", 
        maxWidth: "1600px", 
        margin: "0 auto",
        minHeight: "calc(100vh - 80px)",
        flexDirection: isMobile ? "column" : "row",
      }}>
        {/* Left: Camera Preview (1/3 width on desktop, full width on mobile) */}
        <div style={{
          flex: isMobile ? "1 1 auto" : "0 0 clamp(280px, 25vw, 360px)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minWidth: 0,
        }}>
          <div style={{
            background: "white",
            borderRadius: 12,
            padding: "clamp(12px, 2vw, 16px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            position: "relative",
          }}>
            <h2 style={{ 
              margin: "0 0 12px 0", 
              fontSize: "clamp(14px, 2.5vw, 16px)", 
              fontWeight: 600, 
              color: "#2d3748",
            }}>
              Camera Preview
            </h2>
            <div
              style={{
                position: "relative",
                background: "#000",
                borderRadius: 8,
                overflow: "hidden",
                aspectRatio: "3 / 4",
              }}
            >
              {isInitializing && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                }}>
                  <div style={{
                    background: "white",
                    color: "#2d3748",
                    padding: "12px 20px",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 14,
                  }}>
                    Initializing gaze tracker...
                  </div>
                </div>
              )}
              <video
                ref={videoRef}
                playsInline
                muted
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)",
                }}
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              />
            </div>
            <div style={{ 
              marginTop: 12, 
              padding: "8px 12px", 
              background: "#f7fafc", 
              borderRadius: 6,
              textAlign: "center",
              fontSize: "clamp(12px, 2vw, 14px)",
              fontWeight: 600,
              color: "#4a5568",
            }}>
              {gaze.x != null
                ? `Fixation: (x: ${gaze.x}, y: ${gaze.y})`
                : isTracking
                ? "Tracking..."
                : "Press Start to begin"}
            </div>
          </div>

          {/* Export Controls */}
          <div style={{
            background: "white",
            borderRadius: 12,
            padding: "clamp(12px, 2vw, 16px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}>
            <h3 style={{ 
              margin: "0 0 12px 0", 
              fontSize: "clamp(13px, 2vw, 14px)", 
              fontWeight: 600, 
              color: "#2d3748",
            }}>
              Export Options
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={handleExportJSON}
                disabled={samples.length === 0}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: samples.length === 0 ? "#f7fafc" : "white",
                  color: samples.length === 0 ? "#a0aec0" : "#2d3748",
                  cursor: samples.length === 0 ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "clamp(12px, 2vw, 14px)",
                  boxShadow: samples.length === 0 ? "none" : "0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                📄 Export as JSON
              </button>
              <button
                onClick={handleExportCSV}
                disabled={samples.length === 0}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: samples.length === 0 ? "#f7fafc" : "white",
                  color: samples.length === 0 ? "#a0aec0" : "#2d3748",
                  cursor: samples.length === 0 ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "clamp(12px, 2vw, 14px)",
                  boxShadow: samples.length === 0 ? "none" : "0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                📊 Export as CSV
              </button>
            </div>
          </div>
        </div>

        {/* Right: Charts (2/3 width on desktop, full width on mobile) */}
        <div style={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "column", 
          gap: "clamp(12px, 2vw, 20px)",
          minWidth: 0,
        }}>
          {/* Eye Fixation Chart */}
          <div style={{
            background: "white",
            borderRadius: 12,
            padding: "clamp(12px, 2vw, 20px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: "300px",
          }}>
            <h2 style={{ 
              margin: "0 0 16px 0", 
              fontSize: "clamp(16px, 3vw, 18px)", 
              fontWeight: 700, 
              color: "#1a202c",
            }}>
              Eye Fixation Map.
            </h2>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ReactApexChart
                type="line"
                series={[
                  {
                    name: "Gaze Points",
                    data: samples.map((s) => [s.x, s.y]),
                  },
                ]}
                options={{
                  theme: { mode: "light" },
                  chart: { 
                    animations: { enabled: false }, 
                    toolbar: { show: false },
                    background: "transparent",
                  },
                  stroke: { 
                    width: 3,
                    curve: "smooth",
                  },
                  xaxis: { 
                    title: { 
                      text: "Horizontal Gaze (x)", 
                      style: { fontSize: 14, fontWeight: 600, color: "#4a5568" }
                    }, 
                    min: xMin, 
                    max: xMax,
                    labels: { style: { colors: "#718096", fontSize: 12 } },
                  },
                  yaxis: { 
                    title: { 
                      text: "Vertical Gaze (y)", 
                      style: { fontSize: 14, fontWeight: 600, color: "#4a5568" }
                    }, 
                    min: yMin, 
                    max: yMax,
                    labels: { style: { colors: "#718096", fontSize: 12 } },
                  },
                  colors: ["#3182ce"],
                  grid: { 
                    borderColor: "#e2e8f0",
                    strokeDashArray: 4,
                  },
                  markers: { size: 4 },
                }}
                height="100%"
        
              />
            </div>
          </div>

     
        </div>
        
      </div>
           {/* Pupil Dilation Chart */}
           <div style={{
            background: "white",
            borderRadius: 12,
            padding: "clamp(12px, 2vw, 20px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: "300px",
          }}>
            <h2 style={{ 
              margin: "0 0 16px 0", 
              fontSize: "clamp(16px, 3vw, 18px)", 
              fontWeight: 700, 
              color: "#1a202c",
            }}>
              Pupil Dilation Over Time
            </h2>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ReactApexChart
                type="line"
                series={[
                  {
                    name: "Pupil Dilation (Δ)",
                    data: pupilSamples.map((p) => ({ x: parseFloat(p.x), y: p.y })),
                  },
                ]}
                options={{
                  theme: { mode: "light" },
                  chart: { 
                    animations: { enabled: false }, 
                    toolbar: { show: false },
                    background: "transparent",
                  },
                  stroke: { 
                    width: 3,
                    curve: "smooth",
                  },
                  xaxis: { 
                    title: { 
                      text: "Time (seconds)", 
                      style: { fontSize: 14, fontWeight: 600, color: "#4a5568" }
                    },
                    labels: { style: { colors: "#718096", fontSize: 12 } },
                  },
                  yaxis: { 
                    title: { 
                      text: "Δ Normalized Pupil Size", 
                      style: { fontSize: 14, fontWeight: 600, color: "#4a5568" }
                    },
                    labels: { style: { colors: "#718096", fontSize: 12 } },
                  },
                  colors: ["#ed8936"],
                  grid: { 
                    borderColor: "#e2e8f0",
                    strokeDashArray: 4,
                  },
                  markers: { size: 4 },
                }}
                height="100%"
              />
            </div>
          </div>
    </div>
  );
}
