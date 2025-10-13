// BlinkDetection.js

// Approximate eye landmark indices for FaceLandmarker 478
const LEFT_EYE = [33, 133];   // left corner, right corner of left eye
const RIGHT_EYE = [362, 263]; // left corner, right corner of right eye

const UPPER_EYE_LID_LEFT = 159;   // top lid left eye
const LOWER_EYE_LID_LEFT = 145;   // bottom lid left eye
const UPPER_EYE_LID_RIGHT = 386;  // top lid right eye
const LOWER_EYE_LID_RIGHT = 374;  // bottom lid right eye

// Threshold for blink (distance ratio)
const BLINK_RATIO = 0.25;

function distance(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

export function detectBlink(landmarks) {
  if (!landmarks || landmarks.length === 0) return false;

  // Left eye vertical / horizontal ratio
  const leftVert = distance(landmarks[UPPER_EYE_LID_LEFT], landmarks[LOWER_EYE_LID_LEFT]);
  const leftHoriz = distance(landmarks[LEFT_EYE[0]], landmarks[LEFT_EYE[1]]);
  const leftRatio = leftVert / leftHoriz;

  // Right eye vertical / horizontal ratio
  const rightVert = distance(landmarks[UPPER_EYE_LID_RIGHT], landmarks[LOWER_EYE_LID_RIGHT]);
  const rightHoriz = distance(landmarks[RIGHT_EYE[0]], landmarks[RIGHT_EYE[1]]);
  const rightRatio = rightVert / rightHoriz;

  // Average ratio
  const ratio = (leftRatio + rightRatio) / 2;

  // Blink if ratio below threshold
  return ratio < BLINK_RATIO;
}
