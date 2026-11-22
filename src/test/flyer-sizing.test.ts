import { describe, expect, it } from "vitest";
import {
  RECOMMENDED_FLYER_WIDTH,
  RECOMMENDED_FLYER_HEIGHT,
  RECOMMENDED_FLYER_ASPECT_RATIO,
  FLYER_SIZE_PRESETS,
  evaluateFlyerSizing,
  calculateCanvasRenderBounds,
} from "@/lib/flyer-sizing";

describe("Flyer Sizing & Mobile Optimization", () => {
  it("defines standard 9:16 mobile canvas dimensions as 1080 × 1920", () => {
    expect(RECOMMENDED_FLYER_WIDTH).toBe(1080);
    expect(RECOMMENDED_FLYER_HEIGHT).toBe(1920);
    expect(RECOMMENDED_FLYER_ASPECT_RATIO).toBeCloseTo(1.7778, 3);
  });

  it("includes 9:16 Mobile Fullscreen as the recommended preset", () => {
    const recommendedPreset = FLYER_SIZE_PRESETS.find((p) => p.isRecommended);
    expect(recommendedPreset).toBeDefined();
    expect(recommendedPreset?.id).toBe("9:16");
    expect(recommendedPreset?.width).toBe(1080);
    expect(recommendedPreset?.height).toBe(1920);
  });

  it("identifies standard 1080 × 1920 images as optimal match", () => {
    const evalResult = evaluateFlyerSizing(1080, 1920);
    expect(evalResult.isMatch).toBe(true);
    expect(evalResult.status).toBe("optimal");
    expect(evalResult.label).toContain("9:16 Mobile Standard");
  });

  it("identifies high-res 9:16 images (e.g. 1440 × 2560 or 2160 × 3840) as optimal match", () => {
    const evalResult1 = evaluateFlyerSizing(1440, 2560);
    expect(evalResult1.isMatch).toBe(true);
    expect(evalResult1.status).toBe("optimal");

    const evalResult2 = evaluateFlyerSizing(2160, 3840);
    expect(evalResult2.isMatch).toBe(true);
    expect(evalResult2.status).toBe("optimal");
  });

  it("identifies near-9:16 images within acceptable tolerance", () => {
    // 1080 × 1860 (aspect ratio ~1.722, deviation ~3%)
    const evalResult = evaluateFlyerSizing(1080, 1860);
    expect(evalResult.isMatch).toBe(true);
    expect(evalResult.status).toBe("optimal");
  });

  it("detects traditional print A4 (1:1.414) as a mismatch requiring crop/resize", () => {
    // Standard A4 aspect ratio ~ 1.414
    const evalResult = evaluateFlyerSizing(1000, 1414);
    expect(evalResult.isMatch).toBe(false);
    expect(evalResult.status).toBe("mismatch");
    expect(evalResult.label).toContain("Print A4");
    expect(evalResult.message).toContain("9:16 (1080 × 1920 px)");
  });

  it("detects square 1:1 image as a mismatch", () => {
    const evalResult = evaluateFlyerSizing(1200, 1200);
    expect(evalResult.isMatch).toBe(false);
    expect(evalResult.status).toBe("mismatch");
    expect(evalResult.label).toContain("Square 1:1");
  });

  it("detects landscape image as a mismatch", () => {
    const evalResult = evaluateFlyerSizing(1920, 1080);
    expect(evalResult.isMatch).toBe(false);
    expect(evalResult.status).toBe("mismatch");
    expect(evalResult.label).toContain("Landscape");
  });

  it("gracefully handles zero or negative dimensions", () => {
    const evalZero = evaluateFlyerSizing(0, 0);
    expect(evalZero.isMatch).toBe(false);
    expect(evalZero.status).toBe("mismatch");
    expect(evalZero.label).toBe("Invalid Dimensions");
  });

  it("calculates proportional fit bounds without clipping any content", () => {
    // Fitting an A4 image (1000 × 1414) into 1080 × 1920 canvas
    const bounds = calculateCanvasRenderBounds(1000, 1414, 1080, 1920, "fit");

    // Scale will be constrained by width: 1080 / 1000 = 1.08
    // Resulting height: 1414 * 1.08 = 1527.12 <= 1920 (no overflow)
    expect(bounds.drawWidth).toBe(1080);
    expect(bounds.drawHeight).toBeLessThanOrEqual(1920);
    expect(bounds.drawX).toBe(0);
    expect(bounds.drawY).toBeGreaterThan(0); // Centered vertically with top/bottom padding
  });

  it("calculates crop-to-fill bounds covering the entire 1080 × 1920 canvas with alignment options", () => {
    // Cropping an A4 image (1000 × 1414) to fill 1080 × 1920 canvas
    const boundsCenter = calculateCanvasRenderBounds(1000, 1414, 1080, 1920, "crop", "center");

    // Height constraint: 1920 / 1414 = ~1.3578
    // Resulting width: 1000 * 1.3578 = 1358 >= 1080 (full cover)
    expect(boundsCenter.drawHeight).toBe(1920);
    expect(boundsCenter.drawWidth).toBeGreaterThanOrEqual(1080);

    // Top alignment ensures top flyer header is preserved
    const boundsTop = calculateCanvasRenderBounds(1000, 1414, 1080, 1920, "crop", "top");
    expect(boundsTop.drawY).toBe(0);

    // Bottom alignment ensures bottom deals are preserved
    const boundsBottom = calculateCanvasRenderBounds(1000, 1414, 1080, 1920, "crop", "bottom");
    expect(boundsBottom.drawY).toBe(1920 - boundsBottom.drawHeight);
  });

  it("applies zoom factor correctly during crop mode", () => {
    const baseBounds = calculateCanvasRenderBounds(1000, 1414, 1080, 1920, "crop", "center", 1.0);
    const zoomedBounds = calculateCanvasRenderBounds(1000, 1414, 1080, 1920, "crop", "center", 1.5);

    expect(zoomedBounds.drawWidth).toBe(Math.round(baseBounds.drawWidth * 1.5));
    expect(zoomedBounds.drawHeight).toBe(Math.round(baseBounds.drawHeight * 1.5));
  });
});

describe("Long scrolling flyers", () => {
  it("accepts very tall flyers as long scroll flyers without requiring a crop", async () => {
    const { isLongScrollFlyer } = await import("@/lib/flyer-sizing");
    expect(isLongScrollFlyer(1080, 3800)).toBe(true); // ~3.5:1
    expect(isLongScrollFlyer(1080, 1920)).toBe(false); // standard 9:16
    expect(isLongScrollFlyer(0, 0)).toBe(false);
  });
});
