import React, { useCallback, useEffect, useRef, useState } from "react";
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
  const [heartRate, setHeartRate] = useState(localStorage.getItem("heartRate") || "--");
  const [hrv, setHrv] = useState(localStorage.getItem("hrv") || "--");
  const settingsRef = useRef(null);

  const hideStartScanModal = localStorage.getItem("hideStartScanModal");
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

  // Sync with localStorage changes (e.g., when returning from heart rate measuring)
  useEffect(() => {
    const handleStorageChange = () => {
      const storedHeartRate = localStorage.getItem("heartRate") || "--";
      const storedHrv = localStorage.getItem("hrv") || "--";
      setHeartRate(storedHeartRate);
      setHrv(storedHrv);
    };

    // Check on mount and when window gains focus
    handleStorageChange();
    window.addEventListener("focus", handleStorageChange);
    
    return () => {
      window.removeEventListener("focus", handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("firebaseToken");
    localStorage.removeItem("authEmail");
    localStorage.removeItem("name");
    navigate("/login", { replace: true });
  };
  const handleNoOfRecords = useCallback((noOfRecords) => {
    setNoOfRecords(noOfRecords);
  }, []);


  const onStartMeasuring = () => {
    if (hideStartScanModal) {
      navigate("/heart-rate");
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Hero Section */}
      <div className="relative mx-auto max-w-xl rounded-b-[32px] bg-[#1857C1] px-4 pt-10 pb-6 text-white sm:px-6 md:max-w-4xl  md:pb-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between md:items-center" ref={settingsRef}>
          <div className="space-y-1">
            <div className="text-base text-white/90 md:text-lg">
              <div className="ml-1 flex items-center gap-2">
                Hey {Name} <img src={WavingHand} alt="Waving Hand" className="h-5 w-5 md:h-6 md:w-6" />
              </div>
            </div>
            <h2 className="ml-1 font-secondary text-sm font-semibold text-white/95 md:text-base">
              Welcome Back
            </h2>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
            >
              <SettingsIcon />
            </button>
            {isMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-3 w-32 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-slate-900/5 z-20"
              >
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                >
                  <span aria-hidden="true">
                    <LogoutOutlined />
                  </span>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Heart Rate Measuring Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white px-5 py-6 shadow-lg shadow-slate-900/10 md:flex md:items-center md:justify-between md:gap-6 md:px-6">
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-center gap-3">
              <img src={HeartPulseIcon} alt="Heart Pulse" className="h-8 w-8 md:h-9 md:w-9" />
              <span className="font-secondary text-base font-semibold text-slate-900 md:text-lg">
                Heart Rate Measuring
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {noOfRecords > 0
                ? `${noOfRecords} records`
                : noOfRecords === 0
                ? "No records"
                : "Loading..."}
            </p>
            <img
  src={sampleWaves}
  alt="Sample Waves"
  className="
    w-42            /* default (mobile) */
    sm:w-40         /* small tablets */
    md:w-56         /* tablets */
    lg:w-72         /* laptops */
    xl:w-80         /* large desktops */
    self-end
    md:mt-0
  "
/>

            <PrimaryButton
              onClick={onStartMeasuring}
              className="w-full md:w-auto md:self-start md:px-6"
            >
              Start Measuring
            </PrimaryButton>
          </div>
      
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto mt-10 max-w-xl px-4 pb-12 sm:px-6 md:max-w-4xl">
        <div className="relative z-10 mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <MetricCard
            icon={<img src={hr} alt="Heart Pulse" className="h-12 w-12 sm:h-14 sm:w-14" />}
            title="HR"
            value={heartRate}
            unit="bpm"
            onReset={() => {
              setHeartRate("--");
              localStorage.setItem("heartRate", "--");
            }}
          />
          <MetricCard
            icon={<img src={hrvIcon} alt="Heart Pulse" className="h-12 w-12 sm:h-14 sm:w-14" />}
            title="HRV"
            value={hrv}
            unit="ms"
            onReset={() => {
              setHrv("--");
              localStorage.setItem("hrv", "--");
            }}
          />
          <div className="col-span-2 hidden md:block" />
        </div>

        <div className="mb-6">
          <RecentSection handleNoOfRecords={handleNoOfRecords} />
        </div>
      </div>

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
