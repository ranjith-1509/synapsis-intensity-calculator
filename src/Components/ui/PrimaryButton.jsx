import React from "react";

const PrimaryButton = ({
  children,
  onClick,
  className = "",
  style = {},
  disabled = false,
}) => {
  const baseStyle = {
    background: "#1857C1",
    color: "#ffffff",
    border: "1px solid #1C57C8",
    borderRadius: 9999,
    padding: "8px 16px",
    boxShadow: "0 2px 0 rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.15)",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontWeight: 600,
    fontSize: 12,
    lineHeight: "20px",
    letterSpacing: "-0.2px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    transition:
      "transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease",
    ...style,
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={baseStyle}
      disabled={disabled}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "translateY(1px)";
        e.currentTarget.style.boxShadow =
          "0 1px 0 rgba(0,0,0,0.08), inset 0 0 0 rgba(255,255,255,0.15)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          "0 2px 0 rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.15)";
      }}
    >
      {children}
    </button>
  );
};

export default PrimaryButton;
