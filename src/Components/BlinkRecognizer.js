import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { detectBlink } from '../utils/blinkDetection';

/**
 * useBlinkDetection Hook
 *
 * Real-time blink detection using MediaPipe Tasks Vision FaceLandmarker API.
 * Works in minimized tabs using fallback interval processing.
 * 
 * Features:
 * - Face landmark tracking via MediaPipe Tasks API
 * - Real-time blink detection and counting
 * - Runs efficiently via RAF when tab visible
 * - Automatically switches to interval mode when tab hidden
 */
const useBlinkDetection = ({ videoRef, isActive = false }) => {
  const [blinkCount, setBlinkCount] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const faceLandmarkerRef = useRef(null);
  const lastBlinkTimeRef = useRef(0);
  const rafIdRef = useRef(null);

  /**
   * Initialize MediaPipe FaceLandmarker
   */
  const initializeFaceLandmarker = useCallback(async () => {
    try {
      console.log('Initializing FaceLandmarker for blink detection...');

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
      });

      setIsInitialized(true);
      console.log('✅ FaceLandmarker initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize FaceLandmarker:', error);
    }
  }, []);

  /**
   * Detect blinks from video frame
   */
  const detectFromVideo = useCallback(() => {
   // console.log('Detecting from video frame...');
    const video = videoRef.current;
    const faceLandmarker = faceLandmarkerRef.current;

    if (!video || !faceLandmarker || video.videoWidth === 0) return;

    try {
      const nowMs = performance.now();
      const result = faceLandmarker.detectForVideo(video, nowMs);

      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
//             if (result.faceLandmarks?.length) {
//     console.log('✅ Face detected, landmarks count:', result.faceLandmarks[0].length);
//   } else {
//     console.log('❌ No face detected');
//   }

        const landmarks = result.faceLandmarks[0];
        //console.log(landmarks,"landmarks");
         const currentlyBlinking = detectBlink(landmarks);
         //console.log(currentlyBlinking,"currentlyBlinking");
//   console.log('Landmarks length:', landmarks.length);
//   console.log('First landmark:', landmarks[0]);

       // Blink detection cooldown (avoid double count)
        if (
          currentlyBlinking &&
          !isBlinking &&
          performance.now() - lastBlinkTimeRef.current > 200
        ) {
          setBlinkCount((prev) => prev + 1);
          lastBlinkTimeRef.current = performance.now();
          console.log('👁️ Blink detected! Total:', blinkCount + 1);
        }

        setIsBlinking(currentlyBlinking);
      } else {
        setIsBlinking(false);
      }
    } catch (error) {
      console.error('Error detecting blink:', error);
    }
  }, [isBlinking, blinkCount, videoRef]);

  /**
   * Reset blink count
   */
  const resetCount = useCallback(() => setBlinkCount(0), []);

  // Initialize on mount
  useEffect(() => {
    initializeFaceLandmarker();
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [initializeFaceLandmarker]);

  // Start / stop processing based on visibility + activation
  useEffect(() => {
    if (!isInitialized || !videoRef.current) return;
    const video = videoRef.current;
    let animationId;
    let intervalId;
    let lastVideoTime = -1;

    const runDetection = () => {
      if (video.readyState >= 2) {
        detectFromVideo();
        lastVideoTime = video.currentTime;
      }
    };

    const rafLoop = () => {
      if (video.currentTime !== lastVideoTime) {
        runDetection();
      }
      animationId = requestAnimationFrame(rafLoop);
    };

    const startRAF = () => {
      console.log("visibilityState: visible");
      cancelAnimationFrame(animationId);
      clearInterval(intervalId);
      rafLoop();
    };

    const startInterval = () => {
      console.log("visibilityState: hidden");
      cancelAnimationFrame(animationId);
      clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (video.readyState >= 2) runDetection();
      }, 0); // ~60fps interval for minimized state
    };

    if (document.visibilityState === 'visible') {
      startRAF();
    } else {
      startInterval();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startRAF();
      } else {
        startInterval();
      }
    };

    if (isActive) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, isInitialized, detectFromVideo]);

  return {
    blinkCount,
    isBlinking,
    isInitialized,
    resetCount,
  };
};

export default useBlinkDetection;
