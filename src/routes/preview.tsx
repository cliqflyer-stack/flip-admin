import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  Layers,
  Loader2,
  MapPin,
  Monitor,
  Navigation,
  Phone,
  Smartphone,
  Sparkles,
  Store,
  Tablet,
} from "lucide-react";

import sampleFlyerUrl from "@/assets/sample-flyer.jpg";
import { ProductSheet } from "@/components/flyer/ProductSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  fetchFlyers,
  fetchMerchants,
  fetchProducts,
  fetchStoreLocations,
  resolveImageUrl,
  type ApiFlyer,
  type ApiProduct,
  type Merchant,
  type StoreLocation,
} from "@/lib/api-client";
import type { Hotspot } from "@/lib/flyer-storage";
import { cn } from "@/lib/utils";

const FlyerPreviewCanvas = lazy(() => import("@/components/flyer/FlyerPreviewCanvas"));

export const Route = createFileRoute("/preview")({
  validateSearch: (search: Record<string, unknown>) => ({
    flyerId: (search.flyerId as string) || undefined,
    storeId: (search.storeId as string) || undefined,
    merchantId: (search.merchantId as string) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Dynamic Shopper Preview — Flip Interactive Flyers" },
      {
        name: "description",
        content:
          "Dynamic interactive flyer preview: filter by franchise or store location, test mobile & tablet frames, and tap products for live deals.",
      },
    ],
  }),
  component: DynamicPreviewPage,
});

type DeviceMode = "mobile" | "tablet" | "desktop";

