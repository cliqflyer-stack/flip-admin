import React, { useRef, useState } from "react";
import {
  Building2,
  CalendarClock,
  Calendar,
  CheckCircle2,
  FileText,
  ImagePlus,
  Info,
  Loader2,
  Sparkles,
  Upload,
  AlertTriangle,
  Crop,
  Smartphone,
  Maximize2,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  fetchFlyerById,
  isExtractionRunning,
  startFlyerExtraction,
  waitForExtraction,
  toEndOfDayIso,
  toStartOfDayIso,
  getRelativeDateString,
  getEndOfCurrentMonthString,
  type ApiFlyer,
  type Merchant,
  type StoreLocation,
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
import { FlyerCropDialog } from "./FlyerCropDialog";
import { FranchiseDialog } from "./FranchiseDialog";
import { GenerateFlyerFromSheetDialog } from "./GenerateFlyerFromSheetDialog";
import {
  evaluateFlyerSizing,
  RECOMMENDED_FLYER_WIDTH,
  RECOMMENDED_FLYER_HEIGHT,
  RECOMMENDED_FLYER_ASPECT_RATIO,
  isLongScrollFlyer,
  loadImageElement,
  renderFlyerToCanvas,
  canvasToFile,
  type SizingEvaluation,
} from "@/lib/flyer-sizing";

interface UploadFlyerScreenProps {
  merchants: Merchant[];
  storeLocations: StoreLocation[];
  onFranchiseCreated?: (created: Merchant) => void;
  onFlyerCreated: (flyer: ApiFlyer) => void;
  onCancel: () => void;
}

export function UploadFlyerScreen({
  merchants,
  storeLocations,
  onFranchiseCreated,
  onFlyerCreated,
  onCancel,
}: UploadFlyerScreenProps) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("Weekly Deals · Live Circular");
  const [isAddFranchiseOpen, setIsAddFranchiseOpen] = useState(false);
  const [badgeText, setBadgeText] = useState("NEW");
  const [badgeVariant, setBadgeVariant] = useState("lime");
  const [merchantId, setMerchantId] = useState(merchants[0]?.id || "merch_drug_mart");
  const [storeLocationId, setStoreLocationId] = useState("all");

  const [validFrom, setValidFrom] = useState<string>("");
  const [validTo, setValidTo] = useState<string>(getRelativeDateString(7)); // Default 7 days

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [sizingEval, setSizingEval] = useState<SizingEvaluation | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoFitting, setIsAutoFitting] = useState(false);
  const [isSheetDialogOpen, setIsSheetDialogOpen] = useState(false);
  const [autoDetectOnUpload, setAutoDetectOnUpload] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Long scrolling flyers are accepted as-is (no crop / letterbox needed)
  const isLongFlyer = imgDimensions
    ? isLongScrollFlyer(imgDimensions.width, imgDimensions.height)
    : false;

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

      if (isLongScrollFlyer(dimensions.width, dimensions.height)) {
        toast.success(
          `Long scrolling flyer detected (${(dimensions.height / dimensions.width).toFixed(2)}:1). It will be published as-is and scrolls in the app.`,
          { duration: 5000 },
        );
      } else if (!evaluation.isMatch) {
        toast.warning(
          `Image aspect ratio (${evaluation.aspectRatio.toFixed(2)}) deviates from mobile 9:16 standard. Use Crop/Resize to optimize.`,
          { duration: 5000 },
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

      let opened = created;
      if (autoDetectOnUpload) {
        const progress = toast.loading("Reading deals and prices from the flyer...");
        try {
          await startFlyerExtraction(created.id, true);
          const job = await waitForExtraction(created.id);
          if (job?.status === "failed") {
            toast.error(`Could not read the flyer: ${job.errorMessage}`, { id: progress });
          } else if (isExtractionRunning(job)) {
            toast.info("Still reading. Open Auto-Detect in the studio to see the results.", {
              id: progress,
            });
          } else {
            const items = job?.items ?? [];
            const pending = items.filter((item) => !item.applied).length;
            toast.success(
              `Found ${items.length} deals: ${items.length - pending} mapped, ${pending} to review.`,
              { id: progress },
            );
            // Auto-applied hotspots must be in the studio before anyone saves over them.
            opened = await fetchFlyerById(created.id);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          toast.error(`Flyer published, but it could not be read: ${message}`, { id: progress });
        }
      }

      onFlyerCreated(opened);
    } catch (err: any) {
      toast.error(`Flyer upload failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLocations = storeLocations.filter((l) => l.merchantId === merchantId);

  return (
    <AdminFormPage>
      <AdminFormHeader
        title="Upload Digital Circular"
        description="Publish a new flyer, set its validity window, format it to mobile dimensions and map interactive hotspots."
        onBack={onCancel}
        badge={
          <Badge variant="outline" className="gap-1 font-mono text-[10px] text-primary">
            <Smartphone className="h-3 w-3" />
            9:16 Mobile Standard
          </Badge>
        }
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsSheetDialogOpen(true)}
            className="h-9 gap-1.5 border-emerald-500/40 bg-emerald-500/5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Generate from Spreadsheet
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <AdminFormBody
          aside={
            <>
              {/* Franchise and Branch Assignment */}
              <AdminFormSection
                step={1}
                icon={Building2}
                title="Franchise & Location"
                description="Assign this circular to a brand and an optional specific branch."
              >
                <AdminFormField
                  label="Brand / Franchise"
                  htmlFor="merchant-select"
                  required
                  hint={
                    onFranchiseCreated ? (
                      <button
                        type="button"
                        onClick={() => setIsAddFranchiseOpen(true)}
                        className="font-medium text-primary hover:underline"
                      >
                        + New Franchise
                      </button>
                    ) : undefined
                  }
                >
                  <Select
                    value={merchantId}
                    onValueChange={(val) => {
                      setMerchantId(val);
                      setStoreLocationId("all");
                    }}
                  >
                    <SelectTrigger id="merchant-select" className={adminSelectTriggerClass}>
                      <SelectValue placeholder="Select a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {merchants.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold"
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
                </AdminFormField>

                <AdminFormField label="Store Branch" htmlFor="location-select">
                  <Select value={storeLocationId} onValueChange={setStoreLocationId}>
                    <SelectTrigger id="location-select" className={adminSelectTriggerClass}>
                      <SelectValue placeholder="Chain-wide (All Stores)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-sm font-semibold">
                        Chain-wide (All Branches)
                      </SelectItem>
                      {filteredLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id} className="text-sm">
                          {loc.name} ({loc.city})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </AdminFormField>
              </AdminFormSection>

              {/* Flyer details */}
              <AdminFormSection
                step={2}
                icon={FileText}
                title="Flyer Details"
                description="Shown to shoppers in the app and in search results."
              >
                <AdminFormField label="Flyer Title" htmlFor="flyer-title" required>
                  <Input
                    id="flyer-title"
                    placeholder="e.g. Weekly Grocery Deals & Specials"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className={adminInputClass}
                  />
                </AdminFormField>

                <AdminFormField label="Subtitle / Offer Text" htmlFor="flyer-subtitle">
                  <Input
                    id="flyer-subtitle"
                    placeholder="e.g. Prices valid Thursday through Wednesday"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className={adminInputClass}
                  />
                </AdminFormField>

                <AdminFormField
                  label="Highlight Pill"
                  htmlFor="flyer-badge"
                  description="Short label shown on the flyer card, e.g. NEW, 50% OFF."
                >
                  <Input
                    id="flyer-badge"
                    placeholder="NEW"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className={adminInputClass}
                  />
                </AdminFormField>
              </AdminFormSection>

              {/* Validity window */}
              <AdminFormSection
                step={3}
                icon={CalendarClock}
                title="Validity Window"
                description="Once expired, the flyer is hidden from the customer app and search."
                action={
                  <Badge variant="outline" className="font-mono text-[10px] text-primary">
                    Automatic Hiding
                  </Badge>
                }
              >
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-foreground">Quick Presets</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyPreset(7)}
                      className="h-8 px-3 text-xs font-medium"
                    >
                      +7 Days
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyPreset(14)}
                      className="h-8 px-3 text-xs font-medium"
                    >
                      +14 Days
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyPreset(30)}
                      className="h-8 px-3 text-xs font-medium"
                    >
                      +30 Days
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyPreset("month")}
                      className="h-8 px-3 text-xs font-medium"
                    >
                      End of Month
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApplyPreset("clear")}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      No Expiry
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AdminFormField
                    label={
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        Valid From
                      </span>
                    }
                    htmlFor="valid-from"
                    hint="Optional"
                  >
                    <Input
                      id="valid-from"
                      type="date"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      className={adminInputClass}
                    />
                  </AdminFormField>

                  <AdminFormField
                    label={
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-primary" />
                        Expiry Date
                      </span>
                    }
                    htmlFor="valid-to"
                    required
                  >
                    <Input
                      id="valid-to"
                      type="date"
                      value={validTo}
                      onChange={(e) => setValidTo(e.target.value)}
                      className={adminInputClass}
                    />
                  </AdminFormField>
                </div>

                {validTo ? (
                  <div className="flex items-start gap-2.5 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="leading-relaxed">
                      Publishes immediately and expires on{" "}
                      <strong>
                        {new Date(toEndOfDayIso(validTo)).toLocaleDateString(undefined, {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </strong>{" "}
                      at 11:59 PM.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="leading-relaxed">
                      No expiry date. This flyer stays visible until you set one or archive it.
                    </p>
                  </div>
                )}
              </AdminFormSection>
            </>
          }
        >
          {/* Circular page image: the main, full-height work area */}
          <AdminFormSection
            icon={ImagePlus}
            title="Circular Page Image"
            description="Upload a crisp JPG, PNG or WebP. Standard 9:16 vertical resolution displays best on smartphones."
            action={
              <Badge variant="outline" className="font-mono text-[10px] text-primary">
                Standard: 9:16 (1080 × 1920)
              </Badge>
            }
            className="flex flex-1 flex-col"
            contentClassName="flex flex-1 flex-col"
          >
            {!previewUrl ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                }}
                className="flex min-h-[560px] flex-1 cursor-pointer flex-col items-center justify-center gap-5 rounded-xl border-2 border-dashed border-border bg-muted/20 p-10 text-center transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Upload className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">
                    Click to select a flyer image
                  </p>
                  <p className="text-sm text-muted-foreground">JPG, PNG or WebP · up to 25 MB</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="font-normal">
                    Recommended 1080 × 1920 px
                  </Badge>
                  <Badge variant="secondary" className="font-normal">
                    Long scrolling flyers accepted
                  </Badge>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-2 h-9 gap-1.5 px-4 text-xs font-semibold"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Choose File
                </Button>
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-4">
                {/* Sizing Status Banner */}
                {sizingEval && (
                  <div>
                    {isLongFlyer ? (
                      <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-sky-300 bg-sky-50/80 p-3.5 text-xs text-sky-900 sm:flex-row sm:items-center dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                Long Scrolling Flyer
                              </span>
                              <Badge
                                variant="outline"
                                className="border-sky-400 font-mono text-[9px] text-sky-700 dark:text-sky-300"
                              >
                                {(imgDimensions!.height / imgDimensions!.width).toFixed(2)}:1
                              </Badge>
                            </div>
                            <p className="mt-0.5 max-w-xl text-[11px] text-sky-800 dark:text-sky-300">
                              Published at its original size; shoppers scroll through it in the app.
                              No cropping needed.
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCropDialogOpen(true)}
                          className="h-8 shrink-0 gap-1.5 bg-background text-xs"
                        >
                          <Crop className="h-3 w-3 text-primary" />
                          <span>Optional: Crop</span>
                        </Button>
                      </div>
                    ) : sizingEval.isMatch ? (
                      <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3.5 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                Optimal 9:16 Mobile Flyer Format
                              </span>
                              <Badge
                                variant="default"
                                className="bg-emerald-600 text-[9px] text-white"
                              >
                                Ready for Mobile
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                              Detected {imgDimensions?.width} × {imgDimensions?.height} px (ratio{" "}
                              {sizingEval.aspectRatio.toFixed(2)}).
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCropDialogOpen(true)}
                          className="h-8 shrink-0 gap-1.5 bg-background text-xs"
                        >
                          <Crop className="h-3 w-3 text-primary" />
                          <span>Adjust Framing</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-900 sm:flex-row sm:items-center dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                Mobile Sizing Mismatch
                              </span>
                              <Badge
                                variant="outline"
                                className="border-amber-400 font-mono text-[9px] text-amber-700 dark:text-amber-300"
                              >
                                {sizingEval.label}
                              </Badge>
                            </div>
                            <p className="mt-0.5 max-w-xl text-[11px] text-amber-800 dark:text-amber-300">
                              Current size {imgDimensions?.width} × {imgDimensions?.height} px. The
                              standard is <strong>9:16 (1080 × 1920 px)</strong>; format it to avoid
                              black bars on phones.
                            </p>
                          </div>
                        </div>
                        <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleQuickAutoFit}
                            disabled={isAutoFitting}
                            className="h-8 gap-1 bg-background text-xs"
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
                            className="h-8 gap-1 text-xs font-semibold shadow-xs"
                          >
                            <Crop className="h-3 w-3" />
                            <span>Crop / Resize</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Full-size preview canvas */}
                <div className="group relative flex min-h-[480px] flex-1 items-center justify-center overflow-hidden rounded-xl border bg-muted/30 p-6">
                  <img
                    src={previewUrl}
                    alt="Flyer preview"
                    className="max-h-[68vh] w-auto max-w-full rounded-md border bg-background object-contain shadow-md"
                  />
                  <button
                    type="button"
                    onClick={() => setCropDialogOpen(true)}
                    className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-1.5 bg-black/50 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Crop className="h-5 w-5" />
                    <span>Crop / Resize</span>
                  </button>
                </div>

                {/* File details bar */}
                <div className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {selectedFile?.name}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {imgDimensions && (
                        <>
                          {imgDimensions.width} × {imgDimensions.height} px · ratio{" "}
                          {(imgDimensions.height / imgDimensions.width).toFixed(2)} ·{" "}
                        </>
                      )}
                      {selectedFile && `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCropDialogOpen(true)}
                      className="h-8 gap-1.5 text-xs"
                    >
                      <Crop className="h-3.5 w-3.5 text-primary" />
                      Crop &amp; Resize
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Choose Different File
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={isSubmitting}
            />
          </AdminFormSection>
        </AdminFormBody>

        <AdminFormFooter>
          <div className="mr-auto flex items-center gap-2.5 text-sm">
            <Switch
              id="autodetect-switch"
              checked={autoDetectOnUpload}
              onCheckedChange={setAutoDetectOnUpload}
            />
            <Label
              htmlFor="autodetect-switch"
              className="flex cursor-pointer items-center gap-1.5 font-medium"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Auto-detect deals, prices &amp; areas</span>
            </Label>
          </div>
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
            disabled={isSubmitting || !selectedFile}
            className="h-9 gap-1.5 px-5 text-xs font-semibold shadow-xs"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {isSubmitting ? "Uploading Circular..." : "Publish Flyer & Open Studio"}
          </Button>
        </AdminFormFooter>
      </form>

      {/* Spreadsheet Flyer Generator Dialog */}
      <GenerateFlyerFromSheetDialog
        open={isSheetDialogOpen}
        onOpenChange={setIsSheetDialogOpen}
        merchants={merchants}
        storeLocations={storeLocations}
        onFlyerGenerated={onFlyerCreated}
      />

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
