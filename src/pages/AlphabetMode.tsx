import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Loader2,
  Square,
  CheckCircle2,
  Play,
  Trash2,
  Volume2,
  VolumeX,
  Upload,
  Speaker,
  Mic,
  MicOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HandCanvas from "@/components/HandCanvas";
import { useHandDetection } from "@/hooks/useHandDetection";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import {
  type StoredGesture,
  type HandType,
  getAllGestures,
  saveGesture,
  deleteGesture,
  matchCustomGesture,
} from "@/lib/gestureStore";
import type { Landmark } from "@/lib/gestureClassifier";
import { getEmojiForToken } from "@/lib/emojiMapping";
import { getVoice, saveVoice } from "@/lib/voiceStore";
import { extractHandLandmarksFromImage } from "@/lib/gestureDetection";
import { toast } from "sonner";

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function LetterVoiceControls({ token }: { token: string }) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getVoice(token).then((v) => setHasVoice(!!v));
  }, [token]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await saveVoice(token, blob);
        stream.getTracks().forEach((t) => t.stop());
        setHasVoice(true);
        toast.success(`Voice recorded for "${token}"`);
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  }, [token]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const playVoice = useCallback(async () => {
    const v = await getVoice(token);
    if (v) {
      const url = URL.createObjectURL(v.audioBlob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      void audio.play();
    }
  }, [token]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("audio/")) {
        toast.error("Please upload an audio file");
        return;
      }
      await saveVoice(token, file);
      setHasVoice(true);
      toast.success(`Voice uploaded for "${token}"`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [token]
  );

  return (
    <div className="flex items-center gap-1 mt-2">
      {!isRecording ? (
        <Button
          size="sm"
          variant={hasVoice ? "secondary" : "outline"}
          onClick={startRecording}
          className="h-7 px-2 gap-1 text-xs"
        >
          <Mic className="h-3 w-3" />
          {hasVoice ? "Re-record" : "Record"}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="destructive"
          onClick={stopRecording}
          className="h-7 px-2 gap-1 text-xs"
        >
          <MicOff className="h-3 w-3 animate-pulse" />
          Stop
        </Button>
      )}
      {hasVoice && !isRecording && (
        <Button
          size="sm"
          variant="ghost"
          onClick={playVoice}
          className="h-7 w-7 p-0"
        >
          <Play className="h-3 w-3" />
        </Button>
      )}
      {!isRecording && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 px-2 gap-1 text-xs"
          >
            <Upload className="h-3 w-3" />
            Upload
          </Button>
        </>
      )}
    </div>
  );
}