function DynamicPreviewPage() {
  const searchParams = Route.useSearch();

  const [flyers, setFlyers] = useState<ApiFlyer[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);

  // Selection states
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>("all");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [selectedFlyerId, setSelectedFlyerId] = useState<string>("");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("mobile");

  // Canvas states
  const [imageUrl, setImageUrl] = useState<string>(sampleFlyerUrl);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load database records on mount
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [flyersData, merchantsData, locationsData, productsData] = await Promise.all([
          fetchFlyers().catch(() => []),
          fetchMerchants().catch(() => []),
          fetchStoreLocations().catch(() => []),
          fetchProducts().catch(() => []),
        ]);
        if (cancelled) return;

        setFlyers(flyersData);
        setMerchants(merchantsData);
        setStoreLocations(locationsData);
        setProducts(productsData);

        // Apply URL search params if provided
        const targetFlyerId = searchParams.flyerId;
        const targetStoreId = searchParams.storeId;
        const targetMerchantId = searchParams.merchantId;

        if (targetMerchantId) setSelectedMerchantId(targetMerchantId);
        if (targetStoreId) setSelectedStoreId(targetStoreId);

        // Determine initially active flyer
        let initialFlyer = flyersData[0];
        if (targetFlyerId) {
          const match = flyersData.find((f) => f.id === targetFlyerId);
          if (match) initialFlyer = match;
        } else if (targetStoreId) {
          const match = flyersData.find((f) => f.storeLocationId === targetStoreId);
          if (match) initialFlyer = match;
        }

        if (initialFlyer) {
          activateFlyer(initialFlyer);
        }
      } catch (err) {
        console.error("Error loading preview data", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const activateFlyer = (flyer: ApiFlyer) => {
    setSelectedFlyerId(flyer.id);
    setImageUrl(resolveImageUrl(flyer.flyerImageUrl));
    setSelectedHotspotId(null);

    if (flyer.hotspots && flyer.hotspots.length > 0) {
      setHotspots(
        flyer.hotspots.map((h) => ({
          id: h.id,
          productId: h.productId,
          x: h.x,
          y: h.y,
          width: h.width,
          height: h.height,
        }))
      );
    } else {
      setHotspots([]);
    }
  };

  const handleSelectFlyer = (flyerId: string) => {
    const f = flyers.find((x) => x.id === flyerId);
    if (!f) return;
    activateFlyer(f);
  };

  // Filter flyers dynamically based on franchise & store selection
  const filteredFlyers = flyers.filter((f) => {
    const matchesMerchant = selectedMerchantId === "all" || f.merchantId === selectedMerchantId;
    const matchesStore =
      selectedStoreId === "all" ||
      f.storeLocationId === selectedStoreId ||
      (!f.storeLocationId && (selectedMerchantId === "all" || f.merchantId === selectedMerchantId));
    return matchesMerchant && matchesStore;
  });

  // Keep active flyer synced when filter changes
  useEffect(() => {
    if (filteredFlyers.length > 0) {
      const stillVisible = filteredFlyers.some((f) => f.id === selectedFlyerId);
      if (!stillVisible) {
        activateFlyer(filteredFlyers[0]);
      }
    }
  }, [selectedMerchantId, selectedStoreId, filteredFlyers]);

  // Read natural image dimensions
  useEffect(() => {
    if (!imageUrl) return;
    const img = new window.Image();
    img.onload = () => setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = imageUrl;
  }, [imageUrl]);

  const activeFlyer = flyers.find((f) => f.id === selectedFlyerId);
  const activeMerchant = merchants.find((m) => m.id === activeFlyer?.merchantId) || activeFlyer?.merchant;
  const activeLocation = storeLocations.find((l) => l.id === activeFlyer?.storeLocationId) || activeFlyer?.storeLocation;

  // Selected hotspot & product for sheet
  const selectedHotspot = hotspots.find((h) => h.id === selectedHotspotId) ?? null;
  const rawProduct = selectedHotspot
    ? products.find((p) => p.id === selectedHotspot.productId)
    : null;

  const selectedProduct = rawProduct
    ? {
        id: rawProduct.id,
        name: rawProduct.name,
        brand: rawProduct.brand,
        description: rawProduct.description,
        regularPrice: Number(rawProduct.regularPrice),
        offerPrice: Number(rawProduct.offerPrice),
        image: resolveImageUrl(rawProduct.imageUrl),
        category: rawProduct.category,
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur px-4 py-2.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
              <Link to="/admin">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Back to Studio</span>
              </Link>
            </Button>

            <Separator orientation="vertical" className="h-4 hidden sm:block" />

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary">
                PREVIEW MODE
              </Badge>
              <span className="text-xs font-semibold text-foreground hidden md:inline">
                Interactive Shopper Experience
              </span>
            </div>
          </div>

          {/* Franchise / Merchant & Store Location Filters */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedMerchantId}
              onValueChange={(val) => {
                setSelectedMerchantId(val);
                setSelectedStoreId("all");
              }}
            >
              <SelectTrigger className="h-8 text-xs w-[140px] sm:w-[170px]">
                <Building2 className="h-3 w-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="All Franchises" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Brands</SelectItem>
                {merchants.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger className="h-8 text-xs w-[140px] sm:w-[180px]">
                <Store className="h-3 w-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Store Branches</SelectItem>
                {storeLocations
                  .filter((l) => selectedMerchantId === "all" || l.merchantId === selectedMerchantId)
                  .map((loc) => (
                    <SelectItem key={loc.id} value={loc.id} className="text-xs">
                      {loc.name} ({loc.city})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Device Mode Switcher */}
            <div className="hidden sm:flex items-center rounded-lg border bg-muted p-0.5">
              <Button
                variant={deviceMode === "mobile" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => setDeviceMode("mobile")}
                title="Mobile Phone Frame (iPhone)"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={deviceMode === "tablet" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => setDeviceMode("tablet")}
                title="Tablet Frame (iPad)"
              >
                <Tablet className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={deviceMode === "desktop" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => setDeviceMode("desktop")}
                title="Fullscreen Desktop"
              >
                <Monitor className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Dynamic Flyer Selector Pill Bar */}
        <div className="mx-auto max-w-7xl pt-2 flex items-center gap-2 overflow-x-auto text-xs pb-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
            Available Flyers ({filteredFlyers.length}):
          </span>

          {filteredFlyers.map((flyer) => {
            const isSelected = selectedFlyerId === flyer.id;
            return (
              <button
                key={flyer.id}
                onClick={() => handleSelectFlyer(flyer.id)}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition-colors shrink-0 flex items-center gap-1.5",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "bg-muted text-muted-foreground hover:bg-accent border"
                )}
              >
                <span>{flyer.title}</span>
                {flyer.storeLocationId && (
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded-full">
                    Store-wise
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading interactive circular from Neon DB...</p>
          </div>
        ) : !activeFlyer ? (
          <Card className="p-12 text-center border-dashed max-w-md mt-10">
            <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-sm">No flyer available for this filter</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Try selecting "All Franchises" or "All Store Branches" to view available circulars.
            </p>
          </Card>
        ) : (
          <div className="w-full flex flex-col items-center gap-4">
            {/* Store & Flyer Info Header Pill */}
            <div className="flex flex-wrap items-center justify-between gap-3 w-full max-w-4xl bg-card p-3 rounded-xl border shadow-xs text-xs">
              <div className="flex items-center gap-3">
                {activeMerchant && (
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-xs"
                    style={{
                      backgroundColor: activeMerchant.logoBg || "#075E50",
                      color: activeMerchant.logoColor || "#FFFFFF",
                    }}
                  >
                    {activeMerchant.initial || activeMerchant.name.charAt(0)}
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-foreground text-sm">{activeFlyer.title}</h2>
                    {activeFlyer.badgeText && (
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                        {activeFlyer.badgeText}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-[11px] mt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" />
                      {activeLocation ? `${activeLocation.name} · ${activeLocation.city}` : "Chain-wide (All Stores)"}
                    </span>
                    {activeLocation?.phone && (
                      <span className="hidden sm:inline">· {activeLocation.phone}</span>
                    )}
                    {activeLocation && (
                      <a
                        href={
                          activeLocation.latitude && activeLocation.longitude
                            ? `https://www.google.com/maps/dir/?api=1&destination=${activeLocation.latitude},${activeLocation.longitude}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                activeLocation.name + " " + activeLocation.address + " " + activeLocation.city
                              )}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                      >
                        <Navigation className="h-3 w-3" />
                        <span>Map & Directions</span>
                        {activeLocation.latitude && activeLocation.longitude && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            ({activeLocation.latitude.toFixed(4)}, {activeLocation.longitude.toFixed(4)})
                          </span>
                        )}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-semibold bg-primary/5">
                  <Sparkles className="h-3 w-3 mr-1 text-primary" />
                  {hotspots.length} interactive hotspots
                </Badge>
                <Button asChild size="sm" variant="ghost" className="h-8 text-xs text-primary gap-1">
                  <Link to="/admin">
                    Edit Hotspots <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Device Frame Wrapper */}
            <div
              className={cn(
                "transition-all duration-300 flex justify-center pb-20",
                deviceMode === "mobile" && "w-full max-w-[410px]",
                deviceMode === "tablet" && "w-full max-w-[720px]",
                deviceMode === "desktop" && "w-full max-w-4xl"
              )}
            >
              {/* iPhone 16 Style Frame (when mobile) */}
              {deviceMode === "mobile" ? (
                <div className="relative w-full rounded-[48px] bg-slate-900 p-3 shadow-2xl ring-1 ring-slate-800">
                  {/* Dynamic Island / Notch */}
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 h-5 w-24 rounded-full bg-black flex items-center justify-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-800" />
                  </div>

                  {/* Inner Phone Screen */}
                  <div className="relative rounded-[36px] bg-white overflow-hidden border border-slate-700/50 pt-8">
                    <ClientOnly>
                      <Suspense
                        fallback={
                          <div className="flex items-center justify-center p-16">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        }
                      >
                        <FlyerPreviewCanvas
                          imageUrl={imageUrl}
                          imageWidth={imgSize.width}
                          imageHeight={imgSize.height}
                          hotspots={hotspots}
                          selectedHotspotId={selectedHotspotId}
                          onSelectHotspot={setSelectedHotspotId}
                        />
                      </Suspense>
                    </ClientOnly>
                  </div>
                </div>
              ) : deviceMode === "tablet" ? (
                /* iPad Style Frame */
                <div className="relative w-full rounded-[32px] bg-slate-900 p-4 shadow-2xl ring-1 ring-slate-800">
                  <div className="rounded-[20px] bg-white overflow-hidden border border-slate-700/50">
                    <ClientOnly>
                      <Suspense
                        fallback={
                          <div className="flex items-center justify-center p-16">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        }
                      >
                        <FlyerPreviewCanvas
                          imageUrl={imageUrl}
                          imageWidth={imgSize.width}
                          imageHeight={imgSize.height}
                          hotspots={hotspots}
                          selectedHotspotId={selectedHotspotId}
                          onSelectHotspot={setSelectedHotspotId}
                        />
                      </Suspense>
                    </ClientOnly>
                  </div>
                </div>
              ) : (
                /* Fullscreen Desktop View */
                <div className="w-full rounded-xl bg-card border shadow-sm overflow-hidden">
                  <ClientOnly>
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center p-16">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      }
                    >
                      <FlyerPreviewCanvas
                        imageUrl={imageUrl}
                        imageWidth={imgSize.width}
                        imageHeight={imgSize.height}
                        hotspots={hotspots}
                        selectedHotspotId={selectedHotspotId}
                        onSelectHotspot={setSelectedHotspotId}
                      />
                    </Suspense>
                  </ClientOnly>
                </div>
              )}
            </div>

            {/* Interactive Bottom Sheet (Tapped Product Details) */}
            <ProductSheet
              product={selectedProduct}
              onClose={() => setSelectedHotspotId(null)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
