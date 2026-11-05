import React, { useState } from "react";
import { Check, ChevronsUpDown, Edit2, Plus, Search, Trash2 } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  deleteProduct,
  resolveImageUrl,
  type ApiProduct,
  type Merchant,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface ProductsViewProps {
  products: ApiProduct[];
  merchants: Merchant[];
  onNavigateToAddProduct: () => void;
  onNavigateToEditProduct: (productId: string) => void;
  onProductDeleted?: (id: string) => void;
  loading: boolean;
}

const PAGE_SIZE = 20;

export function ProductsView({
  products,
  merchants,
  onNavigateToAddProduct,
  onNavigateToEditProduct,
  onProductDeleted,
  loading,
}: ProductsViewProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Extract unique categories from catalog products
  const uniqueCategories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  );

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * PAGE_SIZE;
  const paginatedProducts = filtered.slice(startIndex, startIndex + PAGE_SIZE);

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

  return (
    <div className="space-y-6 p-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Product Catalog</h1>
            <Badge variant="secondary" className="text-xs font-semibold">
              {products.length} Products
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage catalog items, retail pricing, discounts, and brand mapping for circular hotspots.
          </p>
        </div>

        <Button
          size="sm"
          onClick={onNavigateToAddProduct}
          className="h-8 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Product
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border shadow-xs">
        <CardContent className="p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search product name, brand, or SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search and Select Category Combobox */}
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  size="sm"
                  aria-expanded={categoryOpen}
                  className="h-8 text-xs justify-between w-48 font-normal"
                >
                  <span className="truncate">
                    {categoryFilter === "all" ? "All Categories" : categoryFilter}
                  </span>
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search category..." className="h-8 text-xs" />
                  <CommandList>
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setCategoryFilter("all");
                          setCategoryOpen(false);
                          setCurrentPage(1);
                        }}
                        className="text-xs cursor-pointer flex items-center justify-between"
                      >
                        <span>All Categories</span>
                        <Check
                          className={cn(
                            "h-3.5 w-3.5",
                            categoryFilter === "all" ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                      {uniqueCategories.map((cat) => (
                        <CommandItem
                          key={cat}
                          value={cat}
                          onSelect={() => {
                            setCategoryFilter(cat);
                            setCategoryOpen(false);
                            setCurrentPage(1);
                          }}
                          className="text-xs cursor-pointer flex items-center justify-between"
                        >
                          <span className="truncate">{cat}</span>
                          <Check
                            className={cn(
                              "h-3.5 w-3.5",
                              categoryFilter === cat ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Products Table Card */}
      <Card className="border shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 text-xs">
              <TableHead className="w-14">Image</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Regular</TableHead>
              <TableHead className="text-right">Offer Price</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell colSpan={9} className="h-12 bg-muted/10" />
                </TableRow>
              ))
            ) : paginatedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-xs text-muted-foreground">
                  No products found matching your search criteria.
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((p) => {
                const reg = parseFloat(String(p.regularPrice));
                const off = parseFloat(String(p.offerPrice));
                const hasDiscount = !isNaN(reg) && !isNaN(off) && reg > off && off > 0;
                const savingsPct = hasDiscount ? Math.round(((reg - off) / reg) * 100) : 0;

                return (
                  <TableRow key={p.id} className="text-xs group hover:bg-muted/40 transition-colors">
                    <TableCell className="p-2">
                      <div className="h-9 w-9 rounded border bg-muted/30 flex items-center justify-center overflow-hidden">
                        {p.imageUrl ? (
                          <img
                            src={resolveImageUrl(p.imageUrl)}
                            alt={p.name}
                            className="h-full w-full object-contain p-0.5"
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">No img</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground max-w-[200px] truncate">
                      {p.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.brand}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {p.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.unit || "—"}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {p.sku || "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ${Number(p.regularPrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">
                      ${Number(p.offerPrice).toFixed(2)}
                      {hasDiscount && (
                        <span className="ml-1 text-[10px] bg-emerald-500/10 text-emerald-600 px-1 py-0.5 rounded font-bold">
                          {savingsPct}% off
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onNavigateToEditProduct(p.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit product"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(p)}
                          disabled={deletingId === p.id}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Delete product"
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

        {/* Standard shadcn Pagination Footer */}
        {filtered.length > 0 && (
          <div className="p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-muted/10">
            <span className="text-muted-foreground">
              Showing{" "}
              <strong>
                {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filtered.length)}
              </strong>{" "}
              of <strong>{filtered.length}</strong> products
            </span>

            {totalPages > 1 && (
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={cn(
                        "h-8 text-xs cursor-pointer",
                        validPage === 1 ? "pointer-events-none opacity-50" : ""
                      )}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    // Show first page, last page, and pages around current page
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - validPage) <= 1
                    ) {
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            isActive={validPage === pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className="h-8 w-8 text-xs cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                    if (pageNum === validPage - 2 || pageNum === validPage + 2) {
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationEllipsis className="h-8 w-8" />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className={cn(
                        "h-8 text-xs cursor-pointer",
                        validPage === totalPages ? "pointer-events-none opacity-50" : ""
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
