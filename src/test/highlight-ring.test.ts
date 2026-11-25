import { describe, expect, it } from "vitest";

import {
  ART_HEIGHT,
  ART_WIDTH,
  buildRingStroke,
  paintRingProgress,
  penDistanceAt,
} from "@/components/flyer/highlight-ring";

describe("highlight ring pen order", () => {
  it("draws the crossing of the two tips with the starting stroke", () => {
    const start = penDistanceAt(215, 15);
    const crossing = penDistanceAt(232, 43);
    expect(crossing - start).toBeLessThan(40);
  });

  it("leaves the ending tip until the pen has gone round the ring", () => {
    const bottom = penDistanceAt(373, 796);
    // Just below the crossing, and right beside the starting tip
    expect(penDistanceAt(232, 62)).toBeGreaterThan(bottom);
    expect(penDistanceAt(205, 45)).toBeGreaterThan(bottom);
  });

  it("inks nothing at the start and the whole artwork at the end", () => {
    const pixels = new Uint8ClampedArray(ART_WIDTH * ART_HEIGHT * 4);
    const inked = [
      [215, 15],
      [373, 796],
      [255, 70],
    ].map(([x = 0, y = 0]) => (y * ART_WIDTH + x) * 4);
    inked.forEach((i) => pixels.fill(255, i, i + 4));
    const stroke = buildRingStroke(pixels);
    const alphaAt = (progress: number) => {
      const target = new Uint8ClampedArray(pixels.length);
      paintRingProgress(stroke, progress, target);
      return inked.map((i) => target[i + 3]);
    };

    expect(alphaAt(0)).toEqual([0, 0, 0]);
    expect(alphaAt(0.5)).toEqual([255, 0, 0]);
    expect(alphaAt(1)).toEqual([255, 255, 255]);
  });
});
