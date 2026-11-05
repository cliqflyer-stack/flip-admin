import React, { lazy, Suspense, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  Hand,
  Layers,
  Loader2,
  MapPin,
  MousePointer,
  Plus,
  Save,
  Search,
  Store,
  Tag,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  resolveImageUrl,
  type ApiFlyer,
  type ApiProduct,
  type Merchant,
  type StoreLocation,
} from "@/lib/api-client";
import { ProductDialog } from "./ProductDialog";
import type { Hotspot, HotspotRect } from "@/lib/flyer-storage";
import { cn } from "@/lib/utils";

const FlyerEditorCanvas = lazy(() => import("@/components/flyer/FlyerEditorCanvas"));

interface EditorViewProps {
  flyers: ApiFlyer[];
  selectedFlyerId: string;
  onSelectFlyer: (id: string) => void;
  catalogProducts: ApiProduct[];
  merchants?: Merchant[];
  storeLocations?: StoreLocation[];
  onProductCreated?: (product: ApiProduct) => void;
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
  merchants = [],
  storeLocations = [],
  onProductCreated,
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
  // Navigation states within Studio
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [storeSearch, setStoreSearch] = useState("");

  // Editor states
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [drawProduct, setDrawProduct] = useState<ApiProduct | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  const currentFlyer = flyers.find((f) => f.id === selectedFlyerId);

  // If a flyerId is selected, automatically set the store context
  useEffect(() => {
    if (currentFlyer?.storeLocationId) {
      setSelectedStoreId(currentFlyer.storeLocationId);
    } else if (currentFlyer?.merchantId) {
      setSelectedStoreId(`merchant_${currentFlyer.merchantId}`);
    }
  }, [currentFlyer]);

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
  const categories = [
    "all",
    ...Array.from(new Set(catalogProducts.map((p) => p.category).filter(Boolean))),
  ];

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

