import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Compass,
  Edit2,
  ExternalLink,
  Eye,
  Layers,
  LayoutGrid,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Search,
  Sparkles,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createStoreLocation,
  updateStoreLocation,
  deleteStoreLocation,
  type ApiFlyer,
  type Merchant,
  type StoreLocation,
} from "@/lib/api-client";

interface StoresViewProps {
  merchants: Merchant[];
  storeLocations: StoreLocation[];
  flyers: ApiFlyer[];
  onLocationCreated: (location: StoreLocation) => void;
  onLocationUpdated?: (location: StoreLocation) => void;
  onLocationDeleted: (id: string) => void;
  loading: boolean;
}

// Preset geographic coordinates for Ontario & Canadian retail centers
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  markham: { lat: 43.8561, lng: -79.337 },
  toronto: { lat: 43.6532, lng: -79.3832 },
  "richmond hill": { lat: 43.8828, lng: -79.4403 },
  mississauga: { lat: 43.589, lng: -79.6441 },
  "north york": { lat: 43.7615, lng: -79.4111 },
  scarborough: { lat: 43.7764, lng: -79.2318 },
  vaughan: { lat: 43.8372, lng: -79.5083 },
  brampton: { lat: 43.7315, lng: -79.7624 },
  oakville: { lat: 43.4675, lng: -79.6877 },
};

