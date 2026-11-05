import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Eye,
  Globe2,
  Layers,
  LayoutGrid,
  MapPin,
  Maximize2,
  MousePointerClick,
  Plus,
  ScanSearch,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  Upload,
  Zap,
} from "lucide-react";

import sampleFlyerUrl from "@/assets/sample-flyer.jpg";
import cocaColaImg from "@/assets/products/coca-cola.jpg";
import doritosImg from "@/assets/products/doritos.jpg";
import redBullImg from "@/assets/products/red-bull.jpg";
import colgateImg from "@/assets/products/colgate.jpg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/admin/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flip — Interactive Digital Circulars & Shoppable Retail Media" },
      {
        name: "description",
        content:
          "Transform print flyers into high-converting interactive digital circulars. Precision sub-pixel hotspot editor, multi-store geofenced distribution, and instant mobile shopper previews.",
      },
      { property: "og:title", content: "Flip — Interactive Digital Circulars & Shoppable Retail Media" },
      {
        property: "og:description",
        content:
          "Transform static print flyers into interactive digital circulars with sub-pixel product hotspots, multi-store geofencing, and live shopper preview.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

interface DemoHotspotItem {
  id: string;
  name: string;
  brand: string;
  offerPrice: number;
  regularPrice: number;
  badge: string;
  category: string;
  image: string;
  description: string;
  // Normalized coordinates (0 to 1) for the sample flyer
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEMO_HOTSPOTS: DemoHotspotItem[] = [
  {
    id: "hs_doritos",
    name: "Doritos Dinamita Rolled Chips",
    brand: "Frito-Lay",
    offerPrice: 3.49,
    regularPrice: 4.99,
    badge: "Save 30%",
    category: "Snacks",
    image: doritosImg,
    description: "Chile Limón flavored rolled tortilla chips, 10.75 oz bag.",
    x: 0.08,
    y: 0.18,
    width: 0.4,
    height: 0.32,
  },
  {
    id: "hs_coke",
    name: "Coca-Cola Original 12-Pack",
    brand: "Coca-Cola",
    offerPrice: 5.99,
    regularPrice: 8.99,
    badge: "Special Pack",
    category: "Beverages",
    image: cocaColaImg,
    description: "Classic crisp Coca-Cola soda, 12-pack of 12 fl oz aluminum cans.",
    x: 0.52,
    y: 0.18,
    width: 0.4,
    height: 0.32,
  },
  {
    id: "hs_redbull",
    name: "Red Bull Energy Drink",
    brand: "Red Bull",
    offerPrice: 2.99,
    regularPrice: 3.99,
    badge: "Energy Boost",
    category: "Beverages",
    image: redBullImg,
    description: "Vitalizes body and mind with premium taurine and B-group vitamins, 12 fl oz.",
    x: 0.08,
    y: 0.56,
    width: 0.4,
    height: 0.34,
  },
  {
    id: "hs_colgate",
    name: "Colgate Total Clean Mint",
    brand: "Colgate-Palmolive",
    offerPrice: 3.99,
    regularPrice: 5.49,
    badge: "Oral Care",
    category: "Personal Care",
    image: colgateImg,
    description: "Antibacterial protection for teeth, tongue, cheeks, and gums, 4.8 oz tube.",
    x: 0.52,
    y: 0.56,
    width: 0.4,
    height: 0.34,
  },
];

const FEATURES = [
  {
    icon: ScanSearch,
    badge: "Precision Canvas",
    title: "Sub-Pixel Hotspot Mapping",
    description:
      "Interactive drawing canvas supporting zoom, pan, snapping guides, and both circular and rectangular hotspot coordinates with millimeter accuracy.",
  },
  {
    icon: Tag,
    badge: "Catalog Sync",
    title: "Master Product & SKU Linking",
    description:
      "Instantly attach catalog items, barcodes, nutritional details, and custom price overrides without changing the underlying flyer artwork.",
  },
  {
    icon: Store,
    badge: "Geofencing",
    title: "Multi-Store Location Targeting",
    description:
      "Distribute personalized circulars by city, neighborhood, or specific store branches with interactive Leaflet map integration.",
  },
  {
    icon: Smartphone,
    badge: "Mobile-First",
    title: "Shoppable Customer Viewer",
    description:
      "Mobile-optimized shopper experience featuring responsive tall-scroll viewports, interactive product sheets, and 1-tap cart additions.",
  },
  {
    icon: BadgePercent,
    badge: "Dynamic Deals",
    title: "Real-Time Deal Overrides",
    description:
      "Modify pricing, strike-through rates, and limited-time offer badges in seconds without reprinting or re-uploading flyer assets.",
  },
  {
    icon: ShieldCheck,
    badge: "Cloud Scale",
    title: "Neon Postgres Cloud DB",
    description:
      "Built on Neon PostgreSQL with instant database branching, JWT authentication, role-based access control, and rock-solid uptime.",
  },
];

const STEPS = [
  {
    step: "01",
    icon: Upload,
    title: "Upload Flyer Artworks",
    description:
      "Drop in high-resolution print circulars (PDF, WebP, JPG, or PNG). Our studio automatically detects aspect ratios and prepares canvas tiles.",
  },
  {
    step: "02",
    icon: MousePointerClick,
    title: "Map Interactive Hotspots",
    description:
      "Draw bounding regions over products. Link existing catalog SKUs or define special instant promotional pricing and deal badges.",
  },
  {
    step: "03",
    icon: Share2,
    title: "Publish Omnichannel",
    description:
      "Deploy instantly to web storefronts, mobile app feeds, and in-store interactive kiosk displays with geofenced store targeting.",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Mobile Screen Experience",
    staticPdf: "Requires awkward pinch & squint on tiny fonts",
    flipCircular: "Fluid touch pan, responsive hotspots & tap-to-inspect drawers",
  },
  {
    feature: "Deal Purchasing & Cart",
    staticPdf: "Static image; cannot add items to digital cart",
    flipCircular: "One-tap addition directly into shopper cart or basket",
  },
  {
    feature: "Mid-Week Price Corrections",
    staticPdf: "Requires costly redesign, re-export, and full re-upload",
    flipCircular: "Instant live price override updated in <1 second",
  },
  {
    feature: "Merchandising Analytics",
    staticPdf: "Blind PDF download counts with zero interaction data",
    flipCircular: "Sub-pixel click heatmaps, product dwell time & tap velocity",
  },
  {
    feature: "Store-Level Geofencing",
    staticPdf: "One national generic circular for all stores",
    flipCircular: "Automatic store locator with branch-specific flyers & inventory",
  },
];

function Index() {
  const [selectedHotspot, setSelectedHotspot] = useState<DemoHotspotItem>(DEMO_HOTSPOTS[0]);
  const [viewMode, setViewMode] = useState<"shopper" | "wireframe">("shopper");
  const [basketCount, setBasketCount] = useState<number>(0);
  const [addedHotspotId, setAddedHotspotId] = useState<string | null>(null);

  const handleAddToBasket = (item: DemoHotspotItem) => {
    setBasketCount((prev) => prev + 1);
    setAddedHotspotId(item.id);
    setTimeout(() => {
      setAddedHotspotId(null);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* 1. STICKY BLURRED NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-base shadow-xs transition-transform group-hover:scale-105">
                F
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight">Flip</span>
                <Badge variant="secondary" className="text-[10px] uppercase font-semibold tracking-wider">
                  Studio
                </Badge>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
              <a href="#demo" className="transition-colors hover:text-foreground">
                Interactive Demo
              </a>
              <a href="#features" className="transition-colors hover:text-foreground">
                Features
              </a>
              <a href="#how-it-works" className="transition-colors hover:text-foreground">
                How It Works
              </a>
              <a href="#comparison" className="transition-colors hover:text-foreground">
                Why Flip
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex text-xs h-9 gap-1.5">
              <Link to="/preview">
                <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Shopper Preview</span>
              </Link>
            </Button>

            <Button asChild variant="ghost" size="sm" className="text-xs h-9">
              <Link to="/login">Sign In</Link>
            </Button>

            <Button asChild size="sm" className="text-xs h-9 gap-1.5 shadow-sm font-semibold">
              <Link to="/admin">
                <span>Launch Studio</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-border/60">
        {/* Subtle decorative glowing background gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <Badge
            variant="outline"
            className="mb-6 inline-flex items-center gap-2 border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary transition-all hover:bg-primary/10"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Next-Generation Interactive Circulars & Retail Media</span>
            <ChevronRight className="h-3 w-3 opacity-60" />
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.15]">
            Turn Print Flyers into <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Shoppable Digital Experiences
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Empower retail brands and supermarket chains to upload weekly flyers, map interactive product hotspots with
            millimeter precision, and distribute geofenced shoppable circulars to local store customers in seconds.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Button asChild size="lg" className="h-11 px-6 font-semibold shadow-md gap-2">
              <Link to="/admin">
                <ShieldCheck className="h-4 w-4" />
                <span>Launch Admin Studio</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline" className="h-11 px-6 font-medium gap-2 bg-background">
              <Link to="/preview">
                <Smartphone className="h-4 w-4 text-primary" />
                <span>Customer Live Preview</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </Link>
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="h-11 px-5 text-xs font-medium gap-2"
              onClick={() => {
                const el = document.getElementById("demo");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <MousePointerClick className="h-4 w-4 text-primary" />
              <span>Test Hotspots Live ↓</span>
            </Button>
          </div>

          {/* Social Proof & Metrics Bar */}
          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 max-w-4xl mx-auto">
            <div className="rounded-xl border bg-card/60 p-4 backdrop-blur-xs text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground">60 FPS</p>
              <p className="text-xs text-muted-foreground mt-1">Vector Canvas Engine</p>
            </div>
            <div className="rounded-xl border bg-card/60 p-4 backdrop-blur-xs text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground">99.8%</p>
              <p className="text-xs text-muted-foreground mt-1">Hotspot Mapping Precision</p>
            </div>
            <div className="rounded-xl border bg-card/60 p-4 backdrop-blur-xs text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground">24+ Stores</p>
              <p className="text-xs text-muted-foreground mt-1">Geofenced Locations</p>
            </div>
            <div className="rounded-xl border bg-card/60 p-4 backdrop-blur-xs text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground">0ms</p>
              <p className="text-xs text-muted-foreground mt-1">Instant Realtime Sync</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE LIVE HOTSPOT SHOWCASE WIDGET */}
      <section id="demo" className="py-16 sm:py-24 border-b border-border/60 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-2">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-xs gap-1 py-1">
              <Zap className="h-3.5 w-3.5" />
              Interactive Demo
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Experience Shoppable Hotspots in Action
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Click or tap on any product deal below to preview the circular highlight, view catalog details, and add
              deals to your basket.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">
            {/* Interactive Canvas Flyer Preview */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-3 px-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-foreground">Fresh Deals Weekly Circular #FL-2026</span>
                </div>
                <Tabs
                  value={viewMode}
                  onValueChange={(v) => setViewMode(v as any)}
                  className="h-7"
                >
                  <TabsList className="h-7 text-[11px] p-0.5">
                    <TabsTrigger value="shopper" className="h-6 px-2.5 text-[11px]">
                      Shopper View
                    </TabsTrigger>
                    <TabsTrigger value="wireframe" className="h-6 px-2.5 text-[11px]">
                      Studio Wireframe
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Flyer Image Container with Interactive Hotspots */}
              <div className="relative w-full aspect-[4/5] rounded-2xl border-2 border-border/80 bg-black/5 shadow-2xl overflow-hidden group">
                <img
                  src={sampleFlyerUrl}
                  alt="Interactive Retail Circular Sample"
                  className="w-full h-full object-contain select-none"
                />

                {/* Hotspot Overlays */}
                {DEMO_HOTSPOTS.map((hs) => {
                  const isSelected = selectedHotspot.id === hs.id;
                  return (
                    <button
                      key={hs.id}
                      onClick={() => setSelectedHotspot(hs)}
                      style={{
                        left: `${hs.x * 100}%`,
                        top: `${hs.y * 100}%`,
                        width: `${hs.width * 100}%`,
                        height: `${hs.height * 100}%`,
                      }}
                      className={`absolute rounded-xl transition-all duration-200 cursor-pointer focus:outline-none ${
                        isSelected
                          ? viewMode === "shopper"
                            ? "ring-4 ring-primary ring-offset-2 ring-offset-background bg-primary/15"
                            : "border-2 border-primary bg-primary/20"
                          : viewMode === "shopper"
                            ? "hover:bg-primary/10 hover:ring-2 hover:ring-primary/60"
                            : "border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/15"
                      }`}
                      aria-label={`View deal for ${hs.name}`}
                    >
                      {/* Pulsing Highlight Pin */}
                      <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-[10px] shadow-md transition-transform hover:scale-110">
                        {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : hs.id.slice(3, 4).toUpperCase()}
                      </span>

                      {/* Wireframe coordinates badge */}
                      {viewMode === "wireframe" && (
                        <span className="absolute bottom-1 left-1 rounded bg-background/90 px-1 py-0.5 font-mono text-[9px] text-foreground font-semibold shadow-xs">
                          {hs.brand} • ${hs.offerPrice.toFixed(2)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between w-full px-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MousePointerClick className="h-3.5 w-3.5 text-primary" /> Click any quadrant on the flyer to switch deals
                </span>
                <span className="font-mono text-[11px] font-medium text-foreground">
                  Active: {selectedHotspot.name}
                </span>
              </div>
            </div>

            {/* Selected Deal Information Card & Live Shopping List */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-2 border-primary/20 bg-card shadow-xl overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b bg-muted/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary mb-1">
                        {selectedHotspot.category}
                      </Badge>
                      <CardTitle className="text-xl font-bold">{selectedHotspot.name}</CardTitle>
                      <CardDescription className="text-xs">{selectedHotspot.brand}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs py-1">
                      {selectedHotspot.badge}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  {/* Product visual preview & pricing */}
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 shrink-0 rounded-xl border bg-background p-2 flex items-center justify-center overflow-hidden shadow-xs">
                      <img
                        src={selectedHotspot.image}
                        alt={selectedHotspot.name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-foreground">
                          ${selectedHotspot.offerPrice.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          ${selectedHotspot.regularPrice.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">{selectedHotspot.description}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Hotspot Technical Geometry Display */}
                  <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1 font-mono">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span>HOTSPOT GEOMETRY</span>
                      <span className="text-emerald-500 font-semibold">100% Normalized</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-[11px] pt-1">
                      <div>
                        X: <span className="font-semibold text-foreground">{(selectedHotspot.x * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        Y: <span className="font-semibold text-foreground">{(selectedHotspot.y * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        W: <span className="font-semibold text-foreground">{(selectedHotspot.width * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        H: <span className="font-semibold text-foreground">{(selectedHotspot.height * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Add to Basket Action */}
                  <Button
                    onClick={() => handleAddToBasket(selectedHotspot)}
                    className="w-full gap-2 font-semibold h-11 text-sm shadow-sm"
                    size="lg"
                  >
                    {addedHotspotId === selectedHotspot.id ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>Added to Shopper Basket!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Clip Deal to Basket (${selectedHotspot.offerPrice.toFixed(2)})</span>
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Live Shopper Basket Pill */}
              <div className="rounded-xl border bg-card/80 p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground">Digital Shopping Basket</span>
                    <p className="text-[11px] text-muted-foreground">
                      {basketCount === 0 ? "No deals clipped yet." : `${basketCount} promotional items saved.`}
                    </p>
                  </div>
                </div>
                <Badge variant={basketCount > 0 ? "default" : "outline"} className="text-xs font-mono font-bold">
                  {basketCount} Deals
                </Badge>
              </div>

              {/* Jump to Full Editor CTA Card */}
              <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Want to create your own circular hotspots?</span>
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                    Zero Setup
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Upload any grocery or retail circular image and start dragging custom bounding boxes in Flip Studio.
                </p>
                <Button asChild size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5 bg-background">
                  <Link to="/admin">
                    <span>Open Flip Studio Editor</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. KEY FEATURES BENTO GRID */}
      <section id="features" className="py-16 sm:py-24 border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-2">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-xs gap-1 py-1">
              <Layers className="h-3.5 w-3.5" />
              Complete Retail Platform
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Built for Modern Retail Merchandising
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Everything required to transform print assets into revenue-driving digital circulars with enterprise speed
              and reliability.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <Card key={f.title} className="border border-border/80 bg-card hover:border-primary/40 transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                      {f.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-bold">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS 3-STEP PIPELINE */}
      <section id="how-it-works" className="py-16 sm:py-24 border-b border-border/60 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-2">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-xs gap-1 py-1">
              <Zap className="h-3.5 w-3.5" />
              Streamlined Workflow
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              From Print Art to Live Hotspots in 3 Steps
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              No complex SDK integrations or lengthy software installs required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div
                key={s.step}
                className="relative rounded-2xl border bg-card p-6 shadow-xs hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-xs">
                    {s.step}
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="h-4.5 w-4.5" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. COMPARISON: STATIC PDF VS FLIP INTERACTIVE CIRCULARS */}
      <section id="comparison" className="py-16 sm:py-24 border-b border-border/60">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-xs gap-1 py-1">
              <BadgePercent className="h-3.5 w-3.5" />
              Measurable ROI
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Static PDF Flyers vs Flip Interactive Circulars
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Why leading retailers are ditching plain PDF circulars for shoppable digital experiences.
            </p>
          </div>

          <div className="rounded-2xl border bg-card shadow-lg overflow-hidden">
            <div className="grid grid-cols-12 border-b bg-muted/60 p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <div className="col-span-4 sm:col-span-3">Capability</div>
              <div className="col-span-4 sm:col-span-4 text-muted-foreground">Static PDF Circulars</div>
              <div className="col-span-4 sm:col-span-5 text-primary">Flip Shoppable Circulars</div>
            </div>

            <div className="divide-y divide-border">
              {COMPARISON_ROWS.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 p-4 text-xs sm:text-sm items-center hover:bg-muted/30 transition-colors">
                  <div className="col-span-4 sm:col-span-3 font-semibold text-foreground">{row.feature}</div>
                  <div className="col-span-4 sm:col-span-4 text-muted-foreground pr-2 flex items-center gap-1.5">
                    <span className="text-red-500 font-bold shrink-0">✕</span>
                    <span>{row.staticPdf}</span>
                  </div>
                  <div className="col-span-4 sm:col-span-5 text-foreground font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{row.flipCircular}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. CALL TO ACTION BANNER */}
      <section className="py-16 sm:py-24 bg-muted/30 border-b border-border/60">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Card className="relative overflow-hidden border-2 border-primary/30 bg-card p-8 sm:p-12 shadow-2xl text-center">
            {/* Ambient decorative glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <Badge variant="outline" className="border-primary/30 text-primary text-xs gap-1 py-1">
                <Sparkles className="h-3.5 w-3.5" />
                Zero Setup Barrier
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                Ready to Modernize Your Retail Circulars?
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Experience the studio editor, map your first interactive flyer, and view real-time shopper previews in
                your browser.
              </p>
              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg" className="h-11 px-6 font-semibold shadow-md gap-2">
                  <Link to="/admin">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Launch Studio Admin</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-11 px-6 bg-background">
                  <Link to="/login">Sign In with Demo Credentials</Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="border-t border-border bg-background py-12 text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-sm">
              F
            </div>
            <div>
              <span className="font-bold text-foreground">Flip Retail Media</span>
              <p className="text-[11px] text-muted-foreground">Next-Gen Digital Circular & Hotspot Management Suite</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/preview" className="hover:text-foreground transition-colors">
              Customer Preview
            </Link>
            <Link to="/admin" className="hover:text-foreground transition-colors">
              Studio Portal
            </Link>
            <Link to="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Neon Postgres Connected</span>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <p>&copy; {new Date().getFullYear()} Flip Retail Media Platform. All rights reserved.</p>
          <p>Precision sub-pixel digital flyer canvas engine.</p>
        </div>
      </footer>
    </div>
  );
}
