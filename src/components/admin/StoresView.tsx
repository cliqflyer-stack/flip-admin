import React, { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  CheckSquare,
  ChevronsUpDown,
  Edit2,
  Eye,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Search,
  Square,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  deleteStoreLocation,
  resolveImageUrl,
  type ApiFlyer,
  type Merchant,
  type StoreLocation,
} from "@/lib/api-client";
import { MultiStoreMapView } from "./MultiStoreMapView";

interface StoresViewProps {
  merchants: Merchant[];
  storeLocations: StoreLocation[];
  flyers: ApiFlyer[];
  initialMerchantId?: string | undefined;
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
  initialMerchantId,
  onNavigateToAddStore,
  onNavigateToEditStore,
  onLocationDeleted,
  loading,
}: StoresViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [search, setSearch] = useState("");
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>(initialMerchantId || "all");

  useEffect(() => {
    if (initialMerchantId) {
      setSelectedMerchantId(initialMerchantId);
    }
  }, [initialMerchantId]);
  const [brandOpen, setBrandOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Multi-pin selection: Set of selected store IDs
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    storeLocations.forEach((s) => {
      if (s.latitude && s.longitude) initial.add(s.id);
    });
    return initial;
  });

  // Auto-select stores when storeLocations load
  useEffect(() => {
    if (storeLocations.length > 0) {
      setSelectedStoreIds((prev) => {
        if (prev.size > 0) return prev;
        const initial = new Set<string>();
        storeLocations.forEach((s) => {
          if (s.latitude && s.longitude) initial.add(s.id);
        });
        return initial;
      });
    }
  }, [storeLocations]);

  // Toggle selection on click: multiple can be selected, click on selected will unselect
  const handleToggleStore = (storeId: string) => {
    setSelectedStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      return next;
    });
  };

  const selectedMerchant = merchants.find((m) => m.id === selectedMerchantId);

  const scrollSentinelRef = useRef<HTMLDivElement>(null);

  // Filter store locations
  const filtered = storeLocations.filter((loc) => {
    const matchesSearch =
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      loc.city.toLowerCase().includes(search.toLowerCase()) ||
      loc.address.toLowerCase().includes(search.toLowerCase()) ||
      (loc.postalCode && loc.postalCode.toLowerCase().includes(search.toLowerCase()));

    const matchesMerchant = selectedMerchantId === "all" || loc.merchantId === selectedMerchantId;

    return matchesSearch && matchesMerchant;
  });

  const handleSelectAll = () => {
    const next = new Set<string>();
    filtered.forEach((s) => {
      if (s.latitude && s.longitude) next.add(s.id);
    });
    setSelectedStoreIds(next);
  };

  const handleClearAll = () => {
    setSelectedStoreIds(new Set());
  };

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
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length));
        }
      },
      { threshold: 0.1 },
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

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Stores</h1>
            <Badge variant="secondary" className="text-xs font-semibold">
              {storeLocations.length} Stores
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage store locations, addresses, and assigned circulars.
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

          {/* Search & Select Brand Combobox */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-muted-foreground text-xs font-medium shrink-0">Brand:</span>
            <Popover open={brandOpen} onOpenChange={setBrandOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={brandOpen}
                  size="sm"
                  className="h-8 min-w-[170px] justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    {selectedMerchant ? (
                      <>
                        <span
                          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold"
                          style={{
                            backgroundColor: selectedMerchant.logoBg,
                            color: selectedMerchant.logoColor,
                          }}
                        >
                          {selectedMerchant.initial}
                        </span>
                        <span className="truncate">{selectedMerchant.name}</span>
                      </>
                    ) : (
                      <span>All Brands</span>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search brand..." className="h-8 text-xs" />
                  <CommandList>
                    <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                      No brand found.
                    </CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all-brands"
                        onSelect={() => {
                          setSelectedMerchantId("all");
                          setBrandOpen(false);
                        }}
                        className="text-xs flex items-center justify-between"
                      >
                        <span>All Brands</span>
                        {selectedMerchantId === "all" && <Check className="h-3 w-3 text-primary" />}
                      </CommandItem>
                      {merchants.map((m) => (
                        <CommandItem
                          key={m.id}
                          value={m.name}
                          onSelect={() => {
                            setSelectedMerchantId(m.id);
                            setBrandOpen(false);
                          }}
                          className="text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold"
                              style={{ backgroundColor: m.logoBg, color: m.logoColor }}
                            >
                              {m.initial}
                            </span>
                            <span className="truncate">{m.name}</span>
                          </div>
                          {selectedMerchantId === m.id && (
                            <Check className="h-3 w-3 text-primary" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
                  Add franchise store branches with GPS coordinates so circulars can be targeted
                  geographically.
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
                  (f) => f.merchantId === loc.merchantId && !f.storeLocationId,
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
                                {specificFlyers.length} Flyer
                                {specificFlyers.length === 1 ? "" : "s"}
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
          <div className="lg:col-span-1 space-y-3">
            {/* Multi-Pin Controls Header */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card shadow-2xs">
              <div>
                <span className="text-xs font-bold text-foreground">
                  {selectedStoreIds.size} of{" "}
                  {filtered.filter((s) => s.latitude && s.longitude).length} Pins Selected
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Click a store to toggle pin on map
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSelectAll}
                  className="h-7 px-2 text-xs text-primary font-semibold hover:bg-primary/10"
                >
                  Select All
                </Button>
                {selectedStoreIds.size > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearAll}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Store List with Toggle Checkbox & Pin indicator */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filtered.map((loc) => {
                const merch = merchants.find((m) => m.id === loc.merchantId) || loc.merchant;
                const isSelected = selectedStoreIds.has(loc.id);
                const hasCoords =
                  loc.latitude !== undefined &&
                  loc.longitude !== undefined &&
                  loc.latitude !== null &&
                  loc.longitude !== null;

                return (
                  <div
                    key={loc.id}
                    onClick={() => handleToggleStore(loc.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all select-none ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-xs"
                        : "hover:border-foreground/30 bg-card opacity-75"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Checkbox / Pin Indicator */}
                        <div
                          className={`h-5 w-5 rounded flex items-center justify-center shrink-0 text-xs transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                              : "border border-muted-foreground/40 text-muted-foreground"
                          }`}
                        >
                          {isSelected ? (
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          ) : (
                            <MapPin className="h-3 w-3 opacity-60" />
                          )}
                        </div>

                        <div className="truncate">
                          <span
                            className={`font-semibold text-xs truncate block ${
                              isSelected ? "text-foreground font-bold" : "text-muted-foreground"
                            }`}
                          >
                            {loc.name}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className="text-[9px] shrink-0"
                        style={{
                          backgroundColor: isSelected
                            ? `${merch?.logoBg || "#075E50"}15`
                            : undefined,
                          borderColor: isSelected ? merch?.logoBg || "#075E50" : undefined,
                          color: isSelected ? merch?.logoBg || "#075E50" : undefined,
                        }}
                      >
                        {merch?.name || "Store"}
                      </Badge>
                    </div>

                    <div className="mt-2 pl-7 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="truncate">
                        {loc.address}, {loc.city}
                      </span>
                      {hasCoords ? (
                        <span
                          className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            isSelected
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {isSelected ? "Pin on map" : "Click to pin"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600">No GPS</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Multi-Pin Map */}
          <div className="lg:col-span-2">
            <MultiStoreMapView
              stores={filtered}
              selectedStoreIds={selectedStoreIds}
              onToggleStore={handleToggleStore}
              onSelectAll={handleSelectAll}
              merchants={merchants}
              className="w-full h-full min-h-[580px] rounded-lg border overflow-hidden relative shadow-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
