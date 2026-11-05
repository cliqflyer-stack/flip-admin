import React, { lazy, Suspense, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Database,
  ExternalLink,
  Eye,
  Hand,
  Loader2,
  Maximize2,
  MousePointer,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  resolveImageUrl,
  type ApiFlyer,
  type ApiProduct,
} from "@/lib/api-client";
import type { Hotspot, HotspotRect } from "@/lib/flyer-storage";
import { cn } from "@/lib/utils";

const FlyerEditorCanvas = lazy(() => import("@/components/flyer/FlyerEditorCanvas"));

interface EditorViewProps {
  flyers: ApiFlyer[];
  selectedFlyerId: string;
  onSelectFlyer: (id: string) => void;
  catalogProducts: ApiProduct[];
  hotspots: Hotspot[];
  selectedHotspotId: string | null;
  onSelectHotspot: (id: string | null) => void;
  onCreateHotspot: (rect: HotspotRect) => void;
  onUpdateHotspot: (id: string, rect: HotspotRect) => void;
  onDeleteHotspot: (id: string) => void;
  onSaveToDatabase: () => Promise<void>;
  isSaving: boolean;
  onOpenUpload: () => void;
  imageUrl: string;
  imgSize: { width: number; height: number };
}

export function EditorView({
  flyers,
  selectedFlyerId,
  onSelectFlyer,
  catalogProducts,
  hotspots,
  selectedHotspotId,
  onSelectHotspot,
  onCreateHotspot,
  onUpdateHotspot,
  onDeleteHotspot,
  onSaveToDatabase,
  isSaving,
  onOpenUpload,
  imageUrl,
  imgSize,
}: EditorViewProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [drawProduct, setDrawProduct] = useState<ApiProduct | null>(null);
  const [zoom, setZoom] = useState(1.0);

  // Keyboard shortcut for saving (Ctrl/Cmd + S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSaveToDatabase();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSaveToDatabase]);

  // Extract unique categories from catalog
  const categories = ["all", ...Array.from(new Set(catalogProducts.map((p) => p.category).filter(Boolean)))];

  const filteredProducts = catalogProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedHotspot = hotspots.find((h) => h.id === selectedHotspotId);
  const selectedProduct = selectedHotspot
    ? catalogProducts.find((p) => p.id === selectedHotspot.productId)
    : null;

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Studio Header Sub-bar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b bg-card px-4 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
            Select Flyer:
          </span>
          {flyers.map((flyer) => (
            <button
              key={flyer.id}
              onClick={() => onSelectFlyer(flyer.id)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors shrink-0",
                selectedFlyerId === flyer.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 text-foreground hover:bg-muted border border-border/50"
              )}
            >
              {flyer.title} ({flyer.hotspots?.length || 0})
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenUpload}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            <Plus className="h-3 w-3 mr-1" /> New Flyer
          </Button>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {imgSize.width > 0 && (
            <span className="hidden lg:inline text-muted-foreground">
              {imgSize.width} × {imgSize.height} px
            </span>
          )}

          <Button
            size="sm"
            onClick={onSaveToDatabase}
            disabled={isSaving}
            className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground font-medium shadow-xs"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Save Hotspots (⌘S)</span>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Link to="/preview">
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span>Preview</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Studio 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Product Catalog & Draw Tool */}
        <aside className="flex w-72 lg:w-80 shrink-0 flex-col border-r bg-card">
          <div className="p-3 border-b space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold tracking-tight uppercase text-muted-foreground">
                1. Product Catalog
              </h2>
              <Badge variant="secondary" className="text-[10px] font-semibold">
                {filteredProducts.length} items
              </Badge>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search products & deals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              {categories.slice(0, 5).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "rounded-full px-2 py-0.5 capitalize whitespace-nowrap transition-colors",
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Active drawing hint */}
          {drawProduct ? (
            <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  Draw Mode Active
                </span>
                <button
                  onClick={() => setDrawProduct(null)}
                  className="text-amber-700 dark:text-amber-300 hover:opacity-80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed">
                Click & drag a rectangle over <strong>{drawProduct.name}</strong> on the flyer to map it.
              </p>
            </div>
          ) : (
            <div className="p-2.5 bg-muted/40 border-b text-[11px] text-muted-foreground flex items-center gap-1.5">
              <MousePointer className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Select a product below, then drag a rectangle over the flyer.</span>
            </div>
          )}

          {/* Product Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/50">
            {filteredProducts.map((product) => {
              const isSelectedForDraw = drawProduct?.id === product.id;
              const isMapped = hotspots.some((h) => h.productId === product.id);

              return (
                <div
                  key={product.id}
                  onClick={() => setDrawProduct(isSelectedForDraw ? null : product)}
                  className={cn(
                    "flex items-center gap-3 p-2.5 cursor-pointer transition-colors hover:bg-muted/50",
                    isSelectedForDraw && "bg-primary/10 border-l-4 border-primary",
                    isMapped && "opacity-90"
                  )}
                >
                  <img
                    src={resolveImageUrl(product.imageUrl)}
                    alt={product.name}
                    className="h-10 w-10 shrink-0 rounded object-cover border bg-background"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-xs font-semibold">{product.name}</p>
                      {isMapped && (
                        <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                          <CheckCircle2 className="h-3 w-3" /> Mapped
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{product.brand}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        ${Number(product.offerPrice).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-muted-foreground line-through">
                        ${Number(product.regularPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center Column: Smooth Scrolling Canvas Studio with Zoom Controls */}
        <main className="relative flex-1 flex flex-col bg-muted/20 overflow-hidden">
          {/* Floating Zoom & Studio Control Toolbar */}
          <div className="absolute top-4 z-20 flex items-center gap-1.5 rounded-full border bg-card/95 px-3 py-1 shadow-md backdrop-blur">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => setZoom((z) => Math.max(0.5, parseFloat((z - 0.15).toFixed(2))))}
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>

            <span className="min-w-[44px] text-center text-xs font-semibold text-foreground">
              {Math.round(zoom * 100)}%
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => setZoom((z) => Math.min(2.0, parseFloat((z + 0.15).toFixed(2))))}
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>

            <Separator orientation="vertical" className="h-4 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-medium"
              onClick={() => setZoom(1.0)}
            >
              <RotateCcw className="h-3 w-3 mr-1" /> 100%
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-medium"
              onClick={() => setZoom(0.85)}
            >
              <Maximize2 className="h-3 w-3 mr-1" /> Fit
            </Button>
          </div>

          {/* Dedicated Natural Scrolling Viewport (Allows unconstrained top-to-bottom scroll) */}
          <div className="flex-1 overflow-auto p-8 pt-16 pb-36 flex justify-center">
            <div className="relative inline-block max-w-none">
              <Suspense
                fallback={
                  <div className="flex flex-col items-center justify-center p-20 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Loading flyer canvas...</span>
                  </div>
                }
              >
                <FlyerEditorCanvas
                  imageUrl={imageUrl}
                  imageWidth={imgSize.width}
                  imageHeight={imgSize.height}
                  hotspots={hotspots}
                  selectedId={selectedHotspotId}
                  drawProduct={drawProduct}
                  catalogProducts={catalogProducts}
                  zoom={zoom}
                  onSelect={onSelectHotspot}
                  onCreate={onCreateHotspot}
                  onUpdate={onUpdateHotspot}
                />
              </Suspense>
            </div>
          </div>
        </main>

        {/* Right Column: Hotspots Inspector */}
        <aside className="flex w-72 lg:w-80 shrink-0 flex-col border-l bg-card">
          <div className="p-3 border-b flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold tracking-tight uppercase text-muted-foreground">
                2. Mapped Hotspots
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {hotspots.length} touch target{hotspots.length === 1 ? "" : "s"} on page
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-semibold">
              Live Neon DB
            </Badge>
          </div>

          {/* Selected Hotspot Detailed Card */}
          {selectedHotspot && selectedProduct ? (
            <div className="p-3 border-b bg-primary/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Selected Hotspot
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteHotspot(selectedHotspot.id)}
                  className="h-6 px-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>

              <div className="flex items-center gap-2.5 bg-background p-2 rounded-md border text-xs">
                <img
                  src={resolveImageUrl(selectedProduct.imageUrl)}
                  alt={selectedProduct.name}
                  className="h-9 w-9 rounded object-cover border"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{selectedProduct.name}</p>
                  <p className="text-[11px] text-emerald-600 font-bold">
                    ${Number(selectedProduct.offerPrice).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground">
                <div className="bg-background/80 p-1.5 rounded border">
                  X: {Math.round(selectedHotspot.x * 100)}% · Y: {Math.round(selectedHotspot.y * 100)}%
                </div>
                <div className="bg-background/80 p-1.5 rounded border">
                  W: {Math.round(selectedHotspot.width * 100)}% · H: {Math.round(selectedHotspot.height * 100)}%
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-muted/30 border-b text-[11px] text-muted-foreground">
              Click any hotspot rectangle on the canvas to inspect coordinates.
            </div>
          )}

          {/* Hotspots List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/50">
            {hotspots.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <Sparkles className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                <p className="font-medium">No hotspots mapped yet</p>
                <p className="text-[11px]">Select a product from the left catalog and drag over the flyer.</p>
              </div>
            ) : (
              hotspots.map((h, index) => {
                const prod = catalogProducts.find((p) => p.id === h.productId);
                const isSelected = h.id === selectedHotspotId;

                return (
                  <div
                    key={h.id}
                    onClick={() => onSelectHotspot(h.id)}
                    className={cn(
                      "flex items-center justify-between p-2.5 cursor-pointer text-xs transition-colors hover:bg-muted/50",
                      isSelected && "bg-destructive/10 border-l-4 border-destructive font-semibold"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-muted-foreground">#{index + 1}</span>
                        <p className="truncate font-medium">{prod?.name || "Hotspot"}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {Math.round(h.width * 100)}% × {Math.round(h.height * 100)}% area
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteHotspot(h.id);
                      }}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
