import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MetricCard from "./dashboard/MetricCard";
import RecentSection from "./dashboard/RecentSection";
import ReactApexChart from "react-apexcharts";
import PrimaryButton from "./ui/PrimaryButton";
import StartScanModal from "./ui/StartScanModal";

const Dashboard = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Small preview chart data for hero card
  const previewData = Array.from({ length: 20 }).map(
    (_, i) => 65 + Math.sin(i / 3) * 10 + Math.random() * 5
  );
  const hideStartScanModal = localStorage.getItem("hideStartScanModal");
  const heartRate = localStorage.getItem("heartRate") || "--";
  const hrv = localStorage.getItem("hrv") || "--";


  const previewOptions = {
    chart: {
      type: "area",
      sparkline: { enabled: true },
      toolbar: { show: false },
    },
    stroke: { curve: "smooth", width: 2, colors: ["#93c5fd"] },
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0.1 } },
    tooltip: { enabled: false },
  };


  const onStartMeasuring = () => {
    if (hideStartScanModal) {
      navigate("/heart-rate");
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#f8fafc" }}>
      {/* Hero Section */}
      <div
        className="relative"
        style={{
          background: "#1857C1",
          paddingTop: 40,
          paddingBottom: 20,
          paddingLeft: 16,
          paddingRight: 16,
          borderRadius: "0 0 33px 33px",
        }}
      >
        {/* Header */}

        <div className="flex items-start justify-between mb-4">
          <div>
            <p
              className="text-lg"
              style={{ color: "rgba(255,255,255,0.9)", margin: 0 }}
            >
              Hey Preetam 👋
            </p>
            <h2
              className="text-sm font-semibold"
              style={{ color: "#fff", margin: "4px 0 0 0" }}
            >
              Welcome Back
            </h2>
          </div>
          <button
            className="rounded-full flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              fontSize: 18,
            }}
          >
            ⚙️
          </button>
        </div>

        {/* Heart Rate Measuring Card */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: "#fff",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 18 }}>❤️</span>
            <span
              className="font-semibold"
              style={{ color: "#111", fontSize: 15, width: "100%" }}
            >
              Heart Rate Measuring
            </span>
          </div>
          <p
            className="text-xs mb-3"
            style={{ color: "#9ca3af", margin: "4px 0 12px 0" }}
          >
            56 records
          </p>

          {/* Preview Chart */}
          <div style={{ height: 60, marginBottom: 12 }}>
            <ReactApexChart
              options={previewOptions}
              series={[{ data: previewData }]}
              type="area"
              height={60}
            />
          </div>

          <PrimaryButton onClick={onStartMeasuring}>
            Start Measuring
          </PrimaryButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-8 mt-10">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-3 -mt-6 mb-4 relative z-10">
          <MetricCard icon="❤️" title="HR" value={heartRate} unit="bpm" />
          <MetricCard icon="💠" title="HRV" value={hrv} unit="ms" />
        </div>

        {/* Recent Scan */}
        <div className="mb-5">
          <RecentSection />
        </div>
      </div>

      {/* Floating Camera - Draggable */}
      {/* <CameraBox /> */}

      {/* Start Scan Modal */}
      <StartScanModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStartScan={() => {
          setIsModalOpen(false);
          navigate("/heart-rate");
        }}
      />
    </div>
  );
};

export default Dashboard;
