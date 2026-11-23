/**
 * Standard Flyer Sizing & Formatting Engine for Mobile Viewers
 *
 * For mobile shopping applications, the optimal flyer canvas is 9:16 vertical (1080 × 1920 px).
 * - Matches modern smartphone displays (iPhone, Samsung Galaxy, Pixel)
 * - Eliminates awkward horizontal letterboxing or microscopic text
 * - Provides standardized coordinates for interactive product hotspots
 * - Maintains crisp Retina clarity for fine print while keeping file sizes lightweight
 */

export const RECOMMENDED_FLYER_WIDTH = 1080;
export const RECOMMENDED_FLYER_HEIGHT = 1920;
export const RECOMMENDED_FLYER_ASPECT_RATIO = Number((1920 / 1080).toFixed(4)); // 1.7778 (height/width)
export const ASPECT_RATIO_TOLERANCE = 0.04; // 4% tolerance threshold

export interface FlyerSizePreset {
  id: string;
  name: string;
  ratioLabel: string;
  width: number;
  height: number;
  aspectRatio: number; // height / width
  description: string;
  isRecommended?: boolean | undefined;
}

export const FLYER_SIZE_PRESETS: FlyerSizePreset[] = [
  {
    id: "9:16",
    name: "Mobile Fullscreen",
    ratioLabel: "9:16",
    width: 1080,
    height: 1920,
    aspectRatio: Number((1920 / 1080).toFixed(4)), // 1.7778
    description: "Full smartphone display canvas. Maximum immersion for mobile app users.",
    isRecommended: true,
  },
  {
    id: "4:5",
    name: "Mobile Feed & Card",
    ratioLabel: "4:5",
    width: 1080,
    height: 1350,
    aspectRatio: Number((1350 / 1080).toFixed(4)), // 1.2500
    description: "Compact vertical card format. Popular in social feeds and promotional highlights.",
  },
  {
    id: "3:4",
    name: "Tablet & Catalog",
    ratioLabel: "3:4",
    width: 1080,
    height: 1440,
    aspectRatio: Number((1440 / 1080).toFixed(4)), // 1.3333
    description: "Balanced proportions for tablets, iPad circular viewers, and web carousels.",
  },
  {
    id: "1:1.414",
    name: "Traditional Print (A4)",
    ratioLabel: "1:1.414",
    width: 1080,
    height: 1528,
    aspectRatio: 1.4142,
    description: "Legacy paper flyer print format. Often requires horizontal zooming on phones.",
  },
];

/**
 * Long scrolling flyers (height / width at or above this) are published as-is:
 * the customer app scrolls them, so they never need to be cropped or letterboxed.
 */
export const LONG_FLYER_MIN_RATIO = 1.8;

export function isLongScrollFlyer(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false;
  return height / width >= LONG_FLYER_MIN_RATIO;
}

export interface SizingEvaluation {
  isMatch: boolean;
  aspectRatio: number;
  targetRatio: number;
  deviation: number;
  status: "optimal" | "acceptable" | "mismatch";
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  label: string;
  message: string;
  currentDimensions: { width: number; height: number };
  recommendedDimensions: { width: number; height: number };
}

/**
 * Evaluates whether an uploaded image matches the recommended 9:16 mobile standard.
 */
export function evaluateFlyerSizing(
  width: number,
  height: number,
  targetRatio: number = RECOMMENDED_FLYER_ASPECT_RATIO,
  tolerance: number = ASPECT_RATIO_TOLERANCE
): SizingEvaluation {
  if (width <= 0 || height <= 0) {
    return {
      isMatch: false,
      aspectRatio: 1.7778,
      targetRatio,
      deviation: 0,
      status: "mismatch",
      badgeVariant: "destructive",
      label: "Invalid Dimensions",
      message: "Could not detect flyer dimensions.",
      currentDimensions: { width: 0, height: 0 },
      recommendedDimensions: { width: RECOMMENDED_FLYER_WIDTH, height: RECOMMENDED_FLYER_HEIGHT },
    };
  }

  const actualRatio = Number((height / width).toFixed(4));
  const deviation = Math.abs(actualRatio - targetRatio) / targetRatio;
  const isMatch = deviation <= tolerance;

  const currentDimensions = { width, height };
  const recommendedDimensions = {
    width: RECOMMENDED_FLYER_WIDTH,
    height: RECOMMENDED_FLYER_HEIGHT,
  };

  if (isMatch) {
    return {
      isMatch: true,
      aspectRatio: actualRatio,
      targetRatio,
      deviation,
      status: "optimal",
      badgeVariant: "default",
      label: "9:16 Mobile Standard",
      message: `Optimal mobile aspect ratio detected (${width} × ${height} px). Circular is primed for smartphone screens.`,
      currentDimensions,
      recommendedDimensions,
    };
  }

  if (deviation <= 0.08) {
    return {
      isMatch: true,
      aspectRatio: actualRatio,
      targetRatio,
      deviation,
      status: "acceptable",
      badgeVariant: "secondary",
      label: "Near 9:16 Format",
      message: `Image is close to mobile standard (${actualRatio.toFixed(2)} ratio). Sizing is acceptable, but adjusting to 1080 × 1920 ensures pixel-perfect framing.`,
      currentDimensions,
      recommendedDimensions,
    };
  }

  // Mismatch
  const detectedFormat =
    actualRatio < 1.0
      ? "Landscape"
      : Math.abs(actualRatio - 1.0) < 0.05
      ? "Square 1:1"
      : actualRatio <= 1.45
      ? "Print A4 / Letter (approx 1:1.4)"
      : "Non-standard vertical";

  return {
    isMatch: false,
    aspectRatio: actualRatio,
    targetRatio,
    deviation,
    status: "mismatch",
    badgeVariant: "destructive",
    label: `${detectedFormat} (${actualRatio.toFixed(2)})`,
    message: `Format mismatch: ${width} × ${height} px (${detectedFormat}). For the best mobile app experience, circulars should be 9:16 (1080 × 1920 px) to prevent awkward letterboxing.`,
    currentDimensions,
    recommendedDimensions,
  };
}

