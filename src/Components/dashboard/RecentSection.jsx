
import React, { useMemo } from "react";
import ReactApexChart from "react-apexcharts";

const RecentItem = ({ time = "10:30am", bpm = 72 }) => {
  const data = useMemo(() => Array.from({ length: 20 }).map((_, i) => 60 + Math.sin(i / 2) * 6 + Math.random() * 3), []);
  
  const options = useMemo(() => ({
    chart: { type: "line", sparkline: { enabled: true }, toolbar: { show: false } },
    stroke: { curve: "smooth", width: 2, colors: ["#60a5fa"] },
    tooltip: { enabled: false },
  }), []);

  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 18 }}>❤️</span>
          <span className="font-medium" style={{ fontSize: 14, color: "#111" }}>Heart Rate</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "#9ca3af" }}>{time}</span>
          <span style={{ color: "#9ca3af", fontSize: 16 }}>›</span>
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <div>
            <span className="font-bold" style={{ fontSize: 24, color: "#111" }}>{bpm}</span>
            <span className="ml-1 text-sm" style={{ color: "#6b7280" }}>bpm</span>
          </div>
          <p className="text-xs" style={{ color: "#9ca3af", margin: "2px 0 0 0" }}>Resting Rate</p>
        </div>
        
        <div style={{ width: 100, height: 40 }}>
          <ReactApexChart options={options} series={[{ data }]} type="line" height={40} />
        </div>
      </div>
    </div>
  );
};

const RecentSection = () => {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold" style={{ fontSize: 16, margin: 0, color: "#111" }}>Recent Scan</h4>
        <button className="text-sm font-medium" style={{ color: "#3b82f6", background: "transparent", border: "none", cursor: "pointer" }}>
          See all
        </button>
      </div>
      <div>
        <RecentItem time="10:30am" bpm={72} />
        <RecentItem time="06:30pm" bpm={70} />
      </div>
    </div>
  );
};

export default RecentSection;
