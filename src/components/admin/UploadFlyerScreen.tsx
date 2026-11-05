import React, { useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  type ApiFlyer,
  type Merchant,
  type StoreLocation,
} from "@/lib/api-client";

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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Calculate image natural dimensions & aspect ratio
    const img = new Image();
    img.onload = () => {
      setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = objectUrl;

    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
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

    setIsSubmitting(true);
    try {
      const uploadRes = await uploadImage(selectedFile);
      const aspectRatio =
        imgDimensions && imgDimensions.width > 0
          ? Number((imgDimensions.height / imgDimensions.width).toFixed(4))
          : 1.414;

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
    <div className="p-6 max-w-3xl mx-auto space-y-6">
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
            <h1 className="text-xl font-bold tracking-tight">Upload Digital Circular</h1>
            <p className="text-xs text-muted-foreground">
              Publish a new flyer image and open it directly in the Interactive Studio to map product hotspots.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Flyer Details</CardTitle>
            <CardDescription className="text-xs">
              Assign the circular to a brand franchise and optional branch location.
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
                  <SelectTrigger id="merchant-select" className="text-xs">
                    <SelectValue placeholder="Select a brand" />
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

              <div className="space-y-1.5">
                <Label htmlFor="location-select" className="text-xs font-medium">
                  Target Store Branch
                </Label>
                <Select value={storeLocationId} onValueChange={setStoreLocationId}>
                  <SelectTrigger id="location-select" className="text-xs">
                    <SelectValue placeholder="Chain-wide (All Stores)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All Locations (Chain-wide / Multi-store)
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
                placeholder="e.g. Weekly Grocery Deals Oct 20–26"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="flyer-subtitle" className="text-xs font-medium">
                  Subtitle / Valid Dates
                </Label>
                <Input
                  id="flyer-subtitle"
                  placeholder="e.g. Prices valid Thursday to Wednesday"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="flyer-badge" className="text-xs font-medium">
                  Highlight Badge
                </Label>
                <Input
                  id="flyer-badge"
                  placeholder="e.g. NEW, 50% OFF"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image File Dropzone Card */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Flyer Image File <span className="text-destructive">*</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Upload high-resolution JPG, PNG, or WebP digital circular pages up to 15MB.
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
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-xs font-semibold text-foreground">
                {selectedFile ? selectedFile.name : "Click to select or drop flyer image"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Supported formats: JPG, PNG, WebP
              </p>
            </div>

            {previewUrl && (
              <div className="rounded-lg border p-3 bg-muted/20 flex flex-col sm:flex-row items-center gap-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-32 w-auto object-contain rounded border bg-background"
                />
                <div className="space-y-1 text-xs text-muted-foreground text-center sm:text-left">
                  <p className="font-semibold text-foreground">{selectedFile?.name}</p>
                  {imgDimensions && (
                    <p className="font-mono text-[11px]">
                      {imgDimensions.width} × {imgDimensions.height} px (Ratio:{" "}
                      {(imgDimensions.height / imgDimensions.width).toFixed(2)})
                    </p>
                  )}
                  <p className="text-[11px]">
                    {selectedFile && `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7 text-xs mt-2"
                  >
                    Replace Image
                  </Button>
                </div>
              </div>
            )}
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
            disabled={isSubmitting || !selectedFile}
            className="text-xs font-semibold gap-1.5"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {isSubmitting ? "Uploading Circular..." : "Publish Flyer & Open Studio"}
          </Button>
        </div>
      </form>
    </div>
  );
}
