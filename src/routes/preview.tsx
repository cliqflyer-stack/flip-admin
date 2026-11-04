import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowLeft, Hand, ImagePlus, Loader2, Move, ZoomIn, Database } from "lucide-react";

import sampleFlyerUrl from "@/assets/sample-flyer.jpg";
import { ProductSheet } from "@/components/flyer/ProductSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchFlyers,
  fetchProducts,
  resolveImageUrl,
  type ApiFlyer,
  type ApiProduct,
} from "@/lib/api-client";
import type { Hotspot } from "@/lib/flyer-storage";

const FlyerPreviewCanvas = lazy(() => import("@/components/flyer/FlyerPreviewCanvas"));

export const Route = createFileRoute("/preview")({
  head: () => ({
    meta: [
      { title: "Shopper Preview — Interactive Digital Flyer" },
      {
        name: "description",
        content:
          "Shopper preview: tap a product on the flyer to see a circular highlight and its deal details in a bottom sheet.",
      },
    ],
  }),
  component: PreviewPage,
});

function PreviewPage() {
  const [flyers, setFlyers] = useState<ApiFlyer[]>([]);
  const [selectedFlyerId, setSelectedFlyerId] = useState<string>("");
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [imageUrl, setImageUrl] = useState<string>(sampleFlyerUrl);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from API
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [flyersData, productsData] = await Promise.all([
          fetchFlyers().catch(() => []),
          fetchProducts().catch(() => []),
        ]);
        if (cancelled) return;

        setProducts(productsData);
        if (flyersData.length > 0) {
          setFlyers(flyersData);
          const first = flyersData[0];
          setSelectedFlyerId(first.id);
          setImageUrl(resolveImageUrl(first.flyerImageUrl));
          if (first.hotspots) {
            setHotspots(
              first.hotspots.map((h) => ({
                id: h.id,
                productId: h.productId,
                x: h.x,
                y: h.y,
                width: h.width,
                height: h.height,
              }))
            );
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectFlyer = (flyerId: string) => {
    const f = flyers.find((x) => x.id === flyerId);
    if (!f) return;
    setSelectedFlyerId(flyerId);
    setImageUrl(resolveImageUrl(f.flyerImageUrl));
    setSelectedHotspotId(null);
    if (f.hotspots) {
      setHotspots(
        f.hotspots.map((h) => ({
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

  useEffect(() => {
    if (!imageUrl) return;
    const img = new window.Image();
    img.onload = () => setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = imageUrl;
  }, [imageUrl]);

  const selectedHotspot = hotspots.find((h) => h.id === selectedHotspotId) ?? null;
  const rawProduct = selectedHotspot
    ? products.find((p) => p.id === selectedHotspot.productId)
    : null;

  // Adapt product shape for ProductSheet
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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" aria-label="Back to admin">
              <Link to="/admin">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-sm font-semibold">Shopper Preview Mode</h1>
              <p className="text-xs text-muted-foreground">
                Tap any product on the flyer to see the circular red highlight and bottom deal sheet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {hotspots.length} hotspots active
            </Badge>
            <Button asChild size="sm">
              <Link to="/admin">Back to Editor</Link>
            </Button>
          </div>
        </div>

        {/* Flyer selector tabs */}
        <div className="mx-auto flex max-w-4xl gap-2 px-4 pb-2.5 overflow-x-auto">
          {flyers.map((flyer) => (
            <button
              key={flyer.id}
              onClick={() => handleSelectFlyer(flyer.id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                selectedFlyerId === flyer.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {flyer.title}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
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

        <ProductSheet
          product={selectedProduct}
          open={Boolean(selectedProduct)}
          onOpenChange={(open) => {
            if (!open) setSelectedHotspotId(null);
          }}
        />
      </main>
    </div>
  );
}
