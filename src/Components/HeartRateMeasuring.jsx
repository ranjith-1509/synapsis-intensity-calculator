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
import { GrPowerReset } from "react-icons/gr";
import { calculateHRMetrics } from "../Utils/hrUtils";
import MetricCard from "./dashboard/MetricCard";
import hrvIcon from "../images/hrv.svg";
import hr from "../images/hr.svg";
import './hearRate.css'

const DEFAULT_TARGET_FPS = 30;
const DEFAULT_MAX_POINTS = 100;
const RAW_SIGNAL_WINDOW_SECONDS = 120;

const HeartRateMeasuring = () => {
  const navigate = useNavigate();
  const theme = "light";
  
  // Front camera refs and state
  const frontVideoRef = useRef(null);
  const frontCanvasRef = useRef(null);
  const frontIntervalRef = useRef(null);
  const frontHrSeriesRef = useRef([]);
  const frontHrvSeriesRef = useRef([]);
  const frontExportDataRef = useRef([]);
  
  // Back camera refs and state
  const backVideoRef = useRef(null);
  const backCanvasRef = useRef(null);
  const backIntervalRef = useRef(null);
  const backHrSeriesRef = useRef([]);
  const backHrvSeriesRef = useRef([]);
  const backExportDataRef = useRef([]);
  
  // Front camera state
  const [frontIntensitySeries, setFrontIntensitySeries] = useState([]);
  const [frontHeartRate, setFrontHeartRate] = useState("--");
  const [frontHrv, setFrontHrv] = useState("--");
  
  // Back camera state
  const [backIntensitySeries, setBackIntensitySeries] = useState([]);
  const [backHeartRate, setBackHeartRate] = useState("--");
  const [backHrv, setBackHrv] = useState("--");
  
  // UI state
  const [isFrontCamCollapsed, setIsFrontCamCollapsed] = useState(true);
  const [isBackCamCollapsed, setIsBackCamCollapsed] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const wakeLockRef = useRef(null);

  const targetFps = DEFAULT_TARGET_FPS;
  const maxPoints = DEFAULT_MAX_POINTS;
  
  // Create brightness overlay on mount
  useEffect(() => {
    const div = document.createElement("div");
    div.className = "brightness-overlay";
    document.body.appendChild(div);
  
    return () => div.remove();
  }, []);

  // Screen Wake Lock - Keep screen on
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          wakeLockRef.current = wakeLock;
        }
      } catch (err) {
        console.error('Wake lock error:', err);
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);
  
  const getCameraStream = async (facingMode) => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch (err) {
      console.error(`Camera access error (${facingMode}):`, err);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUserId(firebaseUser?.uid ?? null);
    });

    return () => unsubscribe();
  }, []);

  // Process frame for front camera
  const processFrontFrame = useCallback(() => {
    const video = frontVideoRef.current;
    const canvas = frontCanvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

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

    setFrontIntensitySeries((prev) => [...prev, { x: now, y: Number(avgIntensity.toFixed(2)) }]);
    
    const rawLimit = targetFps * RAW_SIGNAL_WINDOW_SECONDS;
    frontExportDataRef.current = [...frontExportDataRef.current, avgIntensity];
    const limited = frontExportDataRef.current.length > rawLimit 
      ? frontExportDataRef.current.slice(-rawLimit) 
      : frontExportDataRef.current;

    const result = calculateHRMetrics(
      limited,
      targetFps,
      frontHrSeriesRef.current,
      frontHrvSeriesRef.current
    );
    
    if (result) {
      setFrontHeartRate(result.heartRate);
      setFrontHrv(result.hrv);
      frontHrSeriesRef.current = result.hrSeries;
      frontHrvSeriesRef.current = result.hrvSeries;
    }
  }, [targetFps]);

  // Process frame for back camera
  const processBackFrame = useCallback(() => {
    const video = backVideoRef.current;
    const canvas = backCanvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

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

    setBackIntensitySeries((prev) => [...prev, { x: now, y: Number(avgIntensity.toFixed(2)) }]);
    
    const rawLimit = targetFps * RAW_SIGNAL_WINDOW_SECONDS;
    backExportDataRef.current = [...backExportDataRef.current, avgIntensity];
    const limited = backExportDataRef.current.length > rawLimit 
      ? backExportDataRef.current.slice(-rawLimit) 
      : backExportDataRef.current;

    const result = calculateHRMetrics(
      limited,
      targetFps,
      backHrSeriesRef.current,
      backHrvSeriesRef.current
    );
    
    if (result) {
      setBackHeartRate(result.heartRate);
      setBackHrv(result.hrv);
      backHrSeriesRef.current = result.hrSeries;
      backHrvSeriesRef.current = result.hrvSeries;
    }
  }, [targetFps]);

  // Setup front camera frame processing
  useEffect(() => {
    if (frontIntervalRef.current) {
      clearInterval(frontIntervalRef.current);
    }
    frontIntervalRef.current = setInterval(processFrontFrame, 1000 / targetFps);
    return () => {
      if (frontIntervalRef.current) {
        clearInterval(frontIntervalRef.current);
        frontIntervalRef.current = null;
      }
    };
  }, [processFrontFrame, targetFps]);

  // Setup back camera frame processing
  useEffect(() => {
    if (backIntervalRef.current) {
      clearInterval(backIntervalRef.current);
    }
    backIntervalRef.current = setInterval(processBackFrame, 1000 / targetFps);
    return () => {
      if (backIntervalRef.current) {
        clearInterval(backIntervalRef.current);
        backIntervalRef.current = null;
      }
    };
  }, [processBackFrame, targetFps]);

  // Initialize both cameras
  useEffect(() => {
    let cancelled = false;
    let frontStream = null;
    let backStream = null;

    (async () => {
      // Request both cameras concurrently
      const [frontStreamResult, backStreamResult] = await Promise.all([
        getCameraStream("user"),
        getCameraStream("environment"),
      ]);

      if (cancelled) {
        // Clean up if component unmounted
        frontStreamResult?.getTracks().forEach((t) => t.stop());
        backStreamResult?.getTracks().forEach((t) => t.stop());
        return;
      }

      frontStream = frontStreamResult;
      backStream = backStreamResult;

      if (frontStream && frontVideoRef.current) {
        frontVideoRef.current.srcObject = frontStream;
      }
      if (backStream && backVideoRef.current) {
        backVideoRef.current.srcObject = backStream;
      }
    })();

    return () => {
      cancelled = true;
      if (frontIntervalRef.current) {
        clearInterval(frontIntervalRef.current);
        frontIntervalRef.current = null;
      }
      if (backIntervalRef.current) {
        clearInterval(backIntervalRef.current);
        backIntervalRef.current = null;
      }
      if (frontStream) frontStream.getTracks().forEach((t) => t.stop());
      if (backStream) backStream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const saveSessionData = useCallback(async (cameraType, hrSeries, hrvSeries) => {
    if (!userId) return false;

    const maxSamples = 300;
    const hrPoints = hrSeries.slice(-maxSamples);
    if (hrPoints.length < 100) {
      return false;
    }

    const hrvPoints = hrvSeries.slice(-maxSamples);
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
      cameraType, // "front" or "back"
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
    // Stop intervals
    if (frontIntervalRef.current) {
      clearInterval(frontIntervalRef.current);
      frontIntervalRef.current = null;
    }
    if (backIntervalRef.current) {
      clearInterval(backIntervalRef.current);
      backIntervalRef.current = null;
    }

    // Stop video streams
    const frontStream = frontVideoRef.current?.srcObject;
    const backStream = backVideoRef.current?.srcObject;
    if (frontStream) frontStream.getTracks().forEach((track) => track.stop());
    if (backStream) backStream.getTracks().forEach((track) => track.stop());

    // Clear refs
    if (frontVideoRef.current) frontVideoRef.current.srcObject = null;
    if (backVideoRef.current) backVideoRef.current.srcObject = null;

    // Reset state
    frontHrSeriesRef.current = [];
    frontHrvSeriesRef.current = [];
    frontExportDataRef.current = [];
    backHrSeriesRef.current = [];
    backHrvSeriesRef.current = [];
    backExportDataRef.current = [];

    setFrontIntensitySeries([]);
    setFrontHeartRate("--");
    setFrontHrv("--");
    setBackIntensitySeries([]);
    setBackHeartRate("--");
    setBackHrv("--");
  }, []);

  const handleStopMeasuring = useCallback(async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
      }

      // Stop frame processing immediately
      if (frontIntervalRef.current) {
        clearInterval(frontIntervalRef.current);
        frontIntervalRef.current = null;
      }
      if (backIntervalRef.current) {
        clearInterval(backIntervalRef.current);
        backIntervalRef.current = null;
      }

      // Stop video tracks
      const frontStream = frontVideoRef.current?.srcObject;
      const backStream = backVideoRef.current?.srcObject;
      if (frontStream) frontStream.getTracks().forEach((t) => t.stop());
      if (backStream) backStream.getTracks().forEach((t) => t.stop());

      // Save data safely
      const frontHR = frontHeartRate !== "--" ? frontHeartRate : null;
      const backHR = backHeartRate !== "--" ? backHeartRate : null;
      const avgHR = frontHR && backHR 
        ? ((parseFloat(frontHR) + parseFloat(backHR)) / 2).toFixed(1)
        : frontHR || backHR || "--";
      
      localStorage.setItem("heartRate", avgHR);
      localStorage.setItem("hrv", frontHrv !== "--" ? frontHrv : backHrv);

      let saved = false;
      if (userId) {
        try {
          setIsSaving(true);
          // Save both sessions
          const [frontSaved, backSaved] = await Promise.all([
            saveSessionData("front", frontHrSeriesRef.current, frontHrvSeriesRef.current),
            saveSessionData("back", backHrSeriesRef.current, backHrvSeriesRef.current),
          ]);
          saved = frontSaved || backSaved;
        } catch (error) {
          console.error("Failed to save session:", error);
        } finally {
          setIsSaving(false);
        }
      }

      // Reset state AFTER saving and stopping cameras
      resetMeasurementState();

      // Give the browser a short delay before navigating
      setTimeout(() => {
        navigate("/dashboard", {
          state: saved ? { sessionSaved: true } : undefined,
        });
      }, 300);
    } catch (err) {
      console.error("Error while stopping measurement:", err);
    }
  }, [frontHeartRate, backHeartRate, frontHrv, backHrv, navigate, resetMeasurementState, saveSessionData, userId]);

  // Front camera intensity chart options
  const frontIntensityOptions = useMemo(() => {
    const lastWindow = frontIntensitySeries.slice(-maxPoints);
    let yMin = 0, yMax = 255;
    if (lastWindow.length > 0) {
      const values = lastWindow.map((p) => p.y);
      const min = Math.min(...values), max = Math.max(...values);
      yMin = Math.max(min - 1, 0);
      yMax = Math.min(max + 1, 255);
    }
    const baseColor = "#3b82f6"; // Blue for front camera
    return {
      chart: {
        type: "area",
        animations: { enabled: false },
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      stroke: {
        curve: "smooth",
        width: 2,
        colors: [baseColor],
      },
      grid: { borderColor: theme === "dark" ? "#333" : "#ddd" },
      dataLabels: { enabled: false },
      fill: {
        type: "gradient",
        colors: [baseColor],
        gradient: {
          shade: "light",
          type: "vertical",
          shadeIntensity: 0.5,
          inverseColors: false,
          gradientToColors: [baseColor],
          opacityFrom: 0.5,
          opacityTo: 0.35,
          stops: [0, 35, 70, 100],
        },
      },
      xaxis: {
        type: "datetime",
        labels: { style: { colors: theme === "dark" ? "#e5e5e5" : "#111" } },
        title: { text: "Time" },
        range: maxPoints * (1000 / targetFps),
      },
      yaxis: { min: yMin, max: yMax, title: { text: "Intensity" } },
      theme: { mode: theme },
      tooltip: { theme: theme },
      title: {
        text: "Front Camera",
        style: { fontSize: "14px", fontWeight: 600, color: "#111827" },
      },
    };
  }, [frontIntensitySeries, theme, maxPoints, targetFps]);

  // Back camera intensity chart options
  const backIntensityOptions = useMemo(() => {
    const lastWindow = backIntensitySeries.slice(-maxPoints);
    let yMin = 0, yMax = 255;
    if (lastWindow.length > 0) {
      const values = lastWindow.map((p) => p.y);
      const min = Math.min(...values), max = Math.max(...values);
      yMin = Math.max(min - 1, 0);
      yMax = Math.min(max + 1, 255);
    }
    const baseColor = "#10b981"; // Green for back camera
    return {
      chart: {
        type: "area",
        animations: { enabled: false },
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      stroke: {
        curve: "smooth",
        width: 2,
        colors: [baseColor],
      },
      grid: { borderColor: theme === "dark" ? "#333" : "#ddd" },
      dataLabels: { enabled: false },
      fill: {
        type: "gradient",
        colors: [baseColor],
        gradient: {
          shade: "light",
          type: "vertical",
          shadeIntensity: 0.5,
          inverseColors: false,
          gradientToColors: [baseColor],
          opacityFrom: 0.5,
          opacityTo: 0.35,
          stops: [0, 35, 70, 100],
        },
      },
      xaxis: {
        type: "datetime",
        labels: { style: { colors: theme === "dark" ? "#e5e5e5" : "#111" } },
        title: { text: "Time" },
        range: maxPoints * (1000 / targetFps),
      },
      yaxis: { min: yMin, max: yMax, title: { text: "Intensity" } },
      theme: { mode: theme },
      tooltip: { theme: theme },
      title: {
        text: "Back Camera",
        style: { fontSize: "14px", fontWeight: 600, color: "#111827" },
      },
    };
  }, [backIntensitySeries, theme, maxPoints, targetFps]);

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
          Dual Camera HR Monitor
        </h1>
        <div style={{ width: 36 }} />
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
            Both cameras are active. Position your finger over the front camera or face the back camera for measurement.
          </p>
        </div>

        {/* Front Camera Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div style={{ width: 4, height: 20, background: "#3b82f6", borderRadius: 2 }} />
            <h2
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: 16,
                color: "#111827",
                margin: 0,
              }}
            >
              Front Camera
            </h2>
          </div>
          
          {/* Front Camera Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MetricCard
              icon={<img src={hr} alt="Heart Rate" className="w-6 h-6" style={{width: "54px", height: "51px"}}/>}
              title="HR"
              value={frontHeartRate || "--"}
              unit="bpm"
              showReset={false}
            />
            <MetricCard
              icon={<img src={hrvIcon} alt="HRV" className="w-6 h-6" style={{width: "54px", height: "51px"}}/>}
              title="HRV"
              value={frontHrv || "--"}
              unit="ms"
              showReset={false}
            />
          </div>

          {/* Front Camera Graph */}
          <div
            className="rounded-xl p-4 mb-4"
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ height: 200 }}>
              {frontIntensitySeries.length === 0 ? (
                <div
                  style={{
                    height: 200,
                    borderRadius: 8,
                    background: "#f3f4f6",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)`,
                      transform: "translateX(-100%)",
                      animation: "shimmer 1.5s infinite",
                    }}
                  />
                </div>
              ) : (
                <ReactApexChart
                  options={frontIntensityOptions}
                  series={[{ name: "Intensity", data: frontIntensitySeries }]}
                  type="area"
                  height={200}
                />
              )}
            </div>
          </div>
        </div>

        {/* Back Camera Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div style={{ width: 4, height: 20, background: "#10b981", borderRadius: 2 }} />
            <h2
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: 16,
                color: "#111827",
                margin: 0,
              }}
            >
              Back Camera
            </h2>
          </div>
          
          {/* Back Camera Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MetricCard
              icon={<img src={hr} alt="Heart Rate" className="w-6 h-6" style={{width: "54px", height: "51px"}}/>}
              title="HR"
              value={backHeartRate || "--"}
              unit="bpm"
              showReset={false}
            />
            <MetricCard
              icon={<img src={hrvIcon} alt="HRV" className="w-6 h-6" style={{width: "54px", height: "51px"}}/>}
              title="HRV"
              value={backHrv || "--"}
              unit="ms"
              showReset={false}
            />
          </div>

          {/* Back Camera Graph */}
          <div
            className="rounded-xl p-4 mb-4"
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ height: 200 }}>
              {backIntensitySeries.length === 0 ? (
                <div
                  style={{
                    height: 200,
                    borderRadius: 8,
                    background: "#f3f4f6",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)`,
                      transform: "translateX(-100%)",
                      animation: "shimmer 1.5s infinite",
                    }}
                  />
                </div>
              ) : (
                <ReactApexChart
                  options={backIntensityOptions}
                  series={[{ name: "Intensity", data: backIntensitySeries }]}
                  type="area"
                  height={200}
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

      {/* Front Camera Preview */}
      <div
        className={`sticky-camera ${isFrontCamCollapsed ? "collapsed" : ""}`}
        style={{
          width: isFrontCamCollapsed ? 80 : 140,
          height: isFrontCamCollapsed ? 80 : 140,
          position: "fixed",
          top: 16,
          right: 16,
          borderRadius: "12px",
          overflow: "hidden",
          border: "3px solid #3b82f6",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          zIndex: 40,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <video
          ref={frontVideoRef}
          autoPlay
          playsInline
          muted
          width="100%"
          height="100%"
          style={{ objectFit: "cover" }}
        />
        <button
          onClick={() => setIsFrontCamCollapsed((v) => !v)}
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "2px 6px",
            fontSize: 10,
            cursor: "pointer",
          }}
          aria-label={isFrontCamCollapsed ? "Expand front camera" : "Collapse front camera"}
        >
          {isFrontCamCollapsed ? "↗" : "↘"}
        </button>
        <div
          style={{
            position: "absolute",
            bottom: 4,
            left: 4,
            right: 4,
            background: "rgba(59, 130, 246, 0.8)",
            color: "#fff",
            fontSize: 10,
            padding: "2px 4px",
            borderRadius: 4,
            textAlign: "center",
          }}
        >
          Front
        </div>
      </div>

      {/* Back Camera Preview */}
      <div
        className={`sticky-camera ${isBackCamCollapsed ? "collapsed" : ""}`}
        style={{
          width: isBackCamCollapsed ? 80 : 140,
          height: isBackCamCollapsed ? 80 : 140,
          position: "fixed",
          top: isFrontCamCollapsed ? 108 : 168,
          right: 16,
          borderRadius: "12px",
          overflow: "hidden",
          border: "3px solid #10b981",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          zIndex: 39,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <video
          ref={backVideoRef}
          autoPlay
          playsInline
          muted
          width="100%"
          height="100%"
          style={{ objectFit: "cover" }}
        />
        <button
          onClick={() => setIsBackCamCollapsed((v) => !v)}
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "2px 6px",
            fontSize: 10,
            cursor: "pointer",
          }}
          aria-label={isBackCamCollapsed ? "Expand back camera" : "Collapse back camera"}
        >
          {isBackCamCollapsed ? "↗" : "↘"}
        </button>
        <div
          style={{
            position: "absolute",
            bottom: 4,
            left: 4,
            right: 4,
            background: "rgba(16, 185, 129, 0.8)",
            color: "#fff",
            fontSize: 10,
            padding: "2px 4px",
            borderRadius: 4,
            textAlign: "center",
          }}
        >
          Back
        </div>
      </div>

      {/* Hidden canvases for processing */}
      <canvas ref={frontCanvasRef} style={{ display: "none" }} />
      <canvas ref={backCanvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default HeartRateMeasuring;
