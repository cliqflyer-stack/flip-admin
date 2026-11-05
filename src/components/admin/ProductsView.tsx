import React, { useState } from "react";
import {
  Edit2,
  Filter,
  Loader2,
  Package,
  Plus,
  Search,
  Store,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
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
import { ProductDialog } from "./ProductDialog";
import {
  deleteProduct,
  resolveImageUrl,
  type ApiProduct,
  type Merchant,
} from "@/lib/api-client";

interface ProductsViewProps {
  products: ApiProduct[];
  merchants: Merchant[];
  onProductCreated: (product: ApiProduct) => void;
  onProductUpdated?: (product: ApiProduct) => void;
  onProductDeleted?: (id: string) => void;
  loading: boolean;
}

export function ProductsView({
  products,
  merchants,
  onProductCreated,
  onProductUpdated,
  onProductDeleted,
  loading,
}: ProductsViewProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ApiProduct | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleOpenCreate = () => {
    setProductToEdit(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (product: ApiProduct) => {
    setProductToEdit(product);
    setDialogOpen(true);
  };

  const handleDelete = async (product: ApiProduct) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}" from catalog?`)) {
      return;
    }

    setDeletingId(product.id);
    try {
      await deleteProduct(product.id);
      toast.success(`Product "${product.name}" deleted successfully.`);
      if (onProductDeleted) {
        onProductDeleted(product.id);
      }
    } catch (err: any) {
      toast.error(`Failed to delete product: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = (product: ApiProduct, isEdit: boolean) => {
    if (isEdit) {
      if (onProductUpdated) onProductUpdated(product);
    } else {
      onProductCreated(product);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Product Catalog</h1>
            <Badge variant="secondary" className="text-xs font-semibold">
              {products.length} Items in DB
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add and manage retail products with images, prices, discounts, and brand mapping.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleOpenCreate}
          className="h-8 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Product
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by product name, brand, category, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 text-xs">
            <span className="text-muted-foreground text-[11px] font-semibold mr-1 shrink-0">Category:</span>
            {categories.slice(0, 7).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="overflow-hidden shadow-xs border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-16">Item</TableHead>
              <TableHead>Product & Brand</TableHead>
              <TableHead>Category & Unit</TableHead>
              <TableHead>Regular Price</TableHead>
              <TableHead>Offer Deal Price</TableHead>
              <TableHead>Savings</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                  Loading products from Neon DB...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                  No products matched your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((prod) => {
                const reg = Number(prod.regularPrice || 0);
                const off = Number(prod.offerPrice || 0);
                const savings = reg > off ? ((reg - off) / reg) * 100 : 0;

                return (
                  <TableRow key={prod.id} className="text-xs hover:bg-muted/30">
                    <TableCell>
                      <img
                        src={resolveImageUrl(prod.imageUrl)}
                        alt={prod.name}
                        className="h-10 w-10 rounded object-cover border bg-background"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/uploads/products/coca-cola.jpg";
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        {prod.name}
                        {prod.sku && (
                          <span className="text-[10px] font-mono text-muted-foreground border px-1 rounded">
                            {prod.sku}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span>{prod.brand || "General Brand"}</span>
                        {prod.merchant && (
                          <>
                            <span>•</span>
                            <span className="font-medium">{prod.merchant.name}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {prod.category}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">({prod.unit || "each"})</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground line-through font-mono">
                      ${reg.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      ${off.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {savings > 0 ? (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                          {Math.round(savings)}% OFF
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(prod)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title="Edit Product"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === prod.id}
                          onClick={() => handleDelete(prod)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete Product"
                        >
                          {deletingId === prod.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Product Add/Edit Dialog */}
      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        productToEdit={productToEdit}
        merchants={merchants}
        onSave={handleSaved}
      />
    </div>
  );
}
