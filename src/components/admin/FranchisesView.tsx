import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  ExternalLink,
  Globe,
  Layers,
  MapPin,
  Pencil,
  Plus,
  Search,
  Store,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoriesManagerDialog, RenderCategoryIcon } from "./CategoriesManagerDialog";
import {
  deleteMerchant,
  resolveImageUrl,
  type ApiFlyer,
  type Category,
  type Merchant,
  type StoreLocation,
} from "@/lib/api-client";

interface FranchisesViewProps {
  merchants: Merchant[];
  categories: Category[];
  storeLocations: StoreLocation[];
  flyers: ApiFlyer[];
  onNavigateToAddFranchise: () => void;
  onNavigateToEditFranchise: (franchiseId: string) => void;
  onNavigateToStoresForFranchise: (franchiseId: string) => void;
  onNavigateToAddStoreForFranchise: (franchiseId: string) => void;
  onFranchiseDeleted: (id: string) => void;
  onCategoriesUpdated: (categories: Category[]) => void;
  loading: boolean;
}

export function FranchisesView({
  merchants,
  categories,
  storeLocations,
  flyers,
  onNavigateToAddFranchise,
  onNavigateToEditFranchise,
  onNavigateToStoresForFranchise,
  onNavigateToAddStoreForFranchise,
  onFranchiseDeleted,
  onCategoriesUpdated,
  loading,
}: FranchisesViewProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [franchiseToDelete, setFranchiseToDelete] = useState<Merchant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCategoriesManagerOpen, setIsCategoriesManagerOpen] = useState(false);

  // Available dynamic categories
  const categoriesList = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories;
    }
    const map = new Map<string, string>();
    merchants.forEach((m) => {
      if (m.category?.id && m.category?.name) {
        map.set(m.category.id, m.category.name);
      } else if (m.categoryId) {
        map.set(
          m.categoryId,
          m.categoryId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        );
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name, icon: "tag" }));
  }, [categories, merchants]);

  // Filtered merchants
  const filteredMerchants = useMemo(() => {
    return merchants.filter((m) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        (m.website && m.website.toLowerCase().includes(q)) ||
        (m.category?.name && m.category.name.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === "all" ||
        m.categoryId === selectedCategory ||
        m.category?.id === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [merchants, search, selectedCategory]);

  // Compute store and flyer counts per franchise
  const storeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    storeLocations.forEach((loc) => {
      map[loc.merchantId] = (map[loc.merchantId] || 0) + 1;
    });
    return map;
  }, [storeLocations]);

  const flyerCounts = useMemo(() => {
    const map: Record<string, number> = {};
    flyers.forEach((f) => {
      map[f.merchantId] = (map[f.merchantId] || 0) + 1;
    });
    return map;
  }, [flyers]);

  const handleDeleteConfirm = async () => {
    if (!franchiseToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMerchant(franchiseToDelete.id);
      toast.success(`Franchise "${franchiseToDelete.name}" deleted successfully.`);
      onFranchiseDeleted(franchiseToDelete.id);
      setFranchiseToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete franchise";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const associatedStoresCount = franchiseToDelete ? storeCounts[franchiseToDelete.id] || 0 : 0;
  const associatedFlyersCount = franchiseToDelete ? flyerCounts[franchiseToDelete.id] || 0 : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Franchises</h1>
            <Badge variant="secondary" className="text-xs font-semibold">
              {merchants.length} Brands
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage retail franchise chains, brand identity, colors, logos, and branch network.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoriesManagerOpen(true)}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Tag className="h-3.5 w-3.5 text-primary" />
            Categories ({categories.length})
          </Button>

          <Button
            onClick={onNavigateToAddFranchise}
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium bg-primary text-primary-foreground shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Franchise
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Franchise Chains</span>
              <Building2 className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{merchants.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Configured retail brands</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Store Branches</span>
              <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{storeLocations.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Total physical locations</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Digital Flyers</span>
              <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{flyers.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Circulars in circulation</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Categories</span>
              <Tag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{categoriesList.length || 4}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Retail market sectors</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border shadow-xs">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search franchises by name, slug, or website..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-8 text-xs w-[170px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-medium">
                    All Categories
                  </SelectItem>
                  {categoriesList.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <RenderCategoryIcon
                          icon={cat.icon}
                          className="h-3 w-3 text-muted-foreground"
                        />
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(search || selectedCategory !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                  }}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Franchises Table */}
      <Card className="border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="text-xs">
                <TableHead className="w-[280px]">Brand / Franchise</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Branding Colors</TableHead>
                <TableHead>Branches</TableHead>
                <TableHead>Circulars</TableHead>
                <TableHead>Website</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && merchants.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground text-xs"
                  >
                    Loading franchises from database...
                  </TableCell>
                </TableRow>
              ) : filteredMerchants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="max-w-xs mx-auto flex flex-col items-center justify-center text-center space-y-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">No franchises found</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {search || selectedCategory !== "all"
                            ? "Try adjusting your search query or category filter."
                            : "Get started by adding your first retail franchise brand."}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={onNavigateToAddFranchise}
                        className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Franchise
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMerchants.map((merchant) => {
                  const branchesCount = storeCounts[merchant.id] || 0;
                  const circularsCount = flyerCounts[merchant.id] || 0;
                  const categoryName =
                    merchant.category?.name ||
                    (merchant.categoryId
                      ? merchant.categoryId
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())
                      : "General");

                  return (
                    <TableRow key={merchant.id} className="text-xs hover:bg-muted/30">
                      {/* Brand Info */}
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {merchant.logoUrl ? (
                            <img
                              src={resolveImageUrl(merchant.logoUrl)}
                              alt={merchant.name}
                              className="h-9 w-9 rounded-md object-contain border bg-background p-0.5 shrink-0"
                            />
                          ) : (
                            <div
                              className="h-9 w-9 rounded-md flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs"
                              style={{
                                backgroundColor: merchant.logoBg || "#075E50",
                                color: merchant.logoColor || "#FFFFFF",
                              }}
                            >
                              {merchant.initial || merchant.name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate max-w-[180px]">
                              {merchant.name}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground truncate">
                              @{merchant.slug}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[11px] font-normal py-0.5 gap-1.5 inline-flex items-center"
                        >
                          <RenderCategoryIcon
                            icon={merchant.category?.icon}
                            className="h-3 w-3 text-muted-foreground"
                          />
                          <span>{categoryName}</span>
                        </Badge>
                      </TableCell>

                      {/* Brand Colors */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 border rounded px-1.5 py-0.5 bg-background shadow-2xs">
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-inner"
                              style={{ backgroundColor: merchant.logoBg || "#075E50" }}
                              title={`Background: ${merchant.logoBg || "#075E50"}`}
                            />
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-inner"
                              style={{ backgroundColor: merchant.logoColor || "#FFFFFF" }}
                              title={`Text: ${merchant.logoColor || "#FFFFFF"}`}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">
                            {merchant.logoBg || "#075E50"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Branches */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onNavigateToStoresForFranchise(merchant.id)}
                            className="h-6 px-2 text-[11px] font-medium text-foreground hover:bg-muted gap-1"
                            title="View store branches in Stores view"
                          >
                            <MapPin className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <span>
                              {branchesCount} Store{branchesCount === 1 ? "" : "s"}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onNavigateToAddStoreForFranchise(merchant.id)}
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            title="Add branch location for this franchise"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* Circulars */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-[11px] font-medium bg-muted text-foreground"
                        >
                          {circularsCount} Flyer{circularsCount === 1 ? "" : "s"}
                        </Badge>
                      </TableCell>

                      {/* Website */}
                      <TableCell>
                        {merchant.website ? (
                          <a
                            href={
                              merchant.website.startsWith("http")
                                ? merchant.website
                                : `https://${merchant.website}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline max-w-[140px] truncate"
                          >
                            <Globe className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {merchant.website.replace(/^https?:\/\/(www\.)?/, "")}
                            </span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-70" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onNavigateToEditFranchise(merchant.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Edit Franchise"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setFranchiseToDelete(merchant)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Delete Franchise"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!franchiseToDelete}
        onOpenChange={(open) => !open && setFranchiseToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Franchise Brand?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs space-y-2 pt-2">
              <p>
                Are you sure you want to permanently delete{" "}
                <strong className="text-foreground">{franchiseToDelete?.name}</strong>?
              </p>
              {(associatedStoresCount > 0 || associatedFlyersCount > 0) && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20 text-xs">
                  <p className="font-semibold">Cascade Warning:</p>
                  <p className="mt-0.5">
                    This franchise currently has{" "}
                    <strong>
                      {associatedStoresCount} store branch{associatedStoresCount === 1 ? "" : "es"}
                    </strong>{" "}
                    and{" "}
                    <strong>
                      {associatedFlyersCount} digital circular
                      {associatedFlyersCount === 1 ? "" : "s"}
                    </strong>
                    . Deleting this franchise will also remove its associated store locations and
                    flyers from the database.
                  </p>
                </div>
              )}
              <p className="text-muted-foreground">
                This action cannot be undone and will synchronize directly with Neon Postgres DB.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-xs h-8">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="text-xs h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Franchise"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dynamic Categories Manager Modal */}
      <CategoriesManagerDialog
        open={isCategoriesManagerOpen}
        onOpenChange={setIsCategoriesManagerOpen}
        categories={categories}
        merchants={merchants}
        onCategoriesUpdated={onCategoriesUpdated}
      />
    </div>
  );
}
