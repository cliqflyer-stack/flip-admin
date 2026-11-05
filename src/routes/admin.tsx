import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Database,
  ImagePlus,
  Layers,
  Loader2,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";

import sampleFlyerUrl from "@/assets/sample-flyer.jpg";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createFlyer,
  deleteFlyer,
  fetchFlyers,
  fetchMerchants,
  fetchProducts,
  fetchStats,
  fetchStoreLocations,
  resolveImageUrl,
  saveHotspotsBatch,
  uploadImage,
  type ApiFlyer,
  type ApiProduct,
  type DashboardStats,
  type Merchant,
  type StoreLocation,
} from "@/lib/api-client";
import type { Hotspot, HotspotRect } from "@/lib/flyer-storage";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LoginPage } from "@/components/admin/LoginPage";
import { AdminSidebar, type AdminView } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DashboardView } from "@/components/admin/DashboardView";
import { EditorView } from "@/components/admin/EditorView";
import { TemplatesView } from "@/components/admin/TemplatesView";
import { StoresView } from "@/components/admin/StoresView";
import { ProductsView } from "@/components/admin/ProductsView";
import { SettingsView } from "@/components/admin/SettingsView";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Flip Admin — Interactive Flyer & Studio Management" },
      {
        name: "description",
        content:
          "Standard shadcn admin portal for managing digital circulars, interactive hotspots, and catalog products.",
      },
    ],
  }),
  component: AdminPageWrapper,
});

function AdminPageWrapper() {
  return (
    <AuthProvider>
      <AdminContent />
    </AuthProvider>
  );
}

function AdminContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [currentView, setCurrentView] = useState<AdminView>("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [flyersList, setFlyersList] = useState<ApiFlyer[]>([]);
  const [selectedFlyerId, setSelectedFlyerId] = useState<string>("");
  const [catalogProducts, setCatalogProducts] = useState<ApiProduct[]>([]);
  const [merchantsList, setMerchantsList] = useState<Merchant[]>([]);
  const [storeLocationsList, setStoreLocationsList] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Editor states
  const [imageUrl, setImageUrl] = useState<string>(sampleFlyerUrl);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);

  // Upload modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newFlyerTitle, setNewFlyerTitle] = useState("");
  const [newFlyerStore, setNewFlyerStore] = useState("merch_drug_mart");
  const [newFlyerLocation, setNewFlyerLocation] = useState("all");
  const [uploadingFlyer, setUploadingFlyer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial remote data from Neon API
  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, flyersData, productsData, merchantsData, locationsData] = await Promise.all([
        fetchStats().catch(() => null),
        fetchFlyers().catch(() => []),
        fetchProducts().catch(() => []),
        fetchMerchants().catch(() => []),
        fetchStoreLocations().catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      if (productsData.length > 0) setCatalogProducts(productsData);
      if (merchantsData.length > 0) setMerchantsList(merchantsData);
      if (locationsData.length > 0) setStoreLocationsList(locationsData);

      if (flyersData.length > 0) {
        setFlyersList(flyersData);
        if (!selectedFlyerId) {
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
      }
    } catch (e) {
      console.warn("Could not load initial admin data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Read natural image dimensions
  useEffect(() => {
    if (!imageUrl) return;
    const img = new window.Image();
    img.onload = () => setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = imageUrl;
  }, [imageUrl]);

  // Select flyer
  const handleSelectFlyer = (id: string) => {
    const flyer = flyersList.find((f) => f.id === id);
    if (!flyer) return;

    setSelectedFlyerId(id);
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
    toast.info(`Loaded flyer: ${flyer.title}`);
  };

  // Hotspot actions
  const handleCreateHotspot = (rect: HotspotRect) => {
    const newId = `hs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const defaultProduct = catalogProducts[0];
    const newHotspot: Hotspot = {
      id: newId,
      productId: defaultProduct?.id || "prod_pepsi",
      ...rect,
    };
    setHotspots((prev) => [...prev, newHotspot]);
    setSelectedHotspotId(newHotspot.id);
    toast.success("Hotspot mapped to flyer canvas.");
  };

  const handleUpdateHotspot = (id: string, rect: HotspotRect) => {
    setHotspots((prev) => prev.map((h) => (h.id === id ? { ...h, ...rect } : h)));
  };

  const handleDeleteHotspot = (id: string) => {
    setHotspots((prev) => prev.filter((h) => h.id !== id));
    if (selectedHotspotId === id) setSelectedHotspotId(null);
    toast.info("Hotspot removed.");
  };

  // Save Hotspots to Neon DB
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

      // Refresh list
      const refreshed = await fetchFlyers();
      setFlyersList(refreshed);
      const updatedStats = await fetchStats();
      setStats(updatedStats);
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Flyer
  const handleDeleteFlyer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this flyer?")) return;
    try {
      await deleteFlyer(id);
      toast.success("Flyer removed.");
      const refreshed = await fetchFlyers();
      setFlyersList(refreshed);
      if (selectedFlyerId === id && refreshed.length > 0) {
        handleSelectFlyer(refreshed[0].id);
      }
    } catch (e: any) {
      toast.error(`Could not delete flyer: ${e.message}`);
    }
  };

  // Upload flyer handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFlyer(true);
    try {
      const uploadRes = await uploadImage(file);
      const created = await createFlyer({
        merchantId: newFlyerStore || (merchantsList[0]?.id ?? "merch_drug_mart"),
        storeLocationId: newFlyerLocation === "all" ? undefined : newFlyerLocation,
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

      // Refresh and switch to editor
      const refreshed = await fetchFlyers();
      setFlyersList(refreshed);
      handleSelectFlyer(created.id);
      setCurrentView("editor");
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploadingFlyer(false);
    }
  };

  const handleFlyerCreatedFromTemplate = (created: ApiFlyer) => {
    setFlyersList((prev) => [created, ...prev]);
    handleSelectFlyer(created.id);
    setCurrentView("editor");
  };

  // 1. Loading auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md animate-pulse">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Verifying administrator session...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Render standard shadcn Login Page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const currentFlyer = flyersList.find((f) => f.id === selectedFlyerId);

  // 3. Authenticated: Render standard shadcn Admin Portal
  return (
    <SidebarProvider defaultOpen={true}>
      <AdminSidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        flyersCount={flyersList.length}
        productsCount={catalogProducts.length}
        storeLocationsCount={storeLocationsList.length}
      />

      <SidebarInset className="flex flex-col flex-1 min-w-0 bg-background overflow-hidden">
        <AdminHeader
          currentView={currentView}
          onSelectView={setCurrentView}
          onOpenUpload={() => setUploadModalOpen(true)}
          selectedFlyerTitle={currentFlyer?.title}
        />

        {/* View Switcher */}
        <div className="flex-1 overflow-auto">
          {currentView === "dashboard" && (
            <DashboardView
              stats={stats}
              flyers={flyersList}
              loading={loading}
              onSelectFlyerToEdit={(id) => {
                handleSelectFlyer(id);
                setCurrentView("editor");
              }}
              onOpenUpload={() => setUploadModalOpen(true)}
              onSelectView={setCurrentView}
              onDeleteFlyer={handleDeleteFlyer}
            />
          )}

          {currentView === "editor" && (
            <EditorView
              flyers={flyersList}
              selectedFlyerId={selectedFlyerId}
              onSelectFlyer={handleSelectFlyer}
              catalogProducts={catalogProducts}
              merchants={merchantsList}
              onProductCreated={(p) => setCatalogProducts((prev) => [p, ...prev])}
              hotspots={hotspots}
              selectedHotspotId={selectedHotspotId}
              onSelectHotspot={setSelectedHotspotId}
              onCreateHotspot={handleCreateHotspot}
              onUpdateHotspot={handleUpdateHotspot}
              onDeleteHotspot={handleDeleteHotspot}
              onSaveToDatabase={handleSaveToDatabase}
              isSaving={isSaving}
              onOpenUpload={() => setUploadModalOpen(true)}
              imageUrl={imageUrl}
              imgSize={imgSize}
            />
          )}

          {currentView === "templates" && (
            <TemplatesView
              merchants={merchantsList}
              catalogProducts={catalogProducts}
              onFlyerCreated={handleFlyerCreatedFromTemplate}
              currentFlyer={currentFlyer}
            />
          )}

          {currentView === "stores" && (
            <StoresView
              merchants={merchantsList}
              storeLocations={storeLocationsList}
              flyers={flyersList}
              onLocationCreated={(loc) => setStoreLocationsList((prev) => [loc, ...prev])}
              onLocationUpdated={(loc) =>
                setStoreLocationsList((prev) => prev.map((l) => (l.id === loc.id ? loc : l)))
              }
              onLocationDeleted={(id) => setStoreLocationsList((prev) => prev.filter((l) => l.id !== id))}
              loading={loading}
            />
          )}

          {currentView === "products" && (
            <ProductsView
              products={catalogProducts}
              merchants={merchantsList}
              onProductCreated={(p) => setCatalogProducts((prev) => [p, ...prev])}
              onProductUpdated={(p) =>
                setCatalogProducts((prev) => prev.map((item) => (item.id === p.id ? p : item)))
              }
              onProductDeleted={(id) =>
                setCatalogProducts((prev) => prev.filter((item) => item.id !== id))
              }
              loading={loading}
            />
          )}

          {currentView === "settings" && <SettingsView />}
        </div>
      </SidebarInset>

      {/* Upload Flyer Modal Dialog */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Upload className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-bold">Upload Flyer Image</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Upload a digital circular (JPG, PNG, or WebP) to publish to Neon Postgres and map hotspots.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="upload-title" className="text-xs font-semibold">
                Flyer Title
              </Label>
              <Input
                id="upload-title"
                placeholder="e.g. My Weekly Deals Oct 20–26"
                value={newFlyerTitle}
                onChange={(e) => setNewFlyerTitle(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="upload-store" className="text-xs font-semibold">
                Store / Merchant
              </Label>
              <Select value={newFlyerStore} onValueChange={setNewFlyerStore}>
                <SelectTrigger id="upload-store" className="text-xs">
                  <SelectValue placeholder="Select a merchant" />
                </SelectTrigger>
                <SelectContent>
                  {merchantsList.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="upload-location" className="text-xs font-semibold">
                Target Franchise Branch (Optional)
              </Label>
              <Select value={newFlyerLocation} onValueChange={setNewFlyerLocation}>
                <SelectTrigger id="upload-location" className="text-xs">
                  <SelectValue placeholder="All Stores (Chain-wide)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Locations (Chain-wide / Multi-store)
                  </SelectItem>
                  {storeLocationsList
                    .filter((l) => l.merchantId === newFlyerStore)
                    .map((loc) => (
                      <SelectItem key={loc.id} value={loc.id} className="text-xs">
                        {loc.name} ({loc.city})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Flyer Image File</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-xs font-medium text-foreground">Click to browse or drop flyer image</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG, WebP up to 10MB</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploadingFlyer}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadModalOpen(false)}
              disabled={uploadingFlyer}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
