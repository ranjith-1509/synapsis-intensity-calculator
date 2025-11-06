
import React, { useMemo } from "react";
import ReactApexChart from "react-apexcharts";

const RecentItem = ({ time = "10:30am", bpm = 72, title = "Heart Rate" }) => {
  const data = useMemo(
    () => Array.from({ length: 24 }).map((_, i) => 60 + Math.sin(i / 2) * 6 + Math.random() * 3),
    []
  );

  const options = useMemo(
    () => ({
      chart: { type: "area", sparkline: { enabled: true }, toolbar: { show: false } },
      stroke: { curve: "smooth", width: 2, colors: ["#60a5fa"] },
      dataLabels: { enabled: false },
      tooltip: { enabled: false },
      fill: { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 90, 100] } },
    }),
    []
  );

  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span role="img" aria-label="heart">❤️</span>
          <span className="font-medium" style={{ fontSize: 14, color: "#111" }}>{title}</span>
        </div>
        <div className="flex items-center gap-2" style={{ color: "#9ca3af" }}>
          <span className="text-xs">{time}</span>
          <span style={{ fontSize: 16 }}>›</span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div>
            <span className="font-bold" style={{ fontSize: 22, color: "#111" }}>{bpm}</span>
            <span className="ml-1 text-sm" style={{ color: "#6b7280" }}>bpm</span>
          </div>
          <div className="text-xs" style={{ color: "#9ca3af" }}>Resting Rate</div>
        </div>
        <div style={{ width: 110 }}>
          <ReactApexChart options={options} series={[{ data }]} type="area" height={56} />
        </div>
      </div>
    </div>
  );
};

const RecentSection = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold" style={{ margin: 0, fontSize: 16, color: "#111" }}>Recent Scan</h4>
        <button style={{ background: "transparent", border: 0, color: "#3b82f6", fontSize: 12, cursor: "pointer" }}>See all</button>
      </div>

      <div>
        <RecentItem time="10:30am" bpm={72} />
        <RecentItem time="06:30pm" bpm={70} />
      </div>
    </div>
  );
};

export default RecentSection;
