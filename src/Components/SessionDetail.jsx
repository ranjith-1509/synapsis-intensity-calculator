import React, { useEffect, useMemo, useState } from "react";
import { Button } from "antd";
import ReactApexChart from "react-apexcharts";
import { useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, userSessionsCollection } from "../firebaseConfig";


const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value === "number") return new Date(value);
  if (value instanceof Date) return value;
  return null;
};

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

  const createdDate = useMemo(() => {
    if (!session) return null;
    return (
      toDate(session.createdAt) ??
      toDate(session.clientCreatedAt) ??
      (metrics[0]?.timestamp ? new Date(metrics[0].timestamp) : null)
    );
  }, [metrics, session]);

 

  const summary = useMemo(
    () => ({
      sampleCount: session?.sampleCount ?? metrics.length,
      avgHeartRate: averages.avgHeartRate,
      avgHrv: averages.avgHrv,
    }),
    [averages.avgHeartRate, averages.avgHrv, metrics.length, session?.sampleCount]
  );

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
            <div style={{ fontWeight: 600, fontSize: 18, color: "#111827" }}>Session details</div>
            {createdDate && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {createdDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                •{" "}
                {createdDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            )}
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
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#111827" }}>Summary</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Average HR</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: "#111827" }}>
                {summary.avgHeartRate}
                <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 4 }}>bpm</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Average HRV</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: "#111827" }}>
                {summary.avgHrv}
                <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 4 }}>ms</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Samples</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>{summary.sampleCount}</div>
            </div>
            <div>
            
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