export function StoresView({
  merchants,
  storeLocations,
  flyers,
  onLocationCreated,
  onLocationUpdated,
  onLocationDeleted,
  loading,
}: StoresViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [search, setSearch] = useState("");
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StoreLocation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMapStoreId, setSelectedMapStoreId] = useState<string>(storeLocations[0]?.id || "");

  // Form states
  const [formMerchantId, setFormMerchantId] = useState<string>(merchants[0]?.id || "");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Markham");
  const [province, setProvince] = useState("ON");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [latitude, setLatitude] = useState<string>("43.8561");
  const [longitude, setLongitude] = useState<string>("-79.3370");

  const filtered = storeLocations.filter((loc) => {
    const matchesSearch =
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      loc.city.toLowerCase().includes(search.toLowerCase()) ||
      loc.address.toLowerCase().includes(search.toLowerCase()) ||
      (loc.postalCode && loc.postalCode.toLowerCase().includes(search.toLowerCase()));
    const matchesMerchant = selectedMerchantId === "all" || loc.merchantId === selectedMerchantId;
    return matchesSearch && matchesMerchant;
  });

  const handleOpenAdd = () => {
    setEditingLocation(null);
    setFormMerchantId(merchants[0]?.id || "");
    setName("");
    setAddress("");
    setCity("Markham");
    setProvince("ON");
    setPostalCode("");
    setPhone("");
    setLatitude("43.8561");
    setLongitude("-79.3370");
    setDialogOpen(true);
  };

  const handleOpenEdit = (loc: StoreLocation) => {
    setEditingLocation(loc);
    setFormMerchantId(loc.merchantId);
    setName(loc.name);
    setAddress(loc.address);
    setCity(loc.city);
    setProvince(loc.province || "ON");
    setPostalCode(loc.postalCode || "");
    setPhone(loc.phone || "");
    setLatitude(loc.latitude !== undefined && loc.latitude !== null ? String(loc.latitude) : "");
    setLongitude(loc.longitude !== undefined && loc.longitude !== null ? String(loc.longitude) : "");
    setDialogOpen(true);
  };

  const handleAutoFillCoords = (cityName: string) => {
    const key = cityName.trim().toLowerCase();
    const match = CITY_COORDINATES[key];
    if (match) {
      setLatitude(String(match.lat));
      setLongitude(String(match.lng));
      toast.info(`Coordinates filled for ${cityName} (${match.lat}, ${match.lng})`);
    } else {
      toast.info(`Defaulting to Markham coordinates`);
      setLatitude("43.8561");
      setLongitude("-79.3370");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !formMerchantId) {
      toast.error("Please fill in the store name and address.");
      return;
    }

    const latNum = latitude ? parseFloat(latitude) : undefined;
    const lngNum = longitude ? parseFloat(longitude) : undefined;

    if (latNum !== undefined && (isNaN(latNum) || latNum < -90 || latNum > 90)) {
      toast.error("Latitude must be a valid number between -90 and 90");
      return;
    }
    if (lngNum !== undefined && (isNaN(lngNum) || lngNum < -180 || lngNum > 180)) {
      toast.error("Longitude must be a valid number between -180 and 180");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<StoreLocation> = {
        merchantId: formMerchantId,
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        province: province.trim(),
        postalCode: postalCode.trim() || undefined,
        phone: phone.trim() || undefined,
        latitude: latNum,
        longitude: lngNum,
      };

      if (editingLocation) {
        const updated = await updateStoreLocation(editingLocation.id, payload);
        toast.success(`Store location "${updated.name}" updated!`);
        if (onLocationUpdated) onLocationUpdated(updated);
      } else {
        const created = await createStoreLocation(payload);
        toast.success(`Store location "${created.name}" created with GPS coordinates!`);
        onLocationCreated(created);
      }

      setDialogOpen(false);
    } catch (err: any) {
      toast.error(`Failed to save store location: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, storeName: string) => {
    if (!confirm(`Are you sure you want to delete ${storeName}?`)) return;
    try {
      await deleteStoreLocation(id);
      toast.success(`Removed ${storeName}.`);
      onLocationDeleted(id);
    } catch (err: any) {
      toast.error(`Could not delete location: ${err.message}`);
    }
  };

  const activeMapStore =
    filtered.find((l) => l.id === selectedMapStoreId) || filtered[0] || storeLocations[0];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Franchises & Store Locations</h1>
            <Badge variant="secondary" className="text-xs font-semibold">
              {storeLocations.length} Branches · {merchants.length} Brands
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage multi-location retail chains, franchise branches, GPS map coordinates, and store-wise circulars.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border bg-muted p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </Button>
            <Button
              variant={viewMode === "map" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <MapIcon className="h-3.5 w-3.5" />
              Map View
            </Button>
          </div>

          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="h-8 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Store Location
          </Button>
        </div>
      </div>

      {/* Franchise Brands Quick Overview */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {merchants.map((merchant) => {
          const locCount = storeLocations.filter((l) => l.merchantId === merchant.id).length;
          const flyerCount = flyers.filter((f) => f.merchantId === merchant.id).length;

          return (
            <Card
              key={merchant.id}
              onClick={() => setSelectedMerchantId(selectedMerchantId === merchant.id ? "all" : merchant.id)}
              className={`p-3 cursor-pointer transition-all border ${
                selectedMerchantId === merchant.id
                  ? "border-primary ring-2 ring-primary/20 shadow-xs"
                  : "hover:border-foreground/30 shadow-xs"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                  style={{
                    backgroundColor: merchant.logoBg || "#075E50",
                    color: merchant.logoColor || "#FFFFFF",
                  }}
                >
                  {merchant.initial || merchant.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold truncate">{merchant.name}</h4>
                  <p className="text-[11px] text-muted-foreground">
                    {locCount} location{locCount === 1 ? "" : "s"} · {flyerCount} flyer{flyerCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by branch name, city, address, or postal code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 text-xs">
            <span className="text-muted-foreground text-[11px] font-semibold mr-1 shrink-0">Brand:</span>
            <button
              onClick={() => setSelectedMerchantId("all")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedMerchantId === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              All Brands
            </button>
            {merchants.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMerchantId(m.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedMerchantId === m.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* VIEW MODE: INTERACTIVE MAP VIEW */}
      {viewMode === "map" && (
        <Card className="overflow-hidden border shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[540px]">
            {/* Store List Sidebar */}
            <div className="border-r overflow-y-auto max-h-[580px] p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Select Location ({filtered.length})
                </span>
                <span className="text-[11px] text-muted-foreground">Click to center map</span>
              </div>

              {filtered.map((loc) => {
                const merch = merchants.find((m) => m.id === loc.merchantId) || loc.merchant;
                const isSelected = activeMapStore?.id === loc.id;
                const hasCoords = loc.latitude && loc.longitude;

                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedMapStoreId(loc.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-background border-primary shadow-xs ring-1 ring-primary/30"
                        : "bg-card hover:bg-muted/50 border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: merch?.logoBg || "#075E50",
                              color: merch?.logoColor || "#FFFFFF",
                            }}
                          >
                            {merch?.initial || merch?.name.charAt(0)}
                          </span>
                          <h4 className="font-semibold text-xs truncate">{loc.name}</h4>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 truncate">{loc.address}, {loc.city}</p>
                      </div>

                      {hasCoords ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 shrink-0 font-mono">
                          GPS OK
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 shrink-0">
                          No GPS
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-mono">
                        {hasCoords ? `${loc.latitude?.toFixed(4)}, ${loc.longitude?.toFixed(4)}` : "Needs coordinates"}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(loc);
                        }}
                        className="h-6 px-1.5 text-xs text-primary"
                      >
                        <Edit2 className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Embedded OpenStreetMap Display */}
            <div className="lg:col-span-2 flex flex-col h-full bg-background relative min-h-[400px]">
              {activeMapStore && activeMapStore.latitude && activeMapStore.longitude ? (
                <>
                  <iframe
                    title={`Map preview for ${activeMapStore.name}`}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${activeMapStore.longitude - 0.015}%2C${activeMapStore.latitude - 0.01}%2C${activeMapStore.longitude + 0.015}%2C${activeMapStore.latitude + 0.01}&layer=mapnik&marker=${activeMapStore.latitude}%2C${activeMapStore.longitude}`}
                    className="w-full flex-1 border-0 min-h-[420px]"
                    loading="lazy"
                  />

                  {/* Floating Map Store Card Overlay */}
                  <div className="p-4 bg-background/95 backdrop-blur border-t flex flex-wrap items-center justify-between gap-3 shadow-md">
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm text-foreground">{activeMapStore.name}</h3>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {activeMapStore.latitude.toFixed(4)}, {activeMapStore.longitude.toFixed(4)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activeMapStore.address}, {activeMapStore.city}, {activeMapStore.province} {activeMapStore.postalCode}
                        {activeMapStore.phone && ` · ${activeMapStore.phone}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${activeMapStore.latitude},${activeMapStore.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Navigation className="h-3.5 w-3.5 text-primary" />
                          Directions
                        </a>
                      </Button>
                      <Button asChild size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold">
                        <Link to="/preview" search={{ storeId: activeMapStore.id } as any}>
                          <Eye className="h-3.5 w-3.5" />
                          Preview Circulars
                        </Link>
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                  <MapPin className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <h4 className="font-semibold text-sm">No GPS coordinates set for this store</h4>
                  <p className="text-xs mt-1 max-w-sm">
                    Click "Edit" on the store card to set latitude and longitude coordinates, and the map will render immediately.
                  </p>
                  {activeMapStore && (
                    <Button
                      size="sm"
                      onClick={() => handleOpenEdit(activeMapStore)}
                      className="mt-3 gap-1.5 text-xs"
                    >
                      <Edit2 className="h-3 w-3" /> Set Coordinates
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* VIEW MODE: CARDS GRID */}
      {viewMode === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-5 space-y-3">
                <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
              </Card>
            ))
          ) : filtered.length === 0 ? (
            <Card className="col-span-full p-12 text-center border-dashed">
              <Store className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-sm">No store locations found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Add franchise store branches with GPS coordinates so flyers and promotions can be targeted geographically.
              </p>
              <Button size="sm" onClick={handleOpenAdd} className="mt-4 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Location
              </Button>
            </Card>
          ) : (
            filtered.map((loc) => {
              const merch = merchants.find((m) => m.id === loc.merchantId) || loc.merchant;
              const specificFlyers = flyers.filter((f) => f.storeLocationId === loc.id);
              const chainFlyers = flyers.filter((f) => f.merchantId === loc.merchantId && !f.storeLocationId);
              const hasCoords = loc.latitude !== undefined && loc.longitude !== undefined && loc.latitude !== null && loc.longitude !== null;

              return (
                <Card
                  key={loc.id}
                  className="shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {/* Mini Map Viewport */}
                    {hasCoords ? (
                      <div className="relative h-28 w-full border-b bg-muted overflow-hidden">
                        <iframe
                          title={`Map snippet for ${loc.name}`}
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${loc.longitude! - 0.007}%2C${loc.latitude! - 0.004}%2C${loc.longitude! + 0.007}%2C${loc.latitude! + 0.004}&layer=mapnik&marker=${loc.latitude}%2C${loc.longitude}`}
                          className="w-full h-full border-0 pointer-events-none"
                          loading="lazy"
                        />
                        <a
                          href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute bottom-2 right-2 rounded bg-background/90 hover:bg-background text-foreground text-[10px] font-medium px-2 py-0.5 shadow-xs border flex items-center gap-1 backdrop-blur"
                        >
                          <Navigation className="h-3 w-3 text-primary" /> Maps
                        </a>
                      </div>
                    ) : (
                      <div className="h-16 w-full border-b bg-muted/30 flex items-center justify-center text-[11px] text-muted-foreground gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground/50" />
                        <span>Coordinates not configured</span>
                      </div>
                    )}

                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[10px] font-semibold flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-primary" />
                          {merch?.name || "Franchise"}
                        </Badge>

                        <div className="flex items-center gap-1">
                          {specificFlyers.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold">
                              {specificFlyers.length} Store Flyer{specificFlyers.length === 1 ? "" : "s"}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(loc)}
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            title="Edit Location"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(loc.id, loc.name)}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            title="Delete Location"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-base font-semibold mt-1">{loc.name}</CardTitle>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 pb-3 space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-foreground font-medium">{loc.address}</p>
                          <p>
                            {loc.city}, {loc.province} {loc.postalCode}
                          </p>
                        </div>
                      </div>

                      {hasCoords && (
                        <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                          <LocateFixed className="h-3 w-3 shrink-0" />
                          <span>
                            {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                          </span>
                        </div>
                      )}

                      {loc.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <a href={`tel:${loc.phone}`} className="hover:underline text-foreground">
                            {loc.phone}
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </div>

                  <CardFooter className="p-4 pt-2 border-t bg-muted/20 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {specificFlyers.length + chainFlyers.length} circulars active
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                        <Link to="/preview" search={{ storeId: loc.id } as any}>
                          <Eye className="h-3 w-3 text-primary" />
                          Preview Store
                        </Link>
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Add / Edit Store Location Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Store className="h-5 w-5 text-primary" />
                <DialogTitle className="text-lg font-bold">
                  {editingLocation ? "Edit Franchise Store Branch" : "Add Franchise Store Branch"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                Configure physical retail location with street address, phone, and GPS map coordinates.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div className="space-y-1">
                <Label htmlFor="loc-merch" className="text-xs font-semibold">
                  Franchise / Brand
                </Label>
                <Select value={formMerchantId} onValueChange={setFormMerchantId}>
                  <SelectTrigger id="loc-merch" className="text-xs">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {merchants.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.name} ({m.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="loc-name" className="text-xs font-semibold">
                  Branch Name
                </Label>
                <Input
                  id="loc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Longo's Richmond Hill"
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="loc-addr" className="text-xs font-semibold">
                  Street Address
                </Label>
                <Input
                  id="loc-addr"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 10830 Bayview Ave"
                  required
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="loc-city" className="text-xs font-semibold">
                    City
                  </Label>
                  <Input
                    id="loc-city"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      handleAutoFillCoords(e.target.value);
                    }}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="loc-prov" className="text-xs font-semibold">
                    Province
                  </Label>
                  <Input
                    id="loc-prov"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="loc-post" className="text-xs font-semibold">
                    Postal Code
                  </Label>
                  <Input
                    id="loc-post"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="L4S 0A5"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="loc-phone" className="text-xs font-semibold">
                  Store Phone Number
                </Label>
                <Input
                  id="loc-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(905) 555-0100"
                  className="text-xs"
                />
              </div>

              {/* GPS Coordinates Section */}
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <LocateFixed className="h-3.5 w-3.5 text-primary" />
                    GPS Coordinates (Map Visibility)
                  </Label>
                  <button
                    type="button"
                    onClick={() => handleAutoFillCoords(city)}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    Auto-Fill from City
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="loc-lat" className="text-[11px] text-muted-foreground font-medium">
                      Latitude (-90 .. 90)
                    </Label>
                    <Input
                      id="loc-lat"
                      type="number"
                      step="0.0001"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="43.8561"
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="loc-lng" className="text-[11px] text-muted-foreground font-medium">
                      Longitude (-180 .. 180)
                    </Label>
                    <Input
                      id="loc-lng"
                      type="number"
                      step="0.0001"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="-79.3370"
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1 overflow-x-auto pt-1 text-[10px]">
                  <span className="text-muted-foreground shrink-0">Presets:</span>
                  {Object.entries(CITY_COORDINATES).slice(0, 5).map(([cName, cPos]) => (
                    <button
                      key={cName}
                      type="button"
                      onClick={() => {
                        setLatitude(String(cPos.lat));
                        setLongitude(String(cPos.lng));
                      }}
                      className="px-2 py-0.5 rounded border bg-background hover:bg-muted capitalize font-medium whitespace-nowrap"
                    >
                      {cName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary text-primary-foreground font-semibold">
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-1" />
                )}
                {isSubmitting
                  ? "Saving..."
                  : editingLocation
                  ? "Update Store Location"
                  : "Save Store Location"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
