
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactApexChart from "react-apexcharts";
import { onAuthStateChanged } from "firebase/auth";
import { getDocs, limit, orderBy, query } from "firebase/firestore";
import { auth, userSessionsCollection } from "../../firebaseConfig";
import HeartPulse from "../../images/heartpulse.svg";



const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value === "number") return new Date(value);
  if (value instanceof Date) return value;
  return null;
};

const RecentItem = ({ session, onOpen }) => {
  const chartData = useMemo(() => {
    if (!Array.isArray(session.metrics) || session.metrics.length === 0) {
      return Array.from({ length: 100 }, () => 70);
    }
    const heartRates = session.metrics
      .map((metric) => Number(metric.heartRate ?? 0))
      .filter((value) => !Number.isNaN(value));
    return heartRates.slice(-90);
  }, [session.metrics]);

  const chartOptions = useMemo(
    () => ({
      chart: { type: "area", sparkline: { enabled: true }, toolbar: { show: false } },
      stroke: { curve: "smooth", width: 2, colors: ["#60a5fa"] },
      dataLabels: { enabled: false },
      tooltip: { enabled: false },
      fill: {
        type: "gradient",
        gradient: {
          opacityFrom: 0.35,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
    }),
    []
  );

  return (
    <div
      className="rounded-2xl p-4 mb-3"
      style={{ background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", cursor: "pointer" }}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span role="img" aria-label="heart">
            <img src={HeartPulse} alt="Heart Pulse" className="w-6 h-6" />
          </span>
          <span className="font-medium" style={{ fontSize: 14, color: "#111" }}>
            {session.dateLabel}
          </span>
        </div>
        <div className="flex items-center gap-2" style={{ color: "#9ca3af" }}>
          <span className="text-xs">
            {session.timeLabel}
          </span>
          <span style={{ fontSize: 16 }}>›</span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div>
            <span className="font-bold" style={{ fontSize: 22, color: "#111" }}>
              {session.avgHeartRateDisplay}
            </span>
            <span className="ml-1 text-sm" style={{ color: "#6b7280" }}>
              bpm
            </span>
          </div>
          <div className="text-xs" style={{ color: "#9ca3af" }}>
            HRV {session.avgHrvDisplay} ms 
          </div>
        </div>
        <div style={{ width: 110 }}>
          <ReactApexChart
            options={chartOptions}
            series={[{ data: chartData }]}
            type="area"
            height={56}
          />
        </div>
      </div>
    </div>
  );
};

const RecentSection = ({ handleNoOfRecords }) => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log(firebaseUser,"firebaseUser")
      if (!firebaseUser) {
        if (!cancelled) {
          setSessions([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const sessionsRef = userSessionsCollection(firebaseUser.uid);
        const snapshot = await getDocs(
          query(sessionsRef, orderBy("createdAt", "desc"), limit(10))
        );
     handleNoOfRecords(snapshot?.docs?.length);
        if (!cancelled) {
          const list = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          setSessions(list);
        }
      } catch (error) {
        console.error("Failed to load recent sessions:", error);
        if (!cancelled) {
          setSessions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [handleNoOfRecords]);

  const summaries = useMemo(() => {
    return sessions.map((session) => {
      const metrics = Array.isArray(session.metrics) ? session.metrics : [];
      const heartRates = metrics
        .map((metric) => Number(metric.heartRate ?? 0))
        .filter((value) => !Number.isNaN(value));
      const hrvValues = metrics
        .map((metric) => Number(metric.hrv ?? NaN))
        .filter((value) => !Number.isNaN(value));

      const average = (values) =>
        values.length === 0
          ? null
          : Number(
              (
                values.reduce((sum, value) => sum + value, 0) / values.length
              ).toFixed(1)
            );

      const avgHeartRate = session.avgHeartRate ?? average(heartRates);
      const avgHrv = session.avgHrv ?? average(hrvValues);

      const createdDate =
        toDate(session.createdAt) ?? toDate(session.clientCreatedAt) ?? new Date();



      return {
        id: session.id,
        metrics,
        sampleCount: session.sampleCount ?? metrics.length,
        avgHeartRateDisplay:
          typeof avgHeartRate === "number" ? avgHeartRate.toFixed(1) : "--",
        avgHrvDisplay: typeof avgHrv === "number" ? avgHrv.toFixed(1) : "--",
        dateLabel: createdDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        timeLabel: createdDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        raw: {
          ...session,
          metrics,
        },
      };
    });
  }, [sessions]);

  const openSession = (session) => {
    if (!session) return;
    navigate("/session-detail", {
      state: {
        sessionId: session.id,
        sessionData: session.raw,
      },
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold" style={{ margin: 0, fontSize: 16, color: "#111" }}>
          Recent Scan
        </h4>
      </div>

      {loading && (
        <div
          className="rounded-2xl p-4 mb-3"
          style={{ background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
        >
          <span style={{ color: "#6b7280", fontSize: 13 }}>Loading recent sessions…</span>
        </div>
      )}

      {!loading && summaries.length === 0 && (
        <div
          className="rounded-2xl p-4 mb-3"
          style={{ background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
        >
          <span style={{ color: "#6b7280", fontSize: 13 }}>
            No sessions yet. Stop a measurement to save your first session.
          </span>
        </div>
      )}

      <div>
        {summaries.map((session) => (
          <RecentItem key={session.id} session={session} onOpen={() => openSession(session)} />
        ))}
      </div>
    </div>
  );
};

export default RecentSection;
