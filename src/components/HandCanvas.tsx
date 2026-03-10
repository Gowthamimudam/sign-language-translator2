import { useEffect, useRef } from "react";
import type { Landmark } from "@/lib/gestureClassifier";

// MediaPipe hand connections
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

interface Props {
  landmarks: Landmark[][] | null;
  width: number;
  height: number;
}

export default function HandCanvas({ landmarks, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (!landmarks) return;

    for (const hand of landmarks) {
      // Draw connections
      ctx.strokeStyle = "hsl(185, 100%, 50%)";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      for (const [start, end] of CONNECTIONS) {
        const a = hand[start];
        const b = hand[end];
        ctx.beginPath();
        ctx.moveTo(a.x * width, a.y * height);
        ctx.lineTo(b.x * width, b.y * height);
        ctx.stroke();
      }

      // Draw landmarks
      ctx.globalAlpha = 1;
      for (let i = 0; i < hand.length; i++) {
        const lm = hand[i];
        const x = lm.x * width;
        const y = lm.y * height;
        const radius = i === 0 ? 6 : i % 4 === 0 ? 5 : 3;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = i % 4 === 0 ? "hsl(150, 100%, 45%)" : "hsl(185, 100%, 50%)";
        ctx.fill();

        // Glow effect on fingertips
        if (i % 4 === 0 && i > 0) {
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, 2 * Math.PI);
          ctx.fillStyle = "hsla(150, 100%, 45%, 0.15)";
          ctx.fill();
        }
      }
    }
  }, [landmarks, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
    />
  );
}
