import React, { lazy, Suspense, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ChevronsUpDown,
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
  X,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  onCreateHotspot: (rect: HotspotRect, productId?: string) => void;
  onUpdateHotspot: (id: string, update: Partial<Hotspot>) => void;
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
  const [categoryOpen, setCategoryOpen] = useState(false);
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

  const selectedHotspotIndex = hotspots.findIndex((h) => h.id === selectedHotspotId);
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
              className="pl-8 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.map((store) => {
            const merch = merchants.find((m) => m.id === store.merchantId);
            const storeFlyers = flyers.filter((f) => f.storeLocationId === store.id);

            return (
              <Card
                key={store.id}
                onClick={() => setSelectedStoreId(store.id)}
                className="cursor-pointer hover:border-primary/60 transition-all hover:shadow-sm"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                      {merch?.name || "Retail Brand"}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {storeFlyers.length} {storeFlyers.length === 1 ? "circular" : "circulars"}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold mt-1">{store.name}</CardTitle>
                  <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span>{store.city}, {store.province}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{store.address}</span>
                  <ChevronRight className="h-4 w-4" />
                </CardContent>
              </Card>
            );
          })}

          {/* Fallback chain-wide merchants */}
          {merchants.map((m) => {
            const chainFlyers = flyers.filter((f) => f.merchantId === m.id && !f.storeLocationId);
            return (
              <Card
                key={`merch_${m.id}`}
                onClick={() => setSelectedStoreId(`merchant_${m.id}`)}
                className="cursor-pointer hover:border-primary/60 transition-all hover:shadow-sm border-dashed"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Chain-wide
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {chainFlyers.length} {chainFlyers.length === 1 ? "circular" : "circulars"}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold mt-1">{m.name}</CardTitle>
                  <CardDescription className="text-xs">
                    All Locations / Online Circulars
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>National chain</span>
                  <ChevronRight className="h-4 w-4" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // --- STEP 2: STORE CIRCULARS LIST (when store selected, but no flyer clicked yet) ---
  if (selectedStoreId && !selectedFlyerId) {
    const isChain = selectedStoreId.startsWith("merchant_");
    const rawMerchantId = isChain ? selectedStoreId.replace("merchant_", "") : null;
    const storeObj = !isChain ? storeLocations.find((s) => s.id === selectedStoreId) : null;
    const merchantObj = isChain
      ? merchants.find((m) => m.id === rawMerchantId)
      : merchants.find((m) => m.id === storeObj?.merchantId);

    const storeFlyers = isChain
      ? flyers.filter((f) => f.merchantId === rawMerchantId && !f.storeLocationId)
      : flyers.filter((f) => f.storeLocationId === selectedStoreId);

    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedStoreId(null)}
              className="h-8 w-8"
              title="Back to Stores"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{merchantObj?.name}</span>
                <span className="text-xs text-muted-foreground">/</span>
                <span className="text-xs font-semibold">{storeObj?.name || "Chain-wide Circulars"}</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight">Available Circulars</h1>
            </div>
          </div>

          <Button
            size="sm"
            onClick={onOpenUpload}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Upload New Circular</span>
          </Button>
        </div>

        {storeFlyers.length === 0 ? (
          <div className="border border-dashed rounded-lg p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-foreground">No circulars published for this location yet</p>
            <p className="text-xs text-muted-foreground">Upload a digital circular to map interactive hotspots.</p>
            <Button size="sm" onClick={onOpenUpload} className="h-8 gap-1.5 text-xs">
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Circular</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {storeFlyers.map((flyer) => (
              <Card
                key={flyer.id}
                onClick={() => onSelectFlyer(flyer.id)}
                className="group cursor-pointer overflow-hidden border hover:border-primary/60 transition-all hover:shadow-md flex flex-col"
              >
                <div className="aspect-[4/5] bg-muted/30 overflow-hidden relative border-b">
                  <img
                    src={resolveImageUrl(flyer.flyerImageUrl)}
                    alt={flyer.title}
                    className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 right-2.5">
                    <Badge variant="default" className="text-[10px] bg-primary">
                      {flyer.hotspots?.length || 0} Hotspots
                    </Badge>
                  </div>
                </div>
                <CardHeader className="p-3.5 pb-2">
                  <CardTitle className="text-sm font-bold truncate">{flyer.title}</CardTitle>
                  <CardDescription className="text-xs truncate">{flyer.subtitle || "Weekly Circular"}</CardDescription>
                </CardHeader>
                <CardContent className="p-3.5 pt-0 mt-auto flex items-center justify-between text-xs text-muted-foreground">
                  <span>Edit hotspots & canvas</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- STEP 3: FULL CANVAS HOTSPOT EDITOR (when a circular is opened) ---
  return (
    <div className="flex h-full flex-col">
      {/* Studio Top Control Bar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b bg-card px-4 gap-2">
        {/* Breadcrumb Navigation back to stores & flyers */}
        <div className="flex items-center gap-1.5 text-xs truncate">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedStoreId(null);
              onSelectFlyer("");
            }}
            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            title="All Stores"
          >
            <Store className="h-3.5 w-3.5" />
            <span>Stores</span>
          </Button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectFlyer("")}
            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            title="Store Circulars"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Circulars</span>
          </Button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-semibold text-foreground truncate">{currentFlyer?.title}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {hotspots.length} hotspots
          </Badge>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProductDialogOpen(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Product</span>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Link to="/preview" search={{ flyerId: selectedFlyerId } as any}>
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span>Preview</span>
            </Link>
          </Button>

          <Button
            size="sm"
            onClick={onSaveToDatabase}
            disabled={isSaving}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>Save Hotspots</span>
          </Button>
        </div>
      </div>

      {/* Main Studio Body: 3-column layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Column: Product Catalog & Mapper */}
        <aside className="w-72 shrink-0 flex flex-col border-r bg-card">
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold tracking-tight uppercase text-muted-foreground">
                1. Product Catalog
              </h2>
              <span className="text-[10px] text-muted-foreground">
                {catalogProducts.length} items
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>

            {/* Search & Select Category Combobox */}
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={categoryOpen}
                  className="w-full justify-between text-xs h-8 px-2.5 font-normal bg-background"
                >
                  <span className="truncate">
                    {selectedCategory === "all" ? "All Categories" : selectedCategory}
                  </span>
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search categories..." className="h-8 text-xs" />
                  <CommandList>
                    <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                      No category found.
                    </CommandEmpty>
                    <CommandGroup>
                      {categories.map((cat) => (
                        <CommandItem
                          key={cat}
                          value={cat}
                          onSelect={() => {
                            setSelectedCategory(cat);
                            setCategoryOpen(false);
                          }}
                          className="text-xs capitalize"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-3.5 w-3.5",
                              selectedCategory === cat ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span>{cat === "all" ? "All Categories" : cat}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
              ) : selectedHotspotId ? (
                <span className="text-primary text-[11px] font-semibold">
                  Click a product to assign to selected hotspot:
                </span>
              ) : (
                <span className="text-muted-foreground text-[11px]">
                  Select a product or drag an area on canvas:
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
                const isAssignedToSelected = selectedHotspot?.productId === p.id;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (selectedHotspotId) {
                        onUpdateHotspot(selectedHotspotId, { productId: p.id });
                        toast.success(`Assigned "${p.name}" to selected hotspot.`);
                      } else {
                        setDrawProduct(p);
                        toast.info(`Ready to map "${p.name}". Click & drag an area on the canvas.`);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border p-2 cursor-pointer transition-all text-xs",
                      isDrawing
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs"
                        : isAssignedToSelected
                        ? "border-emerald-500 bg-emerald-500/10 shadow-xs"
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
                imageWidth={imgSize.width}
                imageHeight={imgSize.height}
                hotspots={hotspots}
                selectedId={selectedHotspotId}
                onSelect={onSelectHotspot}
                onCreate={(rect) => {
                  const assignedProductId = drawProduct?.id || catalogProducts[0]?.id || "prod_pepsi";
                  onCreateHotspot(rect, assignedProductId);
                  if (drawProduct) {
                    toast.success(`Mapped "${drawProduct.name}" to circular.`);
                  } else {
                    toast.success("Hotspot mapped. Choose a product from the right panel.");
                  }
                }}
                onUpdate={onUpdateHotspot}
                onDelete={onDeleteHotspot}
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
              3. Hotspots Inspector
            </h2>
            <Badge variant="outline" className="text-[10px] font-semibold">
              {hotspots.length} Total
            </Badge>
          </div>

          {/* Selected Hotspot Controls */}
          {selectedHotspot ? (
            <div className="p-3 border-b bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">
                  Hotspot #{selectedHotspotIndex + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectHotspot(null)}
                  className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3 mr-1" /> Deselect
                </Button>
              </div>

              {/* Product Preview Card */}
              {selectedProduct ? (
                <div className="flex items-center gap-2.5 bg-background p-2 rounded-md border text-xs">
                  <div className="h-9 w-9 rounded bg-muted/30 border shrink-0 overflow-hidden flex items-center justify-center">
                    {selectedProduct.imageUrl ? (
                      <img
                        src={resolveImageUrl(selectedProduct.imageUrl)}
                        alt={selectedProduct.name}
                        className="h-full w-full object-contain p-0.5"
                      />
                    ) : (
                      <Tag className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{selectedProduct.name}</p>
                    <p className="text-[11px] text-emerald-600 font-bold">
                      ${Number(selectedProduct.offerPrice || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-background border rounded text-xs text-muted-foreground">
                  No product assigned yet.
                </div>
              )}

              {/* Product Selector Dropdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>Assigned Product</span>
                  <button
                    type="button"
                    onClick={() => setProductDialogOpen(true)}
                    className="text-primary hover:underline text-[10px]"
                  >
                    + New Product
                  </button>
                </div>
                <Select
                  value={selectedHotspot.productId}
                  onValueChange={(val) => {
                    onUpdateHotspot(selectedHotspot.id, { productId: val });
                    const found = catalogProducts.find((p) => p.id === val);
                    toast.success(`Assigned "${found?.name || val}" to hotspot.`);
                  }}
                >
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Select product..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {catalogProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} (${Number(p.offerPrice || 0).toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Promotional Override (Flyer-specific) */}
              <div className="space-y-2 p-2 bg-muted/40 rounded-md border text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground">Flyer Price Override</span>
                  {selectedHotspot.priceOverride && (
                    <button
                      type="button"
                      onClick={() => onUpdateHotspot(selectedHotspot.id, { priceOverride: null, titleOverride: null })}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline"
                    >
                      Reset Default
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground font-mono">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={assignedProduct ? Number(assignedProduct.offerPrice || 0).toFixed(2) : "0.00"}
                      value={selectedHotspot.priceOverride ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : e.target.value;
                        onUpdateHotspot(selectedHotspot.id, { priceOverride: val });
                      }}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Overrides base price ({assignedProduct ? `$${Number(assignedProduct.offerPrice || 0).toFixed(2)}` : "$0.00"}) for this circular.
                  </p>
                </div>

                <div className="space-y-1 pt-1 border-t border-border/50">
                  <label className="text-[10px] text-muted-foreground font-medium">Flyer Title / Badge Override</label>
                  <Input
                    type="text"
                    placeholder={assignedProduct?.name || "Custom circular badge / headline"}
                    value={selectedHotspot.titleOverride ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : e.target.value;
                      onUpdateHotspot(selectedHotspot.id, { titleOverride: val });
                    }}
                    className="h-7 text-xs"
                  />
                </div>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground">
                <div className="bg-background/80 p-1.5 rounded border">
                  X: {Math.round(selectedHotspot.x * 100)}% · Y: {Math.round(selectedHotspot.y * 100)}%
                </div>
                <div className="bg-background/80 p-1.5 rounded border">
                  W: {Math.round(selectedHotspot.width * 100)}% · H: {Math.round(selectedHotspot.height * 100)}%
                </div>
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDeleteHotspot(selectedHotspot.id)}
                className="w-full h-7 text-xs gap-1.5"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete Hotspot</span>
              </Button>
            </div>
          ) : (
            <div className="p-3 bg-muted/30 border-b text-[11px] text-muted-foreground">
              Click any hotspot rectangle on the canvas to inspect, move, resize, or re-assign.
            </div>
          )}

          {/* Hotspots List */}
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
                      <p className="font-semibold text-foreground truncate flex items-center gap-1.5">
                        <span className="truncate">#{i + 1} {h.titleOverride || prod?.name || "Hotspot"}</span>
                        {h.priceOverride && (
                          <span className="shrink-0 text-[10px] font-mono text-emerald-600 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">
                            ${Number(h.priceOverride).toFixed(2)}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                        {Math.round(h.x * 100)}%, {Math.round(h.y * 100)}% · {Math.round(h.width * 100)}%×{Math.round(h.height * 100)}%
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
