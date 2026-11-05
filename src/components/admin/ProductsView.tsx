import React, { useState } from "react";
import {
  Check,
  Filter,
  Loader2,
  Package,
  Plus,
  Search,
  Store,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createProduct,
  resolveImageUrl,
  type ApiProduct,
  type Merchant,
} from "@/lib/api-client";

interface ProductsViewProps {
  products: ApiProduct[];
  merchants: Merchant[];
  onProductCreated: (product: ApiProduct) => void;
  loading: boolean;
}

export function ProductsView({
  products,
  merchants,
  onProductCreated,
  loading,
}: ProductsViewProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [regularPrice, setRegularPrice] = useState("9.99");
  const [offerPrice, setOfferPrice] = useState("7.49");
  const [merchantId, setMerchantId] = useState(merchants[0]?.id || "merch_longos");
  const [imageUrl, setImageUrl] = useState("/uploads/products/coca-cola.jpg");

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const created = await createProduct({
        name,
        brand,
        category,
        regularPrice: parseFloat(regularPrice) || 0,
        offerPrice: parseFloat(offerPrice) || 0,
        merchantId,
        imageUrl,
        unit: "unit",
        description: `${brand} ${name} retail promotional product item.`,
      });

      toast.success(`Product "${name}" added to Neon Postgres catalog!`);
      onProductCreated(created);
      setDialogOpen(false);
      setName("");
      setBrand("");
    } catch (err: any) {
      toast.error(`Failed to create product: ${err.message}`);
    } finally {
      setIsCreating(false);
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
            Products mapped onto flyers for interactive touch reveals and deal popups.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setDialogOpen(true)}
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
              placeholder="Search by product name, brand, or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 text-xs">
            <span className="text-muted-foreground text-[11px] font-semibold mr-1 shrink-0">Category:</span>
            {categories.slice(0, 6).map((cat) => (
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
              <TableHead>Category</TableHead>
              <TableHead>Regular Price</TableHead>
              <TableHead>Offer Deal Price</TableHead>
              <TableHead>Savings</TableHead>
              <TableHead className="text-right">Database ID</TableHead>
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
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="font-semibold text-foreground">{prod.name}</div>
                      <div className="text-[11px] text-muted-foreground">{prod.brand}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {prod.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground line-through font-mono">
                      ${reg.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      ${off.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {savings > 0 ? (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold">
                          {Math.round(savings)}% OFF
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-[10px] text-muted-foreground">
                      {prod.id}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add Product Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-5 w-5 text-primary" />
                <DialogTitle className="text-lg font-bold">Add Product to Catalog</DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                Creates a new record in Neon Postgres available for instant flyer mapping.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div className="space-y-1">
                <Label htmlFor="p-name" className="text-xs font-semibold">
                  Product Name
                </Label>
                <Input
                  id="p-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Lay's Classic Potato Chips 220g"
                  required
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="p-brand" className="text-xs font-semibold">
                    Brand
                  </Label>
                  <Input
                    id="p-brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Frito-Lay"
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="p-cat" className="text-xs font-semibold">
                    Category
                  </Label>
                  <Input
                    id="p-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Snacks"
                    required
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="p-reg" className="text-xs font-semibold">
                    Regular Price ($)
                  </Label>
                  <Input
                    id="p-reg"
                    type="number"
                    step="0.01"
                    value={regularPrice}
                    onChange={(e) => setRegularPrice(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="p-off" className="text-xs font-semibold">
                    Offer Price ($)
                  </Label>
                  <Input
                    id="p-off"
                    type="number"
                    step="0.01"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="p-merch" className="text-xs font-semibold">
                  Merchant / Store
                </Label>
                <Select value={merchantId} onValueChange={setMerchantId}>
                  <SelectTrigger id="p-merch" className="text-xs">
                    <SelectValue placeholder="Select a merchant" />
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
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreating} className="bg-primary text-primary-foreground font-semibold">
                {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                {isCreating ? "Saving to Postgres..." : "Save Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
