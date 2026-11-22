import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronsUpDown,
  ExternalLink,
  Globe,
  ImageIcon,
  Loader2,
  Palette,
  Sparkles,
  Tag,
  Upload,
  X,
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
import { CategoriesManagerDialog, RenderCategoryIcon } from "./CategoriesManagerDialog";
import {
  createMerchant,
  updateMerchant,
  uploadImage,
  resolveImageUrl,
  fetchCategories,
  type Category,
  type Merchant,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface FranchiseFormScreenProps {
  franchise?: Merchant | null;
  categories?: Category[];
  merchants?: Merchant[];
  onCategoryCreated?: (created: Category) => void;
  onSave: (saved: Merchant, isEdit: boolean) => void;
  onCancel: () => void;
}

const PRESET_BG_COLORS = [
  { label: "Emerald Green", hex: "#075E50" },
  { label: "Crimson Red", hex: "#CC0000" },
  { label: "Retail Blue", hex: "#0071DC" },
  { label: "Canary Yellow", hex: "#FFE000" },
  { label: "Royal Purple", hex: "#7C3AED" },
  { label: "Charcoal Slate", hex: "#0F172A" },
  { label: "Tangerine Orange", hex: "#EA580C" },
  { label: "Deep Teal", hex: "#0D9488" },
];

const PRESET_TEXT_COLORS = [
  { label: "Pure White", hex: "#FFFFFF" },
  { label: "Dark Charcoal", hex: "#123D38" },
  { label: "Lime Accent", hex: "#D8F36A" },
  { label: "Golden Sun", hex: "#FFC220" },
  { label: "Jet Black", hex: "#000000" },
];

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "F";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function FranchiseFormScreen({
  franchise,
  categories: propCategories,
  merchants = [],
  onCategoryCreated,
  onSave,
  onCancel,
}: FranchiseFormScreenProps) {
  const isEdit = !!franchise;

  const [name, setName] = useState(franchise?.name || "");
  const [slug, setSlug] = useState(franchise?.slug || "");
  const [isSlugManual, setIsSlugManual] = useState(isEdit);
  const [initial, setInitial] = useState(franchise?.initial || "");
  const [isInitialManual, setIsInitialManual] = useState(isEdit);
  const [categoryId, setCategoryId] = useState(franchise?.categoryId || "groceries");
  const [website, setWebsite] = useState(franchise?.website || "");
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState(franchise?.privacyPolicyUrl || "");
  const [termsUrl, setTermsUrl] = useState(franchise?.termsUrl || "");
  const [logoBg, setLogoBg] = useState(franchise?.logoBg || "#075E50");
  const [logoColor, setLogoColor] = useState(franchise?.logoColor || "#FFFFFF");
  const [logoUrl, setLogoUrl] = useState(franchise?.logoUrl || "");
  const [bannerUrl, setBannerUrl] = useState(franchise?.bannerUrl || "");

  const [categories, setCategories] = useState<Category[]>(propCategories || []);
  const [isManageCatOpen, setIsManageCatOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (propCategories && propCategories.length > 0) {
      setCategories(propCategories);
      if (!franchise?.categoryId) {
        setCategoryId(propCategories[0].id);
      }
    } else {
      fetchCategories().then((cats) => {
        setCategories(cats);
        if (!franchise?.categoryId && cats.length > 0) {
          setCategoryId(cats[0].id);
        }
      });
    }
  }, [franchise, propCategories]);

  // Update slug and initials automatically as user types name (unless manually edited)
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugManual) {
      setSlug(generateSlug(val));
    }
    if (!isInitialManual) {
      setInitial(deriveInitials(val));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const res = await uploadImage(file);
      setLogoUrl(res.url);
      toast.success("Logo uploaded successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to upload logo: ${msg}`);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    try {
      const res = await uploadImage(file);
      setBannerUrl(res.url);
      toast.success("Banner uploaded successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to upload banner: ${msg}`);
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Please enter a franchise name.");
      return;
    }

    const finalSlug =
      slug.trim() || generateSlug(trimmedName) || `franchise-${Date.now().toString(36)}`;
    const finalInitial = initial.trim().toUpperCase() || deriveInitials(trimmedName);

    setIsSubmitting(true);
    try {
      const payload: Partial<Merchant> = {
        name: trimmedName,
        slug: finalSlug,
        initial: finalInitial,
        categoryId: categoryId || null,
        website: website.trim() || null,
        privacyPolicyUrl: privacyPolicyUrl.trim() || null,
        termsUrl: termsUrl.trim() || null,
        logoBg: logoBg || "#075E50",
        logoColor: logoColor || "#FFFFFF",
        logoUrl: logoUrl.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
      };

      if (isEdit && franchise) {
        const updated = await updateMerchant(franchise.id, payload);
        toast.success(`Franchise "${updated.name}" updated successfully.`);
        onSave(updated, true);
      } else {
        const created = await createMerchant(payload);
        toast.success(`Franchise "${created.name}" created successfully.`);
        onSave(created, false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save franchise: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentInitials = initial.trim() || deriveInitials(name) || "F";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header bar */}
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
              {isEdit ? "Edit Franchise Brand" : "Add Franchise Brand"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Configure brand identity, colors, logo, category, and website for this retail chain.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Core Identity */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Brand Identity
            </CardTitle>
            <CardDescription className="text-xs">
              Primary naming, unique handle slug, category, and online store website.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Franchise Name */}
              <div className="space-y-1.5">
                <Label htmlFor="franchise-name" className="text-xs font-medium">
                  Franchise Brand Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="franchise-name"
                  placeholder="e.g. Whole Foods Market, Metro, Sobeys"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Slug / Handle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="franchise-slug" className="text-xs font-medium">
                    Brand Slug / Identifier <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    Used in URLs & system tags
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-muted-foreground font-mono text-xs">
                    @
                  </span>
                  <Input
                    id="franchise-slug"
                    placeholder="whole-foods"
                    value={slug}
                    onChange={(e) => {
                      setIsSlugManual(true);
                      setSlug(generateSlug(e.target.value));
                    }}
                    className="h-9 pl-7 font-mono text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {/* Initials Badge */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="franchise-initial" className="text-xs font-medium">
                    Badge Initials <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">1–3 letters</span>
                </div>
                <Input
                  id="franchise-initial"
                  placeholder="WF"
                  maxLength={4}
                  value={initial}
                  onChange={(e) => {
                    setIsInitialManual(true);
                    setInitial(e.target.value.toUpperCase());
                  }}
                  className="h-9 font-bold tracking-wider uppercase text-xs"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="franchise-category" className="text-xs font-medium">
                    Retail Category
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsManageCatOpen(true)}
                    className="h-5 px-1.5 text-[11px] font-medium text-primary hover:text-primary hover:underline"
                  >
                    + Manage Categories
                  </Button>
                </div>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="franchise-category" className="h-9 text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <RenderCategoryIcon
                            icon={cat.icon}
                            className="h-3.5 w-3.5 text-muted-foreground"
                          />
                          <span>{cat.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Website */}
              <div className="space-y-1.5">
                <Label htmlFor="franchise-website" className="text-xs font-medium">
                  Official Website (Optional)
                </Label>
                <div className="relative">
                  <Globe className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="franchise-website"
                    placeholder="https://example.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="h-9 pl-8 text-xs"
                  />
                </div>
              </div>

              {/* Legal: privacy policy & terms (shown in the customer app product sheet) */}
              <div className="space-y-1.5">
                <Label htmlFor="franchise-privacy" className="text-xs font-medium">
                  Privacy Policy URL
                </Label>
                <Input
                  id="franchise-privacy"
                  placeholder="https://..."
                  value={privacyPolicyUrl}
                  onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="franchise-terms" className="text-xs font-medium">
                  Terms &amp; Conditions URL
                </Label>
                <Input
                  id="franchise-terms"
                  placeholder="https://..."
                  value={termsUrl}
                  onChange={(e) => setTermsUrl(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brand Theme & Appearance */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Brand Theme &amp; Colors
            </CardTitle>
            <CardDescription className="text-xs">
              Select signature colors for pins, flyers, logos, and store badges across the
              application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Background Color */}
              <div className="space-y-2.5">
                <Label className="text-xs font-medium flex items-center justify-between">
                  <span>Logo Background Color</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{logoBg}</span>
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={logoBg}
                    onChange={(e) => setLogoBg(e.target.value)}
                    className="h-9 w-12 rounded cursor-pointer border p-0.5 bg-background shrink-0"
                  />
                  <Input
                    value={logoBg}
                    onChange={(e) => setLogoBg(e.target.value)}
                    placeholder="#075E50"
                    className="h-9 font-mono text-xs"
                  />
                </div>
                {/* Preset swatches */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Quick Palette:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_BG_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setLogoBg(c.hex)}
                        title={c.label}
                        className={cn(
                          "h-5 w-5 rounded-full border shadow-2xs transition-transform hover:scale-110",
                          logoBg.toLowerCase() === c.hex.toLowerCase() &&
                            "ring-2 ring-primary ring-offset-1",
                        )}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Text / Initial Color */}
              <div className="space-y-2.5">
                <Label className="text-xs font-medium flex items-center justify-between">
                  <span>Badge Text / Foreground Color</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{logoColor}</span>
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={logoColor}
                    onChange={(e) => setLogoColor(e.target.value)}
                    className="h-9 w-12 rounded cursor-pointer border p-0.5 bg-background shrink-0"
                  />
                  <Input
                    value={logoColor}
                    onChange={(e) => setLogoColor(e.target.value)}
                    placeholder="#FFFFFF"
                    className="h-9 font-mono text-xs"
                  />
                </div>
                {/* Preset swatches */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Quick Palette:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_TEXT_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setLogoColor(c.hex)}
                        title={c.label}
                        className={cn(
                          "h-5 w-5 rounded-full border shadow-2xs transition-transform hover:scale-110",
                          logoColor.toLowerCase() === c.hex.toLowerCase() &&
                            "ring-2 ring-primary ring-offset-1",
                        )}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Interactive Preview */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Live Brand Badge Preview
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Light preview card */}
                <div className="p-3 rounded-md bg-white text-zinc-900 border shadow-2xs flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-md flex items-center justify-center font-bold text-sm shrink-0 shadow-xs"
                    style={{ backgroundColor: logoBg, color: logoColor }}
                  >
                    {currentInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs truncate">{name || "Brand Name Preview"}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">Light Mode Preview</p>
                  </div>
                </div>

                {/* Dark preview card */}
                <div className="p-3 rounded-md bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-2xs flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-md flex items-center justify-center font-bold text-sm shrink-0 shadow-xs"
                    style={{ backgroundColor: logoBg, color: logoColor }}
                  >
                    {currentInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs truncate">{name || "Brand Name Preview"}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">Dark Mode Preview</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media: Logo & Banner */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              Brand Logo &amp; Media Assets
            </CardTitle>
            <CardDescription className="text-xs">
              Upload high-resolution vector or PNG logos to display instead of the default initial
              badge.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Franchise Logo Image</Label>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <div className="relative h-14 w-14 rounded-md border bg-background p-1 flex items-center justify-center shrink-0">
                      <img
                        src={resolveImageUrl(logoUrl)}
                        alt="Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setLogoUrl("")}
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px]"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="h-14 w-14 rounded-md flex items-center justify-center font-bold text-base shrink-0 border"
                      style={{ backgroundColor: logoBg, color: logoColor }}
                    >
                      {currentInitials}
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="h-8 text-xs gap-1.5 w-full"
                    >
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5" />
                          Upload Logo (PNG/SVG)
                        </>
                      )}
                    </Button>
                    <Input
                      placeholder="Or paste image URL"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="h-7 text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Banner Upload */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Header Banner (Optional)</Label>
                <div className="flex items-center gap-3">
                  {bannerUrl ? (
                    <div className="relative h-14 w-24 rounded-md border bg-background overflow-hidden flex items-center justify-center shrink-0">
                      <img
                        src={resolveImageUrl(bannerUrl)}
                        alt="Banner"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setBannerUrl("")}
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px]"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-14 w-24 rounded-md bg-muted border flex items-center justify-center text-muted-foreground shrink-0 text-[10px]">
                      No Banner
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={isUploadingBanner}
                      className="h-8 text-xs gap-1.5 w-full"
                    >
                      {isUploadingBanner ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5" />
                          Upload Banner Image
                        </>
                      )}
                    </Button>
                    <Input
                      placeholder="Or paste banner URL"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      className="h-7 text-[11px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
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
            className="h-9 px-5 text-xs bg-primary text-primary-foreground shadow-xs gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving to Database...
              </>
            ) : isEdit ? (
              "Update Franchise"
            ) : (
              "Create Franchise"
            )}
          </Button>
        </div>
      </form>

      {/* Dynamic Categories Manager Modal */}
      <CategoriesManagerDialog
        open={isManageCatOpen}
        onOpenChange={setIsManageCatOpen}
        categories={categories}
        merchants={merchants}
        onCategoriesUpdated={(newList) => {
          setCategories(newList);
          if (onCategoryCreated && newList.length > categories.length) {
            onCategoryCreated(newList[newList.length - 1]);
          }
        }}
      />
    </div>
  );
}
