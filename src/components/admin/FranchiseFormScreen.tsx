import type { Patch } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { Building2, Globe, ImageIcon, Loader2, Palette, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";

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
  franchise?: Merchant | null | undefined;
  categories?: Category[] | undefined;
  merchants?: Merchant[] | undefined;
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
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.substring(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? "";
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
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
        setCategoryId(propCategories[0]?.id ?? "");
      }
    } else {
      fetchCategories().then((cats) => {
        setCategories(cats);
        if (!franchise?.categoryId && cats.length > 0) {
          setCategoryId(cats[0]?.id ?? "");
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
      const payload: Patch<Merchant> = {
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
    <AdminFormPage>
      <AdminFormHeader
        title={isEdit ? "Edit Franchise Brand" : "Add Franchise Brand"}
        description="Configure brand identity, colors, logo and legal links for this retail chain."
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
              icon={Sparkles}
              title="Live Brand Preview"
              description="How the badge appears in light and dark mode across the app."
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border bg-white p-3 text-zinc-900 shadow-2xs">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-sm font-bold shadow-xs"
                    style={{ backgroundColor: logoBg, color: logoColor }}
                  >
                    {currentInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{name || "Brand Name"}</p>
                    <p className="font-mono text-[11px] text-zinc-500">Light mode</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-zinc-100 shadow-2xs">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-sm font-bold shadow-xs"
                    style={{ backgroundColor: logoBg, color: logoColor }}
                  >
                    {currentInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{name || "Brand Name"}</p>
                    <p className="font-mono text-[11px] text-zinc-400">Dark mode</p>
                  </div>
                </div>
              </div>
            </AdminFormSection>
          }
        >
          {/* Core Identity */}
          <AdminFormSection
            step={1}
            icon={Building2}
            title="Brand Identity"
            description="Name, unique handle, category and online presence."
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <AdminFormField label="Brand Name" htmlFor="franchise-name" required>
                <Input
                  id="franchise-name"
                  placeholder="e.g. Whole Foods Market, Metro, Sobeys"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={adminInputClass}
                  required
                />
              </AdminFormField>

              <AdminFormField
                label="Brand Slug"
                htmlFor="franchise-slug"
                required
                hint="Used in URLs & system tags"
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
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
                    className={cn(adminInputClass, "pl-7 font-mono")}
                    required
                  />
                </div>
              </AdminFormField>

              <AdminFormField
                label="Badge Initials"
                htmlFor="franchise-initial"
                required
                hint="1–4 letters"
              >
                <Input
                  id="franchise-initial"
                  placeholder="WF"
                  maxLength={4}
                  value={initial}
                  onChange={(e) => {
                    setIsInitialManual(true);
                    setInitial(e.target.value.toUpperCase());
                  }}
                  className={cn(adminInputClass, "font-semibold uppercase tracking-wider")}
                  required
                />
              </AdminFormField>

              <AdminFormField
                label="Retail Category"
                htmlFor="franchise-category"
                hint={
                  <button
                    type="button"
                    onClick={() => setIsManageCatOpen(true)}
                    className="font-medium text-primary hover:underline"
                  >
                    Manage categories
                  </button>
                }
              >
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="franchise-category" className={adminSelectTriggerClass}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-sm">
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
              </AdminFormField>

              <AdminFormField label="Official Website" htmlFor="franchise-website" hint="Optional">
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="franchise-website"

                    placeholder="https://example.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className={cn(adminInputClass, "pl-9")}
                  />
                </div>
              </AdminFormField>

              <AdminFormField label="Privacy Policy URL" htmlFor="franchise-privacy">
                <Input
                  id="franchise-privacy"

                  placeholder="https://..."
                  value={privacyPolicyUrl}
                  onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
                  className={adminInputClass}
                />
              </AdminFormField>

              <AdminFormField label="Terms & Conditions URL" htmlFor="franchise-terms">
                <Input
                  id="franchise-terms"

                  placeholder="https://..."
                  value={termsUrl}
                  onChange={(e) => setTermsUrl(e.target.value)}
                  className={adminInputClass}
                />
              </AdminFormField>
            </div>
          </AdminFormSection>

          {/* Brand Theme & Colors */}
          <AdminFormSection
            step={2}
            icon={Palette}
            title="Brand Theme & Colors"
            description="Signature colors used for pins, flyers, logos and store badges."
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Background Color */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="franchise-logo-bg" className="text-sm font-medium">
                    Logo Background
                  </Label>
                  <span className="font-mono text-xs text-muted-foreground">{logoBg}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="franchise-logo-bg"
                    type="color"
                    value={logoBg}
                    onChange={(e) => setLogoBg(e.target.value)}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-md border bg-background p-1"
                  />
                  <Input
                    value={logoBg}
                    onChange={(e) => setLogoBg(e.target.value)}
                    placeholder="#075E50"
                    className={cn(adminInputClass, "font-mono")}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_BG_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setLogoBg(c.hex)}
                      title={c.label}
                      aria-label={c.label}
                      className={cn(
                        "h-7 w-7 rounded-full border shadow-2xs transition-transform hover:scale-110",
                        logoBg.toLowerCase() === c.hex.toLowerCase() &&
                          "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      )}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>

              {/* Text / Initial Color */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="franchise-logo-color" className="text-sm font-medium">
                    Badge Text Color
                  </Label>
                  <span className="font-mono text-xs text-muted-foreground">{logoColor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="franchise-logo-color"
                    type="color"
                    value={logoColor}
                    onChange={(e) => setLogoColor(e.target.value)}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-md border bg-background p-1"
                  />
                  <Input
                    value={logoColor}
                    onChange={(e) => setLogoColor(e.target.value)}
                    placeholder="#FFFFFF"
                    className={cn(adminInputClass, "font-mono")}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_TEXT_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setLogoColor(c.hex)}
                      title={c.label}
                      aria-label={c.label}
                      className={cn(
                        "h-7 w-7 rounded-full border shadow-2xs transition-transform hover:scale-110",
                        logoColor.toLowerCase() === c.hex.toLowerCase() &&
                          "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      )}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </AdminFormSection>

          {/* Media: Logo & Banner */}
          <AdminFormSection
            step={3}
            icon={ImageIcon}
            title="Logo & Media"
            description="Upload a PNG or SVG logo to replace the default initial badge. The banner is optional."
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Logo Upload */}
              <div className="flex flex-col gap-2.5">
                <Label className="text-sm font-medium">Franchise Logo</Label>
                <div className="flex items-start gap-4">
                  {logoUrl ? (
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border bg-background p-2">
                      <img
                        src={resolveImageUrl(logoUrl)}
                        alt="Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setLogoUrl("")}
                        aria-label="Remove logo"
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-xs"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border text-lg font-bold"
                      style={{ backgroundColor: logoBg, color: logoColor }}
                    >
                      {currentInitials}
                    </div>
                  )}

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
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
                      className="h-9 w-full gap-1.5 text-xs"
                    >
                      {isUploadingLogo ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {isUploadingLogo ? "Uploading..." : "Upload Logo (PNG/SVG)"}
                    </Button>
                    <Input
                      placeholder="Or paste image URL"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Banner Upload */}
              <div className="flex flex-col gap-2.5">
                <Label className="text-sm font-medium">
                  Header Banner{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <div className="flex items-start gap-4">
                  {bannerUrl ? (
                    <div className="relative flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background">
                      <img
                        src={resolveImageUrl(bannerUrl)}
                        alt="Banner"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setBannerUrl("")}
                        aria-label="Remove banner"
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-xs"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-lg border border-dashed bg-muted/40 text-xs text-muted-foreground">
                      No banner
                    </div>
                  )}

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
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
                      className="h-9 w-full gap-1.5 text-xs"
                    >
                      {isUploadingBanner ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {isUploadingBanner ? "Uploading..." : "Upload Banner Image"}
                    </Button>
                    <Input
                      placeholder="Or paste banner URL"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
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
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : isEdit ? (
              "Update Franchise"
            ) : (
              "Create Franchise"
            )}
          </Button>
        </AdminFormFooter>
      </form>

      {/* Dynamic Categories Manager Modal */}
      <CategoriesManagerDialog
        open={isManageCatOpen}
        onOpenChange={setIsManageCatOpen}
        categories={categories}
        merchants={merchants}
        onCategoriesUpdated={(newList) => {
          setCategories(newList);
          const created = newList[newList.length - 1];
          if (onCategoryCreated && created && newList.length > categories.length) {
            onCategoryCreated(created);
          }
        }}
      />
    </AdminFormPage>
  );
}
