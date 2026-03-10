import { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Save,
  Trash2,
  Loader2,
  Square,
  CheckCircle2,
  Mic,
  MicOff,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import HandCanvas from "@/components/HandCanvas";
import { useHandDetection } from "@/hooks/useHandDetection";
import {
  type StoredGesture,
  type HandType,
  getAllGestures,
  saveGesture,
  deleteGesture,
} from "@/lib/gestureStore";
import { saveVoice } from "@/lib/voiceStore";
import type { Landmark } from "@/lib/gestureClassifier";
import { toast } from "sonner";

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;
const REQUIRED_SAMPLES = 2; // one per hand

export default function TrainPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isLoading, isRunning, landmarks, error, start, stop } =
    useHandDetection();

  const [gestureName, setGestureName] = useState("");
  const [gestureEmoji, setGestureEmoji] = useState("");
  const [samples, setSamples] = useState<Landmark[][]>([]);
  const [capturePhase, setCapturePhase] = useState<"idle" | "right" | "left" | "done">("idle");
  const [isCapturing, setIsCapturing] = useState(false);
  const [directionWarning, setDirectionWarning] = useState<string | null>(null);
  const [savedGestures, setSavedGestures] = useState<StoredGesture[]>([]);
  const [readyToSave, setReadyToSave] = useState(false);

  // Voice recording
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    getAllGestures().then(setSavedGestures);
  }, []);

  const handleStart = useCallback(async () => {
    if (videoRef.current) await start(videoRef.current);
  }, [start]);

  const resetCapture = useCallback(() => {
    setIsCapturing(false);
    setCapturePhase("idle");
    setSamples([]);
    setReadyToSave(false);
    setVoiceBlob(null);
    setDirectionWarning(null);
    setGestureEmoji("");
  }, []);

  const handleStop = useCallback(() => {
    stop();
    resetCapture();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
  }, [stop, resetCapture]);

  

  const startCapturing = useCallback(() => {
    if (!gestureName.trim()) {
      toast.error("Enter a gesture name first");
      return;
    }
    resetCapture();
    setIsCapturing(true);
    setCapturePhase("right");
    toast.info("Show your RIGHT hand gesture to the camera and click Capture.");
  }, [gestureName, resetCapture]);

  const captureSample = useCallback(() => {
    if (!landmarks || landmarks.length === 0) {
      toast.error("No hand detected. Show your hand to the camera.");
      return;
    }

    const lm = landmarks[0];
    setDirectionWarning(null);
    const newSamples = [...samples, [...lm]];
    setSamples(newSamples);

    if (capturePhase === "right") {
      // Right hand captured, now ask for left
      setCapturePhase("left");
      toast.success("✋ Right hand captured! Now show your LEFT hand gesture.");
    } else if (capturePhase === "left") {
      // Both hands captured
      setCapturePhase("done");
      setIsCapturing(false);
      setReadyToSave(true);
      toast.success("🤚 Left hand captured! Both hands recorded. Ready to save!");
    }
  }, [landmarks, samples, capturePhase]);

  // Voice recording
  const startVoiceRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setVoiceBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        toast.success("Voice recorded! Click Save to finish.");
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingVoice(true);
    } catch {
      toast.error("Microphone access denied");
    }
  }, []);

  const stopVoiceRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecordingVoice(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (samples.length < REQUIRED_SAMPLES) {
      toast.error(
        "Training incomplete. Please capture the gesture sample."
      );
      return;
    }
    const gesture: StoredGesture = {
      id: `custom_${Date.now()}`,
      name: gestureName.trim(),
      emoji: gestureEmoji.trim() || "👋",
      hand: "both" as HandType,
      samples,
      createdAt: Date.now(),
    };
    await saveGesture(gesture);
    if (voiceBlob) {
      await saveVoice(gestureName.trim(), voiceBlob);
    }
    toast.success(
      `Gesture "${gesture.name}" saved and added to Gesture Library successfully! 🎉`
    );
    // Redirect to gesture library
    setTimeout(() => navigate("/gestures"), 1200);
  }, [samples, gestureName, gestureEmoji, voiceBlob, navigate]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteGesture(id);
    setSavedGestures(await getAllGestures());
    toast.success("Gesture deleted");
  }, []);

  

  return (
    <div className="container pt-24 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-5xl"
      >
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold font-display">
            Train <span className="text-gradient">Custom Gestures</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Record a gesture sample for accurate recognition
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Camera */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="relative aspect-[4/3] bg-muted">
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ transform: "scaleX(-1)" }}
                playsInline
                muted
              />
              <HandCanvas
                landmarks={landmarks}
                width={VIDEO_WIDTH}
                height={VIDEO_HEIGHT}
              />
              {!isRunning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10">
                    {isLoading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : (
                      <Camera className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    {isLoading
                      ? "Loading AI model..."
                      : "Start camera to begin training"}
                  </p>
                </div>
              )}

              {/* Capture instruction overlay */}
              {isCapturing && (
                <div className="absolute top-0 left-0 right-0 bg-background/90 backdrop-blur-sm p-4 border-b border-primary/30 z-10">
                  <div className="text-center space-y-1">
                    <p className="text-lg font-bold font-display text-primary">
                      {capturePhase === "right" ? "✋ Show RIGHT hand" : "🤚 Show LEFT hand"}
                    </p>
                    <p className="text-sm text-foreground font-mono">
                      Hold your {capturePhase === "right" ? "right" : "left"} hand steady and click Capture
                    </p>
                  </div>
                </div>
              )}

              {/* Direction warning overlay */}
              <AnimatePresence>
                {directionWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-14 left-3 right-3 flex items-center gap-2 rounded-lg bg-destructive/90 px-3 py-2 backdrop-blur-sm"
                  >
                    <AlertTriangle className="h-4 w-4 text-destructive-foreground shrink-0" />
                    <span className="text-xs font-mono text-destructive-foreground">
                      {directionWarning}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="border-t border-border p-4 space-y-3">
              <div className="flex gap-3">
                {!isRunning ? (
                  <Button
                    onClick={handleStart}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="mr-2 h-4 w-4" />
                    )}
                    {isLoading ? "Loading..." : "Start Camera"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleStop}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                )}
              </div>

              {isRunning && !readyToSave && (
                <div className="space-y-3">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                        Gesture Name
                      </label>
                      <Input
                        value={gestureName}
                        onChange={(e) => setGestureName(e.target.value)}
                        placeholder='e.g. "Hello", "Thanks", "Water"'
                        className="bg-secondary border-border"
                        disabled={isCapturing}
                      />
                    </div>
                    <div className="w-20 space-y-1.5">
                      <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                        Emoji
                      </label>
                      <Input
                        value={gestureEmoji}
                        onChange={(e) => setGestureEmoji(e.target.value)}
                        placeholder="👋"
                        className="bg-secondary border-border text-center text-lg"
                        disabled={isCapturing}
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {!isCapturing ? (
                      <Button
                        onClick={startCapturing}
                        disabled={!gestureName.trim()}
                        className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Start Training
                      </Button>
                    ) : (
                      <Button
                        onClick={captureSample}
                        size="lg"
                        className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 text-base px-6"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Capture {capturePhase === "right" ? "Right" : "Left"} Hand
                      </Button>
                    )}
                  </div>
                </div>
              )}


              {/* Ready to save */}
              <AnimatePresence>
                {readyToSave && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 rounded-xl border border-accent/30 bg-accent/5 p-4"
                  >
                    <div className="flex items-center gap-2 text-sm text-accent">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">
                        Both hands captured successfully!
                      </span>
                    </div>


                    {/* Voice recording */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground font-mono">
                        Record voice (optional):
                      </span>
                      {!isRecordingVoice ? (
                        <Button
                          size="sm"
                          variant={voiceBlob ? "secondary" : "outline"}
                          onClick={startVoiceRecording}
                          className="gap-1.5"
                        >
                          <Mic className="h-3.5 w-3.5" />
                          {voiceBlob ? "Re-record" : "Record Voice"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={stopVoiceRecording}
                          className="gap-1.5"
                        >
                          <MicOff className="h-3.5 w-3.5 animate-pulse" />
                          Stop Recording
                        </Button>
                      )}
                      {voiceBlob && !isRecordingVoice && (
                        <span className="text-xs text-accent">✓ Voice ready</span>
                      )}
                    </div>

                    <Button onClick={handleSave} className="w-full gap-2">
                      <Save className="h-4 w-4" />
                      Save Gesture to Library
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Training guide */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-4 text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Training Guide
              </h3>
              <ol className="space-y-3 text-xs text-muted-foreground">
                <li className="flex items-start gap-2 rounded-lg p-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold">1</span>
                  <div>
                    <span className="font-medium text-foreground">Start Camera</span>
                    <p className="mt-0.5 text-muted-foreground">Enable the webcam feed</p>
                  </div>
                </li>
                <li className="flex items-start gap-2 rounded-lg p-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold">2</span>
                  <div>
                    <span className="font-medium text-foreground">Name & Show Gesture</span>
                    <p className="mt-0.5 text-muted-foreground">Enter a name and show your hand gesture</p>
                  </div>
                </li>
                <li className="flex items-start gap-2 rounded-lg p-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold">3</span>
                  <div>
                    <span className="font-medium text-foreground">Capture & Save</span>
                    <p className="mt-0.5 text-muted-foreground">Capture the sample and save to library</p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Saved gestures */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-4 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Saved Gestures ({savedGestures.length})
              </h3>
              {savedGestures.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No custom gestures yet. Train one above!
                </p>
              ) : (
                <div className="space-y-2">
                  {savedGestures.map((g) => (
                    <motion.div
                      key={g.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between rounded-lg bg-secondary p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {g.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {g.samples.length} directional samples
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(g.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
