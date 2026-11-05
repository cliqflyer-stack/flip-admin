import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  ExternalLink,
  Eye,
  Layers,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Search,
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
  onLocationDeleted: (id: string) => void;
  loading: boolean;
}

export function StoresView({
  merchants,
  storeLocations,
  flyers,
  onLocationCreated,
  onLocationDeleted,
  loading,
}: StoresViewProps) {
  const [search, setSearch] = useState("");
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New location form state
  const [formMerchantId, setFormMerchantId] = useState<string>(merchants[0]?.id || "");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Markham");
  const [province, setProvince] = useState("ON");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");

  const filtered = storeLocations.filter((loc) => {
    const matchesSearch =
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      loc.city.toLowerCase().includes(search.toLowerCase()) ||
      loc.address.toLowerCase().includes(search.toLowerCase());
    const matchesMerchant = selectedMerchantId === "all" || loc.merchantId === selectedMerchantId;
    return matchesSearch && matchesMerchant;
  });

  const handleOpenAdd = () => {
    setFormMerchantId(merchants[0]?.id || "");
    setName("");
    setAddress("");
    setCity("Markham");
    setProvince("ON");
    setPostalCode("");
    setPhone("");
    setDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !formMerchantId) return;

    setIsSubmitting(true);
    try {
      const created = await createStoreLocation({
        merchantId: formMerchantId,
        name,
        address,
        city,
        province,
        postalCode: postalCode || undefined,
        phone: phone || undefined,
      });

      toast.success(`Store location "${name}" created in Neon Postgres!`);
      onLocationCreated(created);
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(`Failed to create location: ${err.message}`);
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
            Manage multi-location retail chains, franchise branches, and store-wise circular assignments.
          </p>
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
              placeholder="Search by branch name, city, or address..."
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

      {/* Store Locations Grid */}
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
              Add franchise store branches so flyers can be targeted specifically to physical locations.
            </p>
            <Button size="sm" onClick={handleOpenAdd} className="mt-4 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add Location
            </Button>
          </Card>
        ) : (
          filtered.map((loc) => {
            const merch = merchants.find((m) => m.id === loc.merchantId) || loc.merchant;
            // Count flyers assigned to this store specifically OR chain-wide for this merchant
            const specificFlyers = flyers.filter((f) => f.storeLocationId === loc.id);
            const chainFlyers = flyers.filter((f) => f.merchantId === loc.merchantId && !f.storeLocationId);

            return (
              <Card key={loc.id} className="shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
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
                          onClick={() => handleDelete(loc.id, loc.name)}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-base font-semibold mt-2">{loc.name}</CardTitle>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 pb-3 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-foreground font-medium">{loc.address}</p>
                        <p>{loc.city}, {loc.province} {loc.postalCode}</p>
                      </div>
                    </div>

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

      {/* Add Store Location Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Store className="h-5 w-5 text-primary" />
                <DialogTitle className="text-lg font-bold">Add Franchise Store Branch</DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                Creates a new physical retail location capable of having dedicated store-wise circulars.
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
                    onChange={(e) => setCity(e.target.value)}
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
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary text-primary-foreground font-semibold">
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                {isSubmitting ? "Saving Branch..." : "Save Store Branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
