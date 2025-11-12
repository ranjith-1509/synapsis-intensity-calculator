import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogoutOutlined } from "@ant-design/icons";
import MetricCard from "./dashboard/MetricCard";
import RecentSection from "./dashboard/RecentSection";
import PrimaryButton from "./ui/PrimaryButton";
import StartScanModal from "./ui/StartScanModal";
import { SettingsIcon } from "../images/SettingsIcon";
import WavingHand from "../images/WavingHand.svg";
import HeartPulseIcon from "../images/heartpulse.svg";
import hr from "../images/hr.svg";
import hrvIcon from "../images/hrv.svg";
import sampleWaves from "../images/sampleWaves.svg";

const Dashboard = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [noOfRecords, setNoOfRecords] = useState("");
  const settingsRef = useRef(null);

  const hideStartScanModal = localStorage.getItem("hideStartScanModal");
  const heartRate = localStorage.getItem("heartRate") || "--";
  const hrv = localStorage.getItem("hrv") || "--";
  const Name = localStorage.getItem("name") || "";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleLogout = () => {
    localStorage.removeItem("firebaseToken");
    localStorage.removeItem("authEmail");
    localStorage.removeItem("name");
    navigate("/login", { replace: true });
  };
  const handleNoOfRecords = (noOfRecords) => {
    setNoOfRecords(noOfRecords);
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

        <div
          className="flex items-start justify-between mb-4"
          ref={settingsRef}
        >
          <div>
            <div
              className="text-lg"
              style={{ color: "rgba(255,255,255,0.9)", margin: 0 }}
            >
              <div className="flex items-center gap-2 ml-[5px]">
                Hey {Name} <img src={WavingHand} alt="Waving Hand" />
              </div>
            </div>
            <h2
              className="text-sm font-semibold"
              style={{ color: "#fff", margin: "4px 0 0 0",marginLeft: "5px" }}
            >
              Welcome Back
            </h2>
          </div>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="rounded-full flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                background: "rgba(255,255,255,0.2)",
                border: "none",
                color: "#fff",
                fontSize: 18,
                cursor: "pointer",
              }}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
            >
              <SettingsIcon />
            </button>
            {isMenuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: 44,
                  right: 0,
                  background: "#ffffff",
                  borderRadius: 16,
                  boxShadow: "0 12px 32px rgba(15,23,42,0.18)",
                  padding: "8px",
                  width: 110,
                  zIndex: 20,
                }}
              >
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "transparent",
                    border: "none",
                    fontSize: 14,
                    color: "#334155",
                    cursor: "pointer",
                  }}
                >
                  <span role="img" aria-hidden="true">
                    <LogoutOutlined />
                  </span>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Heart Rate Measuring Card */}
        <div
          className="rounded-3xl p-4"
          style={{
            background: "#fff",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 18 }}>
              <img src={HeartPulseIcon} alt="Heart Pulse" className="w-6 h-6" />
            </span>
            <span
              className="font-semibold"
              style={{ color: "#111", fontSize: 15, width: "100%" }}
            >
              Heart Rate Measuring
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: "#9ca3af" }}>
            {noOfRecords > 0
              ? `${noOfRecords} records`
              : noOfRecords === 0
              ? "No records"
              : "Loading..."}
          </p>

          {/* Preview Chart */}
            <img
              src={sampleWaves}
              alt="Sample Waves"
              style={{ width: "307px" ,float: "right"}}
            />

          <PrimaryButton onClick={onStartMeasuring}>
            Start Measuring
          </PrimaryButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-8 mt-10">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-3 -mt-6 mb-4 relative z-10">
          <MetricCard
            icon={
              <img
                src={hr}
                alt="Heart Pulse"
                className="w-6 h-6"
                style={{ width: "54px", height: "51px" }}
              />
            }
            title="HR"
            value={heartRate}
            unit="bpm"
          />
          <MetricCard
            icon={
              <img
                src={hrvIcon}
                alt="Heart Pulse"
                className="w-6 h-6"
                style={{ width: "54px", height: "51px" }}
              />
            }
            title="HRV"
            value={hrv}
            unit="ms"
          />
        </div>

        {/* Recent Scan */}
        <div className="mb-5">
          <RecentSection handleNoOfRecords={handleNoOfRecords} />
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
