import React, { useState, useEffect, useRef } from "react";
import {
  ImagePlus,
  Loader2,
  Package,
  Sparkles,
  Tag,
  Upload,
  Check,
  Percent,
} from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createProduct,
  updateProduct,
  uploadImage,
  resolveImageUrl,
  PRODUCT_PRESET_IMAGES,
  type ApiProduct,
  type Merchant,
} from "@/lib/api-client";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productToEdit?: ApiProduct | null;
  merchants: Merchant[];
  defaultMerchantId?: string;
  onSave: (product: ApiProduct, isEdit: boolean) => void;
}

const CATEGORY_SUGGESTIONS = [
  "Groceries",
  "Beverages",
  "Snacks",
  "Dairy",
  "Personal Care",
  "Health & Vitamins",
  "Produce",
  "Household",
  "Frozen",
  "Bakery",
];

const UNIT_SUGGESTIONS = ["each", "pack", "354 mL", "500 g", "kg", "lb", "280 tablets", "12 cans"];

export function ProductDialog({
  open,
  onOpenChange,
  productToEdit,
  merchants,
  defaultMerchantId,
  onSave,
}: ProductDialogProps) {
  const isEdit = Boolean(productToEdit);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [unit, setUnit] = useState("each");
  const [sku, setSku] = useState("");
  const [regularPrice, setRegularPrice] = useState("9.99");
  const [offerPrice, setOfferPrice] = useState("6.99");
  const [description, setDescription] = useState("");
  const [merchantId, setMerchantId] = useState(defaultMerchantId || merchants[0]?.id || "");
  const [imageUrl, setImageUrl] = useState(PRODUCT_PRESET_IMAGES[0].url);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageTab, setImageTab] = useState<"preset" | "upload" | "url">("preset");

  // Reset or fill form when opening / changing product
  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || "");
      setBrand(productToEdit.brand || "");
      setCategory(productToEdit.category || "Groceries");
      setUnit(productToEdit.unit || "each");
      setSku(productToEdit.sku || "");
      setRegularPrice(String(productToEdit.regularPrice || "0.00"));
      setOfferPrice(String(productToEdit.offerPrice || "0.00"));
      setDescription(productToEdit.description || "");
      setMerchantId(productToEdit.merchantId || merchants[0]?.id || "");
      setImageUrl(productToEdit.imageUrl || PRODUCT_PRESET_IMAGES[0].url);
      setImageTab(productToEdit.imageUrl?.startsWith("http") ? "url" : "preset");
    } else {
      setName("");
      setBrand("");
      setCategory("Groceries");
      setUnit("each");
      setSku("");
      setRegularPrice("9.99");
      setOfferPrice("6.99");
      setDescription("");
      setMerchantId(defaultMerchantId || merchants[0]?.id || "");
      setImageUrl(PRODUCT_PRESET_IMAGES[0].url);
      setImageTab("preset");
    }
  }, [productToEdit, open, defaultMerchantId, merchants]);

  const regNum = parseFloat(regularPrice) || 0;
  const offNum = parseFloat(offerPrice) || 0;
  const savingsPercent = regNum > offNum && regNum > 0 ? Math.round(((regNum - offNum) / regNum) * 100) : 0;

  // Handle local file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, WebP)");
      return;
    }

    setIsUploading(true);
    try {
      const res = await uploadImage(file);
      setImageUrl(res.url);
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      toast.error(`Image upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }

    if (!imageUrl.trim()) {
      toast.error("Product image is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<ApiProduct> = {
        name: name.trim(),
        brand: brand.trim(),
        category: category.trim() || "General",
        unit: unit.trim() || "each",
        sku: sku.trim() || undefined,
        regularPrice: regNum,
        offerPrice: offNum,
        description: description.trim() || `${brand.trim()} ${name.trim()} promotional deal item.`,
        merchantId: merchantId || undefined,
        imageUrl: imageUrl.trim(),
      };

      if (isEdit && productToEdit) {
        const updated = await updateProduct(productToEdit.id, payload);
        toast.success(`Product "${updated.name}" updated in Neon Postgres!`);
        onSave(updated, true);
      } else {
        const created = await createProduct(payload);
        toast.success(`Product "${created.name}" created and added to catalog!`);
        onSave(created, false);
      }

      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Failed to save product: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-bold">
                {isEdit ? "Edit Product Item" : "Create New Product"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              {isEdit
                ? "Update product details, pricing, discount, and image in Neon Postgres."
                : "Add a retail item to the catalog to map onto digital circulars and deals."}
            </DialogDescription>
          </DialogHeader>

          {/* Product Image Section */}
          <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Product Image</span>
              {imageUrl && (
                <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[220px]">
                  {imageUrl}
                </span>
              )}
            </Label>

            <div className="flex items-start gap-3">
              {/* Image Preview Box */}
              <div className="relative h-20 w-20 shrink-0 rounded-md border bg-background overflow-hidden flex items-center justify-center shadow-xs">
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : imageUrl ? (
                  <img
                    src={resolveImageUrl(imageUrl)}
                    alt="Product Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = PRODUCT_PRESET_IMAGES[0].url;
                    }}
                  />
                ) : (
                  <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>

              {/* Image Source Tabs */}
              <div className="flex-1 space-y-2">
                <Tabs value={imageTab} onValueChange={(v: any) => setImageTab(v)} className="w-full">
                  <TabsList className="grid grid-cols-3 h-7 text-xs">
                    <TabsTrigger value="preset" className="text-[11px] py-1">Presets</TabsTrigger>
                    <TabsTrigger value="upload" className="text-[11px] py-1">Upload File</TabsTrigger>
                    <TabsTrigger value="url" className="text-[11px] py-1">Image URL</TabsTrigger>
                  </TabsList>

                  {/* Preset Gallery */}
                  <TabsContent value="preset" className="pt-2">
                    <div className="grid grid-cols-4 gap-1.5 max-h-24 overflow-y-auto p-1">
                      {PRODUCT_PRESET_IMAGES.map((preset) => (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => setImageUrl(preset.url)}
                          className={`flex flex-col items-center p-1 rounded border text-[10px] transition-all ${
                            imageUrl === preset.url
                              ? "border-primary bg-primary/10 font-bold"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          <img
                            src={resolveImageUrl(preset.url)}
                            alt={preset.label}
                            className="h-7 w-7 object-cover rounded"
                          />
                          <span className="truncate w-full text-center mt-0.5">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Upload File */}
                  <TabsContent value="upload" className="pt-2">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed rounded-md p-3 text-center cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <Upload className="h-4 w-4 mx-auto text-primary mb-1" />
                      <span className="text-xs font-medium text-foreground">
                        {isUploading ? "Uploading..." : "Click to select image file"}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, WebP up to 5MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                  </TabsContent>

                  {/* URL Input */}
                  <TabsContent value="url" className="pt-2">
                    <Input
                      placeholder="https://example.com/item-image.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>

          {/* Core Info Fields */}
          <div className="space-y-3 text-xs">
            {/* Title & Brand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prod-name" className="text-xs font-semibold">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="prod-name"
                  placeholder="e.g. Lay's Classic Potato Chips 220g"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="prod-brand" className="text-xs font-semibold">
                  Brand / Manufacturer
                </Label>
                <Input
                  id="prod-brand"
                  placeholder="e.g. Frito-Lay, Coca-Cola, Tide"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Category & Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-1">
                <Label htmlFor="prod-cat" className="text-xs font-semibold">
                  Category
                </Label>
                <Input
                  id="prod-cat"
                  placeholder="e.g. Groceries"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  list="category-options"
                  className="text-xs"
                />
                <datalist id="category-options">
                  {CATEGORY_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <Label htmlFor="prod-unit" className="text-xs font-semibold">
                  Unit / Size
                </Label>
                <Input
                  id="prod-unit"
                  placeholder="e.g. each, 354 mL, kg"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  list="unit-options"
                  className="text-xs"
                />
                <datalist id="unit-options">
                  {UNIT_SUGGESTIONS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <Label htmlFor="prod-sku" className="text-xs font-semibold">
                  SKU / Barcode (Optional)
                </Label>
                <Input
                  id="prod-sku"
                  placeholder="e.g. 06563345"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {/* Pricing Section */}
            <div className="rounded-lg border p-3 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  Pricing & Deals
                </Label>
                {savingsPercent > 0 && (
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                    <Percent className="h-3 w-3 mr-0.5" />
                    {savingsPercent}% OFF Deal
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="prod-reg" className="text-[11px] text-muted-foreground font-medium">
                    Regular Price ($)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">$</span>
                    <Input
                      id="prod-reg"
                      type="number"
                      step="0.01"
                      min="0"
                      value={regularPrice}
                      onChange={(e) => setRegularPrice(e.target.value)}
                      required
                      className="pl-6 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="prod-off" className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    Offer / Flyer Deal Price ($)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs text-emerald-600 font-bold">$</span>
                    <Input
                      id="prod-off"
                      type="number"
                      step="0.01"
                      min="0"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      required
                      className="pl-6 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Merchant / Store Franchise */}
            <div className="space-y-1">
              <Label htmlFor="prod-merchant" className="text-xs font-semibold">
                Franchise Brand
              </Label>
              <Select value={merchantId} onValueChange={setMerchantId}>
                <SelectTrigger id="prod-merchant" className="text-xs">
                  <SelectValue placeholder="Select brand franchise" />
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

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="prod-desc" className="text-xs font-semibold">
                Product Description (Optional)
              </Label>
              <Textarea
                id="prod-desc"
                rows={2}
                placeholder="Product description shown in deal popups and details sheet..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || isUploading}
              className="bg-primary text-primary-foreground font-semibold text-xs"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1.5" />
              )}
              {isSubmitting
                ? "Saving..."
                : isEdit
                ? "Update Product"
                : "Save & Add to Catalog"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
