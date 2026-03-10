export type GestureToken = string; // e.g. "A", "7"

export const EMOJI_MAPPING: Record<string, string> = {
  A: "🍎",
  B: "🐝",
  C: "🐱",
  D: "🐶",
  E: "🥚",
  F: "🐟",
  G: "🍇",
  H: "🏠",
  I: "🍦",
  J: "🕹️",
  K: "🔑",
  L: "🦁",
  M: "🌝",
  N: "🌃",
  O: "🐙",
  P: "🥞",
  Q: "👸",
  R: "🌈",
  S: "⭐",
  T: "🌴",
  U: "☂️",
  V: "🎻",
  W: "🌊",
  X: "❌",
  Y: "🧶",
  Z: "🦓",

  "0": "0️⃣",
  "1": "1️⃣",
  "2": "2️⃣",
  "3": "3️⃣",
  "4": "4️⃣",
  "5": "5️⃣",
  "6": "6️⃣",
  "7": "7️⃣",
  "8": "8️⃣",
  "9": "9️⃣",
};

export function getEmojiForToken(token: GestureToken | null | undefined): string | null {
  if (!token) return null;
  return EMOJI_MAPPING[token] ?? null;
}

