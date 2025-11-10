/**
 * Based on: Fukunishi et al. "Video Based Measurement of Heart Rate and Heart Rate Variability 
 * Spectrogram from Estimated Hemoglobin Information" (CVPR 2018)
 * 
 * Algorithm steps:
 * 1. Extract hemoglobin/intensity component from each frame (already done in Opencamera.js)
 * 2. Form the wave of hemoglobin component (time series)
 * 3. Apply detrending to eliminate temporal variations of moving average
 * 4. Apply band-pass filter (0.75-3.0 Hz = 45-180 BPM)
 * 5. Detect local peaks of BVP waveform
 * 6. Calculate RR intervals (time between consecutive peaks)
 * 7. Calculate HR and HRV metrics
 */

/**
 * Detrending: Remove slow-moving baseline variations using moving average subtraction
 * Based on detrending technique [25] mentioned in the paper
 */
const detrend = (data, windowSize = Math.floor(data.length * 0.1)) => {
  if (data.length < windowSize * 2) return data;
  
  const detrended = [];
  const halfWindow = Math.floor(windowSize / 2);
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(data.length, i + halfWindow);
    
    // Calculate local mean (moving average)
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += data[j];
    }
    const localMean = sum / (end - start);
    
    // Subtract local mean to detrend
    detrended.push(data[i] - localMean);
  }
  
  return detrended;
};

/**
 * Band-pass filter using Butterworth approximation
 * Pass band: 0.75 Hz to 3.0 Hz (45-180 BPM)
 * This filters out noise outside the heart rate range
 */
const bandPassFilter = (data, sampleRate, lowCut = 0.75, highCut = 3.0) => {
  // Simple moving average band-pass approximation
  // For more accuracy, would need proper IIR/FIR filter implementation
  // Using high-pass + low-pass combination
  

  
  // Simple boxcar (moving average) filter for low frequencies
  // This is an approximation - proper implementation would use IIR/FIR filters
  const filtered = [...data];
  
  // High-pass component: subtract low-frequency trend
  const highPassWindow = Math.ceil(sampleRate / lowCut);
  const highPassed = detrend(filtered, highPassWindow);
  
  // Low-pass component: smooth to remove high-frequency noise
  const lowPassWindow = Math.ceil(sampleRate / (highCut * 2));
  const smoothed = [];
  for (let i = 0; i < highPassed.length; i++) {
    const start = Math.max(0, i - Math.floor(lowPassWindow / 2));
    const end = Math.min(highPassed.length, i + Math.ceil(lowPassWindow / 2));
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += highPassed[j];
    }
    smoothed.push(sum / (end - start));
  }
  
  return smoothed;
};

/**
 * Detect peaks in BVP waveform
 * Finds local maxima that are above an adaptive threshold
 */
const detectPeaks = (data, minDistance = null, sampleRate = 30) => {
  if (!minDistance) {
    // Minimum distance based on max heart rate (180 BPM = 0.33s per beat)
    // At 30 fps: 0.33s * 30 fps ≈ 10 frames minimum between peaks
    minDistance = Math.floor(sampleRate / 3); // ~10 frames for 30fps, prevents double detection
  }
  
  const peaks = [];
  
  // Calculate adaptive threshold based on signal statistics
  const sorted = [...data].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const q75 = sorted[Math.floor(sorted.length * 0.75)];
  const threshold = median + (q75 - median) * 0.5;
  
  // Find local maxima above threshold
  for (let i = 1; i < data.length - 1; i++) {
    const isLocalMax = data[i] > data[i - 1] && data[i] > data[i + 1];
    const aboveThreshold = data[i] > threshold;
    
    if (isLocalMax && aboveThreshold) {
      // Check minimum distance from previous peak
      if (peaks.length === 0 || (i - peaks[peaks.length - 1]) >= minDistance) {
        peaks.push(i);
      }
    }
  }
  
  return peaks;
};

/**
 * Remove outliers from RR intervals using median absolute deviation (MAD)
 * This improves robustness as mentioned in the paper
 */
const removeOutliers = (rrIntervals) => {
  if (rrIntervals.length < 3) return rrIntervals;
  
  // Calculate median
  const sorted = [...rrIntervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  // Calculate MAD (Median Absolute Deviation)
  const deviations = rrIntervals.map(rr => Math.abs(rr - median));
  const mad = deviations.sort((a, b) => a - b)[Math.floor(deviations.length / 2)];
  
  // Keep intervals within 3 MAD (standard outlier threshold)
  const threshold = 3 * mad;
  return rrIntervals.filter(rr => Math.abs(rr - median) <= threshold);
};

/**
 * Calculate HR (Heart Rate) and HRV (Heart Rate Variability)
 * Implements the algorithm from Fukunishi et al. CVPR 2018
 * 
 * @param {Array<number>} data - Time series of intensity/hemoglobin values
 * @param {number} targetFps - Frames per second (default: 30)
 * @returns {Object|null} - { heartRate: number (BPM), hrv: number (ms, SDNN) } or null if insufficient data
 */
// Updated calculateHRMetrics to also return HR + HRV series (preserving original logic)

// ... PLACE YOUR EXISTING detrend, bandPassFilter, detectPeaks, removeOutliers FUNCTIONS ABOVE ...

/**
 * Calculate HR (Heart Rate) and HRV (Heart Rate Variability)
 * Now ALSO returns:
 *   hrSeries:  [{ x: timestamp(ms), y: bpm }]
 *   hrvSeries: [{ x: timestamp(ms), y: ms  }]
 *
 * No logic changed for core HR / HRV computation.
 */
export const calculateHRMetrics = (
  data,
  targetFps = 30,
  prevHrSeries = [],
  prevHrvSeries = []
) => {
  if (!data || data.length < 50) return null;

  const detrended = detrend(data);
  const filtered = bandPassFilter(detrended, targetFps, 0.75, 3.0);
  const peaks = detectPeaks(filtered, null, targetFps);

  if (peaks.length < 2) return null;

  const frameIntervalMs = 1000 / targetFps;
  const rrIntervals = [];
  for (let i = 1; i < peaks.length; i++) {
    const diff = (peaks[i] - peaks[i - 1]) * frameIntervalMs;
    if (diff >= 333 && diff <= 1333) {
      rrIntervals.push(diff);
    }
  }

  if (rrIntervals.length < 2) return null;

  const cleanedRR = removeOutliers(rrIntervals);
  if (cleanedRR.length < 2) return null;

  const avgRR = cleanedRR.reduce((a, b) => a + b, 0) / cleanedRR.length;
  const hr = 60000 / avgRR;

  const mean = avgRR;
  const variance =
    cleanedRR.reduce((sum, val) => sum + (val - mean) ** 2, 0) /
    cleanedRR.length;
  const sdnn = Math.sqrt(variance);

  if (hr < 40 || hr > 200) return null;

  const heartRate = parseFloat(hr.toFixed(1));
  const hrv = parseFloat(sdnn.toFixed(1));

  const t = Date.now();

  const hrSeries = [...prevHrSeries, { x: t, y: heartRate }];
  const hrvSeries = [...prevHrvSeries, { x: t, y: hrv }];

  return {
    heartRate,
    hrv,
    hrSeries,
    hrvSeries,
  };
};

  