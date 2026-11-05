import React, { useRef, useState } from "react";
import { ArrowLeft, Check, ChevronsUpDown, Loader2, MapPin, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { InteractiveMapPicker } from "./InteractiveMapPicker";
import {
  createStoreLocation,
  updateStoreLocation,
  uploadImage,
  resolveImageUrl,
  type Merchant,
  type StoreLocation,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface StoreFormScreenProps {
  storeLocation?: StoreLocation | null;
  merchants: Merchant[];
  onSave: (location: StoreLocation, isEdit: boolean) => void;
  onCancel: () => void;
}

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

export function StoreFormScreen({
  storeLocation,
  merchants,
  onSave,
  onCancel,
}: StoreFormScreenProps) {
  const isEdit = !!storeLocation;

  const [merchantId, setMerchantId] = useState(
    storeLocation?.merchantId || merchants[0]?.id || ""
  );
  const [name, setName] = useState(storeLocation?.name || "");
  const [address, setAddress] = useState(storeLocation?.address || "");
  const [city, setCity] = useState(storeLocation?.city || "Markham");
  const [province, setProvince] = useState(storeLocation?.province || "ON");
  const [postalCode, setPostalCode] = useState(storeLocation?.postalCode || "");
  const [phone, setPhone] = useState(storeLocation?.phone || "");
  const [logoUrl, setLogoUrl] = useState(storeLocation?.logoUrl || "");

  // Coordinates
  const [latitude, setLatitude] = useState<number | null>(
    storeLocation?.latitude !== undefined && storeLocation?.latitude !== null
      ? storeLocation.latitude
      : 43.8561
  );
  const [longitude, setLongitude] = useState<number | null>(
    storeLocation?.longitude !== undefined && storeLocation?.longitude !== null
      ? storeLocation.longitude
      : -79.337
  );

  const [brandOpen, setBrandOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const selectedMerchant = merchants.find((m) => m.id === merchantId);

  const handleCityPreset = (cityName: string) => {
    setCity(cityName.charAt(0).toUpperCase() + cityName.slice(1));
    const coords = CITY_COORDINATES[cityName.toLowerCase()];
    if (coords) {
      setLatitude(coords.lat);
      setLongitude(coords.lng);
      toast.info(`Updated map to center of ${cityName}.`);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const res = await uploadImage(file);
      setLogoUrl(res.url);
      toast.success("Store logo uploaded!");
    } catch (err: any) {
      toast.error(`Logo upload failed: ${err.message}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantId) {
      toast.error("Please select a brand/franchise.");
      return;
    }
    if (!name.trim() || !address.trim() || !city.trim()) {
      toast.error("Store name, address, and city are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        merchantId,
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        province: province.trim(),
        postalCode: postalCode.trim() || undefined,
        phone: phone.trim() || undefined,
        latitude: latitude !== null ? Number(latitude) : undefined,
        longitude: longitude !== null ? Number(longitude) : undefined,
        logoUrl: logoUrl.trim() || undefined,
      };

      if (isEdit && storeLocation) {
        const updated = await updateStoreLocation(storeLocation.id, payload);
        toast.success(`Updated "${updated.name}" successfully!`);
        onSave(updated, true);
      } else {
        const created = await createStoreLocation(payload);
        toast.success(`Created store "${created.name}" successfully!`);
        onSave(created, false);
      }
    } catch (err: any) {
      toast.error(`Failed to save store location: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {isEdit ? "Edit Store Location" : "Add Store Location"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Configure franchise brand, contact info, store logo, and GPS map pin coordinates.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Brand & Store Identity Card */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Store Identity & Franchise</CardTitle>
            <CardDescription className="text-xs">
              Select the parent brand and configure store branch naming and logo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Brand Combobox */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Brand Franchise <span className="text-destructive">*</span>
                </Label>
                <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={brandOpen}
                      className="w-full justify-between h-9 text-xs"
                    >
                      {selectedMerchant ? (
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: selectedMerchant.logoBg || "#075E50",
                              color: selectedMerchant.logoColor || "#FFFFFF",
                            }}
                          >
                            {selectedMerchant.initial}
                          </span>
                          <span className="truncate">{selectedMerchant.name}</span>
                        </div>
                      ) : (
                        "Search and select brand..."
                      )}
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search retail brand..." className="h-9 text-xs" />
                      <CommandList>
                        <CommandEmpty>No brand found.</CommandEmpty>
                        <CommandGroup>
                          {merchants.map((merchant) => (
                            <CommandItem
                              key={merchant.id}
                              value={merchant.name}
                              onSelect={() => {
                                setMerchantId(merchant.id);
                                setBrandOpen(false);
                              }}
                              className="text-xs cursor-pointer flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold"
                                  style={{
                                    backgroundColor: merchant.logoBg || "#075E50",
                                    color: merchant.logoColor || "#FFFFFF",
                                  }}
                                >
                                  {merchant.initial}
                                </span>
                                <span>{merchant.name}</span>
                              </div>
                              <Check
                                className={cn(
                                  "h-3.5 w-3.5",
                                  merchantId === merchant.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Branch Name */}
              <div className="space-y-1.5">
                <Label htmlFor="store-name" className="text-xs font-medium">
                  Branch / Location Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="store-name"
                  placeholder="e.g. Downtown Flagship, Markham Town Square"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Store Logo Option */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-medium">Store / Branch Logo (Optional)</Label>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img
                      src={resolveImageUrl(logoUrl)}
                      alt="Store logo"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : selectedMerchant ? (
                    <span
                      className="inline-flex h-full w-full items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor: selectedMerchant.logoBg || "#075E50",
                        color: selectedMerchant.logoColor || "#FFFFFF",
                      }}
                    >
                      {selectedMerchant.initial}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-[10px]">No Logo</span>
                  )}
                </div>

                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="https://... or upload custom logo"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="text-xs h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="h-9 text-xs gap-1.5 shrink-0"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Upload
                  </Button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address & Contact Information Card */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Address & Contact Information</CardTitle>
            <CardDescription className="text-xs">
              Physical store location for customer directions and localized circular delivery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="store-address" className="text-xs font-medium">
                Street Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="store-address"
                placeholder="e.g. 100 Main Street, Suite 200"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="store-city" className="text-xs font-medium">
                  City <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="store-city"
                  placeholder="Markham"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="store-province" className="text-xs font-medium">
                  Province
                </Label>
                <Input
                  id="store-province"
                  placeholder="ON"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="store-postal" className="text-xs font-medium">
                  Postal Code
                </Label>
                <Input
                  id="store-postal"
                  placeholder="L3R 9M4"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="store-phone" className="text-xs font-medium">
                  Phone Number
                </Label>
                <Input
                  id="store-phone"
                  placeholder="(905) 555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Map & GPS Coordinates Card */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">GPS Map Pin & Coordinates</CardTitle>
            <CardDescription className="text-xs">
              Click anywhere on the map to drop a pin, or enter manual coordinates to position the location.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick City Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                Quick GTA Presets:
              </span>
              {Object.keys(CITY_COORDINATES).map((cName) => (
                <button
                  key={cName}
                  type="button"
                  onClick={() => handleCityPreset(cName)}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[11px] capitalize transition-colors font-medium",
                    city.toLowerCase() === cName
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-muted/40 hover:bg-muted"
                  )}
                >
                  {cName}
                </button>
              ))}
            </div>

            {/* Interactive Pin-Drop Leaflet Map */}
            <InteractiveMapPicker
              latitude={latitude}
              longitude={longitude}
              onChange={(newLat, newLng) => {
                setLatitude(newLat);
                setLongitude(newLng);
              }}
              className="h-80 w-full rounded-lg border"
            />

            {/* Manual Coordinate Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="store-lat" className="text-xs font-medium">
                  Latitude (e.g. 43.8561)
                </Label>
                <Input
                  id="store-lat"
                  type="number"
                  step="any"
                  placeholder="43.8561"
                  value={latitude ?? ""}
                  onChange={(e) =>
                    setLatitude(e.target.value === "" ? null : parseFloat(e.target.value))
                  }
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="store-lng" className="text-xs font-medium">
                  Longitude (e.g. -79.3370)
                </Label>
                <Input
                  id="store-lng"
                  type="number"
                  step="any"
                  placeholder="-79.3370"
                  value={longitude ?? ""}
                  onChange={(e) =>
                    setLongitude(e.target.value === "" ? null : parseFloat(e.target.value))
                  }
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="text-xs font-semibold gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MapPin className="h-3.5 w-3.5" />
            )}
            {isSubmitting
              ? "Saving Location..."
              : isEdit
              ? "Update Store Location"
              : "Create Store Location"}
          </Button>
        </div>
      </form>
    </div>
  );
}
