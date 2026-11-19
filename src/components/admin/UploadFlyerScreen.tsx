import React, { useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Calendar,
  CheckCircle2,
  Clock,
  ImagePlus,
  Info,
  Loader2,
  MapPin,
  Sparkles,
  Upload,
  AlertTriangle,
  Crop,
  Smartphone,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  createFlyer,
  uploadImage,
  toEndOfDayIso,
  toStartOfDayIso,
  getRelativeDateString,
  getEndOfCurrentMonthString,
  type ApiFlyer,
  type Merchant,
  type StoreLocation,
} from "@/lib/api-client";
import { FlyerCropDialog } from "./FlyerCropDialog";
import {
  evaluateFlyerSizing,
  RECOMMENDED_FLYER_WIDTH,
  RECOMMENDED_FLYER_HEIGHT,
  RECOMMENDED_FLYER_ASPECT_RATIO,
  loadImageElement,
  renderFlyerToCanvas,
  canvasToFile,
  type SizingEvaluation,
} from "@/lib/flyer-sizing";

interface UploadFlyerScreenProps {
  merchants: Merchant[];
  storeLocations: StoreLocation[];
  onFlyerCreated: (flyer: ApiFlyer) => void;
  onCancel: () => void;
}

export function UploadFlyerScreen({
  merchants,
  storeLocations,
  onFlyerCreated,
  onCancel,
}: UploadFlyerScreenProps) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("Weekly Deals · Live Circular");
  const [badgeText, setBadgeText] = useState("NEW");
  const [badgeVariant, setBadgeVariant] = useState("lime");
  const [merchantId, setMerchantId] = useState(merchants[0]?.id || "merch_drug_mart");
  const [storeLocationId, setStoreLocationId] = useState("all");

  const [validFrom, setValidFrom] = useState<string>("");
  const [validTo, setValidTo] = useState<string>(getRelativeDateString(7)); // Default 7 days

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [sizingEval, setSizingEval] = useState<SizingEvaluation | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoFitting, setIsAutoFitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApplyPreset = (days: number | "month" | "clear") => {
    if (days === "clear") {
      setValidTo("");
      toast.info("Cleared expiry date (never expires).");
      return;
    }
    if (days === "month") {
      const eom = getEndOfCurrentMonthString();
      setValidTo(eom);
      toast.info(`Expiry set to end of month (${eom}).`);
      return;
    }
    const futureDate = getRelativeDateString(days);
    setValidTo(futureDate);
    toast.info(`Expiry set to +${days} days (${futureDate}).`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Calculate natural image dimensions & assess mobile 9:16 compatibility
    const img = new Image();
    img.onload = () => {
      const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
      setImgDimensions(dimensions);

      const evaluation = evaluateFlyerSizing(dimensions.width, dimensions.height);
      setSizingEval(evaluation);

      if (!evaluation.isMatch) {
        toast.warning(
          `Image aspect ratio (${evaluation.aspectRatio.toFixed(2)}) deviates from mobile 9:16 standard. Use Crop/Resize to optimize.`,
          { duration: 5000 }
        );
      } else {
        toast.success("Image matches 9:16 Mobile Standard (1080 × 1920)!", { duration: 3000 });
      }
    };
    img.src = objectUrl;

    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
    }
  };

  const handleApplyCrop = (result: {
    file: File;
    previewUrl: string;
    width: number;
    height: number;
    aspectRatio: number;
  }) => {
    setSelectedFile(result.file);
    setPreviewUrl(result.previewUrl);
    setImgDimensions({ width: result.width, height: result.height });

    const evaluation = evaluateFlyerSizing(result.width, result.height);
    setSizingEval(evaluation);
  };

  const handleQuickAutoFit = async () => {
    if (!selectedFile || !previewUrl) return;

    setIsAutoFitting(true);
    try {
      const img = await loadImageElement(selectedFile);
      const canvas = renderFlyerToCanvas(img, {
        mode: "fit",
        targetWidth: RECOMMENDED_FLYER_WIDTH,
        targetHeight: RECOMMENDED_FLYER_HEIGHT,
        backgroundColor: "#FFFFFF",
      });

      const cleanFilename = selectedFile.name.replace(/\.[^/.]+$/, "") + "-autofit-9x16.jpg";
      const fittedFile = await canvasToFile(canvas, cleanFilename, 0.92);
      const newPreviewUrl = URL.createObjectURL(fittedFile);

      setSelectedFile(fittedFile);
      setPreviewUrl(newPreviewUrl);
      setImgDimensions({ width: RECOMMENDED_FLYER_WIDTH, height: RECOMMENDED_FLYER_HEIGHT });

      const evaluation = evaluateFlyerSizing(RECOMMENDED_FLYER_WIDTH, RECOMMENDED_FLYER_HEIGHT);
      setSizingEval(evaluation);

      toast.success("Flyer auto-fitted to 1080 × 1920 px (9:16) with 100% content preserved!");
    } catch (err: any) {
      toast.error(`Auto-fit failed: ${err.message}`);
    } finally {
      setIsAutoFitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a flyer image file to upload.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a title for the flyer.");
      return;
    }
    if (validFrom && validTo && new Date(validFrom) > new Date(validTo)) {
      toast.error("Valid From date cannot be after Expiry Date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadRes = await uploadImage(selectedFile);
      const aspectRatio =
        imgDimensions && imgDimensions.width > 0
          ? Number((imgDimensions.height / imgDimensions.width).toFixed(4))
          : RECOMMENDED_FLYER_ASPECT_RATIO;

      const created = await createFlyer({
        merchantId,
        storeLocationId: storeLocationId === "all" ? undefined : storeLocationId,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        badgeText: badgeText.trim() || undefined,
        badgeVariant,
        flyerImageUrl: uploadRes.url,
        aspectRatio,
        status: "published",
        pageCount: 1,
        validFrom: validFrom ? toStartOfDayIso(validFrom) : undefined,
        validTo: validTo ? toEndOfDayIso(validTo) : undefined,
      });

      toast.success(`"${created.title}" published! Opening in Interactive Studio...`);
      onFlyerCreated(created);
    } catch (err: any) {
      toast.error(`Flyer upload failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLocations = storeLocations.filter((l) => l.merchantId === merchantId);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
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
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Upload Digital Circular
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono text-primary gap-1">
                <Smartphone className="h-3 w-3" />
                9:16 Mobile Standard
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Publish a new flyer image, set validity dates, format to mobile dimensions, and map interactive hotspots.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Franchise and Branch Assignment */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">1. Franchise Brand &amp; Location</CardTitle>
            <CardDescription className="text-xs">
              Assign this digital circular to a franchise brand and an optional specific branch.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="merchant-select" className="text-xs font-medium">
                  Brand / Franchise <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={merchantId}
                  onValueChange={(val) => {
                    setMerchantId(val);
                    setStoreLocationId("all");
                  }}
                >
                  <SelectTrigger id="merchant-select" className="h-8 text-xs">
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {merchants.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold"
                            style={{ backgroundColor: m.logoBg, color: m.logoColor }}
                          >
                            {m.initial}
                          </span>
                          <span>{m.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location-select" className="text-xs font-medium">
                  Store Branch Assignment
                </Label>
                <Select value={storeLocationId} onValueChange={setStoreLocationId}>
                  <SelectTrigger id="location-select" className="h-8 text-xs">
                    <SelectValue placeholder="Chain-wide (All Stores)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-semibold">
                      Chain-wide (All Branches)
                    </SelectItem>
                    {filteredLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id} className="text-xs">
                        {loc.name} ({loc.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="flyer-title" className="text-xs font-medium">
                Flyer Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="flyer-title"
                placeholder="e.g. Weekly Grocery Deals & Specials"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-8 text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="flyer-subtitle" className="text-xs font-medium">
                  Subtitle / Valid Offer Text
                </Label>
                <Input
                  id="flyer-subtitle"
                  placeholder="e.g. Prices valid Thursday through Wednesday"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="flyer-badge" className="text-xs font-medium">
                  Highlight Pill
                </Label>
                <Input
                  id="flyer-badge"
                  placeholder="e.g. NEW, 50% OFF, WEEKLY"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validity Period & Automatic Expiry Configuration Card */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4 text-primary" />
                2. Validity Window &amp; Expiration Date
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono text-primary">
                Automatic Hiding
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Configure when this circular goes live and when it expires. Once expired, the flyer is hidden from customer apps and search results.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {/* Quick Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Quick Expiry Duration Presets
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset(7)}
                  className="h-7 text-xs px-2.5 font-medium"
                >
                  +7 Days (Weekly)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset(14)}
                  className="h-7 text-xs px-2.5 font-medium"
                >
                  +14 Days (Bi-weekly)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset(30)}
                  className="h-7 text-xs px-2.5 font-medium"
                >
                  +30 Days (Monthly)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset("month")}
                  className="h-7 text-xs px-2.5 font-medium"
                >
                  End of Current Month
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleApplyPreset("clear")}
                  className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                >
                  Clear (No Expiry)
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="valid-from" className="text-xs font-medium flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Valid From Date <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="valid-from"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="valid-to" className="text-xs font-medium flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5 text-primary" />
                  Expiry Date (Valid To) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="valid-to"
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  className="h-8 text-xs font-medium"
                />
              </div>
            </div>

            {/* Live Visibility Explanatory Banner */}
            {validTo ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-300 bg-emerald-50 dark:border-emerald-700/60 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Automatic Expiry Configured</p>
                  <p className="text-[11px] leading-relaxed">
                    This circular will be published immediately and will automatically expire on{" "}
                    <strong>
                      {new Date(toEndOfDayIso(validTo)).toLocaleDateString(undefined, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </strong>{" "}
                    at 11:59 PM. After this date, the flyer will no longer be visible to shoppers in the mobile app.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground">No Expiry Date</p>
                  <p className="text-[11px]">
                    This flyer will remain published and visible indefinitely until an expiration date is configured or it is manually archived.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Image File Dropzone & Mobile Sizing Card */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-primary" />
                3. Circular Page Image &amp; Mobile Format
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono text-primary">
                Standard: 9:16 (1080 × 1920)
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Upload crisp JPG, PNG, or WebP circular pages. For mobile app shoppers, standard 9:16 vertical resolution ensures optimal display on smartphones without horizontal distortion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 cursor-pointer hover:bg-muted/30 transition-colors text-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={isSubmitting}
              />
              <Upload className="h-8 w-8 text-primary mb-3" />
              <p className="text-xs font-semibold text-foreground">
                {selectedFile ? selectedFile.name : "Click to select or drop flyer image"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Supported formats: JPG, PNG, WebP (up to 15MB) · Recommended: 1080 × 1920 px (9:16)
              </p>
            </div>

            {/* Sizing Status Banner */}
            {previewUrl && sizingEval && (
              <div className="space-y-3">
                {sizingEval.isMatch ? (
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-900 dark:text-emerald-200">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            Optimal 9:16 Mobile Flyer Format
                          </span>
                          <Badge variant="default" className="text-[9px] bg-emerald-600 text-white">
                            Ready for Mobile
                          </Badge>
                        </div>
                        <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                          Detected {imgDimensions?.width} × {imgDimensions?.height} px (ratio:{" "}
                          {sizingEval.aspectRatio.toFixed(2)}). Fits perfectly on smartphone screens
                          with 1:1 hotspot mapping accuracy.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCropDialogOpen(true)}
                      className="h-7 text-xs gap-1.5 shrink-0 bg-background"
                    >
                      <Crop className="h-3 w-3 text-primary" />
                      <span>Adjust Framing</span>
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            Mobile Sizing Mismatch Detected
                          </span>
                          <Badge variant="outline" className="text-[9px] border-amber-400 text-amber-700 dark:text-amber-300 font-mono">
                            {sizingEval.label}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 max-w-xl">
                          Current size: {imgDimensions?.width} × {imgDimensions?.height} px (Aspect ratio{" "}
                          {sizingEval.aspectRatio.toFixed(2)}). Mobile shopping apps standard is{" "}
                          <strong>9:16 (1080 × 1920 px)</strong>. Format now to ensure high legibility and avoid side black bars on phones.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleQuickAutoFit}
                        disabled={isAutoFitting}
                        className="h-7 text-xs gap-1 bg-background"
                        title="Fits entire flyer inside 1080 × 1920 canvas without cutting any content"
                      >
                        {isAutoFitting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Maximize2 className="h-3 w-3 text-emerald-600" />
                        )}
                        <span>Quick Fit (No Crop)</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setCropDialogOpen(true)}
                        className="h-7 text-xs gap-1 bg-primary text-primary-foreground font-semibold shadow-xs"
                      >
                        <Crop className="h-3 w-3" />
                        <span>Crop / Resize (9:16)</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Image Details Card */}
                <div className="rounded-lg border p-3 bg-muted/20 flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative group shrink-0">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-32 w-auto object-contain rounded border bg-background"
                    />
                    <button
                      type="button"
                      onClick={() => setCropDialogOpen(true)}
                      className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-[10px] rounded cursor-pointer"
                    >
                      <Crop className="h-4 w-4" />
                      <span>Crop / Resize</span>
                    </button>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground text-center sm:text-left flex-1">
                    <p className="font-semibold text-foreground">{selectedFile?.name}</p>
                    {imgDimensions && (
                      <p className="font-mono text-[11px]">
                        {imgDimensions.width} × {imgDimensions.height} px (Aspect Ratio:{" "}
                        {(imgDimensions.height / imgDimensions.width).toFixed(2)})
                      </p>
                    )}
                    <p className="text-[11px]">
                      {selectedFile && `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`}
                    </p>
                    <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCropDialogOpen(true)}
                        className="h-7 text-xs gap-1"
                      >
                        <Crop className="h-3 w-3 text-primary" />
                        Crop &amp; Resize
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Choose Different File
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Action Footer */}
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
            disabled={isSubmitting || !selectedFile}
            className="text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-xs"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {isSubmitting ? "Uploading Circular..." : "Publish Flyer & Open Studio"}
          </Button>
        </div>
      </form>

      {/* Crop & Resize Modal */}
      {previewUrl && (
        <FlyerCropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imageSource={selectedFile || previewUrl}
          initialFilename={selectedFile?.name}
          onApplyCrop={handleApplyCrop}
        />
      )}
    </div>
  );
}
