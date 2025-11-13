import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "antd";
import ReactApexChart from "react-apexcharts";
import { useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { getDocs, orderBy, query, where } from "firebase/firestore";
import { auth, userSessionsCollection } from "../firebaseConfig";

const PERIOD_OPTIONS = ["Day", "Month", "Year"];

const toMillis = (v) => {
  if (!v) return null;
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  if (v.toMillis) return v.toMillis();
  if (v.seconds) return v.seconds * 1000;
  return null;
};

const getPeriodStart = (period) => {
  const now = new Date();
  if (period === "Year") now.setMonth(0, 1);
  if (period === "Month") now.setDate(1);
  now.setHours(0, 0, 0, 0);
  return now.getTime();
};

const formatBpm = (v) => (Number.isFinite(v) ? `${v.toFixed(0)} BPM` : "--");
const formatMs = (v) => (Number.isFinite(v) ? `${v.toFixed(0)} ms` : "--");
const formatCount = (v) => (Number.isFinite(v) ? v.toLocaleString() : "--");
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function SessionDetail() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [userId, setUserId] = useState(auth.currentUser?.uid ?? null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(
    PERIOD_OPTIONS.includes(state?.initialPeriod)
      ? state.initialPeriod
      : "Day"
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const start = getPeriodStart(selectedPeriod);
        const q = query(
          userSessionsCollection(userId),
          where("createdAt", ">=", new Date(start)),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        if (!cancelled)
          setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        if (!cancelled) {
          setError("Unable to load your sessions right now.");
          setSessions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => (cancelled = true);
  }, [userId, selectedPeriod]);

  const allSamples = useMemo(
    () =>
      sessions.flatMap((s) =>
        (s.metrics || [])
          .map((m) => ({
            sessionId: s.id,
            timestamp: toMillis(m.timestamp),
            heartRate: Number(m.heartRate ?? NaN),
            hrv: Number(m.hrv ?? NaN),
          }))
          .filter((x) => Number.isFinite(x.timestamp))
      ),
    [sessions]
  );

  const aggregates = useMemo(() => {
    if (!allSamples.length)
      return {
        sampleCount: 0,
        sessionCount: 0,
        minHeartRate: null,
        maxHeartRate: null,
        avgHeartRate: null,
        avgHrv: null,
      };
    const ids = new Set();
    const hr = [],
      hrv = [];
    for (const s of allSamples) {
      ids.add(s.sessionId);
      if (Number.isFinite(s.heartRate)) hr.push(s.heartRate);
      if (Number.isFinite(s.hrv)) hrv.push(s.hrv);
    }
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y) / a.length : null);
    return {
      sampleCount: allSamples.length,
      sessionCount: ids.size,
      minHeartRate: Math.min(...hr),
      maxHeartRate: Math.max(...hr),
      avgHeartRate: avg(hr),
      avgHrv: avg(hrv),
    };
  }, [allSamples]);

  const heartRange = useMemo(() => {
    const avg = aggregates.avgHeartRate;
    if (!Number.isFinite(avg))
      return { avg: "--", statusLabel: "No data", color: "#94a3b8", left: "50%" };
    let color = "#16a34a";
    let label = "Normal";
    if (avg < 60) {
      color = "#2563eb";
      label = "Low";
    } else if (avg > 100) {
      color = "#ef4444";
      label = "High";
    }
    const left = `${((clamp(avg, 40, 160) - 40) / 120) * 100}%`;
    return {
      min: formatBpm(aggregates.minHeartRate),
      max: formatBpm(aggregates.maxHeartRate),
      avg: formatBpm(avg),
      statusLabel: label,
      color,
      left,
    };
  }, [aggregates]);

  const isDay = selectedPeriod === "Day";
  const chartType = isDay ? "line" : "bar";

  const makeSeries = useCallback(
    (key) => {
    if (isDay)
      return [
        {
          name: key === "heartRate" ? "Heart Rate" : "HRV",
          data: allSamples
            .filter((s) => Number.isFinite(s[key]))
            .map((s) => ({ x: s.timestamp, y: s[key] })),
        },
      ];
    const buckets = new Map();
    const fmt =
      selectedPeriod === "Year"
        ? new Intl.DateTimeFormat("en", { month: "short" })
        : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
    for (const s of allSamples) {
      if (!Number.isFinite(s[key])) continue;
      const label = fmt.format(new Date(s.timestamp));
      const e = buckets.get(label) ?? { sum: 0, count: 0 };
      e.sum += s[key];
      e.count++;
      buckets.set(label, e);
    }
    return [
      {
        name: key === "heartRate" ? "Avg HR" : "Avg HRV",
        data: [...buckets.entries()].map(([x, { sum, count }]) => ({
          x,
          y: +(sum / count).toFixed(1),
        })),
      },
    ];
    },
    [allSamples, isDay, selectedPeriod]
  );

  const heartRateSeries = useMemo(
    () => makeSeries("heartRate"),
    [makeSeries]
  );
  const hrvSeries = useMemo(() => makeSeries("hrv"), [makeSeries]);

  const baseChart = isDay
    ? {
        chart: { type: "line", toolbar: { show: false } },
        stroke: { curve: "smooth", width: 2 },
        xaxis: { type: "datetime", labels: { datetimeUTC: false } },
        tooltip: { x: { format: "MMM dd, HH:mm" } },
        dataLabels: { enabled: false },
      }
    : {
        chart: { type: "bar", toolbar: { show: false } },
        plotOptions: { bar: { borderRadius: 6, columnWidth: "55%" } },
        xaxis: { type: "category", labels: { rotate: -35 } },
        dataLabels: { enabled: false },
      };

  const heartRateChartOptions = {
    ...baseChart,
    colors: ["#1857C1"],
    stroke: { ...(baseChart.stroke ?? {}), colors: ["#1857C1"] },
    yaxis: { title: { text: "BPM" } },
  };
  const hrvChartOptions = {
    ...baseChart,
    colors: ["#14b8a6"],
    stroke: { ...(baseChart.stroke ?? {}), colors: ["#14b8a6"] },
    yaxis: { title: { text: "ms" } },
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
        Loading your insights…
      </div>
    );
  if (!userId)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
        <p>Please sign in to view your history.</p>
        <Button type="primary" onClick={() => navigate("/login")}>
          Log in
        </Button>
      </div>
    );

  const noSamples = allSamples.length === 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {error && <div className="p-2 text-red-500 text-center">{error}</div>}

      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-lg lg:max-w-5xl mx-auto flex items-center justify-between p-4">
          <Button
            onClick={() => navigate(-1)}
            shape="circle"
            className="!bg-gray-100 !border-none !text-gray-500"
          >
            ‹
          </Button>
          <h1 className="text-lg font-semibold">Insights</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-lg lg:max-w-5xl mx-auto p-4">
        {/* Period Selector */}
        <div className="flex justify-center gap-3 mb-5">
          {PERIOD_OPTIONS.map((p) => {
            const active = p === selectedPeriod;
            return (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-4 py-2 rounded-full font-semibold text-sm ${
                  active
                    ? "bg-blue-700 text-white"
                    : "border border-blue-200 text-blue-700 bg-white"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Summary Card */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold">
              {isDay ? "Your Heart range is" : `${selectedPeriod} summary`}
            </h2>
            <span
              className={`px-3 py-1 rounded-full font-semibold text-sm ${
                isDay ? "" : "bg-blue-50 text-slate-900"
              }`}
              style={
                isDay
                  ? { background: `${heartRange.color}20`, color: heartRange.color }
                  : {}
              }
            >
              {isDay
                ? heartRange.statusLabel
                : `Avg ${formatBpm(aggregates.avgHeartRate)}`}
            </span>
          </div>

          {isDay ? (
            <div className="relative h-3 mt-2 rounded-full bg-gradient-to-r from-blue-600 via-green-500 to-red-500">
              <div
                className="absolute top-1/2 w-3 h-6 rounded-sm border-2 border-white -translate-y-1/2"
                style={{ left: heartRange.left, background: heartRange.color }}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500 mt-2">
              Based on {formatCount(aggregates.sampleCount)} readings across{" "}
              {formatCount(aggregates.sessionCount)} sessions this{" "}
              {selectedPeriod.toLowerCase()}.
            </p>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-center">
            <div>
              <div className="text-xs text-gray-500">Average HR</div>
              <div className="text-xl font-semibold">
                {formatBpm(aggregates.avgHeartRate)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Average HRV</div>
              <div className="text-xl font-semibold">
                {formatMs(aggregates.avgHrv)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Sessions</div>
              <div className="text-xl font-semibold">
                {formatCount(aggregates.sessionCount)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Data points</div>
              <div className="text-xl font-semibold">
                {formatCount(aggregates.sampleCount)}
              </div>
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
          <h3 className="text-sm font-semibold mb-3">Heart rate trend</h3>
          {noSamples ? (
            <p className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl text-sm">
              Not enough data in this period yet.
            </p>
          ) : (
            <ReactApexChart
              options={heartRateChartOptions}
              series={heartRateSeries}
              type={chartType}
              height={220}
            />
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3">HRV trend</h3>
          {noSamples ? (
            <p className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl text-sm">
              HRV data not available for this period.
            </p>
          ) : (
            <ReactApexChart
              options={hrvChartOptions}
              series={hrvSeries}
              type={chartType}
              height={220}
            />
          )}
        </section>
      </main>
    </div>
  );
}
