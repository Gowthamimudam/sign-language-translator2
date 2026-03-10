import { useCallback, useRef, useState, useEffect } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { type GestureResult, type Landmark } from "@/lib/gestureClassifier";
import { getAllGestures, matchCustomGesture, type StoredGesture } from "@/lib/gestureStore";

export type GestureFilter = "all" | "gestures" | "alphabet" | "numbers";

function filterGestures(gestures: StoredGesture[], filter: GestureFilter): StoredGesture[] {
  if (filter === "all") return gestures;
  if (filter === "alphabet") return gestures.filter((g) => g.name.startsWith("alpha_"));
  if (filter === "numbers") return gestures.filter((g) => g.name.startsWith("num_"));
  // "gestures" = custom only (no alpha_ or num_ prefix)
  return gestures.filter((g) => !g.name.startsWith("alpha_") && !g.name.startsWith("num_"));
}

export function useHandDetection(filter: GestureFilter = "all") {
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [gesture, setGesture] = useState<GestureResult | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[][] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastGestureTimeRef = useRef(0);
  const customGesturesRef = useRef<StoredGesture[]>([]);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const refreshGestureData = useCallback(async () => {
    try {
      customGesturesRef.current = await getAllGestures();
    } catch (e) {
      console.error("Failed to refresh gesture data:", e);
    }
  }, []);

  useEffect(() => {
    void refreshGestureData();
    const interval = setInterval(() => void refreshGestureData(), 3000);
    return () => clearInterval(interval);
  }, [refreshGestureData]);

  const initialize = useCallback(async () => {
    if (handLandmarkerRef.current) return;
    setIsLoading(true);
    setError(null);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });
    } catch (e) {
      console.error("Failed to initialize HandLandmarker:", e);
      setError("Failed to load AI model. Please refresh and try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startCamera = useCallback(async (video: HTMLVideoElement) => {
    videoRef.current = video;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
    } catch (e) {
      console.error("Camera error:", e);
      setError("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  const detectFrame = useCallback(() => {
    const video = videoRef.current;
    const landmarker = handLandmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    const now = performance.now();
    const results = landmarker.detectForVideo(video, now);

    if (results.landmarks && results.landmarks.length > 0) {
      const lm = results.landmarks[0] as Landmark[];
      setLandmarks(results.landmarks as Landmark[][]);

      if (now - lastGestureTimeRef.current > 100) {
        const filtered = filterGestures(customGesturesRef.current, filterRef.current);
        const customMatch = matchCustomGesture(lm, filtered);
        if (customMatch && customMatch.confidence > 0.3) {
          setGesture({ gesture: customMatch.name, confidence: customMatch.confidence });
        } else {
          setGesture(null);
        }
        lastGestureTimeRef.current = now;
      }
    } else {
      setLandmarks(null);
      if (now - lastGestureTimeRef.current > 1000) {
        setGesture(null);
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectFrame);
  }, []);

  const start = useCallback(async (video: HTMLVideoElement) => {
    await initialize();
    await startCamera(video);
    await refreshGestureData();
    setIsRunning(true);
    animationFrameRef.current = requestAnimationFrame(detectFrame);
  }, [initialize, startCamera, refreshGestureData, detectFrame]);

  const stop = useCallback(() => {
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = 0;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
      videoRef.current = null;
    }
    setIsRunning(false);
    setGesture(null);
    setLandmarks(null);
  }, []);

  return { isLoading, isRunning, gesture, landmarks, error, start, stop };
}
