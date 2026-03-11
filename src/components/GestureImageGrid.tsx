import { useEffect, useMemo, useState } from "react";
import type { StoredGesture } from "@/lib/gestureStore";

function useObjectUrl(blob?: Blob) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

function ImageCard({ label, blob }: { label: string; blob?: Blob }) {
  const url = useObjectUrl(blob);
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted border border-border">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-mono text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-xs font-mono text-muted-foreground">
        Label: <span className="text-foreground font-semibold">{label}</span>
      </p>
    </div>
  );
}

export function GestureImageGrid({
  gestures,
  getLabel,
  title,
}: {
  gestures: StoredGesture[];
  getLabel: (g: StoredGesture) => string;
  title: string;
}) {
  const items = useMemo(
    () => gestures.filter((g) => !!g.imageBlob),
    [gestures]
  );

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 text-xs font-mono uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((g) => (
          <ImageCard key={g.id} label={getLabel(g)} blob={g.imageBlob} />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground font-mono">
        Images are stored locally and persist after refresh.
      </p>
    </div>
  );
}

