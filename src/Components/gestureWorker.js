/* eslint-env worker */
/* eslint-disable no-restricted-globals */
import { GestureRecognizer, FilesetResolver } from "@mediapipe/tasks-vision";

let gestureRecognizer = null;

const initializeRecognizer = async () => {
    console.log("Worker: Initializing MediaPipe Gesture Recognizer...");
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
  );

  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
};

initializeRecognizer();

// Define worker context properly for ESLint
/* global self */
const workerContext = self;

workerContext.postMessage({ type: "ready" }); // <-- notify main thread
workerContext.onmessage = async (e) => {
   // console.log("Worker: Message received", e.data);
  const { type, videoFrame } = e.data;
  //console.log(videoFrame,"voide")
  if (!gestureRecognizer || !videoFrame) return;

  if (type === "frame") {
    try {
      const startTimeMs = performance.now();
      const result = gestureRecognizer.recognizeForVideo(videoFrame, startTimeMs);
//console.log("Worker: Frame processed", result);
      let mappedGesture = "none";
      if (result.gestures && result.gestures.length > 0) {
        const gestureName = result.gestures[0][0].categoryName.toLowerCase();
        if (gestureName.includes("rock") || gestureName.includes("fist")) mappedGesture = "rock";
        else if (gestureName.includes("paper") || gestureName.includes("open")) mappedGesture = "paper";
        else if (
          gestureName.includes("scissors") ||
          gestureName.includes("peace") ||
          gestureName.includes("v")
        )
          mappedGesture = "scissors";
      }
    //  console.log("Worker: Gesture recognized", mappedGesture);

      workerContext.postMessage({ gesture: mappedGesture });
    } catch (err) {
      console.error("Worker error recognizing gesture:", err);
    }
  }
};
