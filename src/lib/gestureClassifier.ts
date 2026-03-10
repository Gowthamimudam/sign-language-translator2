export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface GestureResult {
  gesture: string;
  confidence: number;
}

function distance(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function getFingerStates(landmarks: Landmark[], isRightHand: boolean): boolean[] {
  // Thumb: compare tip x position relative to IP joint
  // For right hand (mirrored in webcam): tip.x > ip.x means extended
  // For left hand: tip.x < ip.x means extended
  const thumbExtended = isRightHand
    ? landmarks[4].x < landmarks[3].x
    : landmarks[4].x > landmarks[3].x;

  // Other fingers: tip.y < pip.y means extended (y increases downward)
  const indexExtended = landmarks[8].y < landmarks[6].y;
  const middleExtended = landmarks[12].y < landmarks[10].y;
  const ringExtended = landmarks[16].y < landmarks[14].y;
  const pinkyExtended = landmarks[20].y < landmarks[18].y;

  return [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended];
}

function fingersCurled(landmarks: Landmark[]): boolean[] {
  // Check if fingertip is close to palm (more strictly curled)
  const palmCenter = landmarks[0];
  const indexCurled = distance(landmarks[8], palmCenter) < distance(landmarks[5], palmCenter);
  const middleCurled = distance(landmarks[12], palmCenter) < distance(landmarks[9], palmCenter);
  const ringCurled = distance(landmarks[16], palmCenter) < distance(landmarks[13], palmCenter);
  const pinkyCurled = distance(landmarks[20], palmCenter) < distance(landmarks[17], palmCenter);
  return [indexCurled, middleCurled, ringCurled, pinkyCurled];
}

export function classifyGesture(landmarks: Landmark[], handedness: string = "Right"): GestureResult {
  const isRight = handedness === "Right";
  const [thumb, index, middle, ring, pinky] = getFingerStates(landmarks, isRight);
  const extendedCount = [thumb, index, middle, ring, pinky].filter(Boolean).length;
  const [indexCurled, middleCurled, ringCurled, pinkyCurled] = fingersCurled(landmarks);

  // All fingers extended, fingers spread = Hi / Stop
  if (extendedCount === 5) {
    const fingerSpread = distance(landmarks[8], landmarks[20]);
    if (fingerSpread > 0.15) {
      return { gesture: "Hi", confidence: 0.88 };
    }
    return { gesture: "Stop", confidence: 0.85 };
  }

  // ILY sign: thumb + index + pinky extended, middle + ring curled
  if (thumb && index && !middle && !ring && pinky) {
    return { gesture: "Love You", confidence: 0.92 };
  }

  // Thumbs up: only thumb extended, hand roughly vertical
  if (thumb && !index && !middle && !ring && !pinky) {
    if (landmarks[4].y < landmarks[3].y) {
      return { gesture: "Yes", confidence: 0.87 };
    }
    return { gesture: "A", confidence: 0.7 };
  }

  // Thumbs down could be "No"
  if (thumb && !index && !middle && !ring && !pinky && landmarks[4].y > landmarks[2].y) {
    return { gesture: "No", confidence: 0.8 };
  }

  // Peace / V sign: index + middle extended
  if (!thumb && index && middle && !ring && !pinky) {
    return { gesture: "Peace / V", confidence: 0.88 };
  }

  // Three fingers
  if (!thumb && index && middle && ring && !pinky) {
    return { gesture: "3 / W", confidence: 0.82 };
  }

  // Four fingers
  if (!thumb && index && middle && ring && pinky) {
    return { gesture: "4", confidence: 0.83 };
  }

  // Pointing (index only)
  if (!thumb && index && !middle && !ring && !pinky) {
    return { gesture: "1 / D", confidence: 0.8 };
  }

  // Fist = nothing extended
  if (extendedCount === 0) {
    return { gesture: "Fist / S", confidence: 0.85 };
  }

  // OK sign: thumb and index tips close together, other fingers extended
  const thumbIndexDist = distance(landmarks[4], landmarks[8]);
  if (thumbIndexDist < 0.06 && middle && ring && pinky) {
    return { gesture: "OK / F", confidence: 0.84 };
  }

  // Pinky only = I
  if (!thumb && !index && !middle && !ring && pinky) {
    return { gesture: "I", confidence: 0.78 };
  }

  // Rock sign: index + pinky
  if (!thumb && index && !middle && !ring && pinky) {
    return { gesture: "Rock / Y", confidence: 0.75 };
  }

  // Thumb + pinky = call me / 6
  if (thumb && !index && !middle && !ring && pinky) {
    return { gesture: "Call / 6", confidence: 0.78 };
  }

  // L shape: thumb + index at right angle
  if (thumb && index && !middle && !ring && !pinky) {
    return { gesture: "L", confidence: 0.8 };
  }

  // Thumb + middle + ring + pinky (no index) = unlikely but handle
  if (thumb && !index && middle && ring && pinky) {
    return { gesture: "B", confidence: 0.65 };
  }

  return { gesture: "Unknown", confidence: 0.3 };
}

export const SUPPORTED_GESTURES = [
  { name: "Hi", description: "Open hand, fingers spread", emoji: "👋" },
  { name: "Stop", description: "Open palm facing forward", emoji: "✋" },
  { name: "Love You", description: "ILY sign (thumb + index + pinky)", emoji: "🤟" },
  { name: "Yes", description: "Thumbs up", emoji: "👍" },
  { name: "No", description: "Thumbs down", emoji: "👎" },
  { name: "Peace / V", description: "Index + middle extended", emoji: "✌️" },
  { name: "OK / F", description: "Thumb and index circle", emoji: "👌" },
  { name: "Fist / S", description: "All fingers closed", emoji: "✊" },
  { name: "1 / D", description: "Index finger pointing", emoji: "☝️" },
  { name: "3 / W", description: "Three fingers extended", emoji: "🤟" },
  { name: "4", description: "Four fingers extended", emoji: "🖖" },
  { name: "L", description: "Thumb + index at right angle", emoji: "🤙" },
  { name: "I", description: "Pinky extended only", emoji: "🤙" },
  { name: "Rock / Y", description: "Index + pinky extended", emoji: "🤘" },
  { name: "Call / 6", description: "Thumb + pinky extended", emoji: "🤙" },
];
