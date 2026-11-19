import React, { useEffect, useRef, useState } from "react";
import {
  Crop,
  Maximize2,
  Smartphone,
  Sparkles,
  Sliders,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  Layers,
  Grid,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FLYER_SIZE_PRESETS,
  RECOMMENDED_FLYER_WIDTH,
  RECOMMENDED_FLYER_HEIGHT,
  RECOMMENDED_FLYER_ASPECT_RATIO,
  calculateCanvasRenderBounds,
  renderFlyerToCanvas,
  canvasToFile,
  loadImageElement,
  type FlyerCropMode,
  type FlyerCropAlignment,
  type FlyerSizePreset,
} from "@/lib/flyer-sizing";

interface FlyerCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSource: string | File | null;
  initialFilename?: string;
  onApplyCrop: (result: {
    file: File;
    previewUrl: string;
    width: number;
    height: number;
    aspectRatio: number;
  }) => void;
}

export function FlyerCropDialog({
  open,
  onOpenChange,
  imageSource,
  initialFilename = "mobile-flyer.jpg",
  onApplyCrop,
}: FlyerCropDialogProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("9:16");
  const [mode, setMode] = useState<FlyerCropMode>("crop");
  const [alignment, setAlignment] = useState<FlyerCropAlignment>("center");
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [bgColor, setBgColor] = useState<string>("#FFFFFF");
  const [showPhoneFrame, setShowPhoneFrame] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);

  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const activePreset: FlyerSizePreset =
    FLYER_SIZE_PRESETS.find((p) => p.id === selectedPresetId) || FLYER_SIZE_PRESETS[0];

  // Load image when dialog opens or imageSource changes
  useEffect(() => {
    if (!open || !imageSource) {
      setLoadedImage(null);
      return;
    }

    let isMounted = true;
    setIsLoadingImage(true);

    loadImageElement(imageSource)
      .then((img) => {
        if (!isMounted) return;
        setLoadedImage(img);
        // If image is already very wide or square, default mode to 'fit' so nothing is cut off
        const naturalRatio = img.naturalHeight / img.naturalWidth;
        if (naturalRatio < 1.4) {
          setMode("fit");
        } else {
          setMode("crop");
        }
        setZoom(1.0);
        setPanOffset({ x: 0, y: 0 });
        setAlignment("center");
      })
      .catch((err) => {
        if (!isMounted) return;
        toast.error(`Failed to load flyer image: ${err.message}`);
      })
      .finally(() => {
        if (isMounted) setIsLoadingImage(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, imageSource]);

  // Live Redraw of Preview Canvas
  useEffect(() => {
    if (!loadedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const targetWidth = activePreset.width;
    const targetHeight = activePreset.height;

    // Set internal resolution of the preview canvas
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Fill background
    ctx.fillStyle = mode === "fit" ? bgColor : "#000000";
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const bounds = calculateCanvasRenderBounds(
      loadedImage.naturalWidth,
      loadedImage.naturalHeight,
      targetWidth,
      targetHeight,
      mode,
      alignment,
      zoom,
      panOffset
    );

    ctx.drawImage(
      loadedImage,
      0,
      0,
      loadedImage.naturalWidth,
      loadedImage.naturalHeight,
      bounds.drawX,
      bounds.drawY,
      bounds.drawWidth,
      bounds.drawHeight
    );

    // Optional Rule-of-Thirds Grid Overlay
    if (showGrid) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);

      // Vertical thirds
      ctx.beginPath();
      ctx.moveTo(targetWidth / 3, 0);
      ctx.lineTo(targetWidth / 3, targetHeight);
      ctx.moveTo((2 * targetWidth) / 3, 0);
      ctx.lineTo((2 * targetWidth) / 3, targetHeight);

      // Horizontal thirds
      ctx.moveTo(0, targetHeight / 3);
      ctx.lineTo(targetWidth, targetHeight / 3);
      ctx.moveTo(0, (2 * targetHeight) / 3);
      ctx.lineTo(targetWidth, (2 * targetHeight) / 3);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [loadedImage, activePreset, mode, alignment, zoom, panOffset, bgColor, showGrid]);

  // Pan drag handlers on preview canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== "crop") return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panOffset };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || mode !== "crop") return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Scale drag delta to target canvas coordinate space
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleFactor = activePreset.width / rect.width;

    setPanOffset({
      x: panStartRef.current.x + dx * scaleFactor,
      y: panStartRef.current.y + dy * scaleFactor,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleResetFraming = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
    setAlignment("center");
  };

  const handleApply = async () => {
    if (!loadedImage) return;

    setIsProcessing(true);
    try {
      const targetCanvas = renderFlyerToCanvas(loadedImage, {
        mode,
        targetWidth: activePreset.width,
        targetHeight: activePreset.height,
        alignment,
        zoom,
        panOffset,
        backgroundColor: bgColor,
      });

      const cleanFilename = initialFilename.replace(/\.[^/.]+$/, "") + "-mobile-1080x1920.jpg";
      const file = await canvasToFile(targetCanvas, cleanFilename, 0.92);
      const previewUrl = URL.createObjectURL(file);

      toast.success(
        `Flyer formatted to ${activePreset.width} × ${activePreset.height} px (${activePreset.ratioLabel} Mobile Standard)!`
      );

      onApplyCrop({
        file,
        previewUrl,
        width: activePreset.width,
        height: activePreset.height,
        aspectRatio: activePreset.aspectRatio,
      });

      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Failed to process flyer: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b bg-muted/20 shrink-0">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  Format Flyer for Mobile Users
                </DialogTitle>
                <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">
                  Mobile Sizing
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Mobile shoppers view circulars on vertical smartphone screens. Standardize to 9:16
                (1080 × 1920 px) to eliminate awkward horizontal borders and make offers touch-ready.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body: Split View (Canvas Preview on Left, Controls on Right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left Canvas Preview Area */}
          <div className="md:col-span-7 bg-muted/30 p-4 sm:p-6 flex flex-col items-center justify-center relative min-h-[380px] border-b md:border-b-0 md:border-r">
            {isLoadingImage ? (
              <div className="flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Loading flyer preview...</span>
              </div>
            ) : (
              <div className="relative flex flex-col items-center justify-center w-full">
                {/* Mobile Phone Mockup Bezel */}
                <div
                  className={`transition-all duration-300 relative flex flex-col items-center shadow-xl ${
                    showPhoneFrame
                      ? "rounded-[36px] p-2.5 bg-neutral-900 border-4 border-neutral-800 shadow-2xl"
                      : "rounded-lg border bg-black shadow-md"
                  }`}
                  style={{
                    maxWidth: "280px",
                    width: "100%",
                    aspectRatio: "9/16",
                  }}
                >
                  {/* Phone Top Notch / Dynamic Island */}
                  {showPhoneFrame && (
                    <div className="absolute top-4 z-20 h-3.5 w-20 bg-black rounded-full flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-neutral-800 mr-2" />
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-950" />
                    </div>
                  )}

                  {/* Canvas Viewport */}
                  <div className="relative w-full h-full overflow-hidden rounded-[26px] bg-background flex items-center justify-center">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      className={`w-full h-full object-contain ${
                        mode === "crop" ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                      }`}
                      title={mode === "crop" ? "Click and drag to pan flyer" : undefined}
                    />

                    {/* Drag overlay hint */}
                    {mode === "crop" && (
                      <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] py-1 px-2 rounded-md text-center pointer-events-none opacity-80">
                        Drag to adjust framing
                      </div>
                    )}
                  </div>

                  {/* Phone Bottom Home Bar */}
                  {showPhoneFrame && (
                    <div className="absolute bottom-2.5 z-20 h-1 w-24 bg-white/40 rounded-full" />
                  )}
                </div>

                {/* Floating Preview Controls */}
                <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPhoneFrame(!showPhoneFrame)}
                    className="h-7 text-xs px-2 gap-1"
                  >
                    <Smartphone className="h-3.5 w-3.5 text-primary" />
                    <span>{showPhoneFrame ? "Hide Phone Bezel" : "Show Phone Bezel"}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGrid(!showGrid)}
                    className="h-7 text-xs px-2 gap-1"
                  >
                    <Grid className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{showGrid ? "Hide Grid" : "Rule of 3rds"}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Controls Panel */}
          <div className="md:col-span-5 p-5 space-y-5 flex flex-col justify-between bg-card text-xs">
            <div className="space-y-4">
              {/* Aspect Ratio Preset Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Target Aspect Ratio</span>
                  <Badge variant="outline" className="text-[10px] font-mono text-primary">
                    1080 × 1920 Mobile
                  </Badge>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {FLYER_SIZE_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedPresetId(preset.id)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                            : "border-border hover:bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">
                            {preset.ratioLabel}
                          </span>
                          {preset.isRecommended && (
                            <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.2 rounded">
                              Best
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-medium mt-0.5 line-clamp-1">{preset.name}</p>
                        <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                          {preset.width} × {preset.height} px
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Strategy Mode Switcher: Fit & Pad vs Crop */}
              <div className="space-y-2 pt-1">
                <Label className="text-xs font-semibold text-foreground">
                  Formatting Approach
                </Label>
                <Tabs value={mode} onValueChange={(val) => setMode(val as FlyerCropMode)}>
                  <TabsList className="grid grid-cols-2 h-8 w-full">
                    <TabsTrigger value="crop" className="text-xs gap-1.5 font-medium">
                      <Crop className="h-3.5 w-3.5 text-primary" />
                      Crop to Fill (Edge-to-Edge)
                    </TabsTrigger>
                    <TabsTrigger value="fit" className="text-xs gap-1.5 font-medium">
                      <Maximize2 className="h-3.5 w-3.5 text-emerald-600" />
                      Smart Fit (No Crop)
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Mode-Specific Settings */}
              {mode === "crop" ? (
                <div className="rounded-lg border p-3.5 space-y-3.5 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Quick Content Alignment</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetFraming}
                      className="h-6 text-[10px] text-muted-foreground hover:text-foreground gap-1 px-1.5"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={alignment === "top" ? "default" : "outline"}
                      onClick={() => {
                        setAlignment("top");
                        setPanOffset((p) => ({ ...p, y: 0 }));
                      }}
                      className="h-7 text-xs"
                    >
                      Top Header
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={alignment === "center" ? "default" : "outline"}
                      onClick={() => {
                        setAlignment("center");
                        setPanOffset((p) => ({ ...p, y: 0 }));
                      }}
                      className="h-7 text-xs"
                    >
                      Center
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={alignment === "bottom" ? "default" : "outline"}
                      onClick={() => {
                        setAlignment("bottom");
                        setPanOffset((p) => ({ ...p, y: 0 }));
                      }}
                      className="h-7 text-xs"
                    >
                      Bottom Deals
                    </Button>
                  </div>

                  {/* Zoom Slider */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <ZoomIn className="h-3 w-3" /> Zoom Scale
                      </span>
                      <span className="font-mono font-semibold">{zoom.toFixed(1)}x</span>
                    </div>
                    <Slider
                      value={[zoom]}
                      min={1.0}
                      max={2.5}
                      step={0.05}
                      onValueChange={([val]) => setZoom(val)}
                      className="py-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border p-3.5 space-y-3 bg-emerald-500/5 border-emerald-500/20">
                  <div className="flex items-start gap-2 text-xs text-foreground">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      <strong className="text-foreground">100% of flyer preserved:</strong> Fits the
                      entire circular inside the 9:16 mobile canvas without clipping any prices,
                      text, or disclaimers.
                    </p>
                  </div>

                  {/* Background Color Picker */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">
                      Canvas Padding Background
                    </Label>
                    <div className="flex items-center gap-2">
                      {[
                        { label: "White", value: "#FFFFFF", border: "border-border" },
                        { label: "Neutral Gray", value: "#F4F4F5", border: "border-border" },
                        { label: "Dark Slate", value: "#18181B", border: "border-border" },
                        { label: "Deep Forest", value: "#075E50", border: "border-border" },
                      ].map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setBgColor(c.value)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] transition-all ${
                            bgColor === c.value
                              ? "border-primary bg-primary/10 font-semibold"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <span
                            className="h-3 w-3 rounded-full border"
                            style={{ backgroundColor: c.value }}
                          />
                          <span>{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Informational Summary Card */}
              <div className="rounded-lg border p-3 bg-muted/30 space-y-1 text-[11px]">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span>Output Resolution:</span>
                  <span className="font-mono text-primary">
                    {activePreset.width} × {activePreset.height} px
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Mobile Display Fit:</span>
                  <span className="font-medium">Edge-to-Edge Clean Fit</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Interactive Hotspots:</span>
                  <span className="text-emerald-600 font-medium">100% Coordinate Accuracy</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApply}
                disabled={isProcessing || !loadedImage}
                className="text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-xs"
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span>Apply {activePreset.ratioLabel} Mobile Standard</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
