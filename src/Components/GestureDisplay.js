import React from 'react';

/**
 * GestureDisplay Component
 * 
 * Displays the current gesture and running counts for rock, paper, scissors
 * in a clean, responsive layout that integrates with the existing UI theme.
 */
const GestureDisplay = ({ 
  currentGesture, 
  gestureCounts, 
  isInitialized, 
  resetCounts 
}) => {
  /**
   * Get emoji representation for gesture
   */
  console.log(gestureCounts)
  const getGestureEmoji = (gesture) => {
    switch (gesture) {
      case 'rock': return '✊';
      case 'paper': return '✋';
      case 'scissors': return '✌️';
      default: return '👋';
    }
  };

  /**
   * Get color for gesture type
   */
  const getGestureColor = (gesture) => {
    switch (gesture) {
      case 'rock': return '#ef4444'; // Red
      case 'paper': return '#3b82f6'; // Blue
      case 'scissors': return '#10b981'; // Green
      default: return '#6b7280'; // Gray
    }
  };

  return (
    <div style={{
      background: "rgba(26, 26, 46, 0.9)",
      borderRadius: "16px",
      padding: "24px",
      border: "1px solid #2d3748",
      backdropFilter: "blur(10px)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      marginBottom: "24px"
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "20px"
      }}>
        <h3 style={{
          margin: 0,
          color: "#e0e0e0",
          fontSize: "1.3rem",
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          🎯 Gesture Recognition
        </h3>
        
        <button
          onClick={resetCounts}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid #2d3748",
            background: "rgba(239, 68, 68, 0.1)",
            color: "#ef4444",
            fontSize: "0.8rem",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onMouseOver={(e) => {
            e.target.style.background = "rgba(239, 68, 68, 0.2)";
          }}
          onMouseOut={(e) => {
            e.target.style.background = "rgba(239, 68, 68, 0.1)";
          }}
        >
          Reset Counts
        </button>
      </div>

      {/* Current Gesture Display */}
      <div style={{
        textAlign: "center",
        marginBottom: "24px",
        padding: "20px",
        background: "rgba(45, 55, 72, 0.3)",
        borderRadius: "12px",
        border: `2px solid ${getGestureColor(currentGesture)}`
      }}>
        <div style={{
          fontSize: "3rem",
          marginBottom: "8px"
        }}>
          {getGestureEmoji(currentGesture)}
        </div>
        <div style={{
          color: "#e0e0e0",
          fontSize: "1.1rem",
          fontWeight: "500",
          textTransform: "capitalize"
        }}>
          {currentGesture === 'none' ? 'No Gesture Detected' : `${currentGesture} Detected`}
        </div>
        {!isInitialized && (
          <div style={{
            color: "#f59e0b",
            fontSize: "0.9rem",
            marginTop: "8px"
          }}>
            Initializing gesture recognition...
          </div>
        )}
      </div>

      {/* Gesture Counts */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "16px"
      }}>
        {['rock', 'paper', 'scissors'].map((gesture) => (
          <div
            key={gesture}
            style={{
              background: "rgba(45, 55, 72, 0.4)",
              borderRadius: "12px",
              padding: "16px",
              textAlign: "center",
              border: `1px solid ${getGestureColor(gesture)}30`,
              transition: "all 0.3s ease",
              transform: currentGesture === gesture ? "scale(1.05)" : "scale(1)",
              boxShadow: currentGesture === gesture ? `0 0 20px ${getGestureColor(gesture)}40` : "none"
            }}
          >
            <div style={{
              fontSize: "2rem",
              marginBottom: "8px"
            }}>
              {getGestureEmoji(gesture)}
            </div>
            <div style={{
              color: "#e0e0e0",
              fontSize: "1rem",
              fontWeight: "600",
              textTransform: "capitalize",
              marginBottom: "4px"
            }}>
              {gesture}
            </div>
            <div style={{
              color: getGestureColor(gesture),
              fontSize: "1.5rem",
              fontWeight: "700"
            }}>
              {gestureCounts[gesture] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Status Indicator */}
      <div style={{
        marginTop: "16px",
        textAlign: "center",
        fontSize: "0.85rem",
        color: isInitialized ? "#10b981" : "#f59e0b"
      }}>
        {isInitialized ? "✅ Gesture recognition active" : "⏳ Loading gesture model..."}
      </div>
    </div>
  );
};

export default GestureDisplay;