export default function AlphabetMode() {
  const [activeTab, setActiveTab] = useState("train");

  return (
    <div className="container pt-24 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-5xl"
      >
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold font-display">
            Alphabet <span className="text-gradient">Mode</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Train sign language alphabets, then detect letters to form words
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="train" className="gap-2">
              <Camera className="h-4 w-4" />
              Train
            </TabsTrigger>
            <TabsTrigger value="detect" className="gap-2">
              <Play className="h-4 w-4" />
              Detect
            </TabsTrigger>
          </TabsList>

          <TabsContent value="train">
            <AlphabetTrain />
          </TabsContent>
          <TabsContent value="detect">
            <AlphabetDetect />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

/* ─── TRAIN TAB ─── */
function AlphabetTrain() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isLoading, isRunning, landmarks, error, start, stop } = useHandDetection();

  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [capturePhase, setCapturePhase] = useState<"idle" | "right" | "left" | "done">("idle");
  const [samples, setSamples] = useState<Landmark[][]>([]);
  const [trainedLetters, setTrainedLetters] = useState<Set<string>>(new Set());
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Load already trained letters
  useEffect(() => {
    getAllGestures().then((gestures) => {
      const trained = new Set<string>();
      gestures.forEach((g) => {
        if (g.name.startsWith("alpha_")) {
          trained.add(g.name.replace("alpha_", ""));
        }
      });
      setTrainedLetters(trained);
    });
  }, []);

  const handleStart = useCallback(async () => {
    if (videoRef.current) await start(videoRef.current);
  }, [start]);

  const handleStop = useCallback(() => {
    stop();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    resetCapture();
  }, [stop]);

  const resetCapture = useCallback(() => {
    setCapturePhase("idle");
    setSamples([]);
  }, []);

  const selectLetter = useCallback((letter: string) => {
    setSelectedLetter(letter);
    resetCapture();
  }, [resetCapture]);

  const startCapturing = useCallback(() => {
    if (!selectedLetter) return;
    resetCapture();
    setCapturePhase("right");
    toast.info(`Show the sign for "${selectedLetter}" and click Capture.`);
  }, [selectedLetter, resetCapture]);

  const captureSample = useCallback(() => {
    if (!landmarks || landmarks.length === 0) {
      toast.error("No hand detected. Show your hand to the camera.");
      return;
    }
    const lm = landmarks[0];
    setSamples([[...lm]]);
    setCapturePhase("done");
    toast.success(`✋ Hand captured for "${selectedLetter}"! Ready to save.`);
  }, [landmarks, selectedLetter]);

  const handleImageUpload = useCallback(
    async (file: File | null) => {
      if (!file || !selectedLetter) return;
      setIsImageUploading(true);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);
      try {
        const img = new Image();
        img.src = previewUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const lm = await extractHandLandmarksFromImage(img);
        if (!lm) {
          toast.error("Could not detect a hand in the uploaded image.");
          setIsImageUploading(false);
          return;
        }
        setSamples([[...lm]]);
        setCapturePhase("done");
        toast.success(`Image processed for "${selectedLetter}". Click Save to store gesture.`);
      } catch {
        toast.error("Failed to process uploaded image.");
      } finally {
        setIsImageUploading(false);
      }
    },
    [selectedLetter, imagePreviewUrl]
  );

  const handleSave = useCallback(async () => {
    if (!selectedLetter || samples.length < 1) return;
    const gesture: StoredGesture = {
      id: `alpha_${selectedLetter}_${Date.now()}`,
      name: `alpha_${selectedLetter}`,
      emoji: selectedLetter,
      hand: "right" as HandType,
      samples,
      createdAt: Date.now(),
    };
    await saveGesture(gesture);
    setTrainedLetters((prev) => new Set([...prev, selectedLetter]));
    setCapturePhase("idle");
    setSamples([]);
    toast.success(`Letter "${selectedLetter}" trained successfully!`);
  }, [selectedLetter, samples]);

  const handleDeleteLetter = useCallback(async (letter: string) => {
    const all = await getAllGestures();
    const toDelete = all.filter((g) => g.name === `alpha_${letter}`);
    for (const g of toDelete) {
      await deleteGesture(g.id);
    }
    setTrainedLetters((prev) => {
      const next = new Set(prev);
      next.delete(letter);
      return next;
    });
    if (selectedLetter === letter) {
      resetCapture();
    }
    toast.success(`Letter "${letter}" deleted.`);
  }, [selectedLetter, resetCapture]);

  return (
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
          <HandCanvas landmarks={landmarks} width={VIDEO_WIDTH} height={VIDEO_HEIGHT} />
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
                {isLoading ? "Loading AI model..." : "Start camera to train alphabets"}
              </p>
            </div>
          )}

          {/* Capture instruction overlay */}
          {capturePhase === "right" && (
            <div className="absolute top-0 left-0 right-0 bg-background/90 backdrop-blur-sm p-4 border-b border-primary/30 z-10">
              <div className="text-center space-y-1">
                <p className="text-2xl font-bold font-display text-primary">
                  {selectedLetter}
                </p>
                <p className="text-lg font-bold font-display text-accent">
                  ✋ Show your hand sign
                </p>
                <p className="text-sm text-foreground font-mono">
                  Hold steady and click Capture
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="border-t border-border p-4 space-y-3">
          <div className="flex gap-3">
            {!isRunning ? (
              <Button onClick={handleStart} disabled={isLoading} className="flex-1">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                {isLoading ? "Loading..." : "Start Camera"}
              </Button>
            ) : (
              <Button onClick={handleStop} variant="destructive" className="flex-1">
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            )}
          </div>

          {isRunning && selectedLetter && capturePhase !== "done" && (
            <div className="flex gap-3">
              {capturePhase === "idle" ? (
                <Button onClick={startCapturing} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                  <Camera className="mr-2 h-4 w-4" />
                  Start Training "{selectedLetter}"
                </Button>
              ) : (
                <Button
                  onClick={captureSample}
                  size="lg"
                  className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 text-base"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Capture Hand Sign
                </Button>
              )}
            </div>
          )}

          {/* Save */}
          <AnimatePresence>
            {capturePhase === "done" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 rounded-xl border border-accent/30 bg-accent/5 p-4"
              >
                <div className="flex items-center gap-2 text-sm text-accent">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Hand sign captured for "{selectedLetter}"!</span>
                </div>
                <Button onClick={handleSave} className="w-full gap-2">
                  Save Letter "{selectedLetter}"
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sidebar — alphabet grid */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Select Letter to Train
          </h3>
          <div className="grid grid-cols-6 gap-2">
            {ALPHABET.map((letter) => {
              const isTrained = trainedLetters.has(letter);
              const isSelected = selectedLetter === letter;
              return (
                <button
                  key={letter}
                  onClick={() => selectLetter(letter)}
                  className={`relative flex h-10 w-full items-center justify-center rounded-lg text-sm font-bold font-mono transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                      : isTrained
                        ? "bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  }`}
                >
                  {letter}
                  {isTrained && (
                    <CheckCircle2 className="absolute -top-1 -right-1 h-3.5 w-3.5 text-accent" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-accent/20 border border-accent/30" />
              Trained
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-secondary" />
              Not trained
            </div>
          </div>
        </div>

        {/* Trained count & media */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Progress
          </h3>
          <p className="text-2xl font-bold font-display text-foreground">
            {trainedLetters.size}<span className="text-muted-foreground text-lg">/{ALPHABET.length}</span>
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(trainedLetters.size / ALPHABET.length) * 100}%` }}
            />
          </div>

          {/* Delete trained letter */}
          {selectedLetter && trainedLetters.has(selectedLetter) && (
            <Button
              variant="destructive"
              size="sm"
              className="mt-3 w-full gap-2"
              onClick={() => handleDeleteLetter(selectedLetter)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Re-train "{selectedLetter}"
            </Button>
          )}

          {selectedLetter && (
            <div className="mt-4 space-y-3">
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
                  Voice for "{selectedLetter}"
                </h4>
                <LetterVoiceControls token={selectedLetter} />
              </div>
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
                  Image for "{selectedLetter}"
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    id="alpha-train-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleImageUpload(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={isImageUploading}
                    onClick={() => document.getElementById("alpha-train-upload")?.click()}
                  >
                    {isImageUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Upload Image
                  </Button>
                  {imagePreviewUrl && (
                    <img
                      src={imagePreviewUrl}
                      alt="Uploaded alphabet gesture"
                      className="h-10 w-10 rounded-md border border-border object-cover"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── DETECT TAB ─── */
function AlphabetDetect() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isLoading, isRunning, landmarks, error, start, stop } = useHandDetection("alphabet");
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const { speak } = useTextToSpeech();

  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [formedText, setFormedText] = useState("");
  const [letterHistory, setLetterHistory] = useState<string[]>([]);
  const [lastSpoken, setLastSpoken] = useState<string | null>(null);

  const alphabetGesturesRef = useRef<StoredGesture[]>([]);
  const stableLetterRef = useRef<string | null>(null);
  const stableCountRef = useRef(0);
  const lastAddedTimeRef = useRef(0);

  const STABLE_FRAMES = 15; // Need 15 consecutive frames (~1.5s) to confirm a letter
  const ADD_COOLDOWN = 2000; // 2s cooldown between adding letters

  // Load alphabet gestures
  useEffect(() => {
    const load = async () => {
      const all = await getAllGestures();
      alphabetGesturesRef.current = all.filter((g) => g.name.startsWith("alpha_"));
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  // Detection loop
  useEffect(() => {
    if (!isRunning || !landmarks || landmarks.length === 0) {
      setCurrentLetter(null);
      setConfidence(0);
      return;
    }

    const lm = landmarks[0] as Landmark[];
    const alphaGestures = alphabetGesturesRef.current;
    if (alphaGestures.length === 0) return;

    const match = matchCustomGesture(lm, alphaGestures);
    if (match && match.confidence > 0.3) {
      const letter = match.name.replace("alpha_", "");
      setCurrentLetter(letter);
      setConfidence(match.confidence);

      // Stability check
      if (letter === stableLetterRef.current) {
        stableCountRef.current++;
        const now = Date.now();
        if (stableCountRef.current >= STABLE_FRAMES && now - lastAddedTimeRef.current > ADD_COOLDOWN) {
          // Letter confirmed — add to text
          setFormedText((prev) => prev + letter);
          setLetterHistory((prev) => [...prev, letter]);
          lastAddedTimeRef.current = now;
          stableCountRef.current = 0;

          if (speechEnabled) {
            speak(letter);
            setLastSpoken(letter);
          }
        }
      } else {
        stableLetterRef.current = letter;
        stableCountRef.current = 1;
      }
    } else {
      setCurrentLetter(null);
      setConfidence(0);
      stableLetterRef.current = null;
      stableCountRef.current = 0;
    }
  }, [landmarks, isRunning, speechEnabled, speak]);

  const handleStart = useCallback(async () => {
    if (videoRef.current) await start(videoRef.current);
  }, [start]);

  const handleStop = useCallback(() => {
    stop();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    setCurrentLetter(null);
    setConfidence(0);
  }, [stop]);

  const addSpace = useCallback(() => {
    setFormedText((prev) => prev + " ");
    setLetterHistory((prev) => [...prev, "␣"]);
  }, []);

  const deleteLastChar = useCallback(() => {
    setFormedText((prev) => prev.slice(0, -1));
    setLetterHistory((prev) => prev.slice(0, -1));
  }, []);

  const clearText = useCallback(() => {
    setFormedText("");
    setLetterHistory([]);
  }, []);

  const replaySpeech = useCallback(() => {
    if (!lastSpoken) return;
    speak(lastSpoken);
  }, [lastSpoken, speak]);

  const stabilityProgress = currentLetter
    ? Math.min((stableCountRef.current / STABLE_FRAMES) * 100, 100)
    : 0;

  return (
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
          <HandCanvas landmarks={landmarks} width={VIDEO_WIDTH} height={VIDEO_HEIGHT} />
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
                  {isLoading ? "Loading AI model..." : "Start to detect alphabets"}
                </p>
              </div>
            </div>
          )}

          {/* Current detected letter overlay */}
          {isRunning && currentLetter && (
            <div className="absolute top-3 right-3 z-10">
              <motion.div
                key={currentLetter}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-primary/50 bg-background/90 backdrop-blur-sm glow-primary"
              >
                <span className="text-4xl font-bold font-display text-primary">
                  {currentLetter}
                </span>
              </motion.div>
              {/* Stability progress ring */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  animate={{ width: `${stabilityProgress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <p className="text-center text-[10px] font-mono text-muted-foreground mt-1">
                Hold steady...
              </p>
            </div>
          )}

          {/* Live indicator */}
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
            <Button onClick={handleStart} disabled={isLoading} className="flex-1 glow-primary">
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
            <Button onClick={handleStop} variant="destructive" className="flex-1">
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSpeechEnabled(!speechEnabled)}
            className="border-border"
          >
            {speechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={replaySpeech}
            disabled={!lastSpoken}
            className="border-border"
            title={lastSpoken ? `Speak "${lastSpoken}"` : "Nothing to replay"}
          >
            <Speaker className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sidebar — formed text */}
      <div className="flex flex-col gap-4">
        {/* Formed text display */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Formed Text
          </h3>
          <div className="min-h-[80px] rounded-xl border border-border bg-secondary/50 p-4">
            {formedText ? (
              <p className="text-2xl font-bold font-display text-foreground break-all leading-relaxed tracking-wide">
                {formedText.split("").map((char, i) => (
                  <motion.span
                    key={`${char}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={char === " " ? "inline-block w-3" : ""}
                  >
                    {char}
                  </motion.span>
                ))}
                <span className="animate-pulse text-primary">|</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground font-mono">
                Sign letters to form words...
              </p>
            )}
          </div>

          {/* Text controls */}
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={addSpace} className="flex-1 gap-1.5">
              ␣ Space
            </Button>
            <Button variant="outline" size="sm" onClick={deleteLastChar} className="flex-1 gap-1.5">
              ← Delete
            </Button>
            <Button variant="destructive" size="sm" onClick={clearText} className="gap-1.5">
              Clear
            </Button>
          </div>
        </div>

        {/* Current detection info */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Detection
          </h3>
          <AnimatePresence mode="wait">
            {currentLetter ? (
              <motion.div
                key={currentLetter}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-center"
              >
                <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 glow-primary">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-primary font-display">{currentLetter}</span>
                    <span className="text-2xl">{getEmojiForToken(currentLetter) ?? "🖐️"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground font-mono">Confidence</span>
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        confidence > 0.8 ? "bg-accent" : confidence > 0.6 ? "bg-primary" : "bg-destructive"
                      }`}
                      style={{ width: `${Math.round(confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-foreground">{Math.round(confidence * 100)}%</span>
                </div>
                <div className="mt-3 flex justify-center">
                  <Button size="sm" variant="outline" className="gap-2" onClick={replaySpeech} disabled={!lastSpoken}>
                    <Speaker className="h-4 w-4" />
                    Speak
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.p
                key="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-muted-foreground font-mono text-center"
              >
                Show a letter sign...
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Letter history */}
        <div className="rounded-2xl border border-border bg-card p-4 flex-1">
          <h3 className="mb-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Letter History
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {letterHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground">No letters detected yet</p>
            ) : (
              letterHistory.map((l, i) => (
                <motion.span
                  key={`${l}-${i}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-md bg-secondary px-2 py-1 text-xs font-mono text-secondary-foreground"
                >
                  {l}
                </motion.span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
