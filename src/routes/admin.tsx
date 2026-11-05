import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import sampleFlyerUrl from "@/assets/sample-flyer.jpg";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  deleteFlyer,
  fetchFlyers,
  fetchMerchants,
  fetchProducts,
  fetchStats,
  fetchStoreLocations,
  resolveImageUrl,
  saveHotspotsBatch,
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
import { UploadFlyerScreen } from "@/components/admin/UploadFlyerScreen";
import { StoreFormScreen } from "@/components/admin/StoreFormScreen";
import { ProductFormScreen } from "@/components/admin/ProductFormScreen";

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: (search.view as AdminView) || "dashboard",
    flyerId: (search.flyerId as string) || undefined,
    storeId: (search.storeId as string) || undefined,
    productId: (search.productId as string) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Flip Admin — Interactive Flyer & Studio Management" },
      {
        name: "description",
        content:
          "Professional admin portal for managing digital circulars, interactive hotspots, multi-store locations, and catalog products.",
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
  const searchParams = Route.useSearch();
  const navigate = Route.useNavigate();

  const currentView: AdminView = searchParams.view || "dashboard";
  const urlFlyerId = searchParams.flyerId;
  const urlStoreId = searchParams.storeId;
  const urlProductId = searchParams.productId;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [flyersList, setFlyersList] = useState<ApiFlyer[]>([]);
  const [selectedFlyerId, setSelectedFlyerId] = useState<string>(urlFlyerId || "");
  const [catalogProducts, setCatalogProducts] = useState<ApiProduct[]>([]);
  const [merchantsList, setMerchantsList] = useState<Merchant[]>([]);
  const [storeLocationsList, setStoreLocationsList] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Editor canvas states
  const [imageUrl, setImageUrl] = useState<string>(sampleFlyerUrl);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);

  // View navigation helper
  const handleSelectView = (view: AdminView, targetFlyerId?: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        view,
        flyerId: targetFlyerId !== undefined ? targetFlyerId : prev.flyerId || selectedFlyerId || undefined,
      }),
      replace: true,
    });
  };

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
        const targetFlyer =
          (urlFlyerId && flyersData.find((f) => f.id === urlFlyerId)) ||
          flyersData[0];

        setSelectedFlyerId(targetFlyer.id);
        setImageUrl(resolveImageUrl(targetFlyer.flyerImageUrl));
        if (targetFlyer.hotspots) {
          setHotspots(
            targetFlyer.hotspots.map((h) => ({
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

  // Sync selected flyer if URL search param changes
  useEffect(() => {
    if (urlFlyerId && urlFlyerId !== selectedFlyerId && flyersList.length > 0) {
      const flyer = flyersList.find((f) => f.id === urlFlyerId);
      if (flyer) {
        setSelectedFlyerId(flyer.id);
        setImageUrl(resolveImageUrl(flyer.flyerImageUrl));
        setSelectedHotspotId(null);
        if (flyer.hotspots) {
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
        }
      }
    }
  }, [urlFlyerId, flyersList]);

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
    navigate({
      search: (prev) => ({
        ...prev,
        flyerId: id,
      }),
      replace: true,
    });
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
    toast.info(`Loaded circular: ${flyer.title}`);
  };

  // Hotspot actions
  const handleCreateHotspot = (rect: HotspotRect, productId?: string) => {
    const newId = `hs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const defaultProduct = catalogProducts[0];
    const newHotspot: Hotspot = {
      id: newId,
      productId: productId || defaultProduct?.id || "prod_pepsi",
      ...rect,
    };
    setHotspots((prev) => [...prev, newHotspot]);
    setSelectedHotspotId(newHotspot.id);
    toast.success("Hotspot mapped to circular canvas.");
  };

  const handleUpdateHotspot = (id: string, update: Partial<Hotspot>) => {
    setHotspots((prev) => prev.map((h) => (h.id === id ? { ...h, ...update } : h)));
  };

  const handleDeleteHotspot = (id: string) => {
    setHotspots((prev) => prev.filter((h) => h.id !== id));
    if (selectedHotspotId === id) setSelectedHotspotId(null);
    toast.info("Hotspot removed.");
  };

  // Save Hotspots to DB
  const handleSaveToDatabase = async () => {
    if (!selectedFlyerId) {
      toast.error("Please select a circular to save hotspots for.");
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
      toast.success(`Saved ${res.count} hotspots successfully!`);

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
    if (!confirm("Are you sure you want to delete this circular?")) return;
    try {
      await deleteFlyer(id);
      toast.success("Circular removed.");
      const refreshed = await fetchFlyers();
      setFlyersList(refreshed);
      if (selectedFlyerId === id && refreshed.length > 0) {
        handleSelectFlyer(refreshed[0].id);
      }
    } catch (e: any) {
      toast.error(`Could not delete circular: ${e.message}`);
    }
  };

  const handleFlyerCreatedFromTemplate = (created: ApiFlyer) => {
    setFlyersList((prev) => [created, ...prev]);
    handleSelectFlyer(created.id);
    handleSelectView("editor", created.id);
  };

  // 1. Loading auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          F
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Verifying administrator session...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Render clean login page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const currentFlyer = flyersList.find((f) => f.id === selectedFlyerId);
  const storeToEdit = urlStoreId ? storeLocationsList.find((s) => s.id === urlStoreId) : null;
  const productToEdit = urlProductId ? catalogProducts.find((p) => p.id === urlProductId) : null;

  // 3. Authenticated: Render Admin Portal
  return (
    <SidebarProvider defaultOpen={true}>
      <AdminSidebar
        currentView={currentView}
        onSelectView={handleSelectView}
        flyersCount={flyersList.length}
        productsCount={catalogProducts.length}
        storeLocationsCount={storeLocationsList.length}
      />

      <SidebarInset className="flex flex-col flex-1 min-w-0 bg-background overflow-hidden">
        <AdminHeader
          currentView={currentView}
          onSelectView={handleSelectView}
          onOpenUpload={() => handleSelectView("upload-flyer")}
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
                handleSelectView("editor", id);
              }}
              onOpenUpload={() => handleSelectView("upload-flyer")}
              onSelectView={handleSelectView}
              onDeleteFlyer={handleDeleteFlyer}
            />
          )}

          {currentView === "upload-flyer" && (
            <UploadFlyerScreen
              merchants={merchantsList}
              storeLocations={storeLocationsList}
              onFlyerCreated={(created) => {
                setFlyersList((prev) => [created, ...prev]);
                handleSelectFlyer(created.id);
                handleSelectView("editor", created.id);
              }}
              onCancel={() => handleSelectView("dashboard")}
            />
          )}

          {currentView === "editor" && (
            <EditorView
              flyers={flyersList}
              selectedFlyerId={selectedFlyerId}
              onSelectFlyer={handleSelectFlyer}
              catalogProducts={catalogProducts}
              merchants={merchantsList}
              storeLocations={storeLocationsList}
              onProductCreated={(p) => setCatalogProducts((prev) => [p, ...prev])}
              hotspots={hotspots}
              selectedHotspotId={selectedHotspotId}
              onSelectHotspot={setSelectedHotspotId}
              onCreateHotspot={handleCreateHotspot}
              onUpdateHotspot={handleUpdateHotspot}
              onDeleteHotspot={handleDeleteHotspot}
              onSaveToDatabase={handleSaveToDatabase}
              isSaving={isSaving}
              onOpenUpload={() => handleSelectView("upload-flyer")}
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
              onNavigateToAddStore={() => handleSelectView("add-store")}
              onNavigateToEditStore={(id) =>
                navigate({
                  search: (prev) => ({ ...prev, view: "edit-store", storeId: id }),
                  replace: true,
                })
              }
              onLocationDeleted={(id) => setStoreLocationsList((prev) => prev.filter((l) => l.id !== id))}
              loading={loading}
            />
          )}

          {currentView === "add-store" && (
            <StoreFormScreen
              merchants={merchantsList}
              onSave={(created) => {
                setStoreLocationsList((prev) => [created, ...prev]);
                handleSelectView("stores");
              }}
              onCancel={() => handleSelectView("stores")}
            />
          )}

          {currentView === "edit-store" && (
            <StoreFormScreen
              storeLocation={storeToEdit}
              merchants={merchantsList}
              onSave={(updated) => {
                setStoreLocationsList((prev) =>
                  prev.map((s) => (s.id === updated.id ? updated : s))
                );
                handleSelectView("stores");
              }}
              onCancel={() => handleSelectView("stores")}
            />
          )}

          {currentView === "products" && (
            <ProductsView
              products={catalogProducts}
              merchants={merchantsList}
              onNavigateToAddProduct={() => handleSelectView("add-product")}
              onNavigateToEditProduct={(id) =>
                navigate({
                  search: (prev) => ({ ...prev, view: "edit-product", productId: id }),
                  replace: true,
                })
              }
              onProductDeleted={(id) =>
                setCatalogProducts((prev) => prev.filter((item) => item.id !== id))
              }
              loading={loading}
            />
          )}

          {currentView === "add-product" && (
            <ProductFormScreen
              merchants={merchantsList}
              onSave={(created) => {
                setCatalogProducts((prev) => [created, ...prev]);
                handleSelectView("products");
              }}
              onCancel={() => handleSelectView("products")}
            />
          )}

          {currentView === "edit-product" && (
            <ProductFormScreen
              product={productToEdit}
              merchants={merchantsList}
              onSave={(updated) => {
                setCatalogProducts((prev) =>
                  prev.map((p) => (p.id === updated.id ? updated : p))
                );
                handleSelectView("products");
              }}
              onCancel={() => handleSelectView("products")}
            />
          )}

          {currentView === "settings" && <SettingsView />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
