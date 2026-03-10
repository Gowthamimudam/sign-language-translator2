import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Sparkles, Mic, MicOff, Play, Upload, Pencil, X, Check, Save, Download, FileUp } from "lucide-react";
import { getAllGestures, deleteGesture, saveGesture, exportGestures, importGestures, type StoredGesture } from "@/lib/gestureStore";
import { saveVoice, getVoice, deleteVoice } from "@/lib/voiceStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";


function VoiceRecordButton({ gestureName }: { gestureName: string }) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getVoice(gestureName).then((v) => setHasVoice(!!v));
  }, [gestureName]);

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
        await saveVoice(gestureName, blob);
        stream.getTracks().forEach((t) => t.stop());
        setHasVoice(true);
        toast.success(`Voice recorded for "${gestureName}"`);
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  }, [gestureName]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const playVoice = useCallback(async () => {
    const v = await getVoice(gestureName);
    if (v) {
      const url = URL.createObjectURL(v.audioBlob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play();
    }
  }, [gestureName]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      toast.error("Please upload an audio file");
      return;
    }
    await saveVoice(gestureName, file);
    setHasVoice(true);
    toast.success(`Voice uploaded for "${gestureName}"`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [gestureName]);

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


export default function GestureLibrary() {
  const navigate = useNavigate();
  const [customGestures, setCustomGestures] = useState<StoredGesture[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingGesture, setEditingGesture] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  const refreshLibrary = useCallback(async () => {
    const all = await getAllGestures();
    setCustomGestures(all.filter((g) => !g.name.startsWith("alpha_") && !g.name.startsWith("num_")));
  }, []);

  const handleExport = useCallback(async () => {
    await exportGestures();
    toast.success("Gestures exported!");
  }, []);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const count = await importGestures(file);
      await refreshLibrary();
      toast.success(`Imported ${count} gesture(s)!`);
    } catch {
      toast.error("Invalid gesture file");
    }
    if (importInputRef.current) importInputRef.current.value = "";
  }, [refreshLibrary]);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteGesture(deleteTarget.id);
    await deleteVoice(deleteTarget.name);
    await refreshLibrary();
    toast.success("Gesture removed from library.");
    setDeleteTarget(null);
  }, [deleteTarget, refreshLibrary]);

  const startEditing = useCallback((gesture: StoredGesture) => {
    setEditingGesture(gesture.id);
    setEditName(gesture.name);
    setEditEmoji(gesture.emoji || "👋");
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingGesture(null);
    setEditName("");
    setEditEmoji("");
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingGesture || !editName.trim()) return;
    const gesture = customGestures.find((g) => g.id === editingGesture);
    if (!gesture) return;

    const oldName = gesture.name;
    const updated: StoredGesture = {
      ...gesture,
      name: editName.trim(),
      emoji: editEmoji.trim() || "👋",
    };
    await saveGesture(updated);

    // If name changed, migrate voice
    if (oldName !== editName.trim()) {
      const voice = await getVoice(oldName);
      if (voice) {
        await saveVoice(editName.trim(), voice.audioBlob);
        await deleteVoice(oldName);
      }
    }

    await refreshLibrary();
    setEditingGesture(null);
    toast.success(`Gesture updated to "${editName.trim()}"`);
  }, [editingGesture, editName, editEmoji, customGestures, refreshLibrary]);

  const toggleEditMode = useCallback(() => {
    setEditMode((prev) => !prev);
    setEditingGesture(null);
  }, []);

  return (
    <div className="container pt-24 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl"
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold font-display">
            Gesture <span className="text-gradient">Library</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your trained gestures. Train new gestures from the Training page.
          </p>
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />

        <div className="mb-6 rounded-2xl border border-border bg-card/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Import your backup JSON to restore trained gestures.</p>
            <Button
              variant="default"
              className="rounded-xl px-8 gap-2"
              onClick={() => importInputRef.current?.click()}
            >
              <FileUp className="h-4 w-4" />
              Import Gestures
            </Button>
          </div>
        </div>

        {customGestures.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium text-lg">No gestures yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Go to the Training page to teach your first gesture.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button className="rounded-xl px-8" onClick={() => navigate("/train")}>
                Train a Gesture
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="mb-5 flex items-center gap-2 text-sm font-mono uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-4 w-4 text-accent" />
              Your Gestures ({customGestures.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {customGestures.map((g, i) => {
                  const isEditing = editingGesture === g.id;
                  return (
                    <motion.div
                      key={g.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: i * 0.05 }}
                      className={`group relative rounded-2xl border p-5 transition-all ${
                        isEditing
                          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                          : editMode
                            ? "border-accent/30 bg-accent/5 hover:border-accent/50 cursor-pointer"
                            : "border-border/60 bg-card/50 hover:border-primary/20 hover:bg-card"
                      }`}
                      onClick={() => {
                        if (editMode && !isEditing) startEditing(g);
                      }}
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Input
                              value={editEmoji}
                              onChange={(e) => setEditEmoji(e.target.value)}
                              className="w-14 text-center text-xl bg-secondary border-border"
                              maxLength={4}
                            />
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 bg-secondary border-border"
                              placeholder="Gesture name"
                              autoFocus
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveEdit} className="flex-1 gap-1.5">
                              <Check className="h-3.5 w-3.5" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditing} className="gap-1.5">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="text-2xl mb-2 block">{g.emoji || "👋"}</span>
                          <h3 className="font-semibold text-foreground font-display text-lg">{g.name}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Both hands • {g.samples.length} sample{g.samples.length !== 1 ? "s" : ""}
                          </p>
                          {!editMode && (
                            <div className="flex items-center gap-1 mt-2">
                              <VoiceRecordButton gestureName={g.name} />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 ml-auto text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteTarget({ id: g.id, name: g.name })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                          {editMode && !isEditing && (
                            <div className="mt-3 text-xs font-mono text-accent flex items-center gap-1">
                              <Pencil className="h-3 w-3" /> Click to edit
                            </div>
                          )}
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                onClick={toggleEditMode}
                variant={editMode ? "default" : "outline"}
                size="lg"
                className={`gap-2 rounded-xl px-10 h-12 text-base ${editMode ? "glow-primary" : "hover:border-primary/40"}`}
              >
                {editMode ? (
                  <>
                    <Check className="h-5 w-5" />
                    Done Editing
                  </>
                ) : (
                  <>
                    <Pencil className="h-5 w-5" />
                    Edit Gestures
                  </>
                )}
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                size="lg"
                className="gap-2 rounded-xl px-8 h-12 text-base hover:border-primary/40"
              >
                <Download className="h-5 w-5" />
                Export
              </Button>
              <Button
                onClick={() => importInputRef.current?.click()}
                variant="outline"
                size="lg"
                className="gap-2 rounded-xl px-8 h-12 text-base hover:border-primary/40"
              >
                <FileUp className="h-5 w-5" />
                Import
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      <div className="fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => importInputRef.current?.click()}
          size="lg"
          className="rounded-full px-6 h-12 gap-2 shadow-lg"
          aria-label="Import gestures backup"
        >
          <FileUp className="h-5 w-5" />
          Import Gestures
        </Button>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this gesture?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" and its samples will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
