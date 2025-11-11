import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import ReactApexChart from "react-apexcharts";
import PrimaryButton from "./ui/PrimaryButton";
import { onAuthStateChanged } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import {
  auth,
  serverTimestamp,
  userSessionsCollection,
} from "../firebaseConfig";
import { calculateHRMetrics } from "../Utils/hrUtils";
import MetricCard from "./dashboard/MetricCard";

const DEFAULT_TARGET_FPS = 30;
const DEFAULT_MAX_POINTS = 100;
const RAW_SIGNAL_WINDOW_SECONDS = 120;
const HeartRateMeasuring = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const hrSeriesRef = useRef([]);
  const hrvSeriesRef = useRef([]);
  const theme = "light";
  const [intensitySeries, setIntensitySeries] = useState([]);
  const [heartRate, setHeartRate] = useState("--");
  const [hrv, setHrv] = useState("--");
  const [, setExportData] = useState([]);
  const [isCamCollapsed, setIsCamCollapsed] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUserId(firebaseUser?.uid ?? null);
    });

    return () => unsubscribe();
  }, []);

  // Frame processing using the video element from CameraBox
  const processFrame = useCallback(() => {
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

 
setIntensitySeries((prev) => [...prev, { x: now, y: Number(avgIntensity.toFixed(2)) }]);
    const rawLimit = targetFps * RAW_SIGNAL_WINDOW_SECONDS;
    setExportData((prev) => {
      const next = [...prev, avgIntensity];
      const limited = next.length > rawLimit ? next.slice(-rawLimit) : next;

      const result = calculateHRMetrics(
        limited,
        targetFps,
        hrSeriesRef.current,
        hrvSeriesRef.current
      );
      if (result) {
        setHeartRate(result.heartRate);
        setHrv(result.hrv);
        hrSeriesRef.current = result.hrSeries;
        hrvSeriesRef.current = result.hrvSeries;
      }

      return limited;
    });
  }, [maxPoints, targetFps]);

  const saveSessionData = useCallback(async () => {
    if (!userId) return false;

    const maxSamples = 300;
    const hrPoints = hrSeriesRef.current.slice(-maxSamples);
    if (hrPoints.length < 100) {
      return false;
    }

    const hrvPoints = hrvSeriesRef.current.slice(-maxSamples);
    const hrvOffset = Math.max(0, hrvPoints.length - hrPoints.length);

    const samples = hrPoints.map((hrPoint, index) => {
      const hrvPoint = hrvPoints[hrvOffset + index] ?? null;
      return {
        timestamp: hrPoint.x,
        heartRate: hrPoint.y,
        hrv: hrvPoint ? hrvPoint.y : null,
      };
    });

    const heartRates = samples.map((sample) => sample.heartRate);
    const validHrvValues = samples
      .map((sample) => sample.hrv)
      .filter((value) => typeof value === "number" && !Number.isNaN(value));

    const average = (values) =>
      values.length === 0
        ? null
        : Number(
            (
              values.reduce((sum, value) => sum + value, 0) / values.length
            ).toFixed(1)
          );

    const avgHeartRate = average(heartRates);
    const avgHrv = average(validHrvValues);

    const firstTimestamp = samples[0]?.timestamp ?? null;
    const lastTimestamp =
      samples[samples.length - 1]?.timestamp ?? firstTimestamp ?? null;
    const durationMs =
      firstTimestamp && lastTimestamp && lastTimestamp >= firstTimestamp
        ? lastTimestamp - firstTimestamp
        : null;

    const sessionsRef = userSessionsCollection(userId);
    const sessionRef = doc(sessionsRef);
    const payload = {
      sessionId: sessionRef.id,
      createdAt: serverTimestamp(),
      clientCreatedAt: Date.now(),
      firstTimestamp,
      lastTimestamp,
      durationMs,
      sampleCount: samples.length,
      avgHeartRate,
      avgHrv,
      metrics: samples,
    };
    await setDoc(sessionRef, payload);

    return true;
  }, [userId]);

  const resetMeasurementState = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    videoRef.current = null;
    canvasRef.current = null;
    hrSeriesRef.current = [];
    hrvSeriesRef.current = [];
    setExportData([]);
    setIntensitySeries([]);
    setHeartRate("--");
    setHrv("--");
  }, [setExportData, setHeartRate, setHrv, setIntensitySeries]);

  const handleVideoReady = useCallback((el) => {
    if (!el) return;
    videoRef.current = el;
  }, []);
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(processFrame, 1000 / targetFps);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [processFrame, targetFps]);

  useEffect(() => {
    let cancelled = false;
  
    (async () => {
      const stream = await getCameraStream("user");
      if (!cancelled && videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    })();
  
    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      const stream = videoRef.current?.srcObject;
      if (stream) stream.getTracks().forEach((t) => t.stop());
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
  }, [intensitySeries, theme, maxPoints, targetFps]);
  const handleStopMeasuring = useCallback(async () => {
    try {
      // ✅ Stop frame processing immediately
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
  
      // ✅ Stop video tracks
      const stream = videoRef.current?.srcObject;
      if (stream) stream.getTracks().forEach((t) => t.stop());
  
      // Save data safely
      localStorage.setItem("heartRate", heartRate);
      localStorage.setItem("hrv", hrv);
  
      let saved = false;
      if (userId) {
        try {
          setIsSaving(true);
          saved = await saveSessionData(); // Wait until saved
        } catch (error) {
          console.error("Failed to save session:", error);
        } finally {
          setIsSaving(false);
        }
      }
  
      // ✅ Reset state AFTER saving and stopping camera
      resetMeasurementState();
  
      // ✅ Give the browser a short delay before navigating (ensures React unmounts properly)
      setTimeout(() => {
        navigate("/dashboard", {
          state: saved ? { sessionSaved: true } : undefined,
        });
      }, 300);
    } catch (err) {
      console.error("Error while stopping measurement:", err);
    }
  }, [heartRate, hrv, navigate, resetMeasurementState, saveSessionData, userId]);
  
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
            <MetricCard
              icon="❤️"
              title="HR"
              value={heartRate || "--"}
              unit="bpm"
            />
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
          disabled={isSaving}
          style={{
            width: "100%",
            opacity: isSaving ? 0.7 : 1,
            pointerEvents: isSaving ? "none" : "auto",
          }}
        >
          {isSaving ? "Saving…" : "Stop Measuring"}
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
          ref={handleVideoReady}
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
