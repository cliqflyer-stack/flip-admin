import React, { useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, MapPin, Store, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AdminFormBody,
  AdminFormField,
  AdminFormFooter,
  AdminFormHeader,
  AdminFormPage,
  AdminFormSection,
  adminInputClass,
} from "./AdminFormLayout";
import { InteractiveMapPicker } from "./InteractiveMapPicker";
import { FranchiseDialog } from "./FranchiseDialog";
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
  storeLocation?: StoreLocation | null | undefined;
  merchants: Merchant[];
  initialMerchantId?: string | undefined;
  onFranchiseCreated?: (created: Merchant) => void;
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
  initialMerchantId,
  onFranchiseCreated,
  onSave,
  onCancel,
}: StoreFormScreenProps) {
  const isEdit = !!storeLocation;

  const [merchantId, setMerchantId] = useState(
    storeLocation?.merchantId || initialMerchantId || merchants[0]?.id || "",
  );
  const [name, setName] = useState(storeLocation?.name || "");
  const [address, setAddress] = useState(storeLocation?.address || "");
  const [city, setCity] = useState(storeLocation?.city || "Markham");
  const [province, setProvince] = useState(storeLocation?.province || "ON");
  const [postalCode, setPostalCode] = useState(storeLocation?.postalCode || "");
  const [phone, setPhone] = useState(storeLocation?.phone || "");
  const [logoUrl, setLogoUrl] = useState(storeLocation?.logoUrl || "");
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState(storeLocation?.privacyPolicyUrl || "");
  const [termsUrl, setTermsUrl] = useState(storeLocation?.termsUrl || "");

  // Coordinates
  const [latitude, setLatitude] = useState<number | null>(
    storeLocation?.latitude !== undefined && storeLocation?.latitude !== null
      ? storeLocation.latitude
      : 43.8561,
  );
  const [longitude, setLongitude] = useState<number | null>(
    storeLocation?.longitude !== undefined && storeLocation?.longitude !== null
      ? storeLocation.longitude
      : -79.337,
  );

  const [brandOpen, setBrandOpen] = useState(false);
  const [isAddFranchiseOpen, setIsAddFranchiseOpen] = useState(false);
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
        privacyPolicyUrl: privacyPolicyUrl.trim() || null,
        termsUrl: termsUrl.trim() || null,
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
    <AdminFormPage>
      <AdminFormHeader
        title={isEdit ? "Edit Store Location" : "Add Store Location"}
        description="Set the franchise, branch details, contact information and GPS pin for this store."
        onBack={onCancel}
        badge={
          isEdit ? (
            <Badge variant="secondary" className="text-[10px]">
              Editing
            </Badge>
          ) : undefined
        }
      />

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <AdminFormBody
          aside={
            <AdminFormSection
              step={3}
              icon={MapPin}
              title="GPS Coordinates"
              description="Click the map to drop a pin, or enter exact coordinates."
            >
              {/* Quick City Presets */}
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">Quick GTA presets</Label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(CITY_COORDINATES).map((cName) => (
                    <button
                      key={cName}
                      type="button"
                      onClick={() => handleCityPreset(cName)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                        city.toLowerCase() === cName
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background hover:bg-muted",
                      )}
                    >
                      {cName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <AdminFormField label="Latitude" htmlFor="store-lat">
                  <Input
                    id="store-lat"
                    type="number"
                    step="any"
                    placeholder="43.8561"
                    value={latitude ?? ""}
                    onChange={(e) =>
                      setLatitude(e.target.value === "" ? null : parseFloat(e.target.value))
                    }
                    className={cn(adminInputClass, "font-mono")}
                  />
                </AdminFormField>

                <AdminFormField label="Longitude" htmlFor="store-lng">
                  <Input
                    id="store-lng"
                    type="number"
                    step="any"
                    placeholder="-79.3370"
                    value={longitude ?? ""}
                    onChange={(e) =>
                      setLongitude(e.target.value === "" ? null : parseFloat(e.target.value))
                    }
                    className={cn(adminInputClass, "font-mono")}
                  />
                </AdminFormField>
              </div>
            </AdminFormSection>
          }
        >
          {/* Brand & Store Identity */}
          <AdminFormSection
            step={1}
            icon={Store}
            title="Store Identity"
            description="Parent franchise, branch name and optional branch logo."
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <AdminFormField
                label="Franchise Brand"
                required
                hint={
                  <button
                    type="button"
                    onClick={() => setIsAddFranchiseOpen(true)}
                    className="font-medium text-primary hover:underline"
                  >
                    + New franchise
                  </button>
                }
              >
                <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={brandOpen}
                      className="h-10 w-full justify-between px-3 text-sm font-normal"
                    >
                      {selectedMerchant ? (
                        <div className="flex min-w-0 items-center gap-2">
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
                        <span className="text-muted-foreground">Search and select brand…</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search retail brand..." className="h-9 text-sm" />
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
                              className="flex cursor-pointer items-center justify-between text-sm"
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
                                  merchantId === merchant.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </AdminFormField>

              <AdminFormField label="Branch Name" htmlFor="store-name" required>
                <Input
                  id="store-name"
                  placeholder="e.g. Downtown Flagship, Markham Town Square"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={adminInputClass}
                />
              </AdminFormField>
            </div>

            {/* Store Logo */}
            <AdminFormField
              label="Branch Logo"
              htmlFor="store-logo"
              hint="Optional · falls back to the brand badge"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
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
                    <span className="text-[10px] text-muted-foreground">No logo</span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 gap-2">
                  <Input
                    id="store-logo"
                    placeholder="https://… or upload a logo"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className={adminInputClass}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="h-10 shrink-0 gap-1.5 text-xs"
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
            </AdminFormField>
          </AdminFormSection>

          {/* Address & Contact */}
          <AdminFormSection
            step={2}
            icon={MapPin}
            title="Address & Contact"
            description="Physical location used for directions and localized circular delivery."
          >
            <AdminFormField label="Street Address" htmlFor="store-address" required>
              <Input
                id="store-address"
                placeholder="e.g. 100 Main Street, Suite 200"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className={adminInputClass}
              />
            </AdminFormField>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <AdminFormField label="City" htmlFor="store-city" required>
                <Input
                  id="store-city"
                  placeholder="Markham"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className={adminInputClass}
                />
              </AdminFormField>

              <AdminFormField label="Province" htmlFor="store-province">
                <Input
                  id="store-province"
                  placeholder="ON"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className={adminInputClass}
                />
              </AdminFormField>

              <AdminFormField label="Postal Code" htmlFor="store-postal">
                <Input
                  id="store-postal"
                  placeholder="L3R 9M4"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className={adminInputClass}
                />
              </AdminFormField>

              <AdminFormField label="Phone" htmlFor="store-phone">
                <Input
                  id="store-phone"
                  type="tel"
                  placeholder="(905) 555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={adminInputClass}
                />
              </AdminFormField>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <AdminFormField
                label="Privacy Policy URL"
                htmlFor="store-privacy"
                hint="Optional override"
                description="Leave empty to use the franchise policy."
              >
                <Input
                  id="store-privacy"
                  placeholder="https://…"
                  value={privacyPolicyUrl}
                  onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
                  className={adminInputClass}
                />
              </AdminFormField>

              <AdminFormField
                label="Terms & Conditions URL"
                htmlFor="store-terms"
                hint="Optional override"
                description="Leave empty to use the franchise terms."
              >
                <Input
                  id="store-terms"
                  placeholder="https://…"
                  value={termsUrl}
                  onChange={(e) => setTermsUrl(e.target.value)}
                  className={adminInputClass}
                />
              </AdminFormField>
            </div>
          </AdminFormSection>

          {/* Interactive Map */}
          <AdminFormSection
            icon={MapPin}
            title="Map Pin"
            description="Drag or click the map to position this store precisely."
            action={
              <Badge variant="outline" className="font-mono text-[10px]">
                {latitude !== null && longitude !== null
                  ? `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`
                  : "No pin set"}
              </Badge>
            }
          >
            <InteractiveMapPicker
              latitude={latitude}
              longitude={longitude}
              onChange={(newLat, newLng) => {
                setLatitude(newLat);
                setLongitude(newLng);
              }}
              className="h-[420px] w-full overflow-hidden rounded-lg border"
            />
          </AdminFormSection>
        </AdminFormBody>

        <AdminFormFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-9 px-4 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="h-9 gap-1.5 px-5 text-xs font-semibold shadow-xs"
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
        </AdminFormFooter>
      </form>

      {/* Quick Add Franchise Modal */}
      <FranchiseDialog
        open={isAddFranchiseOpen}
        onOpenChange={setIsAddFranchiseOpen}
        onSuccess={(created) => {
          if (onFranchiseCreated) {
            onFranchiseCreated(created);
          }
          setMerchantId(created.id);
        }}
      />
    </AdminFormPage>
  );
}
