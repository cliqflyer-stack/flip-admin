import { useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import { Group, Image as KonvaImage, Layer, Rect, Shape, Stage } from "react-konva";
import { Minus, Maximize, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { Hotspot } from "@/lib/flyer-storage";
import { useHtmlImage } from "@/hooks/use-html-image";

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

// Brand "parrot" green: Electric Volt Lime (--color-brand-lime) from the admin theme.
const PEN_INK = "#D8F36A";
const PEN_DRAW_MS = 480;

interface PenPoint {
  x: number;
  y: number;
  pressure: number; // 0..1, scales the nib width along the stroke
}

/**
 * Generates a hand-drawn marker loop around a deal, as a pen would draw it:
 * - Starts at the lower-left with a thin pen-down tail
 * - Sweeps ~370 degrees counter-clockwise with light hand wobble
 * - Firm body through the sides, lifts off with a thin rounded finish just inside the start
 */
function createPenRingPoints(rx: number, ry: number): PenPoint[] {
  const points: PenPoint[] = [];
  const numSteps = 120;
  // Reference shape: starts at the lower-left tail, sweeps counter-clockwise around the deal,
  // and finishes just short of the start, tucked slightly inside it
  const startAngle = 2.37; // ~lower-left
  const totalAngle = -(Math.PI * 2 + 0.5); // ~370 degrees, negative = counter-clockwise on screen

  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const angle = startAngle + t * totalAngle;

    // Light hand wobble only, so the loop reads as round rather than lumpy
    const wobble1 = Math.sin(angle * 2.5) * 0.012;
    const wobble2 = Math.cos(angle * 4.2) * 0.006;
    const wobble3 = Math.sin(angle * 7.1) * 0.003;
    const totalWobble = wobble1 + wobble2 + wobble3;

    // Finishing tail tucks slightly inside the start so the two ends read as separate strokes
    const tailProgress = Math.max(0, (t - 0.85) / 0.15);
    const tailTuck = 1 - tailProgress * 0.08;

    const curRx = rx * (1 + totalWobble) * tailTuck;
    const curRy = ry * (1 + totalWobble * 0.85) * tailTuck;

    // Pen pressure: light pen-down tail, full body through the sides, thin rounded finish
    const pressureIn = 0.3 + 0.7 * Math.min(1, t / 0.12);
    const pressureOut = t > 0.85 ? Math.max(0.2, (1 - t) / 0.15) : 1;
    const jitter = 0.9 + 0.1 * Math.sin(angle * 5.3 + 1.2);

    points.push({
      x: Math.cos(angle) * curRx,
      y: Math.sin(angle) * curRy,
      pressure: pressureIn * pressureOut * jitter,
    });
  }
  return points;
}

/**
 * Paints the first `progress` (0..1) of the pen loop onto the canvas.
 * Ink is drawn segment by segment so the nib width follows the pressure curve.
 */
function drawPenStroke(
  ctx: Konva.Context,
  points: PenPoint[],
  progress: number,
  baseWidth: number,
) {
  if (points.length < 2 || progress <= 0) return;
  const last = Math.min(points.length - 1, Math.max(1, Math.floor((points.length - 1) * progress)));

  const drawn = points.slice(0, last + 1);
  const start = drawn[0];
  if (!start) return;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Ink: variable-width nib stroke, fully opaque
  ctx.strokeStyle = PEN_INK;
  for (let i = 1; i < drawn.length; i++) {
    const a = drawn[i - 1];
    const b = drawn[i];
    if (!a || !b) continue;
    ctx.lineWidth = Math.max(1, baseWidth * (a.pressure + b.pressure) * 0.5);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

interface PenMarkProps {
  hotspot: Hotspot;
  stageWidth: number;
  stageHeight: number;
  /** Only the mark that was just tapped draws itself; the others are already inked. */
  animate: boolean;
}

/** A hand-drawn ring around one hotspot. It stays on the flyer until the user taps empty space. */
function PenMark({ hotspot, stageWidth, stageHeight, animate }: PenMarkProps) {
  const groupRef = useRef<Konva.Group>(null);
  const shapeRef = useRef<Konva.Shape>(null);
  const progressRef = useRef(animate ? 0 : 1);

  const hsWidth = hotspot.width * stageWidth;
  const hsHeight = hotspot.height * stageHeight;
  const centerX = (hotspot.x + hotspot.width / 2) * stageWidth;
  const centerY = (hotspot.y + hotspot.height / 2) * stageHeight;

  // Responsive radii with comfortable padding around the deal
  const rawRx = Math.max((hsWidth / 2) * 1.22, 28);
  const rawRy = Math.max((hsHeight / 2) * 1.2, 28);
  // Balance aspect ratio so it remains an organic oval rather than an extreme sliver
  const ringRx = Math.max(rawRx, rawRy * 0.55);
  const ringRy = Math.max(rawRy, rawRx * 0.55);

  const penPoints = useMemo(() => createPenRingPoints(ringRx, ringRy), [ringRx, ringRy]);
  // Nib width scales with the stage so the ink stays proportional on phones and desktops
  const penWidth = Math.max(5.5, Math.min(8, stageWidth / 65));

  // Pen-drawing animation: the nib traces the loop once, then the ink stays put.
  // Runs only on mount, so a later tap elsewhere does not cut this stroke short.
  useEffect(() => {
    const group = groupRef.current;
    const shape = shapeRef.current;
    if (!animate || !group || !shape) return;

    progressRef.current = 0;
    group.opacity(0);

    const fadeIn = new Konva.Tween({
      node: group,
      opacity: 1,
      duration: 0.16,
      easing: Konva.Easings.EaseOut,
    });
    fadeIn.play();

    const startTime = performance.now();
    let raf = 0;

    const animateStroke = (now: number) => {
      const raw = Math.min(1, (now - startTime) / PEN_DRAW_MS);
      // Quick start, slower finish as the pen closes the loop
      progressRef.current = 1 - Math.pow(1 - raw, 2.2);
      shape.getLayer()?.batchDraw();

      if (raw < 1) raf = requestAnimationFrame(animateStroke);
    };

    raf = requestAnimationFrame(animateStroke);

    return () => {
      fadeIn.destroy();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Group ref={groupRef} x={centerX} y={centerY} listening={false}>
      <Shape
        ref={shapeRef}
        listening={false}
        sceneFunc={(ctx) => drawPenStroke(ctx, penPoints, progressRef.current, penWidth)}
      />
    </Group>
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
      const anchor =
        point ?? { x: stageWidth / 2, y: stageHeight / 2 };
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
            {markedHotspots.map((hotspot) => (
              <PenMark
                key={hotspot.id}
                hotspot={hotspot}
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
