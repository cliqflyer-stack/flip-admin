import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Loader2,
  Store,
  Layers,
  Eye,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  createFlyer,
  createProduct,
  saveHotspotsBatch,
  uploadImage,
  getRelativeDateString,
  toEndOfDayIso,
  type ApiFlyer,
  type Merchant,
  type StoreLocation,
} from "@/lib/api-client";
import {
  generateFlyerFromProducts,
  SheetProductRow,
  GeneratedFlyerOutput,
} from "@/lib/flyer-generator";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchants: Merchant[];
  storeLocations: StoreLocation[];
  onFlyerGenerated: (flyer: ApiFlyer) => void;
}

export function GenerateFlyerFromSheetDialog({
  open,
  onOpenChange,
  merchants,
  storeLocations,
  onFlyerGenerated,
}: Props) {
  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [fileName, setFileName] = useState("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);

  // Column mappings
  const [colName, setColName] = useState("");
  const [colOfferPrice, setColOfferPrice] = useState("");
  const [colRegularPrice, setColRegularPrice] = useState("");
  const [colBrand, setColBrand] = useState("");
  const [colUnit, setColUnit] = useState("");
  const [colCategory, setColCategory] = useState("");
  const [colBadge, setColBadge] = useState("");
  const [colImageUrl, setColImageUrl] = useState("");

  // Flyer configs
  const [merchantId, setMerchantId] = useState(merchants[0]?.id || "");
  const [storeLocationId, setStoreLocationId] = useState("all");
  const [flyerTitle, setFlyerTitle] = useState("Weekly Circular Specials");
  const [flyerSubtitle, setFlyerSubtitle] = useState("Limited Time Offers · In-Store & Online");
  const [validDays, setValidDays] = useState(7);
  const [gridDensity, setGridDensity] = useState<"6" | "8">("6");

  // Generated output
  const [generatedOutput, setGeneratedOutput] = useState<GeneratedFlyerOutput | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedMerchant = merchants.find((m) => m.id === merchantId) || merchants[0];
  const merchantStores = storeLocations.filter((s) => s.merchantId === merchantId);

  // Auto-detect matching column names
  const autoDetectColumns = (headers: string[]) => {
    const findMatch = (keywords: string[]) => {
      return (
        headers.find((h) =>
          keywords.some((k) => h.toLowerCase().trim() === k.toLowerCase().trim())
        ) ||
        headers.find((h) =>
          keywords.some((k) => h.toLowerCase().includes(k.toLowerCase()))
        ) ||
        ""
      );
    };

    setColName(findMatch(["name", "product_name", "product", "title", "item", "item_name"]));
    setColOfferPrice(
      findMatch(["offer_price", "offer price", "sale_price", "deal_price", "discount_price", "price"])
    );
    setColRegularPrice(
      findMatch(["regular_price", "regular price", "original_price", "mrp", "retail_price", "list_price"])
    );
    setColBrand(findMatch(["brand", "manufacturer", "make"]));
    setColUnit(findMatch(["unit", "size", "pack", "weight"]));
    setColCategory(findMatch(["category", "dept", "department"]));
    setColBadge(findMatch(["badge", "tag", "discount", "promo", "deal_tag"]));
    setColImageUrl(findMatch(["image", "image_url", "photo", "picture", "thumbnail", "img"]));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (data.length < 2) {
          toast.error("Spreadsheet is empty or has no data rows.");
          return;
        }

        const headers = (data[0] || []).map((h) => String(h).trim()).filter(Boolean);
        const rows = XLSX.utils.sheet_to_json(ws);

        setRawHeaders(headers);
        setRawRows(rows);
        autoDetectColumns(headers);
        setStep("mapping");
        toast.success(`Loaded ${rows.length} product rows from ${file.name}`);
      } catch (err: any) {
        toast.error(`Failed to parse file: ${err.message}`);
      }
    };

    reader.readAsBinaryString(file);
  };

  const getMappedProducts = (): SheetProductRow[] => {
    return rawRows.map((row) => {
      const rawOffer = colOfferPrice ? row[colOfferPrice] : null;
      const rawReg = colRegularPrice ? row[colRegularPrice] : null;

      const offerPrice = typeof rawOffer === "number" ? rawOffer : parseFloat(String(rawOffer || "").replace(/[^0-9.]/g, "")) || 4.99;
      const regularPrice = typeof rawReg === "number" ? rawReg : parseFloat(String(rawReg || "").replace(/[^0-9.]/g, "")) || Number((offerPrice * 1.3).toFixed(2));

      return {
        name: colName ? String(row[colName] || "Special Deal") : "Special Deal",
        brand: colBrand ? String(row[colBrand] || "") : "",
        description: "",
        offerPrice,
        regularPrice,
        unit: colUnit ? String(row[colUnit] || "") : "",
        category: colCategory ? String(row[colCategory] || "General") : "General",
        badgeText: colBadge ? String(row[colBadge] || "") : "",
        imageUrl: colImageUrl ? String(row[colImageUrl] || "") : undefined,
      };
    });
  };

  const handleGeneratePreview = async () => {
    if (!colName) {
      toast.error("Please select the Product Name column.");
      return;
    }
    if (!colOfferPrice) {
      toast.error("Please select the Offer Price column.");
      return;
    }

    setIsProcessing(true);
    try {
      const products = getMappedProducts();
      const output = await generateFlyerFromProducts(products, {
        title: flyerTitle,
        subtitle: flyerSubtitle,
        merchantName: selectedMerchant?.name || "Retail Superstore",
        merchantLogoBg: selectedMerchant?.logoBg,
        merchantLogoColor: selectedMerchant?.logoColor,
        validityText: `Valid next ${validDays} days`,
        gridColumns: 2,
        gridRows: gridDensity === "8" ? 4 : 3,
      });

      setGeneratedOutput(output);
      setPreviewDataUrl(output.canvas.toDataURL("image/jpeg", 0.9));
      setStep("preview");
      toast.success("Generated high-resolution 9:16 flyer circular!");
    } catch (err: any) {
      toast.error(`Generation failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAndOpenFlyer = async () => {
    if (!generatedOutput) return;

    setIsProcessing(true);
    try {
      // 1. Upload generated flyer image file
      const uploadRes = await uploadImage(generatedOutput.file);
      const flyerImageUrl = uploadRes.url;

      // 2. Create products in database and collect product IDs
      const mappedProducts = getMappedProducts().slice(0, generatedOutput.slots.length);
      const productIds: string[] = [];

      for (const p of mappedProducts) {
        const createdProd = await createProduct({
          merchantId: selectedMerchant?.id,
          name: p.name,
          brand: p.brand || "",
          description: p.description || "Generated from product sheet",
          regularPrice: String(p.regularPrice),
          offerPrice: String(p.offerPrice),
          unit: p.unit || "each",
          category: p.category || "General",
          imageUrl: p.imageUrl || flyerImageUrl,
        });
        productIds.push(createdProd.id);
      }

      // 3. Create Flyer record
      const expiryIso = toEndOfDayIso(getRelativeDateString(validDays));
      const createdFlyer = await createFlyer({
        merchantId: selectedMerchant?.id || "merch_drug_mart",
        storeLocationId: storeLocationId === "all" ? null : storeLocationId,
        title: flyerTitle,
        subtitle: flyerSubtitle,
        badgeText: "NEW",
        badgeVariant: "lime",
        flyerImageUrl,
        aspectRatio: 1.7778,
        status: "published",
        pageCount: 1,
        validTo: expiryIso,
      });

      // 4. Batch create hotspots with exact computed grid slot coordinates!
      const hotspotItems = generatedOutput.slots.map((slot, idx) => ({
        productId: productIds[idx] || productIds[0],
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
        titleOverride: slot.product.name,
        priceOverride: String(slot.product.offerPrice),
      }));

      await saveHotspotsBatch(createdFlyer.id, hotspotItems);

      toast.success(`🎉 Flyer created with ${hotspotItems.length} mapped interactive hotspots!`);
      onOpenChange(false);
      onFlyerGenerated(createdFlyer);
    } catch (err: any) {
      toast.error(`Failed to publish flyer: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setStep("upload");
    setRawHeaders([]);
    setRawRows([]);
    setFileName("");
    setGeneratedOutput(null);
    setPreviewDataUrl(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetAll();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold">
                Generate Digital Circular from Products Spreadsheet
              </DialogTitle>
              <DialogDescription className="text-xs">
                Upload raw Excel (.xlsx, .xls) or CSV with your promotional products. Automatically renders a 9:16 mobile circular and maps exact hotspot areas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* STEP 1: UPLOAD SPREADSHEET */}
        {step === "upload" && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-10 max-w-lg w-full flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/60 transition-colors bg-muted/20 hover:bg-muted/40"
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Upload className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold">Select Products Spreadsheet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Supports Excel (.xlsx, .xls) and CSV (.csv) files with columns for Title, Price, Brand, etc.
              </p>
              <Button size="sm" className="mt-4 gap-2 text-xs font-medium">
                <FileSpreadsheet className="h-4 w-4" />
                Browse File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Smart Column Detection automatically maps headers like "Product", "Offer Price", "Brand", etc.</span>
            </div>
          </div>
        )}

        {/* STEP 2: COLUMN MAPPING & FLYER SETTINGS */}
        {step === "mapping" && (
          <div className="flex-1 overflow-y-auto py-3 space-y-5">
            {/* File info banner */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border text-xs">
              <div className="flex items-center gap-2 truncate">
                <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold truncate">{fileName}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {rawRows.length} items found
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("upload")}
                className="h-6 text-xs text-muted-foreground hover:text-foreground"
              >
                Change File
              </Button>
            </div>

            {/* Column Mapping Selectors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  1. Map Spreadsheet Columns
                </h4>
                <span className="text-[11px] text-muted-foreground">* Required fields</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    Product Title *
                  </Label>
                  <Select value={colName} onValueChange={setColName}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawHeaders.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    Offer Price *
                  </Label>
                  <Select value={colOfferPrice} onValueChange={setColOfferPrice}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawHeaders.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Regular Price</Label>
                  <Select value={colRegularPrice} onValueChange={setColRegularPrice}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs italic">-- None (Auto-calc) --</SelectItem>
                      {rawHeaders.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Brand</Label>
                  <Select value={colBrand} onValueChange={setColBrand}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs italic">-- None --</SelectItem>
                      {rawHeaders.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Unit (e.g. lb, each)</Label>
                  <Select value={colUnit} onValueChange={setColUnit}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs italic">-- None --</SelectItem>
                      {rawHeaders.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={colCategory} onValueChange={setColCategory}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs italic">-- None --</SelectItem>
                      {rawHeaders.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Discount / Badge</Label>
                  <Select value={colBadge} onValueChange={setColBadge}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs italic">-- Auto-calculate --</SelectItem>
                      {rawHeaders.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Product Image URL</Label>
                  <Select value={colImageUrl} onValueChange={setColImageUrl}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs italic">-- None (Placeholder) --</SelectItem>
                      {rawHeaders.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Flyer Theme & Store Settings */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
                2. Circular Details &amp; Retail Brand
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Retail Brand *</Label>
                  <Select value={merchantId} onValueChange={setMerchantId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
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

                <div className="space-y-1">
                  <Label className="text-xs">Store Branch</Label>
                  <Select value={storeLocationId} onValueChange={setStoreLocationId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Chain-wide (All Stores)</SelectItem>
                      {merchantStores.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.name} ({s.city})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Circular Density</Label>
                  <Select value={gridDensity} onValueChange={(v: any) => setGridDensity(v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6" className="text-xs">6 Items (2 cols × 3 rows)</SelectItem>
                      <SelectItem value="8" className="text-xs">8 Items (2 cols × 4 rows)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Flyer Title</Label>
                  <Input
                    value={flyerTitle}
                    onChange={(e) => setFlyerTitle(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="e.g. Weekly Super Savings"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Subtitle / Callout</Label>
                  <Input
                    value={flyerSubtitle}
                    onChange={(e) => setFlyerSubtitle(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="e.g. Live In-Store Deals"
                  />
                </div>
              </div>
            </div>

            {/* First 3 Rows Preview */}
            <div className="space-y-1.5 border-t pt-2">
              <Label className="text-[11px] text-muted-foreground font-semibold">
                Sample preview (first 3 rows mapped):
              </Label>
              <div className="border rounded-md divide-y text-xs">
                {rawRows.slice(0, 3).map((r, i) => (
                  <div key={i} className="p-2 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-foreground">
                        {colName ? r[colName] || `Row #${i + 1}` : `Row #${i + 1}`}
                      </span>
                      {colBrand && r[colBrand] && (
                        <span className="text-muted-foreground ml-2">({r[colBrand]})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-600">
                        ${colOfferPrice ? r[colOfferPrice] : "4.99"}
                      </span>
                      {colRegularPrice && r[colRegularPrice] && (
                        <span className="line-through text-muted-foreground text-[11px]">
                          ${r[colRegularPrice]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW GENERATED 9:16 FLYER */}
        {step === "preview" && previewDataUrl && (
          <div className="flex-1 overflow-y-auto py-2 flex flex-col md:flex-row gap-6 items-center justify-center">
            <div className="h-[460px] aspect-[9/16] rounded-xl overflow-hidden border shadow-lg relative bg-white shrink-0">
              <img
                src={previewDataUrl}
                alt="Generated Flyer"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="space-y-4 max-w-sm">
              <div className="space-y-1">
                <Badge className="bg-emerald-600 text-[10px]">Ready to Publish</Badge>
                <h3 className="text-base font-bold">{flyerTitle}</h3>
                <p className="text-xs text-muted-foreground">{flyerSubtitle}</p>
              </div>

              <div className="p-3 bg-muted/30 border rounded-lg space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Brand:</span>
                  <span className="font-semibold">{selectedMerchant?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mapped Products:</span>
                  <span className="font-semibold">{generatedOutput?.slots.length} items</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hotspot Areas:</span>
                  <span className="font-semibold text-primary">Exact 0..1 coordinates pre-computed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format:</span>
                  <span>1080 × 1920 (9:16 Mobile Standard)</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Upon saving, this digital circular will be published, products registered in your catalog, and all hotspots pre-mapped in the canvas editor.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="border-t pt-3 flex items-center justify-between">
          {step === "mapping" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("upload")}
              className="h-8 text-xs gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </Button>
          )}

          {step === "preview" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("mapping")}
              className="h-8 text-xs gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Edit Mappings</span>
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>

            {step === "mapping" && (
              <Button
                size="sm"
                onClick={handleGeneratePreview}
                disabled={isProcessing}
                className="h-8 text-xs gap-1.5 font-semibold"
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span>Generate Flyer</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}

            {step === "preview" && (
              <Button
                size="sm"
                onClick={handleSaveAndOpenFlyer}
                disabled={isProcessing}
                className="h-8 text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>Publish Flyer &amp; Open in Studio</span>
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
