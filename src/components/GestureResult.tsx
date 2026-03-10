import { motion, AnimatePresence } from "framer-motion";
import type { GestureResult as GestureResultType } from "@/lib/gestureClassifier";

interface Props {
  gesture: GestureResultType | null;
  isSpeaking: boolean;
}

export default function GestureResultDisplay({ gesture, isSpeaking }: Props) {
  return (
    <div className="flex flex-col items-center gap-4">
      <AnimatePresence mode="wait">
        {gesture && gesture.gesture !== "Unknown" ? (
          <motion.div
            key={gesture.gesture}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="rounded-2xl border border-primary/40 bg-primary/10 px-8 py-4 glow-primary">
              <h2 className="text-4xl font-bold text-primary font-display tracking-tight">
                {gesture.gesture}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <ConfidenceBar confidence={gesture.confidence} />
              {isSpeaking && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent"
                >
                  🔊
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="no-gesture"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-muted-foreground text-sm font-mono"
          >
            Show a hand gesture to the camera...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  const color =
    percent > 80
      ? "bg-accent"
      : percent > 60
        ? "bg-primary"
        : "bg-destructive";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-mono">Confidence</span>
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <span className="text-xs font-mono text-foreground">{percent}%</span>
    </div>
  );
}
