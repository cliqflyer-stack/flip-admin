import { useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import { Image as KonvaImage, Layer, Rect, Shape, Stage } from "react-konva";
import { Minus, Maximize, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import highlightRingUrl from "@/assets/highlight-ring.png";

import type { Hotspot } from "@/lib/flyer-storage";
import { useHtmlImage } from "@/hooks/use-html-image";
import {
  ART_HEIGHT,
  ART_WIDTH,
  buildRingStroke,
  paintRingProgress,
  type RingStroke,
} from "./highlight-ring";

interface FlyerPreviewCanvasProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  hotspots: Hotspot[];
  /** The most recently tapped hotspot. It animates its ring and is scrolled into view. */
  selectedHotspotId: string | null;
  /** Every hotspot tapped so far. Their rings stay on the flyer. */
  markedHotspotIds: string[];
  /** True while the product bottom sheet is open, so the reveal keeps the item above it. */
  isSheetOpen: boolean;
  /** Called with a hotspot id on tap, or null when empty space is tapped. */
  onSelectHotspot: (hotspotId: string | null) => void;
  /** Removes every ring from the flyer. */
  onClearMarks: () => void;
}

interface ViewState {
  scale: number;
  x: number;
  y: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const HIT_FILL = "rgba(255,255,255,0.001)";
// Approximate share of the viewport the bottom sheet covers when open.
const SHEET_VIEWPORT_SHARE = 0.45;

// Width / height of the highlight artwork. Never stretch it: the shape must stay exact.
const RING_ASPECT = ART_WIDTH / ART_HEIGHT;
const PEN_DRAW_MS = 250;

const ringStrokeCache = new WeakMap<HTMLImageElement, RingStroke | null>();

/** Reads the artwork's pixels once per image; null if the browser refuses a 2D canvas. */
function getRingStroke(ringImage: HTMLImageElement): RingStroke | null {
  const cached = ringStrokeCache.get(ringImage);
  if (cached !== undefined) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = ART_WIDTH;
  canvas.height = ART_HEIGHT;
  const ctx = canvas.getContext("2d");
  let stroke: RingStroke | null = null;
  if (ctx) {
    ctx.drawImage(ringImage, 0, 0, ART_WIDTH, ART_HEIGHT);
    stroke = buildRingStroke(ctx.getImageData(0, 0, ART_WIDTH, ART_HEIGHT).data);
  }
  ringStrokeCache.set(ringImage, stroke);
  return stroke;
}

/** Paints the first `progress` (0..1) of the pen stroke onto `buffer` and returns it. */
function revealRing(
  buffer: HTMLCanvasElement,
  stroke: RingStroke,
  progress: number,
): HTMLCanvasElement {
  const ctx = buffer.getContext("2d");
  if (!ctx) return buffer;
  if (buffer.width !== ART_WIDTH) buffer.width = ART_WIDTH;
  if (buffer.height !== ART_HEIGHT) buffer.height = ART_HEIGHT;

  const frame = ctx.createImageData(ART_WIDTH, ART_HEIGHT);
  paintRingProgress(stroke, progress, frame.data);
  ctx.putImageData(frame, 0, 0);
  return buffer;
}

interface PenMarkProps {
  hotspot: Hotspot;
  ringImage: HTMLImageElement;
  stageWidth: number;
  stageHeight: number;
  /** Only the mark that was just tapped draws itself; the others are already drawn. */
  animate: boolean;
}

/** The hand-drawn ring around one hotspot. It stays on the flyer until the user clears it. */
function PenMark({ hotspot, ringImage, stageWidth, stageHeight, animate }: PenMarkProps) {
  const shapeRef = useRef<Konva.Shape>(null);
  const progressRef = useRef(animate ? 0 : 1);
  const buffer = useMemo(() => document.createElement("canvas"), []);
  const stroke = useMemo(() => getRingStroke(ringImage), [ringImage]);

  const hsWidth = hotspot.width * stageWidth;
  const hsHeight = hotspot.height * stageHeight;

  // Size the ring around the product without distorting it, and keep it inside the flyer
  const width = Math.min(
    Math.max(56, hsWidth * 1.3, hsHeight * 1.3 * RING_ASPECT),
    stageWidth,
    stageHeight * RING_ASPECT,
  );
  const height = width / RING_ASPECT;
  const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));
  const left = clamp((hotspot.x + hotspot.width / 2) * stageWidth - width / 2, stageWidth - width);
  const top = clamp(
    (hotspot.y + hotspot.height / 2) * stageHeight - height / 2,
    stageHeight - height,
  );

  // Pen-drawing animation. Runs only on mount, so a later tap elsewhere does not restart it.
  useEffect(() => {
    if (!animate) return;
    progressRef.current = 0;
    let frame = 0;
    let startTime: number | null = null;

    const step = (now: number) => {
      startTime ??= now;
      const t = Math.min(1, (now - startTime) / PEN_DRAW_MS);
      // Ease in and out, like a pen setting off and slowing as it closes the loop
      progressRef.current = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      shapeRef.current?.getLayer()?.batchDraw();
      if (t < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only, see above
  }, []);

  return (
    <Shape
      ref={shapeRef}
      x={left}
      y={top}
      listening={false}
      sceneFunc={(ctx) => {
        // A finished ring is the artwork itself, with no per-pixel work
        const source =
          progressRef.current >= 1 || !stroke
            ? ringImage
            : revealRing(buffer, stroke, progressRef.current);
        ctx.drawImage(source, 0, 0, width, height);
      }}
    />
  );
}

/**
 * Customer-side viewer: zoom/pan the flyer, tap a product to select it
 * (sketched marker ring highlight) or tap empty space to clear all marks.
 */
export default function FlyerPreviewCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  hotspots,
  selectedHotspotId,
  markedHotspotIds,
  isSheetOpen,
  onSelectHotspot,
  onClearMarks,
}: FlyerPreviewCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const panRef = useRef({ active: false, moved: 0, lastX: 0, lastY: 0 });
  const revealedIdRef = useRef<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [view, setView] = useState<ViewState>({ scale: 1, x: 0, y: 0 });
  const image = useHtmlImage(imageUrl);
  const ringImage = useHtmlImage(highlightRingUrl);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const realWidth = image?.naturalWidth || imageWidth || 800;
  const realHeight = image?.naturalHeight || imageHeight || 1200;
  const fitScale = realWidth > 0 && containerWidth > 0 ? containerWidth / realWidth : 0;
  const stageWidth = Math.round(realWidth * fitScale);
  const stageHeight = Math.round(realHeight * fitScale);

  const clampView = (next: ViewState): ViewState => {
    const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.scale));
    const maxX = 0;
    const minX = stageWidth * (1 - scale);
    const maxY = 0;
    const minY = stageHeight * (1 - scale);
    return {
      scale,
      x: Math.min(maxX, Math.max(minX, next.x)),
      y: Math.min(maxY, Math.max(minY, next.y)),
    };
  };

  const zoomAtPoint = (point: { x: number; y: number } | null, factor: number) => {
    setView((current) => {
      const nextScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.scale * factor));
      if (nextScale === current.scale) return current;
      const anchor = point ?? { x: stageWidth / 2, y: stageHeight / 2 };
      const contentX = (anchor.x - current.x) / current.scale;
      const contentY = (anchor.y - current.y) / current.scale;
      return clampView({
        scale: nextScale,
        x: anchor.x - contentX * nextScale,
        y: anchor.y - contentY * nextScale,
      });
    });
  };

  const markedHotspots = hotspots.filter((h) => markedHotspotIds.includes(h.id));

  // Bring a newly tapped item into view without centering the page on it.
  // Scrolls only if the item is off-screen, and keeps it above the bottom sheet when open.
  useEffect(() => {
    const container = containerRef.current;
    if (!selectedHotspotId || !container || stageWidth <= 0 || stageHeight <= 0) return;
    if (revealedIdRef.current === selectedHotspotId) return;
    const hotspot = hotspots.find((h) => h.id === selectedHotspotId);
    if (!hotspot) return;
    revealedIdRef.current = selectedHotspotId;

    const anchor = document.createElement("div");
    anchor.style.position = "absolute";
    anchor.style.pointerEvents = "none";
    anchor.style.left = `${view.x + hotspot.x * stageWidth * view.scale}px`;
    anchor.style.top = `${view.y + hotspot.y * stageHeight * view.scale}px`;
    anchor.style.width = `${hotspot.width * stageWidth * view.scale}px`;
    anchor.style.height = `${hotspot.height * stageHeight * view.scale}px`;
    if (isSheetOpen) {
      anchor.style.scrollMarginBottom = `${Math.round(window.innerHeight * SHEET_VIEWPORT_SHARE)}px`;
    }
    container.appendChild(anchor);
    anchor.scrollIntoView({ behavior: "smooth", block: "nearest" });
    anchor.remove();
    // Runs only when a new item is tapped, not on resize or zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHotspotId, stageWidth, stageHeight]);

  const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const pointer = stageRef.current?.getPointerPosition();
    const direction = event.evt.deltaY > 0 ? -1 : 1;
    zoomAtPoint(pointer ?? null, 1.15 ** direction);
  };

  type StageEvent = Konva.KonvaEventObject<MouseEvent | TouchEvent>;
  const handleMouseDown = (event: StageEvent) => {
    if (view.scale <= MIN_ZOOM + 0.02) {
      panRef.current.active = false;
      return;
    }
    if (event.target.getStage() !== event.target) return;
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;
    panRef.current = { active: true, moved: 0, lastX: pointer.x, lastY: pointer.y };
  };

  const handleMouseMove = () => {
    const pan = panRef.current;
    if (!pan.active) return;
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;
    const dx = pointer.x - pan.lastX;
    const dy = pointer.y - pan.lastY;
    pan.moved += Math.abs(dx) + Math.abs(dy);
    pan.lastX = pointer.x;
    pan.lastY = pointer.y;
    setView((current) => clampView({ ...current, x: current.x + dx, y: current.y + dy }));
  };

  const handleMouseUp = (event: StageEvent) => {
    const pan = panRef.current;
    panRef.current.active = false;
    if (pan.moved < 4 && event.target.getStage() === event.target) {
      onSelectHotspot(null);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full select-none">
      {image && stageWidth > 0 && (
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          style={{ cursor: view.scale > MIN_ZOOM + 0.02 ? "grab" : "pointer" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          <Layer scaleX={view.scale} scaleY={view.scale} x={view.x} y={view.y}>
            <KonvaImage image={image} width={stageWidth} height={stageHeight} listening={false} />
            {hotspots.map((hotspot) => (
              <Rect
                key={hotspot.id}
                x={hotspot.x * stageWidth}
                y={hotspot.y * stageHeight}
                width={hotspot.width * stageWidth}
                height={hotspot.height * stageHeight}
                fill={HIT_FILL}
                // Invisible fat stroke: keeps the tap target generous on touch screens.
                stroke={HIT_FILL}
                strokeWidth={24}
                strokeScaleEnabled={false}
                onClick={(event) => {
                  event.cancelBubble = true;
                  onSelectHotspot(hotspot.id);
                }}
                onTap={(event) => {
                  event.cancelBubble = true;
                  onSelectHotspot(hotspot.id);
                }}
              />
            ))}
            {ringImage &&
              markedHotspots.map((hotspot) => (
                <PenMark
                  key={hotspot.id}
                  hotspot={hotspot}
                  ringImage={ringImage}
                  stageWidth={stageWidth}
                  stageHeight={stageHeight}
                  animate={hotspot.id === selectedHotspotId}
                />
              ))}
          </Layer>
        </Stage>
      )}
      {markedHotspotIds.length > 0 && (
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-3 left-3 h-8 gap-1.5 px-2.5 text-xs shadow-sm"
          onClick={onClearMarks}
        >
          <X className="h-3.5 w-3.5" />
          Clear marks
        </Button>
      )}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 rounded-lg border bg-background/90 p-1 shadow-sm backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Zoom in"
          onClick={() => zoomAtPoint(null, 1.3)}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Zoom out"
          onClick={() => zoomAtPoint(null, 1 / 1.3)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Reset zoom"
          onClick={() => setView({ scale: 1, x: 0, y: 0 })}
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
