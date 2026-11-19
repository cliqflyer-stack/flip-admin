import { useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage } from "react-konva";
import { Minus, Maximize, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { Hotspot } from "@/lib/flyer-storage";
import { useHtmlImage } from "@/hooks/use-html-image";

interface FlyerPreviewCanvasProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  hotspots: Hotspot[];
  selectedHotspotId: string | null;
  onSelectHotspot: (hotspotId: string | null) => void;
}

interface ViewState {
  scale: number;
  x: number;
  y: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const HIT_FILL = "rgba(255,255,255,0.001)";

/**
 * Generates organic, hand-drawn marker ring loop points.
 * Simulates a shopper circling a deal with a yellow felt highlighter:
 * - Starts at ~10 o'clock (top-left)
 * - Sweeps ~402 degrees clockwise with natural hand curvature wobbles
 * - Overlaps past the starting point with a slight organic flare
 */
function createSketchedRingPoints(rx: number, ry: number): number[] {
  const points: number[] = [];
  const numSteps = 52;
  const startAngle = -2.25; // ~10 o'clock
  const totalAngle = Math.PI * 2 + 0.72; // ~402 degrees of sweep

  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const angle = startAngle + t * totalAngle;

    // Organic imperfections: gentle harmonic wobbles resembling natural hand movement
    const wobble1 = Math.sin(angle * 2.5) * 0.032;
    const wobble2 = Math.cos(angle * 4.2) * 0.018;
    const wobble3 = Math.sin(angle * 7.1) * 0.01;
    const totalWobble = wobble1 + wobble2 + wobble3;

    // Overlapping tail flare (when looping past 360 degrees)
    const overlapProgress = Math.max(0, (t - 0.78) / 0.22);
    const tailFlare = overlapProgress * 0.07;

    const curRx = rx * (1 + totalWobble + tailFlare);
    const curRy = ry * (1 + totalWobble * 0.85 + tailFlare);

    const x = Math.cos(angle) * curRx;
    const y = Math.sin(angle) * curRy;
    points.push(Math.round(x * 100) / 100, Math.round(y * 100) / 100);
  }
  return points;
}

/**
 * Customer-side viewer: zoom/pan the flyer, tap a product to select it
 * (sketched yellow marker ring highlight) or tap empty space to deselect.
 */
export default function FlyerPreviewCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  hotspots,
  selectedHotspotId,
  onSelectHotspot,
}: FlyerPreviewCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const highlightGroupRef = useRef<Konva.Group>(null);
  const mainLineRef = useRef<Konva.Line>(null);
  const glowLineRef = useRef<Konva.Line>(null);
  const panRef = useRef({ active: false, moved: 0, lastX: 0, lastY: 0 });
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

  const selectedHotspot = hotspots.find((h) => h.id === selectedHotspotId) ?? null;

  // Calculate sketched ring geometry around selected hotspot
  const hsWidth = selectedHotspot ? selectedHotspot.width * stageWidth : 0;
  const hsHeight = selectedHotspot ? selectedHotspot.height * stageHeight : 0;
  const hsCenterX = selectedHotspot
    ? (selectedHotspot.x + selectedHotspot.width / 2) * stageWidth
    : 0;
  const hsCenterY = selectedHotspot
    ? (selectedHotspot.y + selectedHotspot.height / 2) * stageHeight
    : 0;

  // Responsive radii with comfortable padding around the deal
  const rawRx = Math.max((hsWidth / 2) * 1.22, 28);
  const rawRy = Math.max((hsHeight / 2) * 1.20, 28);
  // Balance aspect ratio so it remains an organic oval rather than an extreme sliver
  const ringRx = Math.max(rawRx, rawRy * 0.55);
  const ringRy = Math.max(rawRy, rawRx * 0.55);

  const ringPoints = useMemo(() => {
    if (!selectedHotspot || stageWidth <= 0) return [];
    return createSketchedRingPoints(ringRx, ringRy);
  }, [selectedHotspot?.id, ringRx, ringRy, stageWidth]);

  // Sketched marker ring animation: quick organic draw-on (~260ms) + settle into solid sketched ring
  useEffect(() => {
    const group = highlightGroupRef.current;
    const mainLine = mainLineRef.current;
    const glowLine = glowLineRef.current;
    if (!group || !selectedHotspotId || ringPoints.length === 0) return;

    // Approximate loop perimeter for the draw-in stroke
    const approxLength = Math.PI * (ringRx + ringRy) * 1.25;

    // Set initial stroke-dash for the hand-drawn circling effect
    if (mainLine) {
      mainLine.dash([approxLength, approxLength]);
      mainLine.dashOffset(approxLength);
    }
    if (glowLine) {
      glowLine.dash([approxLength, approxLength]);
      glowLine.dashOffset(approxLength);
    }

    group.opacity(0);
    group.scale({ x: 0.92, y: 0.92 });

    const scaleTween = new Konva.Tween({
      node: group,
      opacity: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 0.28,
      easing: Konva.Easings.BackEaseOut,
    });
    scaleTween.play();

    const startTime = performance.now();
    const drawDuration = 260; // ms: fast energetic pen circling
    let raf = 0;

    const animateStroke = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / drawDuration);
      // Ease out cubic for a natural hand stroke that decelerates as the pen lifts
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentOffset = approxLength * (1 - ease);

      if (mainLine) mainLine.dashOffset(currentOffset);
      if (glowLine) glowLine.dashOffset(currentOffset);

      if (progress < 1) {
        raf = requestAnimationFrame(animateStroke);
      } else {
        // Drawing complete: settle into solid sketched line (no marching dots!)
        if (mainLine) mainLine.dash([]);
        if (glowLine) glowLine.dash([]);
      }
    };

    raf = requestAnimationFrame(animateStroke);

    return () => {
      scaleTween.destroy();
      cancelAnimationFrame(raf);
    };
  }, [selectedHotspotId, ringRx, ringRy, ringPoints]);

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
            {selectedHotspot && ringPoints.length > 0 && (
              <Group
                ref={highlightGroupRef}
                x={hsCenterX}
                y={hsCenterY}
                listening={false}
              >
                {/* Under-glow: soft yellow highlighter ink bleed */}
                <Line
                  ref={glowLineRef}
                  points={ringPoints}
                  stroke="rgba(250, 204, 21, 0.28)"
                  strokeWidth={Math.max(7, Math.min(11, stageWidth / 50))}
                  tension={0.36}
                  lineCap="round"
                  lineJoin="round"
                  closed={false}
                  listening={false}
                />
                {/* Main hand-drawn highlighter stroke */}
                <Line
                  ref={mainLineRef}
                  points={ringPoints}
                  stroke="#FACC15"
                  strokeWidth={Math.max(4, Math.min(6, stageWidth / 85))}
                  tension={0.36}
                  lineCap="round"
                  lineJoin="round"
                  closed={false}
                  listening={false}
                />
              </Group>
            )}
          </Layer>
        </Stage>
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
