import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronsUpDown,
  ImageIcon,
  Loader2,
  Package,
  Store,
  Tag,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createProduct,
  updateProduct,
  uploadImage,
  resolveImageUrl,
  fetchCategories,
  PRODUCT_PRESET_IMAGES,
  type ApiFlyer,
  type ApiProduct,
  type Category,
  type Merchant,
  type ProductOption,
} from "@/lib/api-client";
import {
  AdminFormBody,
  AdminFormField,
  AdminFormFooter,
  AdminFormHeader,
  AdminFormPage,
  AdminFormSection,
  adminInputClass,
  adminSelectTriggerClass,
} from "./AdminFormLayout";
import { ProductOptionsEditor } from "./ProductOptionsEditor";
import { cn } from "@/lib/utils";

interface ProductFormScreenProps {
  product?: ApiProduct | null | undefined;
  merchants: Merchant[];
  /** Products are saved per flyer, so every product must be attached to one. */
  flyers?: ApiFlyer[] | undefined;
  onSave: (product: ApiProduct, isEdit: boolean) => void;
  onCancel: () => void;
}

const COMMON_CATEGORIES = [
  "Produce",
  "Dairy & Eggs",
  "Meat & Seafood",
  "Bakery",
  "Beverages",
  "Snacks",
  "Pantry",
  "Frozen",
  "Health & Beauty",
  "Household",
  "Pharmacy",
  "Electronics",
  "General",
];

