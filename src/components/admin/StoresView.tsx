import React, { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Edit2,
  Eye,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  deleteStoreLocation,
  resolveImageUrl,
  type ApiFlyer,
  type Merchant,
  type StoreLocation,
} from "@/lib/api-client";

interface StoresViewProps {
  merchants: Merchant[];
  storeLocations: StoreLocation[];
  flyers: ApiFlyer[];
  onNavigateToAddStore: () => void;
  onNavigateToEditStore: (storeId: string) => void;
  onLocationDeleted: (id: string) => void;
  loading: boolean;
}

const PAGE_SIZE = 20;

export function StoresView({
  merchants,
  storeLocations,
  flyers,
  onNavigateToAddStore,
  onNavigateToEditStore,
  onLocationDeleted,
  loading,
}: StoresViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [search, setSearch] = useState("");
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedMapStoreId, setSelectedMapStoreId] = useState<string>(
    storeLocations[0]?.id || ""
  );

  const scrollSentinelRef = useRef<HTMLDivElement>(null);

  // Filter store locations
  const filtered = storeLocations.filter((loc) => {
    const matchesSearch =
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      loc.city.toLowerCase().includes(search.toLowerCase()) ||
      loc.address.toLowerCase().includes(search.toLowerCase()) ||
      (loc.postalCode && loc.postalCode.toLowerCase().includes(search.toLowerCase()));

    const matchesMerchant =
      selectedMerchantId === "all" || loc.merchantId === selectedMerchantId;

    return matchesSearch && matchesMerchant;
  });

  // Reset pagination when search or filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, selectedMerchantId]);

  // Infinite scroll observer: load next 20 stores on scroll bottom
  useEffect(() => {
    const sentinel = scrollSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length));
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtered.length]);

  const visibleStores = filtered.slice(0, visibleCount);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await deleteStoreLocation(id);
      toast.success(`Store location "${name}" removed.`);
      onLocationDeleted(id);
    } catch (err: any) {
      toast.error(`Could not delete location: ${err.message}`);
    }
  };

  const selectedMapStore =
    filtered.find((l) => l.id === selectedMapStoreId) || filtered[0] || storeLocations[0];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Stores & Locations</h1>
            <Badge variant="secondary" className="text-xs font-semibold">
              {storeLocations.length} Branches
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage multi-location retail chains, franchise branches, GPS map coordinates, and store circulars.
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
            onClick={onNavigateToAddStore}
            className="h-8 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Store Location
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border shadow-xs">
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
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                  selectedMerchantId === m.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                <span
                  className="inline-flex h-3.5 w-3.5 items-center justify-center rounded text-[9px] font-bold"
                  style={{ backgroundColor: m.logoBg, color: m.logoColor }}
                >
                  {m.initial}
                </span>
                <span>{m.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Card Grid View */}
      {viewMode === "grid" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-5 space-y-3">
                  <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                </Card>
              ))
            ) : filtered.length === 0 ? (
              <Card className="col-span-full p-12 text-center border-dashed">
                <h3 className="font-semibold text-sm">No store locations found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Add franchise store branches with GPS coordinates so circulars can be targeted geographically.
                </p>
                <Button size="sm" onClick={onNavigateToAddStore} className="mt-4 gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add Location
                </Button>
              </Card>
            ) : (
              visibleStores.map((loc) => {
                const merch = merchants.find((m) => m.id === loc.merchantId) || loc.merchant;
                const specificFlyers = flyers.filter((f) => f.storeLocationId === loc.id);
                const chainFlyers = flyers.filter(
                  (f) => f.merchantId === loc.merchantId && !f.storeLocationId
                );
                const hasCoords =
                  loc.latitude !== undefined &&
                  loc.longitude !== undefined &&
                  loc.latitude !== null &&
                  loc.longitude !== null;

                return (
                  <Card
                    key={loc.id}
                    className="shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden border"
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
                        <div className="h-14 w-full border-b bg-muted/30 flex items-center justify-center text-[11px] text-muted-foreground gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground/50" />
                          <span>Coordinates not configured</span>
                        </div>
                      )}

                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {/* Store / Brand Logo */}
                            {loc.logoUrl ? (
                              <img
                                src={resolveImageUrl(loc.logoUrl)}
                                alt={loc.name}
                                className="h-6 w-6 rounded object-contain border bg-background"
                              />
                            ) : merch ? (
                              <span
                                className="inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold"
                                style={{
                                  backgroundColor: merch.logoBg || "#075E50",
                                  color: merch.logoColor || "#FFFFFF",
                                }}
                              >
                                {merch.initial}
                              </span>
                            ) : null}
                            <span className="font-semibold text-xs text-muted-foreground">
                              {merch?.name || "Franchise"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {specificFlyers.length > 0 && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold"
                              >
                                {specificFlyers.length} Flyer{specificFlyers.length === 1 ? "" : "s"}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onNavigateToEditStore(loc.id)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Edit Location"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(loc.id, loc.name)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Delete Location"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <CardTitle className="text-sm font-semibold mt-1">{loc.name}</CardTitle>
                      </CardHeader>

                      <CardContent className="p-4 pt-1 pb-3 space-y-1.5 text-xs text-muted-foreground">
                        <p className="text-foreground font-medium">{loc.address}</p>
                        <p>
                          {loc.city}, {loc.province} {loc.postalCode}
                        </p>

                        {hasCoords && (
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                          </p>
                        )}

                        {loc.phone && (
                          <div className="flex items-center gap-1.5 text-foreground">
                            <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                            <a href={`tel:${loc.phone}`} className="hover:underline">
                              {loc.phone}
                            </a>
                          </div>
                        )}
                      </CardContent>
                    </div>

                    <CardFooter className="p-4 pt-2 border-t bg-muted/20 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {specificFlyers.length + chainFlyers.length} circulars active
                      </span>

                      <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                        <Link to="/preview" search={{ storeId: loc.id } as any}>
                          <Eye className="h-3 w-3 text-primary" />
                          Preview Store
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>

          {/* Sentinel for infinite scroll */}
          {visibleCount < filtered.length && (
            <div ref={scrollSentinelRef} className="py-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length))
                }
                className="text-xs"
              >
                Load More Stores ({visibleCount} of {filtered.length} loaded)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Map View */}
      {viewMode === "map" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {filtered.map((loc) => {
              const merch = merchants.find((m) => m.id === loc.merchantId);
              const isSelected = selectedMapStore?.id === loc.id;
              return (
                <div
                  key={loc.id}
                  onClick={() => setSelectedMapStoreId(loc.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "hover:border-foreground/30 bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">{loc.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {merch?.name}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {loc.address}, {loc.city}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-2 rounded-lg border overflow-hidden min-h-[500px] bg-muted relative">
            {selectedMapStore?.latitude && selectedMapStore?.longitude ? (
              <iframe
                title="Interactive Map View"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedMapStore.longitude - 0.02}%2C${selectedMapStore.latitude - 0.015}%2C${selectedMapStore.longitude + 0.02}%2C${selectedMapStore.latitude + 0.015}&layer=mapnik&marker=${selectedMapStore.latitude}%2C${selectedMapStore.longitude}`}
                className="w-full h-full min-h-[500px] border-0"
                loading="lazy"
              />
            ) : (
              <div className="h-full min-h-[500px] flex items-center justify-center text-xs text-muted-foreground">
                Select a store location with GPS coordinates
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
