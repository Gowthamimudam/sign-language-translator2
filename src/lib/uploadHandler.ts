import type { GestureFilter } from "@/hooks/useHandDetection";
import { detectCustomGestureFromImageSource, type ImageDetectionResult } from "@/lib/gestureDetection";

export interface UploadProcessResult {
  previewUrl: string;
  detection: ImageDetectionResult | null;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

export async function processUploadedGestureImage(
  file: File,
  filter: GestureFilter
): Promise<UploadProcessResult> {
  const previewUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(previewUrl);
    const detection = await detectCustomGestureFromImageSource(img, filter);
    return { previewUrl, detection };
  } catch {
    return { previewUrl, detection: null };
  }
}

