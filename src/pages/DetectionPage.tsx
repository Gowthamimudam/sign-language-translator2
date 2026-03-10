import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Square, Volume2, VolumeX, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHandDetection, type GestureFilter } from "@/hooks/useHandDetection";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import GestureResultDisplay from "@/components/GestureResult";
import HandCanvas from "@/components/HandCanvas";

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

type DetectionMode = "gestures" | "alphabets" | "numbers";

export default function DetectionPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<DetectionMode>("gestures");

  const gestureFilter: GestureFilter =
    mode === "gestures" ? "gestures" : mode === "alphabets" ? "alphabet" : "numbers";

  const { isLoading, isRunning, gesture, landmarks, error, start, stop } = useHandDetection(gestureFilter);
  const { speak, stopSpeaking } = useTextToSpeech();
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [sentence, setSentence] = useState("");

  const lastTokenRef = useRef<string | null>(null);
  const lastAppendTimeRef = useRef(0);
  const APPEND_COOLDOWN_MS = 1500;

  // Map raw gesture name to token shown/appended based on mode
  const getTokenForCurrentMode = useCallback(
    (rawName: string): string | null => {
      if (mode === "gestures") {
        return rawName;
      }
      if (mode === "alphabets") {
        if (rawName.startsWith("alpha_")) return rawName.replace("alpha_", "");
        return null;
      }
      if (mode === "numbers") {
        if (rawName.startsWith("num_")) return rawName.replace("num_", "");
        return null;
      }
      return null;
    },
    [mode]
  );

  // Detection → sentence builder + speech + history
  useEffect(() => {
    if (!gesture || gesture.gesture === "Unknown" || gesture.confidence <= 0.5 || !isRunning) return;

    const rawName = gesture.gesture;
    const token = getTokenForCurrentMode(rawName);
    if (!token) return;

    const now = Date.now();
    if (token === lastTokenRef.current && now - lastAppendTimeRef.current < APPEND_COOLDOWN_MS) return;

    // Append token to sentence (no automatic spaces; Space button handles that)
    setSentence((prev) => prev + token);

    // Speak token if enabled
    if (speechEnabled) {
      speak(token.split(" / ")[0]);
    }

    // History of recognized tokens
    setHistory((prev) => {
      const display = token;
      const last = prev[prev.length - 1];
      if (last === display) return prev;
      return [...prev.slice(-19), display];
    });

    lastTokenRef.current = token;
    lastAppendTimeRef.current = now;
  }, [gesture, isRunning, getTokenForCurrentMode, speechEnabled, speak]);

  const handleStart = useCallback(async () => {
    if (videoRef.current) {
      await start(videoRef.current);
    }
  }, [start]);

  const handleStop = useCallback(() => {
    stop();
    stopSpeaking();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
  }, [stop, stopSpeaking]);

  const addSpace = useCallback(() => {
    setSentence((prev) => (prev.endsWith(" ") || prev.length === 0 ? prev : prev + " "));
  }, []);

  const clearSentence = useCallback(() => {
    setSentence("");
    setHistory([]);
    lastTokenRef.current = null;
    lastAppendTimeRef.current = 0;
  }, []);

  const currentModeLabel =
    mode === "gestures" ? "Gestures" : mode === "alphabets" ? "Alphabets" : "Numbers";

  // Normalize gesture for display component
  const displayGesture = gesture
    ? {
        gesture: getTokenForCurrentMode(gesture.gesture) ?? gesture.gesture,
        confidence: gesture.confidence,
      }
    : null;

  return (
    <div className="container pt-24 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-4xl"
      >
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold font-display">
            Gesture <span className="text-gradient">Detection</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Position your hand in front of the camera
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Camera view */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
            {/* Mode selector + sentence box */}
            <div className="flex flex-col gap-3 border-b border-border bg-card/80 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={mode === "gestures" ? "default" : "outline"}
                    onClick={() => setMode("gestures")}
                    className="h-8 px-3 text-xs"
                  >
                    Gestures
                  </Button>
                  <Button
                    size="sm"
                    variant={mode === "alphabets" ? "default" : "outline"}
                    onClick={() => setMode("alphabets")}
                    className="h-8 px-3 text-xs"
                  >
                    Alphabets
                  </Button>
                  <Button
                    size="sm"
                    variant={mode === "numbers" ? "default" : "outline"}
                    onClick={() => setMode("numbers")}
                    className="h-8 px-3 text-xs"
                  >
                    Numbers
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addSpace}
                    className="h-8 px-3 text-xs"
                  >
                    Space
                  </Button>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Mode: <span className="text-foreground font-semibold">{currentModeLabel}</span>
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2">
                <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                  Detected Sentence
                </p>
                <p className="min-h-[28px] text-sm font-display text-foreground break-words">
                  {sentence ? sentence : <span className="text-muted-foreground">Start signing to build a sentence...</span>}
                </p>
                <div className="mt-2 flex justify-end">
                  <Button size="xs" variant="outline" className="h-6 px-2 text-[11px]" onClick={clearSentence}>
                    Clear Sentence
                  </Button>
                </div>
              </div>
            </div>

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
                  <div className="scanline absolute inset-0" />
                  <div className="relative z-10 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10">
                      {isLoading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      ) : (
                        <Play className="h-8 w-8 text-primary ml-1" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      {isLoading ? "Loading AI model..." : "Press Start to begin"}
                    </p>
                  </div>
                </div>
              )}

              {/* Status indicator */}
              {isRunning && (
                <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 backdrop-blur-sm border border-border">
                  <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-xs font-mono text-accent">LIVE</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 border-t border-border p-4">
              {!isRunning ? (
                <Button
                  onClick={handleStart}
                  disabled={isLoading}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Detection
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleStop}
                  variant="destructive"
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop Camera
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSpeechEnabled(!speechEnabled)}
                className="border-border"
              >
                {speechEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Current gesture */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="mb-4 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Detected Gesture
              </h3>
              <GestureResultDisplay gesture={displayGesture} isSpeaking={speechEnabled} />
            </div>

            {/* History */}
            <div className="rounded-2xl border border-border bg-card p-4 flex-1">
              <h3 className="mb-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                History
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No gestures yet</p>
                ) : (
                  history.map((g, i) => (
                    <motion.span
                      key={`${g}-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-md bg-secondary px-2 py-1 text-xs font-mono text-secondary-foreground"
                    >
                      {g}
                    </motion.span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
