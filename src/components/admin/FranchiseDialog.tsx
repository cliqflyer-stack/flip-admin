import React, { useEffect, useRef, useState } from "react";
import { Building2, Globe, ImageIcon, Loader2, Palette, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  createMerchant,
  updateMerchant,
  uploadImage,
  resolveImageUrl,
  fetchCategories,
  type Category,
  type Merchant,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface FranchiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  franchise?: Merchant | null;
  onSuccess: (saved: Merchant, isEdit: boolean) => void;
}

const PRESET_BG_COLORS = [
  { label: "Emerald Green", hex: "#075E50" },
  { label: "Crimson Red", hex: "#CC0000" },
  { label: "Retail Blue", hex: "#0071DC" },
  { label: "Canary Yellow", hex: "#FFE000" },
  { label: "Royal Purple", hex: "#7C3AED" },
  { label: "Charcoal Slate", hex: "#0F172A" },
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

export function FranchiseDialog({
  open,
  onOpenChange,
  franchise,
  onSuccess,
}: FranchiseDialogProps) {
  const isEdit = !!franchise;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [initial, setInitial] = useState("");
  const [categoryId, setCategoryId] = useState("groceries");
  const [website, setWebsite] = useState("");
  const [logoBg, setLogoBg] = useState("#075E50");
  const [logoColor, setLogoColor] = useState("#FFFFFF");
  const [logoUrl, setLogoUrl] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (open) {
      if (franchise) {
        setName(franchise.name || "");
        setSlug(franchise.slug || "");
        setInitial(franchise.initial || "");
        setCategoryId(franchise.categoryId || "groceries");
        setWebsite(franchise.website || "");
        setLogoBg(franchise.logoBg || "#075E50");
        setLogoColor(franchise.logoColor || "#FFFFFF");
        setLogoUrl(franchise.logoUrl || "");
      } else {
        setName("");
        setSlug("");
        setInitial("");
        setCategoryId(categories[0]?.id || "groceries");
        setWebsite("");
        setLogoBg("#075E50");
        setLogoColor("#FFFFFF");
        setLogoUrl("");
      }
    }
  }, [open, franchise, categories]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEdit) {
      setSlug(generateSlug(val));
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
      toast.success("Logo uploaded.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Upload failed: ${msg}`);
    } finally {
      setIsUploadingLogo(false);
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
        logoBg: logoBg || "#075E50",
        logoColor: logoColor || "#FFFFFF",
        logoUrl: logoUrl.trim() || null,
      };

      if (isEdit && franchise) {
        const updated = await updateMerchant(franchise.id, payload);
        toast.success(`Franchise "${updated.name}" updated.`);
        onSuccess(updated, true);
      } else {
        const created = await createMerchant(payload);
        toast.success(`Franchise "${created.name}" created.`);
        onSuccess(created, false);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            {isEdit ? "Edit Franchise Brand" : "Add Franchise Brand"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Create or update retail franchise chain branding and categories.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Name & Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="diag-franchise-name" className="text-xs font-medium">
              Brand Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="diag-franchise-name"
              placeholder="e.g. Whole Foods Market"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="diag-franchise-slug" className="text-xs font-medium">
                Slug / Handle
              </Label>
              <Input
                id="diag-franchise-slug"
                placeholder="whole-foods"
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                className="h-8 font-mono text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="diag-franchise-initial" className="text-xs font-medium">
                Initials Badge
              </Label>
              <Input
                id="diag-franchise-initial"
                placeholder="WF"
                maxLength={4}
                value={initial}
                onChange={(e) => setInitial(e.target.value.toUpperCase())}
                className="h-8 font-bold uppercase text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Website (Optional)</Label>
              <Input
                placeholder="https://..."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Theme Colors & Preview */}
          <div className="p-3 rounded-md bg-muted/40 border space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-primary" />
                Badge Colors
              </Label>
              <div className="flex items-center gap-2">
                <div
                  className="h-7 w-7 rounded flex items-center justify-center font-bold text-xs shadow-2xs"
                  style={{ backgroundColor: logoBg, color: logoColor }}
                >
                  {initial || deriveInitials(name) || "F"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="color"
                value={logoBg}
                onChange={(e) => setLogoBg(e.target.value)}
                className="h-7 w-10 rounded cursor-pointer border p-0.5 bg-background shrink-0"
              />
              <Input
                value={logoBg}
                onChange={(e) => setLogoBg(e.target.value)}
                className="h-7 font-mono text-[11px]"
                placeholder="BG Color"
              />
              <input
                type="color"
                value={logoColor}
                onChange={(e) => setLogoColor(e.target.value)}
                className="h-7 w-10 rounded cursor-pointer border p-0.5 bg-background shrink-0"
              />
              <Input
                value={logoColor}
                onChange={(e) => setLogoColor(e.target.value)}
                className="h-7 font-mono text-[11px]"
                placeholder="Text Color"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESET_BG_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setLogoBg(c.hex)}
                  title={c.label}
                  className={cn(
                    "h-4 w-4 rounded-full border shadow-2xs transition-transform hover:scale-110",
                    logoBg.toLowerCase() === c.hex.toLowerCase() &&
                      "ring-2 ring-primary ring-offset-1",
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 text-xs bg-primary text-primary-foreground shadow-xs gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Update Franchise" : "Create Franchise"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
