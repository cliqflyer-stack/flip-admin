import React, { useState, useEffect } from "react";
import {
  Search,
  Loader2,
  Tag,
  ArrowRight,
  Store,
  Layers,
  Sparkles,
  ExternalLink,
  MapPin,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  searchDeals,
  resolveImageUrl,
  type DealSearchResult,
} from "@/lib/api-client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectResult: (result: DealSearchResult) => void;
  merchantId?: string | undefined;
  storeLocationId?: string | undefined;
}

/**
 * Component that renders the exact cropped portion of a flyer banner image
 * corresponding to a hotspot rectangle (x, y, width, height in 0..1 coordinates).
 */
export function FlyerBannerSnippet({
  flyerImageUrl,
  x = 0,
  y = 0,
  width = 0.3,
  height = 0.3,
  className = "w-16 h-16 rounded-md",
}: {
  flyerImageUrl: string;
  x?: number | undefined;
  y?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
  className?: string | undefined;
}) {
  const safeW = Math.max(0.05, width);
  const safeH = Math.max(0.05, height);

  // Calculate transform styles to frame the exact portion
  // Scale flyer image so the sub-rectangle fills 100% of container
  const scaleX = 1 / safeW;
  const scaleY = 1 / safeH;
  const transX = -(x / safeW) * 100;
  const transY = -(y / safeH) * 100;

  return (
    <div className={`relative overflow-hidden bg-muted/40 border shrink-0 ${className}`}>
      <img
        src={resolveImageUrl(flyerImageUrl)}
        alt="Deal Snippet"
        style={{
          position: "absolute",
          width: `${scaleX * 100}%`,
          height: `${scaleY * 100}%`,
          left: `${transX}%`,
          top: `${transY}%`,
          maxWidth: "none",
          maxHeight: "none",
        }}
        className="pointer-events-none select-none object-cover"
      />
    </div>
  );
}

export function DealSearchDialog({
  open,
  onOpenChange,
  onSelectResult,
  merchantId,
  storeLocationId,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DealSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
    // Fetch initial popular deals when opened
    handleSearch("");
  }, [open]);

  const handleSearch = async (q: string) => {
    setIsLoading(true);
    try {
      const data = await searchDeals({
        query: q,
        merchantId,
        storeLocationId,
        limit: 30,
      });
      setResults(data.results || []);
    } catch (err: any) {
      console.error("Search failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    handleSearch(val);
  };

  const handleItemClick = (result: DealSearchResult) => {
    onSelectResult(result);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Search Input Bar */}
        <div className="p-4 border-b flex items-center gap-3 bg-card">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            placeholder="Search deals, products, circular specials (e.g. Coke, Coffee, Chips)..."
            value={query}
            onChange={handleInputChange}
            className="border-0 shadow-none focus-visible:ring-0 text-sm h-9 px-0"
          />
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setQuery("");
                handleSearch("");
              }}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {results.length === 0 && !isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <Search className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="font-semibold text-foreground text-sm">No circular deals found</p>
              <p>Try searching for a different product name, brand, or store item.</p>
            </div>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="group p-3 rounded-xl border bg-background hover:bg-muted/40 hover:border-primary/50 transition-all cursor-pointer flex items-center gap-3.5 shadow-2xs"
              >
                {/* Visual Cropped Portion from Flyer Banner or Product Photo */}
                {item.hasHotspot && item.flyerImageUrl && item.x !== undefined ? (
                  <div className="relative">
                    <FlyerBannerSnippet
                      flyerImageUrl={item.flyerImageUrl}
                      x={item.x}
                      y={item.y}
                      width={item.width}
                      height={item.height}
                      className="w-18 h-18 rounded-lg shadow-2xs group-hover:scale-102 transition-transform"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/80 text-[8px] font-bold text-white px-1 rounded">
                      In Flyer
                    </span>
                  </div>
                ) : (
                  <div className="w-18 h-18 rounded-lg border bg-muted/40 overflow-hidden shrink-0">
                    <img
                      src={resolveImageUrl(item.productImageUrl)}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform"
                    />
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.brand && (
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {item.brand}
                      </span>
                    )}
                    {item.category && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {item.category}
                      </Badge>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-foreground truncate mt-0.5 group-hover:text-primary transition-colors">
                    {item.name}
                  </h4>

                  {/* Pricing */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-black text-rose-600 text-base">
                      ${Number(item.offerPrice || 0).toFixed(2)}
                    </span>
                    {item.regularPrice && Number(item.regularPrice) > Number(item.offerPrice) && (
                      <span className="line-through text-xs text-muted-foreground">
                        reg. ${Number(item.regularPrice).toFixed(2)}
                      </span>
                    )}
                    {item.unit && (
                      <span className="text-xs text-muted-foreground">/{item.unit}</span>
                    )}
                  </div>

                  {/* Circular / Store source info */}
                  {item.flyerTitle && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1 truncate">
                      <Store className="h-3 w-3 text-primary shrink-0" />
                      <span className="truncate">
                        {item.merchantName} · <strong>{item.flyerTitle}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Open indicator */}
                <div className="flex flex-col items-end gap-1 shrink-0 text-xs font-semibold text-primary">
                  <div className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Open in Circular</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Click to zoom &amp; scroll
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
