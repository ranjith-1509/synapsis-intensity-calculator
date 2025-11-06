import React from "react";

const MetricCard = ({ icon, title, value, unit }) => {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span className="font-medium" style={{ color: "#111", fontSize: 14 }}>
            {title}
          </span>
        </div>
        <button
          style={{
            background: "transparent",
            border: "none",
            color: "#9ca3af",
            fontSize: 18,
            cursor: "pointer",
            padding: 0,
          }}
        >
          ⋮
        </button>
      </div>
      <div>
        <span className="font-bold" style={{ fontSize: 28, color: "#111" }}>
          {value}
        </span>
        <span className="ml-1" style={{ fontSize: 14, color: "#6b7280" }}>
          {unit}
        </span>
      </div>
    </div>
  );
};

export default MetricCard;
