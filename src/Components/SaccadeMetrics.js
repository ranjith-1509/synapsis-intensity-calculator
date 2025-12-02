import React from 'react';

/**
 * SaccadeMetrics Component
 * 
 * Displays real-time saccade metrics including count, frequency, and velocity.
 * Clean, easy-to-understand UI matching the existing design.
 */
const SaccadeMetrics = ({ 
  saccadeCount = 0,
  saccadeFrequency = 0,
  averageVelocity = 0,
  recentSaccades = [],
  isTracking = false
}) => {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        padding: "clamp(12px, 2vw, 16px)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        marginTop: 12,
      }}
    >
      <h3
        style={{
          margin: "0 0 16px 0",
          fontSize: "clamp(14px, 2.5vw, 16px)",
          fontWeight: 600,
          color: "#2d3748",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>👁️</span>
        <span>Saccade Metrics</span>
      </h3>

      {/* Main Metrics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* Saccade Count */}
        <div
          style={{
            background: "#f7fafc",
            borderRadius: 8,
            padding: "12px",
            textAlign: "center",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontSize: "clamp(11px, 2vw, 12px)",
              color: "#718096",
              fontWeight: 500,
              marginBottom: 4,
            }}
          >
            Total Count
          </div>
          <div
            style={{
              fontSize: "clamp(20px, 3vw, 24px)",
              fontWeight: 700,
              color: "#3182ce",
            }}
          >
            {saccadeCount}
          </div>
        </div>

        {/* Saccade Frequency */}
        <div
          style={{
            background: "#f7fafc",
            borderRadius: 8,
            padding: "12px",
            textAlign: "center",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontSize: "clamp(11px, 2vw, 12px)",
              color: "#718096",
              fontWeight: 500,
              marginBottom: 4,
            }}
          >
            Frequency
          </div>
          <div
            style={{
              fontSize: "clamp(20px, 3vw, 24px)",
              fontWeight: 700,
              color: "#48bb78",
            }}
          >
            {saccadeFrequency.toFixed(1)}
          </div>
          <div
            style={{
              fontSize: "clamp(9px, 1.5vw, 10px)",
              color: "#a0aec0",
              marginTop: 2,
            }}
          >
            /sec
          </div>
        </div>

        {/* Average Velocity */}
        <div
          style={{
            background: "#f7fafc",
            borderRadius: 8,
            padding: "12px",
            textAlign: "center",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontSize: "clamp(11px, 2vw, 12px)",
              color: "#718096",
              fontWeight: 500,
              marginBottom: 4,
            }}
          >
            Avg Velocity
          </div>
          <div
            style={{
              fontSize: "clamp(20px, 3vw, 24px)",
              fontWeight: 700,
              color: "#ed8936",
            }}
          >
            {averageVelocity}
          </div>
          <div
            style={{
              fontSize: "clamp(9px, 1.5vw, 10px)",
              color: "#a0aec0",
              marginTop: 2,
            }}
          >
            px/s
          </div>
        </div>
      </div>

      {/* Recent Saccades List */}
      {isTracking && recentSaccades.length > 0 && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontSize: "clamp(12px, 2vw, 13px)",
              fontWeight: 600,
              color: "#4a5568",
              marginBottom: 8,
            }}
          >
            Recent Saccades
          </div>
          <div
            style={{
              maxHeight: "120px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {recentSaccades.slice(-5).reverse().map((saccade, index) => (
              <div
                key={index}
                style={{
                  background: "#f7fafc",
                  borderRadius: 6,
                  padding: "8px 10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "clamp(11px, 2vw, 12px)",
                }}
              >
                <div style={{ color: "#4a5568" }}>
                  <span style={{ fontWeight: 600 }}>{saccade.velocity}</span>
                  <span style={{ color: "#a0aec0", marginLeft: 4 }}>px/s</span>
                </div>
                <div style={{ color: "#718096", fontSize: "clamp(10px, 1.5vw, 11px)" }}>
                  {saccade.distance}px
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Indicator */}
      {!isTracking && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            background: "#fffbf0",
            borderRadius: 6,
            textAlign: "center",
            fontSize: "clamp(11px, 2vw, 12px)",
            color: "#744210",
          }}
        >
          Start tracking to see saccade metrics
        </div>
      )}
    </div>
  );
};

export default SaccadeMetrics;