export type FlyerCropMode = "fit" | "crop";
export type FlyerCropAlignment = "top" | "center" | "bottom";

export interface FlyerRenderOptions {
  mode: FlyerCropMode;
  targetWidth?: number | undefined;
  targetHeight?: number | undefined;
  alignment?: FlyerCropAlignment | undefined;
  zoom?: number; // 1.0 to 3.0
  panOffset?: { x: number; y: number }; // normalized pan [-1, 1]
  backgroundColor?: string; // for fit mode, e.g. '#FFFFFF'
}

/**
 * Calculates positioning parameters for rendering an image onto target canvas.
 */
export function calculateCanvasRenderBounds(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  mode: FlyerCropMode,
  alignment: FlyerCropAlignment = "center",
  zoom: number = 1.0,
  panOffset: { x: number; y: number } = { x: 0, y: 0 }
) {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { drawX: 0, drawY: 0, drawWidth: targetWidth, drawHeight: targetHeight };
  }

  if (mode === "fit") {
    // Proportional fit: preserve full image inside target canvas with padding borders
    const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const drawWidth = Math.round(sourceWidth * scale);
    const drawHeight = Math.round(sourceHeight * scale);
    const drawX = Math.round((targetWidth - drawWidth) / 2);
    const drawY = Math.round((targetHeight - drawHeight) / 2);

    return { drawX, drawY, drawWidth, drawHeight };
  }

  // mode === 'crop' (Fill target canvas)
  const baseScale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const effectiveScale = baseScale * Math.max(1, zoom);

  const drawWidth = Math.round(sourceWidth * effectiveScale);
  const drawHeight = Math.round(sourceHeight * effectiveScale);

  // Default alignment anchor
  let baseX = (targetWidth - drawWidth) / 2;
  let baseY = (targetHeight - drawHeight) / 2;

  if (alignment === "top") {
    baseY = 0;
  } else if (alignment === "bottom") {
    baseY = targetHeight - drawHeight;
  }

  // Apply pan offsets with boundaries
  const maxPanX = Math.max(0, (drawWidth - targetWidth) / 2);
  const maxPanY = Math.max(0, (drawHeight - targetHeight) / 2);

  const boundedPanX = Math.max(-maxPanX, Math.min(maxPanX, panOffset.x));
  const boundedPanY = Math.max(-maxPanY, Math.min(maxPanY, panOffset.y));

  const drawX = Math.round(baseX + boundedPanX);
  const drawY = Math.round(baseY + boundedPanY);

  return { drawX, drawY, drawWidth, drawHeight };
}

/**
 * Renders an image element onto an offscreen canvas with the specified sizing and cropping options.
 */
export function renderFlyerToCanvas(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  options: FlyerRenderOptions
): HTMLCanvasElement {
  const targetWidth = options.targetWidth || RECOMMENDED_FLYER_WIDTH;
  const targetHeight = options.targetHeight || RECOMMENDED_FLYER_HEIGHT;

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to obtain 2D canvas context");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Fill background
  const bgColor = options.backgroundColor || "#FFFFFF";
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const srcWidth =
    imageSource instanceof HTMLImageElement
      ? imageSource.naturalWidth || imageSource.width
      : imageSource.width;
  const srcHeight =
    imageSource instanceof HTMLImageElement
      ? imageSource.naturalHeight || imageSource.height
      : imageSource.height;

  const bounds = calculateCanvasRenderBounds(
    srcWidth,
    srcHeight,
    targetWidth,
    targetHeight,
    options.mode,
    options.alignment,
    options.zoom,
    options.panOffset
  );

  ctx.drawImage(
    imageSource,
    0,
    0,
    srcWidth,
    srcHeight,
    bounds.drawX,
    bounds.drawY,
    bounds.drawWidth,
    bounds.drawHeight
  );

  return canvas;
}

/**
 * Converts a Canvas element to a high-quality File object.
 */
export function canvasToFile(
  canvas: HTMLCanvasElement,
  filename: string = "mobile-flyer-1080x1920.jpg",
  quality: number = 0.92
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas conversion to Blob failed"));
          return;
        }
        const file = new File([blob], filename, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        resolve(file);
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Loads an image from a URL or Blob and returns an HTMLImageElement.
 */
export function loadImageElement(source: string | File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error("Failed to load image source"));

    if (typeof source === "string") {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}
