/**
 * IndexedDB-based storage for recorded voice clips per gesture name.
 */

const DB_NAME = "signspeak-voices";
const DB_VERSION = 1;
const STORE_NAME = "voice_clips";

export interface StoredVoice {
  gestureName: string; // key
  audioBlob: Blob;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "gestureName" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVoice(gestureName: string, audioBlob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ gestureName, audioBlob, createdAt: Date.now() } as StoredVoice);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getVoice(gestureName: string): Promise<StoredVoice | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(gestureName);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllVoices(): Promise<StoredVoice[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteVoice(gestureName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(gestureName);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Play a recorded voice clip. Returns true if a recording exists and was played.
 */
export async function playRecordedVoice(gestureName: string): Promise<boolean> {
  const voice = await getVoice(gestureName);
  if (!voice) return false;
  const url = URL.createObjectURL(voice.audioBlob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  await audio.play();
  return true;
}
