import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Layers,
  Loader2,
  MapPin,
  Monitor,
  Navigation,
  Phone,
  Smartphone,
  Store,
  Tablet,
} from "lucide-react";

import sampleFlyerUrl from "@/assets/sample-flyer.jpg";
import { ProductSheet } from "@/components/flyer/ProductSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          "Dynamic interactive flyer preview: hierarchical brand & store browsing, mobile view with tall scroll support, and shoppable product hotspots.",
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

  // Navigation states
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(searchParams.merchantId || null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(searchParams.storeId || null);
  const [selectedFlyerId, setSelectedFlyerId] = useState<string | null>(searchParams.flyerId || null);
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

        // If flyerId is in search params, activate it
        if (searchParams.flyerId) {
          const match = flyersData.find((f) => f.id === searchParams.flyerId);
          if (match) {
            activateFlyer(match);
          }
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

  // Header navigation back
  const handleResetToCatalog = () => {
    setSelectedFlyerId(null);
    setSelectedStoreId(null);
    setSelectedBrandId(null);
  };

  const handleBackToStores = () => {
    setSelectedFlyerId(null);
    setSelectedStoreId(null);
  };

  const handleBackToFlyers = () => {
    setSelectedFlyerId(null);
  };

  // --- STEP 1: BRANDS & INDEPENDENT STORES LISTING ---
  if (!selectedFlyerId && !selectedBrandId && !selectedStoreId) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
              <Link to="/admin">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Admin Studio</span>
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <div>
              <h1 className="text-sm font-bold tracking-tight">Shopper Preview</h1>
              <p className="text-[11px] text-muted-foreground">Select a brand or store to browse active circulars</p>
            </div>
          </div>
        </header>

        <main className="p-6 max-w-5xl mx-auto flex-1 w-full space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight">Select Retail Brand or Store</h2>
            <p className="text-xs text-muted-foreground">
              Choose from franchise retail brands with multiple locations, or standalone store branches.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {merchants.map((brand) => {
              const brandLocations = storeLocations.filter((l) => l.merchantId === brand.id);
              const brandFlyers = flyers.filter((f) => f.merchantId === brand.id);

              return (
                <Card
                  key={brand.id}
                  onClick={() => setSelectedBrandId(brand.id)}
                  className="cursor-pointer hover:border-primary hover:shadow-md transition-all p-5 flex flex-col justify-between border shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold shadow-xs"
                        style={{ backgroundColor: brand.logoBg || "#075E50", color: brand.logoColor || "#FFFFFF" }}
                      >
                        {brand.initial}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {brandFlyers.length} Circular{brandFlyers.length === 1 ? "" : "s"}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-base text-foreground">{brand.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {brandLocations.length} Store Location{brandLocations.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t flex items-center justify-between text-xs text-primary font-medium">
                    <span>View Stores & Circulars</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // --- STEP 2: BRAND'S STORE LOCATIONS ---
  if (!selectedFlyerId && selectedBrandId && !selectedStoreId) {
    const brand = merchants.find((m) => m.id === selectedBrandId);
    const locations = storeLocations.filter((l) => l.merchantId === selectedBrandId);
    const chainFlyers = flyers.filter((f) => f.merchantId === selectedBrandId && !f.storeLocationId);

    return (
      <div className="min-h-screen bg-muted/20 flex flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetToCatalog}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Brands</span>
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <div>
              <h1 className="text-sm font-bold tracking-tight">{brand?.name} Locations</h1>
              <p className="text-[11px] text-muted-foreground">Select a store branch to view its localized circulars</p>
            </div>
          </div>
        </header>

        <main className="p-6 max-w-5xl mx-auto flex-1 w-full space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight">{brand?.name} Branches</h2>
            <p className="text-xs text-muted-foreground">
              Select a location to test location-specific deals and circular pages.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Chain-wide option */}
            <Card
              onClick={() => setSelectedStoreId(`chain_${selectedBrandId}`)}
              className="cursor-pointer hover:border-primary hover:shadow-md transition-all p-5 flex flex-col justify-between border shadow-xs bg-card"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    Universal
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {chainFlyers.length} Circulars
                  </Badge>
                </div>
                <h3 className="font-semibold text-base text-foreground">Chain-wide Circulars</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  National deals and weekly specials applicable to all {brand?.name} locations.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t flex items-center justify-between text-xs text-primary font-medium">
                <span>View Chain Circulars</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </Card>

            {/* Store branches */}
            {locations.map((loc) => {
              const locFlyers = flyers.filter(
                (f) => f.storeLocationId === loc.id || (f.merchantId === brand?.id && !f.storeLocationId)
              );

              return (
                <Card
                  key={loc.id}
                  onClick={() => setSelectedStoreId(loc.id)}
                  className="cursor-pointer hover:border-primary hover:shadow-md transition-all p-5 flex flex-col justify-between border shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span>{loc.city}, {loc.province}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {locFlyers.length} Circulars
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-base text-foreground">{loc.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{loc.address}</p>
                    {loc.phone && (
                      <p className="text-[11px] text-muted-foreground mt-1">{loc.phone}</p>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t flex items-center justify-between text-xs text-primary font-medium">
                    <span>Select Store Branch</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // --- STEP 3: STORE'S CIRCULARS VIEW ---
  if (!selectedFlyerId && selectedStoreId) {
    const isChain = selectedStoreId.startsWith("chain_");
    const activeMerchant = merchants.find((m) => m.id === selectedBrandId);
    const activeLocation = !isChain ? storeLocations.find((l) => l.id === selectedStoreId) : null;

    const availableFlyers = flyers.filter((f) => {
      if (isChain) {
        return f.merchantId === selectedBrandId && !f.storeLocationId;
      }
      return (
        f.storeLocationId === selectedStoreId ||
        (f.merchantId === activeLocation?.merchantId && !f.storeLocationId)
      );
    });

    return (
      <div className="min-h-screen bg-muted/20 flex flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToStores}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Stores</span>
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <div>
              <h1 className="text-sm font-bold tracking-tight">
                {activeLocation ? activeLocation.name : `${activeMerchant?.name} Chain Circulars`}
              </h1>
              <p className="text-[11px] text-muted-foreground">Select a circular to launch mobile preview</p>
            </div>
          </div>
        </header>

        <main className="p-6 max-w-5xl mx-auto flex-1 w-full space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight">Active Circulars</h2>
            <p className="text-xs text-muted-foreground">
              Select a circular to experience the mobile shopper view with zoom, pan, and interactive product sheets.
            </p>
          </div>

          {availableFlyers.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <h3 className="font-semibold text-sm">No circulars published for this location</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Return to the studio to publish a flyer for this branch.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableFlyers.map((flyer) => (
                <Card
                  key={flyer.id}
                  onClick={() => activateFlyer(flyer)}
                  className="cursor-pointer hover:border-primary hover:shadow-md transition-all overflow-hidden flex flex-col justify-between border shadow-xs bg-card"
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
                    <span>Open Mobile Preview</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- STEP 4: MOBILE SHOPPER PREVIEW FRAME (Flyer is actively opened) ---
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur px-4 py-2.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToFlyers}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Change Circular</span>
            </Button>

            <Separator orientation="vertical" className="h-4 hidden sm:block" />

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary">
                PREVIEW MODE
              </Badge>
              <span className="text-xs font-semibold text-foreground hidden md:inline truncate max-w-xs">
                {activeFlyer?.title}
              </span>
            </div>
          </div>

          {/* Device Frame Switcher */}
          <div className="flex items-center rounded-lg border bg-muted p-0.5">
            <Button
              variant={deviceMode === "mobile" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDeviceMode("mobile")}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Phone</span>
            </Button>
            <Button
              variant={deviceMode === "tablet" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDeviceMode("tablet")}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <Tablet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tablet</span>
            </Button>
            <Button
              variant={deviceMode === "desktop" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDeviceMode("desktop")}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 overflow-auto">
        <div className="w-full flex flex-col items-center gap-4">
          {/* Store & Flyer Info Header Pill */}
          <div className="flex flex-wrap items-center justify-between gap-3 w-full max-w-3xl bg-card p-3 rounded-xl border shadow-xs text-xs">
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
                  <h2 className="font-bold text-foreground text-sm">{activeFlyer?.title}</h2>
                  {activeFlyer?.badgeText && (
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
                      href={`https://www.google.com/maps?q=${activeLocation.latitude},${activeLocation.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                    >
                      <Navigation className="h-3 w-3" />
                      <span>Map & Directions</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[11px] font-semibold bg-primary/5">
                {hotspots.length} interactive hotspots
              </Badge>
              <Button asChild size="sm" variant="ghost" className="h-8 text-xs text-primary gap-1">
                <Link to="/admin" search={{ view: "editor", flyerId: activeFlyer?.id } as any}>
                  Edit Hotspots <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Device Frame Wrapper with Smooth Internal Vertical Scroll for Tall Flyers */}
          <div
            className={cn(
              "transition-all duration-300 flex justify-center pb-20",
              deviceMode === "mobile" && "w-full max-w-[420px]",
              deviceMode === "tablet" && "w-full max-w-[720px]",
              deviceMode === "desktop" && "w-full max-w-4xl"
            )}
          >
            {deviceMode === "mobile" ? (
              /* iPhone 16 Style Frame with Internal Vertical Scroll */
              <div className="relative w-full rounded-[48px] bg-slate-900 p-3 shadow-2xl ring-1 ring-slate-800">
                {/* Dynamic Island / Notch */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 h-5 w-24 rounded-full bg-black flex items-center justify-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-950/80 mr-3" />
                  <div className="h-2 w-2 rounded-full bg-blue-950/60" />
                </div>

                {/* Inner Screen Viewport: Scrollable vertically if flyer height is large */}
                <div className="relative rounded-[36px] bg-white border border-slate-700/50 pt-8 h-[720px] max-h-[82vh] overflow-y-auto no-scrollbar">
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
                <div className="rounded-[20px] bg-white border border-slate-700/50 h-[740px] max-h-[82vh] overflow-y-auto no-scrollbar">
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
        </div>
      </main>

      {/* Product Detail Bottom Sheet */}
      <ProductSheet
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => {
          if (!open) setSelectedHotspotId(null);
        }}
        onAddToList={(prod) => {
          setSelectedHotspotId(null);
        }}
      />
    </div>
  );
}
