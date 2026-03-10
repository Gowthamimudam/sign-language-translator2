/**
 * Estimate palm facing direction from MediaPipe hand landmarks.
 * Uses wrist (0), middle finger MCP (9), and index finger MCP (5) to determine orientation.
 */

import type { Landmark } from "./gestureClassifier";

export type Direction = "NORTH" | "WEST" | "SOUTH" | "EAST";

export const DIRECTION_LABELS: Record<Direction, string> = {
  NORTH: "Front (facing camera)",
  WEST: "Left direction",
  SOUTH: "Down direction",
  EAST: "Right direction",
};

export const DIRECTION_INSTRUCTIONS: Record<Direction, string> = {
  NORTH: "Show the gesture facing NORTH (front direction)",
  WEST: "Rotate your hand slightly and show the same gesture facing WEST (left direction)",
  SOUTH: "Rotate your hand and show the same gesture facing SOUTH (down direction)",
  EAST: "Rotate your hand and show the same gesture facing EAST (right direction)",
};

export const DIRECTIONS_ORDER: Direction[] = ["NORTH", "WEST", "SOUTH", "EAST"];

/**
 * Detect the rough palm-facing direction based on landmark positions.
 * We use the vector from the wrist (0) to the middle finger MCP (9) to determine
 * the primary axis the hand is pointing toward.
 */
export function detectPalmDirection(landmarks: Landmark[]): Direction {
  if (landmarks.length < 21) return "NORTH";

  const wrist = landmarks[0];
  const middleMCP = landmarks[9];

  // Vector from wrist to middle finger MCP
  const dx = middleMCP.x - wrist.x;
  const dy = middleMCP.y - wrist.y;

  // In MediaPipe normalized coords: x goes left→right, y goes top→bottom
  // "NORTH" = fingers pointing up (dy is very negative)
  // "SOUTH" = fingers pointing down (dy is very positive)
  // "WEST"  = fingers pointing left (dx is very negative)
  // "EAST"  = fingers pointing right (dx is very positive)

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDy > absDx) {
    // Primarily vertical
    return dy < 0 ? "NORTH" : "SOUTH";
  } else {
    // Primarily horizontal
    return dx < 0 ? "WEST" : "EAST";
  }
}

/**
 * Check if detected direction matches expected direction.
 */
export function isCorrectDirection(
  landmarks: Landmark[],
  expected: Direction
): boolean {
  return detectPalmDirection(landmarks) === expected;
}
