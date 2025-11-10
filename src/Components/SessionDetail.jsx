/**
 * README (wiring):
 * - Render this page when a RecentItem is tapped.
 * - Example using react-router:
 *     import { useNavigate } from "react-router-dom";
 *     const navigate = useNavigate();
 *     <RecentItem time="10:30am" bpm={72} onClick={() => navigate("/session-detail", { state: { time:"10:30 AM", bpm:72, hrv:34, date:"Nov 10, 2025" } })} />
 * - Add a route:
 *     <Route path="/session-detail" element={<SessionDetail />} />
 * - If you prefer a modal route, push the route as above and render this page full-screen.
 */
import React, { useMemo, useState } from "react";
import { Button } from "antd";
import ReactApexChart from "react-apexcharts";
import { useLocation, useNavigate } from "react-router-dom";
import PrimaryButton from "./ui/PrimaryButton";

const PRIMARY = "#1857C1";
const BG = "#f8fafc";
const SURFACE = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT = "#111827";
const MUTED = "#6b7280";

const MOBILE_CONTENT_MAX_WIDTH = 440; // keeps layout tidy on big screens

const SessionDetail = () => {
  const renderOptionButtons = (options, currentValue, onChange, ariaLabel) => (
    <div className="flex gap-2" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option === currentValue;
        return (
          <PrimaryButton
            key={option}
            onClick={() => onChange(option)}
            className="sd-option-btn"
            style={{
              background: active ? PRIMARY : "#ffffff",
              color: active ? "#ffffff" : PRIMARY,
              border: active ? `1px solid ${PRIMARY}` : `1px solid ${BORDER}`,
              boxShadow: active
                ? "0 4px 12px rgba(24,87,193,0.25)"
                : "0 2px 6px rgba(15,23,42,0.08)",
              padding: "12px 18px",
              minWidth: 96,
              width: "10%",
              height: "20%",
             
            }}
            aria-pressed={active}
          >
            {option}
          </PrimaryButton>
        );
      })}
    </div>
  );

  const navigate = useNavigate();
  const { state } = useLocation();
  // Mock if state not provided
  const meta = {
    bpm: state?.bpm ?? 72,
    hrv: state?.hrv ?? 34,
    time: state?.time ?? "10:30 AM",
    date: state?.date ?? "Nov 10, 2025",
    rangeLabel: state?.rangeLabel ?? "Normal",
  };

  const [period, setPeriod] = useState("Day");
  const [view, setView] = useState("Summary");

  // Dummy time series (compact and realistic)
  const chartSeries = useMemo(
    () => [
      {
        name: "Heart Rate",
        data: [
          [0, 72],
          [1, 74],
          [2, 71],
          [3, 76],
          [4, 78],
          [5, 73],
          [6, 80],
          [7, 69],
          [8, 75],
          [9, 72],
          [10, 79],
        ],
      },
    ],
    []
  );



  const baseChartOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
      animations: { enabled: true },
      sparkline: { enabled: false },
    },
    grid: {
      strokeDashArray: 4,
      borderColor: BORDER,
    },
    stroke: {
      curve: "smooth",
      width: 2,
      colors: [PRIMARY],
    },
    dataLabels: { enabled: false },
    xaxis: {
      type: "numeric",
      tickAmount: 5,
      labels: {
        style: { colors: TEXT, fontSize: "11px" },
        formatter: (val) => `${val}m`,
      },
      axisBorder: { color: BORDER },
      axisTicks: { color: BORDER },
    },
    yaxis: {
      labels: { style: { colors: TEXT, fontSize: "11px" } },
    },
    tooltip: {
      theme: "light",
    },
  };

  const hrChartOptions = useMemo(
    () => ({
      ...baseChartOptions,
      yaxis: {
        ...baseChartOptions.yaxis,
        title: { text: "BPM" },
        min: 60,
        max: 90,
      },
    }),
    []
  );

  const hrvChartOptions = useMemo(
    () => ({
      ...baseChartOptions,
      yaxis: {
        ...baseChartOptions.yaxis,
        title: { text: "HRV (ms)" },
        min: 20,
        max: 45,
      },
    }),
    []
  );

  return (
    <div className="sd-root" role="main" aria-label="Session details page">
      {/* Header */}
      <header className="sd-header" style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
        <div className="sd-header-inner">
          <Button
            aria-label="Go back"
            tabIndex={0}
            onClick={() => navigate(-1)}
            className="sd-back-btn"
            type="text"
          >
            ‹
          </Button>
          <div className="sd-header-title">
            <div className="sd-title">Session details</div>
            <div className="sd-subtitle" aria-live="polite">
              {meta.date} • {meta.time}
            </div>
          </div>
          <div className="sd-header-spacer" />
        </div>
      </header>

      <div className="sd-container">
        {/* Period buttons */}
        <div className="sd-row justify-center flex">
          {renderOptionButtons(["Month", "Day", "Year"], period, setPeriod, "Period selector")}
        </div>

    
      {/* Column B: Graphs */}
   
            <section className="sd-graphs" aria-label="Charts">
              <div className="sd-chart-card">
                <div className="sd-chart-title">Heart Rate over time</div>
                <ReactApexChart
                  options={hrChartOptions}
                  series={chartSeries}
                  type="line"
                  height={180}
                />
              </div>
      
            </section>
        
        <div className="sd-grid">
          {/* Column A: Summary card */}

            <section className="sd-card" aria-label="Summary">
              <div className="sd-card-header">
                <span className="sd-range-dot" aria-hidden />
                <span className="sd-range-text">Your Heart range is</span>
                <span className="sd-range-badge" aria-label={`Status ${meta.rangeLabel}`}>{meta.rangeLabel}</span>
              </div>

              {/* Range slider visual */}
              <div className="sd-range-bar" role="img" aria-label="Heart rate range indicator">
                <div className="sd-range-bar-left" />
                <div className="sd-range-indicator" />
                <div className="sd-range-bar-right" />
              </div>

              {/* Legend */}
              <div className="sd-legend">
                <div className="sd-legend-item">
                  <span className="dot blue" aria-hidden />
                  <span className="label">Min BPM</span>
                  <span className="value">{"<60BPM"}</span>
                </div>
                <div className="sd-legend-item">
                  <span className="dot green" aria-hidden />
                  <span className="label">Max BPM</span>
                  <span className="value">{"60-100BPM"}</span>
                </div>
                <div className="sd-legend-item">
                  <span className="dot red" aria-hidden />
                  <span className="label">Avg</span>
                  <span className="value">{">100BPM"}</span>
                </div>
              </div>

              <div className="sd-metrics">
                <div className="metric">
                  <div className="metric-label">BPM</div>
                  <div className="metric-value">{meta.bpm} <span className="metric-unit">bpm</span></div>
                </div>
                <div className="metric">
                  <div className="metric-label">HRV</div>
                  <div className="metric-value">{meta.hrv} <span className="metric-unit">ms</span></div>
                </div>
                <div className="metric">
                  <div className="metric-label muted">Last</div>
                  <div className="metric-value small">{meta.time}</div>
                </div>
              </div>
            </section>
        

    
        </div>
      </div>

      <style>{`
        .sd-root {
          min-height: 100vh;
          background: ${BG};
          display: flex;
          flex-direction: column;
        }
        .sd-header {
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .sd-header-inner {
          height: 64px;
          padding: env(safe-area-inset-top) 16px 0 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: ${MOBILE_CONTENT_MAX_WIDTH}px;
          margin: 0 auto;
        }
        .sd-back-btn {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          background: #f3f4f6;
          color: ${MUTED};
          font-size: 18px;
        }
        .sd-header-title {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          text-align: center;
        }
        .sd-title {
          font-weight: 600;
          font-size: 18px;
          color: ${TEXT};
          line-height: 22px;
        }
        .sd-subtitle {
          margin-top: 2px;
          font-size: 12px;
          color: ${MUTED};
        }
        .sd-header-spacer {
          width: 44px;
          height: 44px;
        }
        .sd-container {
          max-width: ${MOBILE_CONTENT_MAX_WIDTH}px;
          width: 100%;
          margin: 0 auto;
          padding: 16px;
          flex: 1;
        }
        .sd-row {
          margin-bottom: 12px;
        }
        .sd-button-group {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
          gap: 10px;
        }
        .sd-option-btn {
          width: 100%;
        }

        .sd-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .sd-card {
          background: ${SURFACE};
          border: 1px solid ${BORDER};
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
        }
        .sd-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .sd-range-dot {
          width: 8px;
          height: 8px;
          background: ${PRIMARY};
          border-radius: 999px;
        }
        .sd-range-text {
          color: ${TEXT};
          font-weight: 600;
          font-size: 14px;
        }
        .sd-range-badge {
          margin-left: auto;
          background: #e8f5e9;
          color: #16a34a;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
        }
        .sd-range-bar {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 8px;
          margin: 10px 0 14px 0;
        }
        .sd-range-bar-left,
        .sd-range-bar-right {
          height: 6px;
          border-radius: 999px;
        }
        .sd-range-bar-left {
          background: linear-gradient(90deg, #2dd4bf, #22c55e);
        }
        .sd-range-bar-right {
          background: linear-gradient(90deg, #f59e0b, #ef4444);
        }
        .sd-range-indicator {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: #10b981;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.2);
        }
        .sd-legend {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          margin-bottom: 8px;
        }
        .sd-legend-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 13px;
        }
        .sd-legend-item .label { color: ${TEXT}; }
        .sd-legend-item .value { color: ${MUTED}; }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          margin-right: 8px;
        }
        .dot.blue { background: #3b82f6; }
        .dot.green { background: #22c55e; }
        .dot.red { background: #ef4444; }

        .sd-metrics {
          margin-top: 8px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }
        .metric {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }
        .metric-label {
          font-size: 12px;
          color: ${TEXT};
        }
        .metric-label.muted { color: ${MUTED}; }
        .metric-value {
          font-size: 18px;
          font-weight: 700;
          color: ${TEXT};
        }
        .metric-value.small { font-size: 16px; }
        .metric-unit { font-size: 12px; color: ${MUTED}; font-weight: 500; }

        .sd-graphs {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .sd-chart-card {
          background: ${SURFACE};
          border: 1px solid ${BORDER};
          border-radius: 16px;
          padding: 12px;
        }
        .sd-chart-title {
          font-weight: 600;
          font-size: 14px;
          color: ${TEXT};
          margin-bottom: 6px;
        }

        /* Tablet/desktop */
        @media (min-width: 768px) {
          .sd-grid {
            grid-template-columns: 1fr 1.4fr;
            align-items: start;
          }
          .sd-graphs .sd-chart-card {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default SessionDetail;


