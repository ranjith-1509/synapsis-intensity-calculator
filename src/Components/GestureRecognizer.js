import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';

/**
 * useGestureRecognition Hook
 * 
 * This hook handles real-time gesture recognition using MediaPipe's Gesture Recognizer via Web Worker.
 * It detects rock, paper, scissors gestures from the camera feed and maintains running counts.
 * 
 * Features:
 * - Real-time gesture detection using MediaPipe Tasks Vision in Web Worker
 * - Running count tracking for each gesture type
 * - Efficient processing with Web Worker to prevent UI lag
 * - Responsive UI updates without breaking existing functionality
 * - Offloads heavy computation to background thread
 */
const useGestureRecognition = ({ videoRef, isActive = false }) => {
  const [gestureCounts, setGestureCounts] = useState({
    rock: 0,
    paper: 0,
    scissors: 0,
    none: 0
  });
  const [currentGesture, setCurrentGesture] = useState('none');
  const [isInitialized, setIsInitialized] = useState(false);
  
  const gestureRecognizerRef = useRef(null);
  const lastPredictionRef = useRef(null);
  const predictionThrottleRef = useRef(null);

  /**
   * Initialize MediaPipe Gesture Recognizer
   * Loads the gesture recognition model and sets up the recognizer
   */
  const initializeGestureRecognizer = useCallback(async () => {
    try {
      console.log('Initializing MediaPipe Gesture Recognizer...');
      
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
      );
      
      gestureRecognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
          delegate: "GPU"
        },
        runningMode: "LIVE_STREAM",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      setIsInitialized(true);
      console.log('Gesture Recognizer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gesture Recognizer:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  }, []);

  /**
   * Recognize gesture from video frame
   * Processes the current video frame and returns the detected gesture
   */
  const recognizeGesture = useCallback(() => {
    console.log("hiiii<><><")
    if (!gestureRecognizerRef.current || !videoRef.current || !isActive) {
      return;
    }

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    try {
      const startTimeMs = performance.now();
      const result = gestureRecognizerRef.current.recognizeForVideo(video, startTimeMs);
      if (result.gestures && result.gestures.length > 0) {
        const gesture = result.gestures[0][0];
        const gestureName = gesture.categoryName.toLowerCase();
        // Map MediaPipe gesture names to our expected gestures
        let mappedGesture = 'none';
        if (gestureName.includes('rock') || gestureName.includes('fist')) {
          mappedGesture = 'rock';
        } else if (gestureName.includes('paper') || gestureName.includes('open')) {
          mappedGesture = 'paper';
        } else if (gestureName.includes('scissors') || gestureName.includes('peace') || gestureName.includes('v')) {
          mappedGesture = 'scissors';
        }
        
        console.log(mappedGesture, "mappedGesture");
        
        // Throttle predictions to avoid rapid state updates
        if (lastPredictionRef.current !== mappedGesture) {
          lastPredictionRef.current = mappedGesture;
          
          // Clear existing throttle
          if (predictionThrottleRef.current) {
            clearTimeout(predictionThrottleRef.current);
          }
          
          // Update gesture after a short delay to confirm it's stable
          predictionThrottleRef.current = setTimeout(() => {
            setCurrentGesture(mappedGesture);
            
            // Increment count for the detected gesture
            setGestureCounts(prevCounts => ({
              ...prevCounts,
              [mappedGesture]: prevCounts[mappedGesture] + 1
            }));
          }, 200); // 200ms delay to confirm gesture stability
        }
      } else {
        // No gesture detected
        if (lastPredictionRef.current !== 'none') {
          lastPredictionRef.current = 'none';
          setCurrentGesture('none');
        }
      }
    } catch (error) {
      console.error('Error recognizing gesture:', error);
    }
  }, [isActive, videoRef]);

  /**
   * Reset gesture counts to zero
   */
  const resetCounts = useCallback(() => {
    setGestureCounts({
      rock: 0,
      paper: 0,
      scissors: 0,
      none: 0
    });
  }, []);

  // Initialize gesture recognizer on component mount
  useEffect(() => {
    initializeGestureRecognizer();
    
    return () => {
      // Cleanup
      if (predictionThrottleRef.current) {
        clearTimeout(predictionThrottleRef.current);
      }
    };
  }, [initializeGestureRecognizer]);

  // Start/stop gesture recognition based on isActive prop
useEffect(() => {
  let animationId;
  let intervalId;
  let lastVideoTime = -1;

  const video = videoRef.current;
  if (!video) return;

  const runGesture = () => {
    if (video.readyState >= 2) {
      recognizeGesture();
      lastVideoTime = video.currentTime;
    }
  };

  const renderLoop = () => {
    // Only run if video frame changed
    if (video.currentTime !== lastVideoTime) {
      runGesture();
    }

    animationId = requestAnimationFrame(renderLoop);
  };

  const startRAF = () => {
    cancelAnimationFrame(animationId);
    clearInterval(intervalId);
    renderLoop();
  };

  const startInterval = () => {
    cancelAnimationFrame(animationId);
    clearInterval(intervalId);
    intervalId = setInterval(() => {
      if (video.readyState >= 2) runGesture();
    }, 10); // adjust interval as needed
  };

  // Handle visibility changes automatically
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      startRAF();
    } else {
      startInterval();
    }
  };

  if (isActive && isInitialized) {
    // Start correct mode based on initial visibility
    if (document.visibilityState === "visible") {
      startRAF();
    } else {
      startInterval();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  return () => {
    cancelAnimationFrame(animationId);
    clearInterval(intervalId);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [isActive, isInitialized, recognizeGesture]);



  return {
    gestureCounts,
    currentGesture,
    isInitialized,
    resetCounts
  };
};

export default useGestureRecognition;
