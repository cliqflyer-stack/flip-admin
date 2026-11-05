import React, { useRef, useState } from "react";
import { ArrowLeft, Check, ChevronsUpDown, Loader2, Package, Tag, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  PRODUCT_PRESET_IMAGES,
  type ApiProduct,
  type Merchant,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface ProductFormScreenProps {
  product?: ApiProduct | null;
  merchants: Merchant[];
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
  onSave,
  onCancel,
}: ProductFormScreenProps) {
  const isEdit = !!product;

  const [name, setName] = useState(product?.name || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [category, setCategory] = useState(product?.category || "Groceries");
  const [unit, setUnit] = useState(product?.unit || "Each");
  const [sku, setSku] = useState(product?.sku || "");
  const [regularPrice, setRegularPrice] = useState(product ? String(product.regularPrice) : "4.99");
  const [offerPrice, setOfferPrice] = useState(product ? String(product.offerPrice) : "3.49");
  const [merchantId, setMerchantId] = useState(product?.merchantId || merchants[0]?.id || "");
  const [description, setDescription] = useState(product?.description || "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || PRODUCT_PRESET_IMAGES[0].url);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        sku: sku.trim() || undefined,
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
              {isEdit ? "Edit Product" : "Add Product"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Configure product details, retail pricing, savings deals, and imagery for flyers and mobile app.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Core Product Information */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">General Information</CardTitle>
            <CardDescription className="text-xs">
              Essential product details used in catalog search and flyer hotspots.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prod-name" className="text-xs font-medium">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="prod-name"
                  placeholder="e.g. Lay's Classic Potato Chips 220g"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-brand" className="text-xs font-medium">
                  Brand / Manufacturer
                </Label>
                <Input
                  id="prod-brand"
                  placeholder="e.g. Lay's, Coca-Cola, Tide"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Category Searchable Combobox */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Category</Label>
                <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={categoryOpen}
                      className="w-full justify-between h-9 text-xs"
                    >
                      {category || "Select category..."}
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search category..." className="h-9 text-xs" />
                      <CommandList>
                        <CommandEmpty>No category found.</CommandEmpty>
                        <CommandGroup>
                          {COMMON_CATEGORIES.map((cat) => (
                            <CommandItem
                              key={cat}
                              value={cat}
                              onSelect={() => {
                                setCategory(cat);
                                setCategoryOpen(false);
                              }}
                              className="text-xs cursor-pointer flex items-center justify-between"
                            >
                              <span>{cat}</span>
                              <Check
                                className={cn(
                                  "h-3.5 w-3.5",
                                  category === cat ? "opacity-100" : "opacity-0"
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

              <div className="space-y-1.5">
                <Label htmlFor="prod-unit" className="text-xs font-medium">
                  Unit / Pack Size
                </Label>
                <Input
                  id="prod-unit"
                  placeholder="e.g. 220g, 1L, Each, 12-pack"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-sku" className="text-xs font-medium">
                  SKU / Barcode
                </Label>
                <Input
                  id="prod-sku"
                  placeholder="e.g. 06563345"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="merchant-owner" className="text-xs font-medium">
                Store / Franchise Brand
              </Label>
              <Select value={merchantId} onValueChange={setMerchantId}>
                <SelectTrigger id="merchant-owner" className="text-xs h-9">
                  <SelectValue placeholder="All Brands (Universal)" />
                </SelectTrigger>
                <SelectContent>
                  {merchants.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Deals Card */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Pricing & Deal Discounts</CardTitle>
            <CardDescription className="text-xs">
              Offer price is displayed prominently on flyer hotspots with automatic discount badges.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prod-reg-price" className="text-xs font-medium">
                  Regular Price ($) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input
                    id="prod-reg-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="4.99"
                    value={regularPrice}
                    onChange={(e) => setRegularPrice(e.target.value)}
                    required
                    className="pl-7 text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-off-price" className="text-xs font-medium">
                  Offer / Deal Price ($) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground font-semibold text-emerald-600">
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
                    className="pl-7 text-xs h-9 font-semibold text-emerald-600"
                  />
                </div>
              </div>
            </div>

            {hasDiscount && (
              <div className="p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/20 flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                <span className="font-medium">
                  Calculated Customer Savings: <strong>${savingsAmount}</strong>
                </span>
                <Badge variant="secondary" className="bg-emerald-600 text-white font-bold text-xs">
                  {savingsPct}% OFF DEAL
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Imagery & Product Thumbnail Card */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Product Imagery</CardTitle>
            <CardDescription className="text-xs">
              Select from high-resolution preset items, upload a custom image, or provide a URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Preset Thumbnails */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground block">
                Quick Retail Presets:
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PRODUCT_PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setImageUrl(preset.url)}
                    className={cn(
                      "flex flex-col items-center rounded-lg border p-1.5 transition-all text-center group",
                      imageUrl === preset.url
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                        : "border-border hover:border-foreground/30 bg-muted/20"
                    )}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="h-10 w-10 object-contain rounded"
                    />
                    <span className="text-[10px] truncate max-w-full font-medium mt-1 text-muted-foreground group-hover:text-foreground">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL or Upload */}
            <div className="flex items-center gap-3 pt-2">
              <div className="h-16 w-16 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                {imageUrl ? (
                  <img
                    src={resolveImageUrl(imageUrl)}
                    alt="Preview"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span className="text-muted-foreground text-[10px]">No image</span>
                )}
              </div>

              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="https://... or upload custom image"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="text-xs h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="h-9 text-xs gap-1.5 shrink-0"
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

            <div className="space-y-1.5 pt-2">
              <Label htmlFor="prod-desc" className="text-xs font-medium">
                Product Description
              </Label>
              <Textarea
                id="prod-desc"
                placeholder="Product description and highlights displayed in the shopper detail bottom sheet..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="text-xs"
              />
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
              <Package className="h-3.5 w-3.5" />
            )}
            {isSubmitting
              ? "Saving Product..."
              : isEdit
              ? "Update Product"
              : "Create Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
