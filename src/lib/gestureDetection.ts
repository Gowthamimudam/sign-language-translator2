import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { Landmark } from "@/lib/gestureClassifier";
import { getAllGestures, matchCustomGesture, type StoredGesture } from "@/lib/gestureStore";
import type { GestureFilter } from "@/hooks/useHandDetection";

type ImageSource = ImageBitmap | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas;

let imageLandmarkerPromise: Promise<HandLandmarker> | null = null;

async function getImageLandmarker(): Promise<HandLandmarker> {
  if (imageLandmarkerPromise) return imageLandmarkerPromise;
  imageLandmarkerPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    return await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      numHands: 2,
    });
  })();
  return imageLandmarkerPromise;
}

function filterGestures(gestures: StoredGesture[], filter: GestureFilter): StoredGesture[] {
  if (filter === "all") return gestures;
  if (filter === "alphabet") return gestures.filter((g) => g.name.startsWith("alpha_"));
  if (filter === "numbers") return gestures.filter((g) => g.name.startsWith("num_"));
  return gestures.filter((g) => !g.name.startsWith("alpha_") && !g.name.startsWith("num_"));
}

export interface ImageDetectionResult {
  matchedName: string; // e.g. "alpha_A" or "num_7"
  token: string; // e.g. "A" or "7"
  confidence: number;
  landmarks: Landmark[] | null;
}

export async function extractHandLandmarksFromImage(
  source: ImageSource
): Promise<Landmark[] | null> {
  const landmarker = await getImageLandmarker();
  const results = landmarker.detect(source);
  const lm = (results.landmarks?.[0] as Landmark[] | undefined) ?? null;
  return lm && lm.length > 0 ? lm : null;
}

export async function detectCustomGestureFromImageSource(
  source: ImageSource,
  filter: GestureFilter
): Promise<ImageDetectionResult | null> {
  const landmarker = await getImageLandmarker();
  const results = landmarker.detect(source);
  const lm = (results.landmarks?.[0] as Landmark[] | undefined) ?? null;
  if (!lm || lm.length === 0) return null;

  const all = await getAllGestures();
  const filtered = filterGestures(all, filter);
  if (filtered.length === 0) return null;

  const match = matchCustomGesture(lm, filtered);
  if (!match || match.confidence <= 0.3) return null;

  const token = match.name.startsWith("alpha_")
    ? match.name.replace("alpha_", "")
    : match.name.startsWith("num_")
      ? match.name.replace("num_", "")
      : match.name;

  return {
    matchedName: match.name,
    token,
    confidence: match.confidence,
    landmarks: lm,
  };
}

