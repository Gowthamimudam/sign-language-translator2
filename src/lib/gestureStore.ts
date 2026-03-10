/**
 * IndexedDB-based storage for custom trained gestures.
 * Each gesture stores multiple landmark samples for matching.
 */

import type { Landmark } from "./gestureClassifier";

export type HandType = "left" | "right" | "both";

export interface StoredGesture {
  id: string;
  name: string;
  emoji: string; // user-chosen emoji for this gesture
  hand: HandType; // which hand this gesture is for
  samples: Landmark[][]; // each sample is 21 landmarks
  createdAt: number;
}

const DB_NAME = "signspeak-gestures";
const DB_VERSION = 3;
const STORE_NAME = "custom_gestures";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      // Clean up legacy store from removed built-in gesture tracking
      if (db.objectStoreNames.contains("deleted_builtin_gestures")) {
        db.deleteObjectStore("deleted_builtin_gestures");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllGestures(): Promise<StoredGesture[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveGesture(gesture: StoredGesture): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(gesture);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteGesture(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Normalize landmarks relative to wrist (index 0) and scale to unit size.
 * This makes matching position/scale invariant.
 */
export function normalizeLandmarks(landmarks: Landmark[]): number[] {
  const wrist = landmarks[0];
  const points = landmarks.map((l) => ({
    x: l.x - wrist.x,
    y: l.y - wrist.y,
    z: l.z - wrist.z,
  }));

  // Find max distance for scale normalization
  let maxDist = 0;
  for (const p of points) {
    const d = Math.sqrt(p.x ** 2 + p.y ** 2 + p.z ** 2);
    if (d > maxDist) maxDist = d;
  }
  if (maxDist === 0) maxDist = 1;

  const flat: number[] = [];
  for (const p of points) {
    flat.push(p.x / maxDist, p.y / maxDist, p.z / maxDist);
  }
  return flat;
}

/**
 * Compare two normalized landmark vectors using euclidean distance.
 */
export function landmarkDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum / a.length);
}

/**
 * Match live landmarks against all stored custom gestures.
 * Returns the best match if distance is below threshold.
 */
export function matchCustomGesture(
  liveLandmarks: Landmark[],
  storedGestures: StoredGesture[],
  threshold = 0.25
): { name: string; confidence: number } | null {
  const liveNorm = normalizeLandmarks(liveLandmarks);
  let bestName = "";
  let bestDist = Infinity;

  for (const gesture of storedGestures) {
    // Use minimum distance across samples (best match) for more precise detection
    let minDist = Infinity;
    for (const sample of gesture.samples) {
      const sampleNorm = normalizeLandmarks(sample);
      const dist = landmarkDistance(liveNorm, sampleNorm);
      if (dist < minDist) minDist = dist;
    }
    const avgDist = minDist;

    if (avgDist < bestDist) {
      bestDist = avgDist;
      bestName = gesture.name;
    }
  }

  if (bestDist < threshold && bestName) {
    // Convert distance to confidence (0 dist = 1.0 confidence)
    const confidence = Math.max(0, Math.min(1, 1 - bestDist / threshold));
    return { name: bestName, confidence };
  }

  return null;
}

/**
 * Export all gestures as a JSON file download.
 */
export async function exportGestures(): Promise<void> {
  const gestures = await getAllGestures();
  const data = JSON.stringify(gestures, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `signspeak-gestures-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import gestures from a JSON file, merging with existing ones.
 */
export async function importGestures(file: File): Promise<number> {
  const text = await file.text();
  const gestures: StoredGesture[] = JSON.parse(text);
  let count = 0;
  for (const g of gestures) {
    if (g.id && g.name && g.samples) {
      await saveGesture(g);
      count++;
    }
  }
  return count;
}