export function ProductFormScreen({
  product,
  merchants,
  flyers = [],
  onSave,
  onCancel,
}: ProductFormScreenProps) {
  const isEdit = !!product;

  const [name, setName] = useState(product?.name || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [category, setCategory] = useState(product?.category || "Groceries");
  const [dynamicCategories, setDynamicCategories] = useState<string[]>(COMMON_CATEGORIES);
  const [unit, setUnit] = useState(product?.unit || "Each");
  const [sku, setSku] = useState(product?.sku || "");
  const [upc, setUpc] = useState(product?.upc || "");
  const [options, setOptions] = useState<ProductOption[]>(product?.options ?? []);
  const [flyerId, setFlyerId] = useState(product?.flyerId || flyers[0]?.id || "");
  const [regularPrice, setRegularPrice] = useState(product ? String(product.regularPrice) : "4.99");
  const [offerPrice, setOfferPrice] = useState(product ? String(product.offerPrice) : "3.49");
  const [merchantId, setMerchantId] = useState(product?.merchantId || merchants[0]?.id || "");
  const [description, setDescription] = useState(product?.description || "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || PRODUCT_PRESET_IMAGES[0]?.url || "");

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCategories().then((cats) => {
      const names = cats.map((c) => c.name);
      setDynamicCategories(Array.from(new Set([...names, ...COMMON_CATEGORIES])));
    });
  }, []);

  // Discount % calculation
  const regNum = parseFloat(regularPrice);
  const offNum = parseFloat(offerPrice);
  const hasDiscount = !isNaN(regNum) && !isNaN(offNum) && regNum > offNum && offNum > 0;
  const savingsPct = hasDiscount ? Math.round(((regNum - offNum) / regNum) * 100) : 0;
  const savingsAmount = hasDiscount ? (regNum - offNum).toFixed(2) : "0.00";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await uploadImage(file);
      setImageUrl(res.url);
      toast.success("Image uploaded!");
    } catch (err: any) {
      toast.error(`Image upload failed: ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    if (!flyerId) {
      toast.error("Choose the flyer this product belongs to.");
      return;
    }
    if (isNaN(regNum) || isNaN(offNum)) {
      toast.error("Please enter valid prices.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        brand: brand.trim() || name.trim(),
        category: category.trim() || "General",
        unit: unit.trim() || undefined,
        sku: sku.trim() || null,
        upc: upc.trim() || null,
        options: options
          .map((o) => ({ label: o.label.trim(), value: o.value.trim() }))
          .filter((o) => o.label && o.value),
        flyerId: flyerId || null,
        regularPrice: regularPrice.trim(),
        offerPrice: offerPrice.trim(),
        merchantId: merchantId || undefined,
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
      };

      if (isEdit && product) {
        const updated = await updateProduct(product.id, payload);
        toast.success(`Updated "${updated.name}" successfully!`);
        onSave(updated, true);
      } else {
        const created = await createProduct(payload);
        toast.success(`Created product "${created.name}" successfully!`);
        onSave(created, false);
      }
    } catch (err: any) {
      toast.error(`Failed to save product: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPage>
      <AdminFormHeader
        title={isEdit ? "Edit Product" : "Add Product"}
        description="Product details, retail pricing, deal discount and imagery for flyers and the mobile app."
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
            <>
              {/* Pricing & Deals */}
              <AdminFormSection
                icon={Tag}
                title="Pricing & Deal"
                description="The offer price is highlighted on flyer hotspots with an automatic discount badge."
              >
                <AdminFormField label="Regular Price" htmlFor="prod-reg-price" required>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="prod-reg-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="4.99"
                      value={regularPrice}
                      onChange={(e) => setRegularPrice(e.target.value)}
                      required
                      className={cn(adminInputClass, "pl-7 font-mono")}
                    />
                  </div>
                </AdminFormField>

                <AdminFormField label="Offer Price" htmlFor="prod-off-price" required>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-600">
                      $
                    </span>
                    <Input
                      id="prod-off-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="3.49"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      required
                      className={cn(
                        adminInputClass,
                        "pl-7 font-mono font-semibold text-emerald-600",
                      )}
                    />
                  </div>
                </AdminFormField>

                {hasDiscount ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">
                    <span>
                      Customer saves <strong>${savingsAmount}</strong>
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-emerald-600 text-xs font-bold text-white"
                    >
                      {savingsPct}% OFF
                    </Badge>
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    Set an offer price below the regular price to show a savings badge.
                  </p>
                )}
              </AdminFormSection>

              {/* Assignment */}
              <AdminFormSection
                icon={Store}
                title="Assignment"
                description="Every product belongs to one flyer."
              >
                <AdminFormField label="Flyer" htmlFor="prod-flyer" required>
                  <Select value={flyerId} onValueChange={setFlyerId}>
                    <SelectTrigger id="prod-flyer" className={adminSelectTriggerClass}>
                      <SelectValue placeholder="Select the flyer" />
                    </SelectTrigger>
                    <SelectContent>
                      {flyers.map((f) => (
                        <SelectItem key={f.id} value={f.id} className="text-sm">
                          {f.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </AdminFormField>

                <AdminFormField label="Store / Franchise Brand" htmlFor="merchant-owner">
                  <Select value={merchantId} onValueChange={setMerchantId}>
                    <SelectTrigger id="merchant-owner" className={adminSelectTriggerClass}>
                      <SelectValue placeholder="All brands (universal)" />
                    </SelectTrigger>
                    <SelectContent>
                      {merchants.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-sm">
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </AdminFormField>
              </AdminFormSection>
            </>
          }
        >
          {/* General Information */}
          <AdminFormSection
            icon={Package}
            title="General Information"
            description="Used in catalog search, flyer hotspots and the product sheet."
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <AdminFormField label="Product Name" htmlFor="prod-name" required>
                <Input
                  id="prod-name"
                  placeholder="e.g. Lay's Classic Potato Chips 220g"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={adminInputClass}
                />
              </AdminFormField>

              <AdminFormField label="Brand / Manufacturer" htmlFor="prod-brand">
                <Input
                  id="prod-brand"
                  placeholder="e.g. Lay's, Coca-Cola, Tide"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className={adminInputClass}
                />
              </AdminFormField>

              <AdminFormField label="Category">
                <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={categoryOpen}
                      className="h-10 w-full justify-between px-3 text-sm font-normal"
                    >
                      <span className={cn("truncate", !category && "text-muted-foreground")}>
                        {category || "Select category…"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search category..." className="h-9 text-sm" />
                      <CommandList>
                        <CommandEmpty>No category found.</CommandEmpty>
                        <CommandGroup>
                          {dynamicCategories.map((cat) => (
                            <CommandItem
                              key={cat}
                              value={cat}
                              onSelect={() => {
                                setCategory(cat);
                                setCategoryOpen(false);
                              }}
                              className="flex cursor-pointer items-center justify-between text-sm"
                            >
                              <span>{cat}</span>
                              <Check
                                className={cn(
                                  "h-3.5 w-3.5",
                                  category === cat ? "opacity-100" : "opacity-0",
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

              <AdminFormField label="Unit / Pack Size" htmlFor="prod-unit">
                <Input
                  id="prod-unit"
                  placeholder="e.g. 220g, 1L, Each, 12-pack"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className={adminInputClass}
                />
              </AdminFormField>

              <AdminFormField label="SKU" htmlFor="prod-sku" hint="Optional">
                <Input
                  id="prod-sku"
                  placeholder="e.g. 06563345"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className={cn(adminInputClass, "font-mono")}
                />
              </AdminFormField>

              <AdminFormField label="UPC / Barcode" htmlFor="prod-upc" hint="Optional">
                <Input
                  id="prod-upc"
                  placeholder="e.g. 036000291452"
                  value={upc}
                  onChange={(e) => setUpc(e.target.value)}
                  className={cn(adminInputClass, "font-mono")}
                />
              </AdminFormField>
            </div>

            <ProductOptionsEditor value={options} onChange={setOptions} />
          </AdminFormSection>

          {/* Imagery */}
          <AdminFormSection
            icon={ImageIcon}
            title="Product Imagery & Details"
            description="Pick a preset, upload your own image, or paste an image URL."
          >
            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium">Retail presets</Label>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 xl:grid-cols-8">
                {PRODUCT_PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setImageUrl(preset.url)}
                    title={preset.label}
                    className={cn(
                      "group flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all",
                      imageUrl === preset.url
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border bg-muted/20 hover:border-foreground/30",
                    )}
                  >
                    <img
                      src={resolveImageUrl(preset.url)}
                      alt={preset.label}
                      className="h-12 w-12 rounded object-contain"
                    />
                    <span className="max-w-full truncate text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background">
                {imageUrl ? (
                  <img
                    src={resolveImageUrl(imageUrl)}
                    alt="Preview"
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">No image</span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                <Input
                  id="prod-image"
                  placeholder="https://… or upload an image"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className={cn(adminInputClass, "flex-1")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="h-10 shrink-0 gap-1.5 text-xs"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Upload Image
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            <AdminFormField label="Description" htmlFor="prod-desc" hint="Optional">
              <Textarea
                id="prod-desc"
                placeholder="Highlights shown in the shopper's product detail sheet…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="text-sm"
              />
            </AdminFormField>
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
              <Package className="h-3.5 w-3.5" />
            )}
            {isSubmitting ? "Saving Product..." : isEdit ? "Update Product" : "Create Product"}
          </Button>
        </AdminFormFooter>
      </form>
    </AdminFormPage>
  );
}
