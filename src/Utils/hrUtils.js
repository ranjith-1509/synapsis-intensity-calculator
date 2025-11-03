// Detect peaks using a simple local maximum method
export const detectPeaks = (data, threshold = 0.7) => {
    const peaks = [];
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i - 1] && data[i] > data[i + 1] && data[i] > threshold) {
        peaks.push(i);
      }
    }
    return peaks;
  };
  
  // Calculate HR (Heart Rate) and HRV (Heart Rate Variability)
  export const calculateHRMetrics = (data, targetFps = 30) => {
    if (!data || data.length < 50) return null;
  
    const peaks = detectPeaks(data);
    if (peaks.length < 2) return null;
  
    // Convert frame indices → RR intervals (in milliseconds)
    const frameIntervalMs = 1000 / targetFps;
    const rrIntervals = [];
    for (let i = 1; i < peaks.length; i++) {
      const diff = (peaks[i] - peaks[i - 1]) * frameIntervalMs;
      rrIntervals.push(diff);
    }
  
    const avgRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
    const hr = 60000 / avgRR; // BPM
  
    // HRV (SDNN) = standard deviation of RR intervals
    const mean = avgRR;
    const variance =
      rrIntervals.reduce((sum, val) => sum + (val - mean) ** 2, 0) /
      rrIntervals.length;
    const sdnn = Math.sqrt(variance);
  
    return {
      heartRate: parseFloat(hr.toFixed(1)),
      hrv: parseFloat(sdnn.toFixed(1)),
    };
  };
  