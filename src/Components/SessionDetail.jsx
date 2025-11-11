import React, { useEffect, useMemo, useState } from "react";
import { Button } from "antd";
import ReactApexChart from "react-apexcharts";
import { useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, userSessionsCollection } from "../firebaseConfig";




const SessionDetail = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [userId, setUserId] = useState(auth.currentUser?.uid ?? null);
  const [session, setSession] = useState(state?.sessionData ?? null);
  const [loading, setLoading] = useState(!state?.sessionData);

  const sessionId = state?.sessionId ?? session?.sessionId ?? session?.id ?? null;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUserId(firebaseUser?.uid ?? null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId || !sessionId || state?.sessionData) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const sessionRef = doc(userSessionsCollection(userId), sessionId);
        const snap = await getDoc(sessionRef);
        console.log(snap,"snap")
        console.log(sessionRef,"sessionRef")
        if (!cancelled && snap.exists()) {
          setSession({ id: snap.id, ...snap.data() });
        }
      } catch (error) {
        console.error("Failed to load session:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, sessionId, state?.sessionData]);

  const metrics = useMemo(() => {
    if (!session || !Array.isArray(session.metrics)) return [];
    return session.metrics
      .map((metric) => ({
        timestamp: metric.timestamp,
        heartRate: Number(metric.heartRate ?? NaN),
        hrv: Number(metric.hrv ?? NaN),
      }))
      .filter((metric) => !Number.isNaN(metric.heartRate));
  }, [session]);

  const heartRateSeries = useMemo(
    () =>
      metrics.map((metric) => ({
        x: metric.timestamp,
        y: metric.heartRate,
      })),
    [metrics]
  );

  const hrvSeries = useMemo(
    () =>
      metrics
        .filter((metric) => !Number.isNaN(metric.hrv))
        .map((metric) => ({
          x: metric.timestamp,
          y: metric.hrv,
        })),
    [metrics]
  );

  const averages = useMemo(() => {
    const average = (values) =>
      values.length === 0
        ? "--"
        : (
            values.reduce((sum, value) => sum + value, 0) / values.length
          ).toFixed(1);

    const heartRates = metrics.map((metric) => metric.heartRate);
    const hrvValues = metrics
      .map((metric) => metric.hrv)
      .filter((value) => !Number.isNaN(value));

    return {
      avgHeartRate: session?.avgHeartRate?.toFixed
        ? session.avgHeartRate.toFixed(1)
        : average(heartRates),
      avgHrv: session?.avgHrv?.toFixed
        ? session.avgHrv.toFixed(1)
        : average(hrvValues),
    };
  }, [metrics, session?.avgHeartRate, session?.avgHrv]);



 

  const summary = useMemo(() => {
    const sampleCount = session?.sampleCount ?? metrics.length;
    const avgHeartRateValue =
      typeof session?.avgHeartRate === "number"
        ? session.avgHeartRate
        : metrics.length > 0
        ? metrics.reduce((sum, point) => sum + point.heartRate, 0) /
          metrics.length
        : null;

    return {
      sampleCount,
      avgHeartRateDisplay: averages.avgHeartRate,
      avgHeartRateValue: avgHeartRateValue,
      avgHrv: averages.avgHrv,
    };
  }, [averages.avgHeartRate, averages.avgHrv, metrics, session?.avgHeartRate, session?.sampleCount]);

  const heartRange = useMemo(() => {
    const heartRates = metrics.map((metric) => metric.heartRate);
    if (heartRates.length === 0) {
      return {
        min: "--",
        max: "--",
        avg: "--",
        statusLabel: "No data",
        statusColor: "#94a3b8",
        indicatorLeft: "50%",
      };
    }

    const min = Math.min(...heartRates);
    const max = Math.max(...heartRates);
    const avgValue =
      typeof summary.avgHeartRateValue === "number"
        ? summary.avgHeartRateValue
        : heartRates.reduce((sum, value) => sum + value, 0) / heartRates.length;

    let statusLabel = "Normal";
    let statusColor = "#16a34a";

    if (avgValue < 60) {
      statusLabel = "Low";
      statusColor = "#2563eb";
    } else if (avgValue > 100) {
      statusLabel = "High";
      statusColor = "#ef4444";
    }

    const clamp = (value, minValue, maxValue) =>
      Math.max(minValue, Math.min(maxValue, value));
    const indicatorPercent = clamp(avgValue, 40, 160);
    const indicatorLeft = `${
      ((indicatorPercent - 40) / (160 - 40)) * 100
    }%`;

    const formatBpm = (value) =>
      Number.isFinite(value) ? `${Math.round(value)} BPM` : "--";

    return {
      min: `${min.toFixed(0)} BPM`,
      max: `${max.toFixed(0)} BPM`,
      avg: formatBpm(avgValue),
      statusLabel,
      statusColor,
      indicatorLeft,
    };
  }, [metrics, summary.avgHeartRateValue]);

  const chartOptions = useMemo(
    () => ({
      chart: { type: "line", toolbar: { show: false } },
      stroke: { curve: "smooth", width: 2 },
      dataLabels: { enabled: false },
      tooltip: {
        x: { format: "HH:mm:ss" },
      },
      xaxis: {
        type: "datetime",
        labels: { datetimeUTC: false },
      },
    }),
    []
  );

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#6b7280" }}>Loading session…</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#6b7280" }}>Session not found.</p>
          <Button type="primary" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px",
            maxWidth: 480,
            margin: "0 auto",
          }}
        >
          <Button
            aria-label="Go back"
            tabIndex={0}
            onClick={() => navigate(-1)}
            shape="circle"
            style={{ border: "none", background: "#f3f4f6", color: "#6b7280" }}
          >
            ‹
          </Button>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 18, color: "#111827" }}>Scan Results</div>
          </div>
          <div style={{ width: 44 }} />
        </div>
      </header>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "16px" }}>
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#111827" }}>
              Your Heart range is
            </h2>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                background: `${heartRange.statusColor}20`,
                color: heartRange.statusColor,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: heartRange.statusColor,
                }}
              />
              {heartRange.statusLabel}
            </span>
          </div>

          <div style={{ position: "relative", height: 12, marginTop: 4 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, #2563eb 0%, #22c55e 50%, #ef4444 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: heartRange.indicatorLeft,
                transform: "translate(-50%, -50%)",
                width: 12,
                height: 24,
                borderRadius: "25%",
                border: "2px solid #ffffff",
                background: heartRange.statusColor,
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              fontSize: 13,
              color: "#475569",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#2563eb",
                }}
              />
              <div>
                <div style={{ fontWeight: 600, color: "#111827" }}>Min BPM</div>
                <div>{heartRange.min}</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#16a34a",
                }}
              />
              <div>
                <div style={{ fontWeight: 600, color: "#111827" }}>Max BPM</div>
                <div>{heartRange.max}</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#ef4444",
                }}
              />
              <div>
                <div style={{ fontWeight: 600, color: "#111827" }}>Avg</div>
                <div>{heartRange.avg}</div>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: "#111827" }}>
            Heart Rate
          </h3>
          <ReactApexChart
            options={{
              ...chartOptions,
              stroke: { ...chartOptions.stroke, colors: ["#1857C1"] },
              yaxis: { title: { text: "BPM" } },
            }}
            series={[{ name: "Heart Rate", data: heartRateSeries }]}
            type="line"
            height={220}
          />
        </section>

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: "#111827" }}>
            HRV
          </h3>
          <ReactApexChart
            options={{
              ...chartOptions,
              stroke: { ...chartOptions.stroke, colors: ["#14b8a6"] },
              yaxis: { title: { text: "ms" } },
            }}
            series={[{ name: "HRV", data: hrvSeries }]}
            type="line"
            height={220}
          />
        </section>
      </main>
    </div>
  );
};

export default SessionDetail;
