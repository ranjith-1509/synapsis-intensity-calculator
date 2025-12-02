/**
 * Saccade Detection Utility
 * 
 * Detects rapid eye movements (saccades) based on gaze position changes.
 * A saccade is defined as a rapid movement exceeding minimum distance 
 * within a maximum time threshold.
 */

// Configuration thresholds
const MIN_SACCADE_DISTANCE = 10; // pixels - minimum distance to be considered a saccade
const MAX_SACCADE_TIME = 100; // milliseconds - maximum time for a saccade
const MIN_SACCADE_TIME = 10; // milliseconds - minimum time to avoid noise

/**
 * Calculate Euclidean distance between two points
 * @param {Object} p1 - First point {x, y}
 * @param {Object} p2 - Second point {x, y}
 * @returns {number} Distance in pixels
 */
function calculateDistance(p1, p2) {
  if (!p1 || !p2 || p1.x == null || p1.y == null || p2.x == null || p2.y == null) {
    return 0;
  }
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Detect if a saccade occurred between two gaze points
 * @param {Object} prevGaze - Previous gaze point {x, y, timestamp}
 * @param {Object} currentGaze - Current gaze point {x, y, timestamp}
 * @returns {Object|null} Saccade event object or null if no saccade detected
 */
export function detectSaccade(prevGaze, currentGaze) {
  if (!prevGaze || !currentGaze || !prevGaze.timestamp || !currentGaze.timestamp) {
    return null;
  }

  const distance = calculateDistance(prevGaze, currentGaze);
  const timeDelta = currentGaze.timestamp - prevGaze.timestamp;
console.log("timeDelta", timeDelta);
console.log("distance", distance);
  // Check if movement meets saccade criteria
  if (
    distance >= MIN_SACCADE_DISTANCE &&
    timeDelta >= MIN_SACCADE_TIME &&
    timeDelta <= MAX_SACCADE_TIME
  ) {
    // Calculate velocity (pixels per second)
    const velocity = timeDelta > 0 ? (distance / timeDelta) * 1000 : 0;

    return {
      distance: Math.round(distance),
      velocity: Math.round(velocity),
      duration: timeDelta,
      timestamp: currentGaze.timestamp,
      startPoint: { x: prevGaze.x, y: prevGaze.y },
      endPoint: { x: currentGaze.x, y: currentGaze.y },
    };
  }

  return null;
}

/**
 * Calculate saccade frequency (saccades per second)
 * @param {Array} saccades - Array of saccade events
 * @param {number} timeWindowMs - Time window in milliseconds (default: 1000ms for per-second)
 * @returns {number} Frequency (saccades per time window)
 */
export function calculateSaccadeFrequency(saccades, timeWindowMs = 1000) {
  if (!saccades || saccades.length === 0) return 0;

  const now = performance.now();
  const windowStart = now - timeWindowMs;
  
  // Count saccades within the time window
  const recentSaccades = saccades.filter(
    (saccade) => saccade.timestamp >= windowStart
  );

  return recentSaccades.length;
}

/**
 * Calculate average saccade velocity
 * @param {Array} saccades - Array of saccade events
 * @returns {number} Average velocity in pixels per second
 */
export function calculateAverageVelocity(saccades) {
  if (!saccades || saccades.length === 0) return 0;

  const totalVelocity = saccades.reduce((sum, saccade) => sum + saccade.velocity, 0);
  return Math.round(totalVelocity / saccades.length);
}

/**
 * Get recent saccades within a time window
 * @param {Array} saccades - Array of saccade events
 * @param {number} timeWindowMs - Time window in milliseconds
 * @returns {Array} Recent saccades
 */
export function getRecentSaccades(saccades, timeWindowMs = 5000) {
  if (!saccades || saccades.length === 0) return [];

  const now = performance.now();
  const windowStart = now - timeWindowMs;

  return saccades
    .filter((saccade) => saccade.timestamp >= windowStart)
    .slice(-10); // Return last 10 saccades
}

