import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  ExternalLink,
  Eye,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Search,
  Sparkles,
  Store,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import sampleFlyerUrl from "@/assets/sample-flyer.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  API_BASE,
  fetchFlyers,
  fetchProducts,
  fetchStats,
  saveHotspotsBatch,
  uploadImage,
  createFlyer,
  createProduct,
  resolveImageUrl,
  type ApiFlyer,
  type ApiProduct,
  type DashboardStats,
} from "@/lib/api-client";
import type { Hotspot, HotspotRect } from "@/lib/flyer-storage";
import { cn } from "@/lib/utils";

const FlyerEditorCanvas = lazy(() => import("@/components/flyer/FlyerEditorCanvas"));

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Flip Admin — Interactive Flyer & Hotspot Manager" },
      {
        name: "description",
        content:
          "Manage store flyers, draw interactive deal hotspots, and publish directly to Neon Postgres for the Flip mobile app.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [flyersList, setFlyersList] = useState<ApiFlyer[]>([]);
  const [selectedFlyerId, setSelectedFlyerId] = useState<string>("");
  const [catalogProducts, setCatalogProducts] = useState<ApiProduct[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);

  // Editor states
  const [imageUrl, setImageUrl] = useState<string>(sampleFlyerUrl);
  const [fileName, setFileName] = useState("flyer.jpg");
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawProduct, setDrawProduct] = useState<ApiProduct | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Modal for new flyer upload
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newFlyerTitle, setNewFlyerTitle] = useState("");
  const [newFlyerStore, setNewFlyerStore] = useState("merch_drug_mart");
  const [uploadingFlyer, setUploadingFlyer] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data from Neon API
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [statsData, flyersData, productsData] = await Promise.all([
          fetchStats().catch(() => null),
          fetchFlyers().catch(() => []),
          fetchProducts().catch(() => []),
        ]);

        if (cancelled) return;

        if (statsData) {
          setStats(statsData);
          setDbConnected(true);
        }

        if (productsData.length > 0) {
          setCatalogProducts(productsData);
        }

        if (flyersData.length > 0) {
          setFlyersList(flyersData);
          const firstFlyer = flyersData[0];
          setSelectedFlyerId(firstFlyer.id);
          setImageUrl(resolveImageUrl(firstFlyer.flyerImageUrl));
          setFileName(firstFlyer.title);

          if (firstFlyer.hotspots && firstFlyer.hotspots.length > 0) {
            setHotspots(
              firstFlyer.hotspots.map((h) => ({
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
        console.error("Failed to load initial data:", err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  // When selected flyer changes, load its image and hotspots
  const handleSelectFlyer = (flyerId: string) => {
    const flyer = flyersList.find((f) => f.id === flyerId);
    if (!flyer) return;

    setSelectedFlyerId(flyerId);
    setImageUrl(resolveImageUrl(flyer.flyerImageUrl));
    setFileName(flyer.title);
    setSelectedId(null);
    setDrawProduct(null);

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
    toast.info(`Loaded flyer: ${flyer.title}`);
  };

  // Read natural image dimensions
  useEffect(() => {
    if (!imageUrl) return;
    const img = new window.Image();
    img.onload = () => setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = imageUrl;
  }, [imageUrl]);

  // Create hotspot
  const handleCreate = (rect: HotspotRect) => {
    if (!drawProduct) return;
    const newId = `hs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const hotspot: Hotspot = { id: newId, productId: drawProduct.id, ...rect };
    setHotspots((prev) => [...prev, hotspot]);
    setSelectedId(hotspot.id);
    toast.success(`Mapped "${drawProduct.name}" to flyer area.`);
    setDrawProduct(null);
  };

  // Update hotspot coordinates
  const handleUpdate = (id: string, rect: HotspotRect) => {
    setHotspots((prev) => prev.map((h) => (h.id === id ? { ...h, ...rect } : h)));
  };

  // Delete hotspot
  const handleDelete = (id: string) => {
    setHotspots((prev) => prev.filter((h) => h.id !== id));
    if (selectedId === id) setSelectedId(null);
    toast.info("Hotspot removed.");
  };

  // Save Hotspots to Neon Postgres Database
  const handleSaveToDatabase = async () => {
    if (!selectedFlyerId) {
      toast.error("Please select a flyer to save hotspots for.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = hotspots.map((h) => ({
        id: h.id,
        productId: h.productId,
        x: Number(h.x.toFixed(4)),
        y: Number(h.y.toFixed(4)),
        width: Number(h.width.toFixed(4)),
        height: Number(h.height.toFixed(4)),
      }));

      const res = await saveHotspotsBatch(selectedFlyerId, payload);
      toast.success(`Saved ${res.count} hotspots directly to Neon Postgres!`);

      // Refresh flyers list
      const refreshed = await fetchFlyers();
      setFlyersList(refreshed);
      const updatedStats = await fetchStats();
      setStats(updatedStats);
    } catch (err: any) {
      console.error(err);
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Upload flyer file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFlyer(true);
    try {
      const uploadRes = await uploadImage(file);
      const created = await createFlyer({
        merchantId: newFlyerStore || "merch_drug_mart",
        title: newFlyerTitle || file.name.replace(/\.[^/.]+$/, ""),
        subtitle: "Weekly Deals · Live Flyer",
        badgeText: "NEW",
        badgeVariant: "lime",
        flyerImageUrl: uploadRes.url,
        aspectRatio: 1.414,
        status: "published",
        pageCount: 1,
      });

      toast.success("New flyer published to Neon DB!");
      setUploadModalOpen(false);
      setNewFlyerTitle("");

      // Refresh and select
      const refreshed = await fetchFlyers();
      setFlyersList(refreshed);
      handleSelectFlyer(created.id);
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploadingFlyer(false);
    }
  };

  const selectedHotspot = hotspots.find((h) => h.id === selectedId) ?? null;
  const selectedProduct = selectedHotspot
    ? catalogProducts.find((p) => p.id === selectedHotspot.productId)
    : null;

  const filteredProducts = catalogProducts.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Toaster position="top-right" richColors />

      {/* Top Navigation Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 bg-card/60 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white text-sm font-extrabold">
              F
            </span>
            flip Admin
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">Interactive Flyer Canvas</span>

          {/* Database connection badge */}
          <div className="ml-4 flex items-center gap-1.5 rounded-full border bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            <Database className="h-3 w-3 text-emerald-600" />
            <span>Neon DB Connected (AWS us-east-1)</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats summary pill */}
          {stats && (
            <div className="hidden items-center gap-3 text-xs text-muted-foreground md:flex">
              <span>
                <strong>{stats.flyers}</strong> flyers
              </span>
              <span>•</span>
              <span>
                <strong>{stats.products}</strong> products
              </span>
              <span>•</span>
              <span>
                <strong>{hotspots.length}</strong> hotspots on page
              </span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setUploadModalOpen(true)}
            className="gap-1.5"
          >
            <Upload className="h-4 w-4" />
            Upload Flyer
          </Button>

          <Button
            size="sm"
            onClick={handleSaveToDatabase}
            disabled={isSaving}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save to Neon DB
          </Button>

          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link to="/preview">
              <Eye className="h-4 w-4" />
              Shopper Preview
            </Link>
          </Button>
        </div>
      </header>

      {/* Sub-header: Flyer Selector Bar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b bg-muted/40 px-4 text-sm">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Active Flyers:
          </span>
          {flyersList.map((flyer) => (
            <button
              key={flyer.id}
              onClick={() => handleSelectFlyer(flyer.id)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                selectedFlyerId === flyer.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-background text-foreground hover:bg-accent border"
              )}
            >
              {flyer.title} ({flyer.hotspots?.length || 0})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {imgSize.width > 0 && (
            <span>
              Image Resolution: {imgSize.width} × {imgSize.height} px
            </span>
          )}
        </div>
      </div>

      {/* Main Workspace (3 Columns: Left = Catalog Picker, Center = Konva Canvas, Right = Hotspot Inspector) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Product Catalog & Draw Tool */}
        <aside className="flex w-80 shrink-0 flex-col border-r bg-card">
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">1. Product Catalog</h2>
              <Badge variant="secondary" className="text-xs">
                {filteredProducts.length} items
              </Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          {/* Active drawing hint */}
          {drawProduct ? (
            <div className="bg-amber-50 border-b border-amber-200 p-3 text-xs text-amber-900">
              <div className="flex items-center justify-between font-semibold">
                <span>Draw mode active</span>
                <button
                  onClick={() => setDrawProduct(null)}
                  className="text-amber-700 hover:text-amber-900"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1">
                Drag a rectangle over <strong>{drawProduct.name}</strong> on the flyer canvas to
                map it.
              </p>
            </div>
          ) : (
            <div className="p-2.5 bg-muted/30 border-b text-xs text-muted-foreground">
              Select a product below, then click & drag over its position on the flyer.
            </div>
          )}

          {/* Products List */}
          <div className="flex-1 overflow-y-auto divide-y">
            {filteredProducts.map((product) => {
              const isSelectedForDraw = drawProduct?.id === product.id;
              const isMapped = hotspots.some((h) => h.productId === product.id);

              return (
                <div
                  key={product.id}
                  onClick={() => setDrawProduct(isSelectedForDraw ? null : product)}
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50",
                    isSelectedForDraw && "bg-primary/10 border-l-4 border-primary",
                    isMapped && "opacity-90"
                  )}
                >
                  <img
                    src={resolveImageUrl(product.imageUrl)}
                    alt={product.name}
                    className="h-10 w-10 shrink-0 rounded object-cover border bg-white"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs font-semibold">{product.name}</p>
                      {isMapped && (
                        <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Mapped
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{product.brand}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700">
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

        {/* Center Column: Konva Canvas Interactive Editor */}
        <main className="flex-1 overflow-auto bg-muted/20 p-4 flex flex-col items-center justify-center">
          <div className="w-full max-w-4xl rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="border-b bg-muted/40 px-3 py-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Interactive Konva Canvas — Normalized Coordinates (0..1)</span>
              <span>{hotspots.length} hotspots mapped</span>
            </div>

            <div className="relative min-h-[500px] flex items-center justify-center">
              <ClientOnly>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center p-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  }
                >
                  <FlyerEditorCanvas
                    imageUrl={imageUrl}
                    imageWidth={imgSize.width}
                    imageHeight={imgSize.height}
                    hotspots={hotspots}
                    selectedId={selectedId}
                    drawProduct={drawProduct as any}
                    onSelect={setSelectedId}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                  />
                </Suspense>
              </ClientOnly>
            </div>
          </div>
        </main>

        {/* Right Column: Hotspot Inspector & Details */}
        <aside className="flex w-80 shrink-0 flex-col border-l bg-card">
          <div className="p-3 border-b">
            <h2 className="text-sm font-semibold">2. Mapped Hotspots</h2>
            <p className="text-xs text-muted-foreground">
              {hotspots.length} product hotspots on this flyer
            </p>
          </div>

          {selectedHotspot && selectedProduct ? (
            <div className="p-4 border-b space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Selected Hotspot
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(selectedHotspot.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={resolveImageUrl(selectedProduct.imageUrl)}
                  alt={selectedProduct.name}
                  className="h-12 w-12 rounded border bg-white object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-xs leading-tight">{selectedProduct.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{selectedProduct.brand}</p>
                  <p className="text-xs font-bold text-emerald-700 mt-0.5">
                    ${Number(selectedProduct.offerPrice).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Coordinates inspection */}
              <div className="rounded border bg-background p-2.5 text-[11px] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">X (norm):</span>
                  <span>{selectedHotspot.x.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Y (norm):</span>
                  <span>{selectedHotspot.y.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Width:</span>
                  <span>{selectedHotspot.width.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Height:</span>
                  <span>{selectedHotspot.height.toFixed(4)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 border-b text-xs text-muted-foreground text-center">
              Click any rectangle on the canvas to inspect coordinates and edit details.
            </div>
          )}

          {/* List of all hotspots on this flyer */}
          <div className="flex-1 overflow-y-auto divide-y">
            {hotspots.map((hs, index) => {
              const prod = catalogProducts.find((p) => p.id === hs.productId);
              const isSelected = hs.id === selectedId;

              return (
                <div
                  key={hs.id}
                  onClick={() => setSelectedId(hs.id)}
                  className={cn(
                    "flex items-center justify-between p-3 text-xs cursor-pointer hover:bg-muted/40 transition-colors",
                    isSelected && "bg-primary/10 border-l-4 border-primary font-semibold"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                      {index + 1}
                    </span>
                    <span className="truncate">{prod ? prod.name : hs.productId}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(hs.id);
                    }}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Upload Flyer Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border">
            <h3 className="text-lg font-bold">Upload New Flyer</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Upload a flyer image (JPG, PNG) to publish directly to Neon Postgres.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold">Flyer Title</label>
                <Input
                  placeholder="e.g. Weekly Savings Circular"
                  value={newFlyerTitle}
                  onChange={(e) => setNewFlyerTitle(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Select Merchant</label>
                <select
                  value={newFlyerStore}
                  onChange={(e) => setNewFlyerStore(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="merch_drug_mart">MY DRUG MART</option>
                  <option value="merch_longos">Longo's</option>
                  <option value="merch_hardware">Home Hardware</option>
                  <option value="merch_nofrills">No Frills</option>
                  <option value="merch_walmart">Walmart</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold">Flyer Image File</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="mt-1 w-full text-xs"
                  disabled={uploadingFlyer}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadModalOpen(false)}
                disabled={uploadingFlyer}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
