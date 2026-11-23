import React, { useState } from "react";
import {
  Baby,
  Book,
  Car,
  Coffee,
  Dumbbell,
  Gift,
  Heart,
  Home,
  Loader2,
  Package,
  Pencil,
  Plus,
  Shirt,
  ShoppingCart,
  Smile,
  Sparkles,
  Tag,
  Tags,
  Trash2,
  Tv,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
  type Merchant,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface CategoriesManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  merchants: Merchant[];
  onCategoriesUpdated: (updatedList: Category[]) => void;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "shopping-cart": ShoppingCart,
  heart: Heart,
  home: Home,
  smile: Smile,
  zap: Zap,
  sparkles: Sparkles,
  tag: Tag,
  tv: Tv,
  utensils: Utensils,
  coffee: Coffee,
  gift: Gift,
  shirt: Shirt,
  baby: Baby,
  book: Book,
  car: Car,
  dumbbell: Dumbbell,
  package: Package,
};

export function RenderCategoryIcon({
  icon,
  className = "h-4 w-4",
}: {
  icon?: string | null | undefined;
  className?: string | undefined;
}) {
  const IconComponent = (icon && CATEGORY_ICONS[icon]) || Tag;
  return <IconComponent className={className} />;
}

export function CategoriesManagerDialog({
  open,
  onOpenChange,
  categories,
  merchants,
  onCategoriesUpdated,
}: CategoriesManagerDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [idSlug, setIdSlug] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("tag");
  const [displayOrder, setDisplayOrder] = useState<number>(categories.length + 1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const startCreate = () => {
    setEditingId(null);
    setName("");
    setIdSlug("");
    setSelectedIcon("tag");
    setDisplayOrder(categories.length + 1);
    setIsCreating(true);
  };

  const startEdit = (cat: Category) => {
    setIsCreating(false);
    setEditingId(cat.id);
    setName(cat.name);
    setIdSlug(cat.id);
    setSelectedIcon(cat.icon || "tag");
    setDisplayOrder(cat.displayOrder ?? 0);
  };

  const cancelForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setName("");
    setIdSlug("");
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (isCreating) {
      setIdSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/(^_|_$)/g, ""),
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Please enter a category name.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        // Update existing category
        const updated = await updateCategory(editingId, {
          name: trimmedName,
          icon: selectedIcon,
          displayOrder: Number(displayOrder),
        });
        const nextList = categories.map((c) => (c.id === updated.id ? updated : c));
        onCategoriesUpdated(nextList);
        toast.success(`Category "${updated.name}" updated successfully.`);
      } else {
        // Create new category
        const created = await createCategory({
          id: idSlug.trim() || undefined,
          name: trimmedName,
          icon: selectedIcon,
          displayOrder: Number(displayOrder),
        });
        const nextList = [...categories, created].sort(
          (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
        );
        onCategoriesUpdated(nextList);
        toast.success(`Category "${created.name}" created successfully.`);
      }
      cancelForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save category: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    const attachedCount = merchants.filter(
      (m) => m.categoryId === cat.id || m.category?.id === cat.id,
    ).length;

    const confirmMsg =
      attachedCount > 0
        ? `Are you sure? ${attachedCount} franchise brand(s) currently belong to "${cat.name}". Deleting it will detach them safely.`
        : `Are you sure you want to delete category "${cat.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    setIsDeletingId(cat.id);
    try {
      await deleteCategory(cat.id);
      const nextList = categories.filter((c) => c.id !== cat.id);
      onCategoriesUpdated(nextList);
      toast.success(`Category "${cat.name}" deleted.`);
      if (editingId === cat.id) cancelForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Delete failed: ${msg}`);
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Tags className="h-4 w-4 text-primary" />
                Dynamic Categories Manager
              </DialogTitle>
              <DialogDescription className="text-xs">
                Manage retail and product categories stored in Neon Postgres DB.
              </DialogDescription>
            </div>
            {!isCreating && !editingId && (
              <Button
                size="sm"
                onClick={startCreate}
                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Category
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Create / Edit Form Card */}
        {(isCreating || editingId) && (
          <form
            onSubmit={handleSave}
            className="rounded-lg border bg-muted/30 p-4 space-y-4 my-2 text-xs"
          >
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                {isCreating ? <Plus className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                {isCreating ? "New Dynamic Category" : `Edit Category: ${name}`}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={cancelForm}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Category Name *</Label>
                <Input
                  placeholder="e.g. Electronics & Tech"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">ID Identifier / Key</Label>
                <Input
                  placeholder="electronics"
                  value={idSlug}
                  onChange={(e) => setIdSlug(e.target.value)}
                  disabled={!isCreating}
                  className="h-8 font-mono text-xs"
                  required
                />
              </div>
            </div>

            {/* Icon Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center justify-between">
                <span>Select Icon</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Current: {selectedIcon}
                </span>
              </Label>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-md border bg-background">
                {Object.keys(CATEGORY_ICONS).map((iconKey) => {
                  const Icon = CATEGORY_ICONS[iconKey] ?? Tag;
                  const isSel = selectedIcon === iconKey;
                  return (
                    <button
                      key={iconKey}
                      type="button"
                      onClick={() => setSelectedIcon(iconKey)}
                      title={iconKey}
                      className={cn(
                        "h-7 w-7 rounded-md border flex items-center justify-center transition-all",
                        isSel
                          ? "bg-primary text-primary-foreground border-primary shadow-xs scale-105"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Display Sort Order</Label>
                <Input
                  type="number"
                  min={0}
                  max={999}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex items-end justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={cancelForm}
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
                  {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  {isCreating ? "Create Category" : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Existing Categories List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 pt-2">
          {categories.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No categories found. Click &quot;Add Category&quot; to create one.
            </div>
          ) : (
            categories.map((cat) => {
              const franchiseCount = merchants.filter(
                (m) => m.categoryId === cat.id || m.category?.id === cat.id,
              ).length;
              const isDeletingThis = isDeletingId === cat.id;

              return (
                <div
                  key={cat.id}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg border bg-card text-xs hover:border-primary/40 transition-colors",
                    editingId === cat.id && "ring-1 ring-primary bg-primary/5",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-primary shrink-0 border">
                      <RenderCategoryIcon icon={cat.icon} className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">{cat.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          #{cat.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          Order: {cat.displayOrder ?? 0}
                        </span>
                        <span className="text-muted-foreground/40">·</span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal">
                          {franchiseCount} Brand{franchiseCount === 1 ? "" : "s"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(cat)}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      title="Edit Category"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isDeletingThis}
                      onClick={() => handleDelete(cat)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Delete Category"
                    >
                      {isDeletingThis ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
