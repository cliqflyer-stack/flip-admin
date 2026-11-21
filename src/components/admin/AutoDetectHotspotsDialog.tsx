import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Cpu,
  Loader2,
  CheckCircle2,
  X,
  Trash2,
  Tag,
  Scan,
  RefreshCw,
  ExternalLink,
  Crop,
  Key,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  autoDetectFlyerHotspots,
  cropBannerArea,
  resolveImageUrl,
  type ApiFlyer,
  type ApiProduct,
  type AutoDetectedItem,
} from "@/lib/api-client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flyer: ApiFlyer;
  catalogProducts: ApiProduct[];
  onApplyHotspots: (
    hotspots: Array<{
      productId: string;
      x: number;
      y: number;
      width: number;
      height: number;
      titleOverride?: string;
      priceOverride?: string;
    }>
  ) => void;
}

export function AutoDetectHotspotsDialog({
  open,
  onOpenChange,
  flyer,
  catalogProducts,
  onApplyHotspots,
}: Props) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [useAi, setUseAi] = useState(true);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("flip_ai_key") || "");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [createMissingProducts, setCreateMissingProducts] = useState(true);

  const [detectedItems, setDetectedItems] = useState<AutoDetectedItem[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Run auto-detection when opened and empty
  useEffect(() => {
    if (open && detectedItems.length === 0 && flyer.flyerImageUrl) {
      handleRunDetection();
    }
  }, [open, flyer.id]);

  const handleRunDetection = async () => {
    setIsDetecting(true);
    setSelectedIndex(null);
    try {
      if (apiKey) {
        localStorage.setItem("flip_ai_key", apiKey);
      }

      const res = await autoDetectFlyerHotspots({
        flyerId: flyer.id,
        flyerImageUrl: flyer.flyerImageUrl,
        merchantId: flyer.merchantId,
        useAi,
        apiKey: apiKey || undefined,
        createMissingProducts,
        applyImmediately: false,
      });

      if (!res.items || res.items.length === 0) {
        toast.warning("No product deals detected. Try toggling AI/OCR mode or adjusting key.");
        setDetectedItems([]);
      } else {
        setDetectedItems(res.items);
        toast.success(`✨ Successfully detected ${res.items.length} product deal areas!`);
      }
    } catch (err: any) {
      toast.error(`Auto-detection failed: ${err.message}`);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleUpdateItem = (index: number, updates: Partial<AutoDetectedItem>) => {
    setDetectedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleDeleteItem = (index: number) => {
    setDetectedItems((prev) => prev.filter((_, i) => i !== index));
    if (selectedIndex === index) setSelectedIndex(null);
  };

  const handleApplyAll = () => {
    if (detectedItems.length === 0) {
      toast.error("No items to apply.");
      return;
    }

    const hotspotsToApply = detectedItems
      .filter((item) => item.matchedProductId || item.product?.id || catalogProducts[0]?.id)
      .map((item) => ({
        productId: item.matchedProductId || item.product?.id || catalogProducts[0]?.id,
        x: item.box.x,
        y: item.box.y,
        width: item.box.width,
        height: item.box.height,
        titleOverride: item.name,
        priceOverride: item.offerPrice ? String(item.offerPrice) : undefined,
      }));

    onApplyHotspots(hotspotsToApply);
    toast.success(`Mapped ${hotspotsToApply.length} interactive hotspots to flyer!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">
                  AI &amp; OCR Circular Auto-Detection
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Automatically detects product deals, crops banner thumbnails, extracts prices, and matches with your catalog.
                </DialogDescription>
              </div>
            </div>

            {/* Quick Mode Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <Switch
                  checked={useAi}
                  onCheckedChange={setUseAi}
                  id="mode-switch"
                />
                <Label htmlFor="mode-switch" className="cursor-pointer text-xs">
                  {useAi ? "Multimodal AI Vision" : "Local OCR Engine"}
                </Label>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="h-7 text-[11px] gap-1 px-2"
                title="Configure Gemini API Key"
              >
                <Key className="h-3 w-3 text-primary" />
                <span>API Key</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleRunDetection}
                disabled={isDetecting}
                className="h-7 text-xs gap-1.5 font-medium"
              >
                {isDetecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>Re-detect</span>
              </Button>
            </div>
          </div>

          {/* Optional Gemini Key Input Drawer */}
          {showKeyInput && (
            <div className="mt-2 p-2.5 rounded-md bg-muted/40 border flex items-center gap-2 text-xs">
              <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                placeholder="Optional Gemini Vision API Key (uses fast local OCR if blank)..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="h-7 text-xs flex-1"
                type="password"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  localStorage.setItem("flip_ai_key", apiKey);
                  setShowKeyInput(false);
                  toast.success("Saved AI Key!");
                }}
                className="h-7 text-xs"
              >
                Save
              </Button>
            </div>
          )}
        </DialogHeader>

        {/* MAIN BODY: 2 COLUMN SPLIT */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 py-3 overflow-hidden">
          {/* Left Column: Visual Flyer Canvas with Overlaid Bounding Boxes */}
          <div className="flex-1 bg-muted/20 border rounded-xl overflow-hidden relative flex items-center justify-center min-h-[350px]">
            {isDetecting && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center z-20 space-y-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-semibold">Scanning Circular with {useAi ? "AI Vision" : "OCR Engine"}...</p>
                  <p className="text-xs text-muted-foreground">Extracting deals, prices, and bounding areas</p>
                </div>
              </div>
            )}

            <div className="relative max-h-full max-w-full">
              <img
                src={resolveImageUrl(flyer.flyerImageUrl)}
                alt={flyer.title}
                className="max-h-[580px] max-w-full object-contain block select-none pointer-events-none"
              />

              {/* Overlaid Detected Bounding Boxes */}
              {detectedItems.map((item, idx) => {
                const isHovered = hoveredIndex === idx;
                const isSelected = selectedIndex === idx;

                return (
                  <div
                    key={item.tempId}
                    onClick={() => setSelectedIndex(idx)}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{
                      left: `${item.box.x * 100}%`,
                      top: `${item.box.y * 100}%`,
                      width: `${item.box.width * 100}%`,
                      height: `${item.box.height * 100}%`,
                    }}
                    className={`absolute cursor-pointer border-2 transition-all rounded-sm flex items-start p-1 ${
                      isSelected
                        ? "border-primary bg-primary/25 z-10 shadow-lg ring-2 ring-primary/40"
                        : isHovered
                        ? "border-amber-400 bg-amber-400/20 z-10"
                        : "border-emerald-500/80 bg-emerald-500/10 hover:border-emerald-400"
                    }`}
                  >
                    <span className="bg-black/80 text-white font-bold text-[9px] px-1 py-0.5 rounded shadow-xs truncate max-w-full">
                      ${item.offerPrice.toFixed(2)} · {item.name.slice(0, 14)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detected Items Inspector List */}
          <div className="w-full md:w-96 flex flex-col border rounded-xl bg-card overflow-hidden">
            <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Detected Deals ({detectedItems.length})
                </h4>
                <p className="text-[10px] text-muted-foreground">Review, edit prices or match catalog</p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {detectedItems.filter((d) => d.isNew).length} new products
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {detectedItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                  <Scan className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  <p>Click "Re-detect" to scan this flyer.</p>
                </div>
              ) : (
                detectedItems.map((item, idx) => {
                  const isSelected = selectedIndex === idx;

                  return (
                    <div
                      key={item.tempId}
                      onClick={() => setSelectedIndex(idx)}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className={`p-2.5 rounded-lg border text-xs space-y-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "hover:border-primary/50 bg-background"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Cropped Flyer Banner Thumbnail */}
                        <div className="h-14 w-14 rounded-md border bg-muted/40 overflow-hidden shrink-0 relative">
                          {item.croppedImageUrl ? (
                            <img
                              src={resolveImageUrl(item.croppedImageUrl)}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                              Crop
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <Input
                            value={item.name}
                            onChange={(e) => handleUpdateItem(idx, { name: e.target.value })}
                            className="h-6 text-xs font-semibold px-1.5 py-0 mb-1"
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">Deal: $</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.offerPrice}
                              onChange={(e) => handleUpdateItem(idx, { offerPrice: parseFloat(e.target.value) || 0 })}
                              className="h-5 w-16 text-xs font-bold px-1 text-rose-600"
                            />
                            {item.badgeText && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 truncate max-w-24">
                                {item.badgeText}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(idx);
                          }}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          title="Delete detected area"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Product Catalog Match Selector */}
                      <div className="pt-1 border-t flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground shrink-0">Map to:</span>
                        <Select
                          value={item.matchedProductId || item.product?.id || "create_new"}
                          onValueChange={(val) => {
                            if (val === "create_new") {
                              handleUpdateItem(idx, { matchedProductId: null, isNew: true });
                            } else {
                              const found = catalogProducts.find((p) => p.id === val);
                              handleUpdateItem(idx, { matchedProductId: val, product: found, isNew: false });
                            }
                          }}
                        >
                          <SelectTrigger className="h-6 text-[11px] flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="create_new" className="text-xs font-medium text-primary">
                              + Create New Product (with cropped photo)
                            </SelectItem>
                            {catalogProducts.map((p) => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                {p.name} (${Number(p.offerPrice || 0).toFixed(2)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {detectedItems.length > 0 && (
              <span>
                Ready to map <strong>{detectedItems.length}</strong> deal hotspots with extracted prices &amp; cropped banner thumbnails.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApplyAll}
              disabled={detectedItems.length === 0}
              className="h-8 text-xs gap-1.5 font-semibold bg-primary text-primary-foreground shadow-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Apply {detectedItems.length} Hotspots to Studio</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
