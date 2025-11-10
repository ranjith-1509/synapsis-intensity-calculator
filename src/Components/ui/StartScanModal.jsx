import React, { useState } from "react";
import { Modal } from "antd";
import PrimaryButton from "./PrimaryButton";
import GuideImage from "../../images/GuidIllustation.png";

const StartScanModal = ({ open, onClose, onStartScan }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleStart = () => {
    if (dontShowAgain) {
      localStorage.setItem("hideStartScanModal", "true");
    }
    onStartScan();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closeIcon={
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6b7280",
            fontSize: 18,
            cursor: "pointer",
            border: "none",
          }}
        >
          ×
        </div>
      }
      styles={{
        content: {
          padding: 0,
          borderRadius: 16,
          overflow: "hidden",
        },
        body: {
          padding: 24,
        },
      }}
      width={340}
      centered
    >
      <div style={{ textAlign: "center" }}>
        {/* Illustration */}
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 200,
          }}
        >
          <img
            src={GuideImage}
            alt="Guide"
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {/* Text Content */}
        <h3
          style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            fontSize: 18,
            lineHeight: "24px",
            color: "#111827",
            margin: "0 0 8px 0",
          }}
        >
          Place your fingertips over the camera lens.
        </h3>
        <p
          style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 400,
            fontSize: 14,
            lineHeight: "20px",
            color: "#6b7280",
            margin: "0 0 24px 0",
          }}
        >
          Hold your hand steady and apply light pressure with your finger.
        </p>

        {/* ✅ Checkbox */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          <span style={{ fontSize: 14, color: "#374151" }}>
            Don’t show again
          </span>
        </label>

        {/* Start Scan Button */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <PrimaryButton onClick={handleStart} style={{ minWidth: 200 }}>
            Start Scan
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
};

export default StartScanModal;