  // --- STEP 1: STORE / FRANCHISE SELECTION (when no flyer is actively opened) ---
  if (!selectedFlyerId && !selectedStoreId) {
    const filteredStores = storeLocations.filter((s) => {
      const merch = merchants.find((m) => m.id === s.merchantId);
      return (
        s.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
        s.city.toLowerCase().includes(storeSearch.toLowerCase()) ||
        (merch && merch.name.toLowerCase().includes(storeSearch.toLowerCase()))
      );
    });

    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Interactive Flyer Studio</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a store location or franchise brand to view and edit its circular hotspots.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search stores or cities..."
              value={storeSearch}
              onChange={(e) => setStoreSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Chain-wide / Universal brands */}
          {merchants.map((merch) => {
            const merchFlyers = flyers.filter((f) => f.merchantId === merch.id);
            const merchLocations = storeLocations.filter((l) => l.merchantId === merch.id);
            return (
              <Card
                key={merch.id}
                onClick={() => setSelectedStoreId(`merchant_${merch.id}`)}
                className="cursor-pointer hover:border-primary transition-all p-4 flex flex-col justify-between border shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
                      style={{ backgroundColor: merch.logoBg, color: merch.logoColor }}
                    >
                      {merch.initial}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {merchFlyers.length} Circular{merchFlyers.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">{merch.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Chain-wide flyers & {merchLocations.length} store branch{merchLocations.length === 1 ? "" : "es"}
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t flex items-center justify-between text-xs text-primary font-medium">
                  <span>Browse Circulars</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Card>
            );
          })}

          {/* Individual store locations */}
          {filteredStores.map((loc) => {
            const merch = merchants.find((m) => m.id === loc.merchantId);
            const storeFlyers = flyers.filter((f) => f.storeLocationId === loc.id);
            return (
              <Card
                key={loc.id}
                onClick={() => setSelectedStoreId(loc.id)}
                className="cursor-pointer hover:border-primary transition-all p-4 flex flex-col justify-between border shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {loc.city}, {loc.province}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {storeFlyers.length} Store Flyer{storeFlyers.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">{loc.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{loc.address}</p>
                </div>
                <div className="mt-4 pt-2 border-t flex items-center justify-between text-xs text-primary font-medium">
                  <span>Open Store Studio</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // --- STEP 2: STORE CIRCULARS VIEW (when store is picked, but flyer not opened yet) ---
  if (!selectedFlyerId && selectedStoreId) {
    const isBrandLevel = selectedStoreId.startsWith("merchant_");
    const activeMerchantId = isBrandLevel ? selectedStoreId.replace("merchant_", "") : null;
    const activeLocation = !isBrandLevel ? storeLocations.find((l) => l.id === selectedStoreId) : null;
    const activeMerchant = isBrandLevel
      ? merchants.find((m) => m.id === activeMerchantId)
      : merchants.find((m) => m.id === activeLocation?.merchantId);

    const storeFlyers = flyers.filter((f) => {
      if (isBrandLevel) {
        return f.merchantId === activeMerchantId;
      }
      return f.storeLocationId === selectedStoreId || (f.merchantId === activeLocation?.merchantId && !f.storeLocationId);
    });

    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedStoreId(null)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">
                  {activeLocation ? activeLocation.name : activeMerchant?.name}
                </h1>
                <Badge variant="outline" className="text-xs">
                  {storeFlyers.length} Circulars
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeLocation
                  ? `${activeLocation.address}, ${activeLocation.city} · Select a circular to edit hotspots`
                  : "Chain-wide flyers · Select a circular to edit hotspots"}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={onOpenUpload}
            className="h-8 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            New Flyer
          </Button>
        </div>

        {storeFlyers.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <h3 className="font-semibold text-sm">No circulars found for this store</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Upload a digital flyer circular for this location to start mapping shoppable product hotspots.
            </p>
            <Button size="sm" onClick={onOpenUpload} className="mt-4 gap-1.5 text-xs">
              <Upload className="h-3.5 w-3.5" /> Upload Flyer
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {storeFlyers.map((flyer) => (
              <Card
                key={flyer.id}
                onClick={() => onSelectFlyer(flyer.id)}
                className="cursor-pointer hover:border-primary hover:shadow-md transition-all overflow-hidden flex flex-col justify-between border shadow-xs"
              >
                <div>
                  <div className="relative aspect-[16/10] bg-muted/40 overflow-hidden border-b">
                    <img
                      src={resolveImageUrl(flyer.flyerImageUrl)}
                      alt={flyer.title}
                      className="h-full w-full object-cover object-top"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <Badge variant="default" className="text-[10px] uppercase font-bold">
                        {flyer.status}
                      </Badge>
                      {flyer.badgeText && (
                        <Badge variant="outline" className="text-[10px] bg-background/90 font-semibold">
                          {flyer.badgeText}
                        </Badge>
                      )}
                    </div>
                    <div className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[10px] text-white">
                      {flyer.hotspots?.length || 0} hotspots
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-sm text-foreground">{flyer.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {flyer.subtitle || "Weekly digital circular"}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-2 border-t bg-muted/20 flex items-center justify-between text-xs text-primary font-medium">
                  <span>Open Hotspot Editor</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- STEP 3: CANVAS HOTSPOT EDITOR (Flyer is actively opened) ---
  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Studio Header Sub-bar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b bg-card px-4 text-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectFlyer("")}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Store Circulars</span>
          </Button>

          <Separator orientation="vertical" className="h-4" />

          <div className="flex items-center gap-1.5 truncate max-w-sm">
            <span className="font-semibold text-foreground truncate">{currentFlyer?.title}</span>
            <span className="text-muted-foreground">({hotspots.length} hotspots)</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {imgSize.width > 0 && (
            <span className="hidden lg:inline text-muted-foreground text-[11px] font-mono">
              {imgSize.width} × {imgSize.height} px
            </span>
          )}

          <Button
            size="sm"
            onClick={onSaveToDatabase}
            disabled={isSaving}
            className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold shadow-xs"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Save Hotspots (⌘S)</span>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Link to="/preview" search={{ flyerId: selectedFlyerId } as any}>
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
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setProductDialogOpen(true)}
                  className="h-6 px-2 text-[10px] gap-1 font-semibold text-primary border-primary/30 hover:bg-primary/10 shadow-2xs"
                >
                  <Plus className="h-3 w-3" />
                  Add Product
                </Button>
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  {filteredProducts.length}
                </Badge>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search products or brands..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/30"
              />
            </div>

            {/* Category pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "rounded-md px-2 py-0.5 capitalize transition-colors font-medium shrink-0",
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Active Placement Tool Banner */}
          <div className="p-2.5 bg-muted/40 border-b text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              {drawProduct ? (
                <>
                  <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate font-semibold text-foreground">
                    Drawing: {drawProduct.name}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground text-[11px]">
                  Select a product below to draw a hotspot:
                </span>
              )}
            </div>
            {drawProduct && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDrawProduct(null)}
                className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Products List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No products found matching your search.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isDrawing = drawProduct?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setDrawProduct(p);
                      toast.info(`Ready to map "${p.name}". Click & drag on the flyer canvas.`);
                    }}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border p-2 cursor-pointer transition-all text-xs",
                      isDrawing
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs"
                        : "hover:bg-muted/40 bg-card border-border/60"
                    )}
                  >
                    <div className="h-10 w-10 shrink-0 rounded bg-muted/30 border flex items-center justify-center overflow-hidden">
                      {p.imageUrl ? (
                        <img
                          src={resolveImageUrl(p.imageUrl)}
                          alt={p.name}
                          className="h-full w-full object-contain p-0.5"
                        />
                      ) : (
                        <Tag className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{p.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="font-bold text-emerald-600">${Number(p.offerPrice).toFixed(2)}</span>
                        {p.unit && <span>{p.unit}</span>}
                      </div>
                    </div>
                    {isDrawing && (
                      <Badge variant="default" className="text-[9px] h-5 px-1.5 shrink-0 bg-primary">
                        Ready
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Center Canvas Viewport */}
        <main className="flex-1 flex flex-col bg-muted/20 relative overflow-hidden">
          {/* Canvas Floating Zoom Toolbar */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-md backdrop-blur">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
              className="h-7 w-7 text-xs"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-[44px] text-center font-mono text-[11px] font-semibold">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.1).toFixed(2))))}
              className="h-7 w-7 text-xs"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Separator orientation="vertical" className="h-4 mx-0.5" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(1.0)}
              className="h-7 px-2 text-[11px] font-medium"
            >
              Reset
            </Button>
          </div>

          {/* Interactive Flyer Canvas Container */}
          <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
            <Suspense
              fallback={
                <div className="flex h-96 items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Loading circular canvas...</span>
                </div>
              }
            >
              <FlyerEditorCanvas
                imageUrl={imageUrl}
                hotspots={hotspots}
                selectedHotspotId={selectedHotspotId}
                onSelectHotspot={onSelectHotspot}
                onCreateHotspot={onCreateHotspot}
                onUpdateHotspot={onUpdateHotspot}
                onDeleteHotspot={onDeleteHotspot}
                drawProduct={drawProduct}
                catalogProducts={catalogProducts}
                zoom={zoom}
              />
            </Suspense>
          </div>
        </main>

        {/* Right Column: Hotspots Inspector */}
        <aside className="hidden xl:flex w-72 shrink-0 flex-col border-l bg-card">
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-tight uppercase text-muted-foreground">
              3. Mapped Hotspots
            </h2>
            <Badge variant="outline" className="text-[10px] font-semibold">
              {hotspots.length} Total
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
            {hotspots.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No hotspots drawn on this flyer yet. Click & drag a rectangle on the canvas to place one.
              </div>
            ) : (
              hotspots.map((h, i) => {
                const prod = catalogProducts.find((p) => p.id === h.productId);
                const isSelected = selectedHotspotId === h.id;
                return (
                  <div
                    key={h.id}
                    onClick={() => onSelectHotspot(h.id)}
                    className={cn(
                      "rounded-lg border p-2.5 transition-all cursor-pointer flex items-center justify-between gap-2",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                        : "bg-muted/20 hover:bg-muted/40 border-border"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">
                        #{i + 1} {prod?.name || "Hotspot"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                        {Math.round(h.x * 100)}%, {Math.round(h.y * 100)}%
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteHotspot(h.id);
                      }}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* Product Creator Dialog within Flyer Studio */}
      <ProductDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        merchants={merchants}
        defaultMerchantId={currentFlyer?.merchantId}
        onSave={(newProd) => {
          if (onProductCreated) onProductCreated(newProd);
          setDrawProduct(newProd);
          toast.success(`"${newProd.name}" ready to place! Click & drag a rectangle on the flyer.`);
        }}
      />
    </div>
  );
}
