import { useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { Image as KonvaImage, Layer, Rect, Stage, Text, Transformer } from "react-konva";

import { PRODUCTS } from "@/data/products";
import { clamp01, type Hotspot, type HotspotRect } from "@/lib/flyer-storage";
import { useHtmlImage } from "@/hooks/use-html-image";
import type { ApiProduct } from "@/lib/api-client";

export interface FlyerEditorCanvasProps {
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  hotspots: Hotspot[];
  selectedId: string | null;
  drawProduct?: ApiProduct | null;
  catalogProducts?: ApiProduct[];
  zoom?: number;
  onSelect: (id: string | null) => void;
  onCreate: (rect: HotspotRect) => void;
  onUpdate: (id: string, update: Partial<Hotspot>) => void;
  onDelete?: (id: string) => void;
}

interface StageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STROKE_IDLE = "#2563eb";
const STROKE_SELECTED = "#dc2626";

/**
 * Admin-side Konva editor:
 * - Locks aspect ratio strictly to the flyer image so it is never stretched.
 * - Allows clicking and dragging to select/draw a hotspot area anywhere on the flyer.
 * - Attaches interactive move & resize Transformer to the selected hotspot.
 * - Normalized coordinates (0–1) are preserved with precision across any zoom level.
 */
export default function FlyerEditorCanvas({
  imageUrl,
  imageWidth = 0,
  imageHeight = 0,
  hotspots,
  selectedId,
  drawProduct,
  catalogProducts = [],
  zoom = 1.0,
  onSelect,
  onCreate,
  onUpdate,
}: FlyerEditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const drawingRef = useRef<{ startX: number; startY: number } | null>(null);
  const draftRef = useRef<StageRect | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [draft, setDraft] = useState<StageRect | null>(null);

  const updateDraft = (rect: StageRect | null) => {
    draftRef.current = rect;
    setDraft(rect);
  };

  const image = useHtmlImage(imageUrl);

  // Combine live API catalog with fallback products
  const productsById = useMemo(() => {
    const map = new Map<string, any>();
    PRODUCTS.forEach((p) => map.set(p.id, p));
    catalogProducts.forEach((p) => map.set(p.id, p));
    return map;
  }, [catalogProducts]);

  // Track available container width
  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width && width > 0) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Strict aspect ratio preservation from intrinsic image dimensions
  const naturalWidth = image?.naturalWidth || imageWidth || 800;
  const naturalHeight = image?.naturalHeight || imageHeight || 1200;
  const aspectRatio = naturalHeight / naturalWidth;

  // Base canvas display width fitting comfortably on screen
  const maxEditorWidth = 840;
  const availableWidth = containerWidth > 0 ? containerWidth - 48 : 760;
  const baseWidth = Math.min(Math.max(availableWidth, 480), maxEditorWidth);

  const stageWidth = Math.round(baseWidth * zoom);
  const stageHeight = Math.round(stageWidth * aspectRatio);

  // Keep transformer attached to selected node
  useEffect(() => {
    const transformer = trRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;
    const node = selectedId ? stage.findOne(`#${selectedId}`) : null;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, hotspots, stageWidth, stageHeight]);

  type StageEvent = Konva.KonvaEventObject<MouseEvent | TouchEvent>;

  const handleMouseDown = (event: StageEvent) => {
    // If clicking an existing shape or transformer handle, let Konva handle dragging/resizing
    if (event.target.getStage() !== event.target) {
      return;
    }

    const position = stageRef.current?.getPointerPosition();
    if (!position) return;

    // Start drawing a selection box
    drawingRef.current = { startX: position.x, startY: position.y };
    updateDraft({ x: position.x, y: position.y, width: 0, height: 0 });
  };

  const handleMouseMove = () => {
    const start = drawingRef.current;
    if (!start) return;
    const position = stageRef.current?.getPointerPosition();
    if (!position) return;

    updateDraft({
      x: Math.min(start.startX, position.x),
      y: Math.min(start.startY, position.y),
      width: Math.abs(position.x - start.startX),
      height: Math.abs(position.y - start.startY),
    });
  };

  const handleMouseUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = null;
    const rect = draftRef.current;
    updateDraft(null);

    if (!rect || stageWidth === 0 || stageHeight === 0) return;

    // If mouse was simply tapped/clicked without dragging (< 8px), deselect
    if (rect.width < 8 && rect.height < 8) {
      onSelect(null);
      return;
    }

    // Minimum drag threshold to create a hotspot
    if (rect.width < 14 || rect.height < 14) return;

    const normalized: HotspotRect = {
      x: clamp01(rect.x / stageWidth),
      y: clamp01(rect.y / stageHeight),
      width: clamp01(rect.width / stageWidth),
      height: clamp01(rect.height / stageHeight),
    };

    if (normalized.width < 0.015 || normalized.height < 0.015) return;
    onCreate(normalized);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex justify-center select-none"
      style={{
        cursor: "crosshair",
        width: stageWidth > 0 ? `${stageWidth}px` : "100%",
        minHeight: `${stageHeight || 600}px`,
      }}
    >
      {image && stageWidth > 0 && (
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          className="shadow-2xl rounded-md overflow-hidden bg-white border border-border/80"
        >
          <Layer>
            {/* The circular image rendered with strict intrinsic aspect ratio */}
            <KonvaImage
              image={image}
              width={stageWidth}
              height={stageHeight}
              listening={false}
            />

            {/* Hotspot bounding rectangles */}
            {hotspots.map((hotspot) => {
              const selected = hotspot.id === selectedId;
              return (
                <Rect
                  key={hotspot.id}
                  id={hotspot.id}
                  name="hotspot"
                  x={hotspot.x * stageWidth}
                  y={hotspot.y * stageHeight}
                  width={hotspot.width * stageWidth}
                  height={hotspot.height * stageHeight}
                  draggable={true}
                  stroke={selected ? STROKE_SELECTED : STROKE_IDLE}
                  strokeWidth={selected ? 3 : 2}
                  fill={selected ? "rgba(220,38,38,0.18)" : "rgba(37,99,235,0.08)"}
                  dash={[6, 4]}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    onSelect(hotspot.id);
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    onSelect(hotspot.id);
                  }}
                  onMouseEnter={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = "move";
                  }}
                  onMouseLeave={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = "crosshair";
                  }}
                  onDragEnd={(event) => {
                    const node = event.target;
                    onUpdate(hotspot.id, {
                      x: clamp01(node.x() / stageWidth),
                      y: clamp01(node.y() / stageHeight),
                      width: hotspot.width,
                      height: hotspot.height,
                    });
                  }}
                  onTransformEnd={(event) => {
                    const node = event.target;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    node.scaleX(1);
                    node.scaleY(1);
                    onUpdate(hotspot.id, {
                      x: clamp01(node.x() / stageWidth),
                      y: clamp01(node.y() / stageHeight),
                      width: clamp01((node.width() * scaleX) / stageWidth),
                      height: clamp01((node.height() * scaleY) / stageHeight),
                    });
                  }}
                />
              );
            })}

            {/* Hotspot Product Labels */}
            {hotspots.map((hotspot) => {
              const product = productsById.get(hotspot.productId);
              if (!product) return null;
              const labelY = Math.max(4, hotspot.y * stageHeight - 20);
              const isSelected = hotspot.id === selectedId;
              return (
                <Text
                  key={`label-${hotspot.id}`}
                  x={hotspot.x * stageWidth}
                  y={labelY}
                  text={`${product.name} ($${Number(product.offerPrice || 0).toFixed(2)})`}
                  fontSize={Math.max(10, Math.min(13, Math.round(11 * zoom)))}
                  fontStyle="600"
                  fill={isSelected ? STROKE_SELECTED : STROKE_IDLE}
                  shadowColor="rgba(255,255,255,0.95)"
                  shadowBlur={4}
                  listening={false}
                />
              );
            })}

            {/* Current Dragging Selection Draft Box */}
            {draft && (
              <Rect
                x={draft.x}
                y={draft.y}
                width={draft.width}
                height={draft.height}
                stroke="#dc2626"
                strokeWidth={2}
                dash={[8, 5]}
                fill="rgba(220,38,38,0.22)"
                listening={false}
              />
            )}

            {/* Konva Move/Resize Transformer for Selected Hotspot */}
            <Transformer
              ref={trRef}
              rotateEnabled={false}
              flipEnabled={false}
              keepRatio={false}
              borderStroke={STROKE_SELECTED}
              anchorStroke={STROKE_SELECTED}
              anchorFill="#ffffff"
              anchorSize={8}
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < 15 || newBox.height < 15 ? oldBox : newBox
              }
            />
          </Layer>
        </Stage>
      )}
    </div>
  );
}
