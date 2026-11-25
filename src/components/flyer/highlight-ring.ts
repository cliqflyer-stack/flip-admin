/**
 * Pen-drawing order for the highlight ring artwork (`@/assets/highlight-ring.png`).
 * All coordinates are artwork pixels. Re-trace everything here if the artwork changes.
 */

export const ART_WIDTH = 720;
export const ART_HEIGHT = 821;

// Centerline of the stroke in drawing order: from the top starting tip, clockwise,
// to the ending tip that crosses just underneath it.
const PEN_PATH: [number, number][] = [
  [190, 26],
  [264, 25],
  [320, 28],
  [373, 35],
  [424, 48],
  [473, 64],
  [519, 84],
  [564, 108],
  [603, 141],
  [635, 179],
  [661, 223],
  [679, 269],
  [693, 315],
  [700, 363],
  [703, 411],
  [703, 459],
  [698, 507],
  [688, 557],
  [672, 605],
  [648, 653],
  [617, 695],
  [577, 733],
  [530, 760],
  [480, 780],
  [427, 793],
  [373, 796],
  [320, 793],
  [267, 784],
  [216, 768],
  [168, 743],
  [125, 711],
  [89, 672],
  [61, 628],
  [41, 580],
  [27, 532],
  [20, 483],
  [17, 434],
  [18, 387],
  [23, 339],
  [31, 291],
  [46, 244],
  [65, 196],
  [90, 150],
  [125, 110],
  [168, 78],
  [214, 63],
  [240, 60],
  [265, 59],
];

// Box around the two tips, where position alone cannot tell the strokes apart
const TIP_BOX = { right: 320, bottom: 130 };
// Lower edge of the starting stroke inside that box, as [x, y] pairs
const START_LOWER_EDGE: [number, number][] = [
  [212, 37],
  [232, 46],
  [250, 52],
  [270, 54],
  [320, 57],
];
// The starting tip's slanted left edge: x = START_TIP_X + y * START_TIP_SLOPE
const START_TIP_X = 197;
const START_TIP_SLOPE = 0.42;
// How far the outermost segments reach past their ends, to cover the slanted tips
const TIP_OVERHANG = 30;
// How many segments at each end of the path belong to a tip
const TIP_SEGMENTS = 8;
// Width of the soft leading edge of the pen
const PEN_FEATHER = 3;

function startLowerEdgeAt(x: number): number {
  for (let i = 1; i < START_LOWER_EDGE.length; i++) {
    const [x1, y1] = START_LOWER_EDGE[i - 1] ?? [0, 0];
    const [x2, y2] = START_LOWER_EDGE[i] ?? [0, 0];
    if (x <= x2) return y1 + ((y2 - y1) * Math.max(0, x - x1)) / (x2 - x1);
  }
  return START_LOWER_EDGE[START_LOWER_EDGE.length - 1]?.[1] ?? 0;
}

const SEGMENTS = (() => {
  let travelled = 0;
  return PEN_PATH.slice(1).map(([x2, y2], i) => {
    const [x1, y1] = PEN_PATH[i] ?? [x2, y2];
    const length = Math.hypot(x2 - x1, y2 - y1);
    const segment = { x1, y1, dx: x2 - x1, dy: y2 - y1, length, from: travelled };
    travelled += length;
    return segment;
  });
})();

/**
 * How far along the pen path (in artwork pixels) the pen is when it inks (x, y).
 * Pixels where the two tips cross belong to the starting stroke, so it is drawn whole.
 */
export function penDistanceAt(x: number, y: number): number {
  let first = 0;
  let last = SEGMENTS.length - 1;
  if (x < TIP_BOX.right && y < TIP_BOX.bottom) {
    const onStartStroke = x >= START_TIP_X + y * START_TIP_SLOPE && y <= startLowerEdgeAt(x);
    if (onStartStroke) last = TIP_SEGMENTS - 1;
    else first = SEGMENTS.length - TIP_SEGMENTS;
  }

  let best = 0;
  let bestSquared = Infinity;
  for (let i = first; i <= last; i++) {
    const s = SEGMENTS[i];
    if (!s) continue;
    let t = ((x - s.x1) * s.dx + (y - s.y1) * s.dy) / (s.length * s.length);
    // The outermost segments reach a little past their ends so the tips draw progressively
    const overhang = TIP_OVERHANG / s.length;
    t = Math.max(
      i === 0 ? -overhang : 0,
      Math.min(i === SEGMENTS.length - 1 ? 1 + overhang : 1, t),
    );
    const ex = x - s.x1 - t * s.dx;
    const ey = y - s.y1 - t * s.dy;
    const squared = ex * ex + ey * ey;
    if (squared < bestSquared) {
      bestSquared = squared;
      best = s.from + t * s.length;
    }
  }
  return best;
}

export interface RingStroke {
  /** The artwork's own RGBA pixels, untouched */
  pixels: Uint8ClampedArray;
  /** Pen distance for each pixel; NaN where the artwork is transparent */
  distances: Float32Array;
  start: number;
  end: number;
}

export function buildRingStroke(pixels: Uint8ClampedArray): RingStroke {
  const distances = new Float32Array(ART_WIDTH * ART_HEIGHT).fill(NaN);
  let start = Infinity;
  let end = -Infinity;
  for (let p = 0; p < distances.length; p++) {
    if (!pixels[p * 4 + 3]) continue;
    const distance = penDistanceAt(p % ART_WIDTH, Math.floor(p / ART_WIDTH));
    distances[p] = distance;
    start = Math.min(start, distance);
    end = Math.max(end, distance);
  }
  return { pixels, distances, start, end };
}

/** Writes into `target` the part of the ring inked at `progress` (0..1). */
export function paintRingProgress(
  stroke: RingStroke,
  progress: number,
  target: Uint8ClampedArray,
): void {
  const { pixels, distances, start, end } = stroke;
  const front = start + progress * (end + PEN_FEATHER - start);
  for (let p = 0; p < distances.length; p++) {
    const distance = distances[p] ?? NaN;
    // NaN (transparent) fails this comparison too
    if (!(distance < front)) continue;
    const i = p * 4;
    target[i] = pixels[i] ?? 0;
    target[i + 1] = pixels[i + 1] ?? 0;
    target[i + 2] = pixels[i + 2] ?? 0;
    target[i + 3] = (pixels[i + 3] ?? 0) * Math.min(1, (front - distance) / PEN_FEATHER);
  }
}
