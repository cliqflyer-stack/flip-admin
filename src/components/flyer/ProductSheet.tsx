import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Check, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolveImageUrl } from "@/lib/api-client";

export interface ProductSheetProps {
  product: any | null;
  open?: boolean | undefined;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onAddToList?: (product: any) => void;
}

// Heights mirror the mobile app's ProductBottomSheet: a compact peek, then 75% of the screen.
const COLLAPSED_HEIGHT = "h-[45vh]";
const EXPANDED_HEIGHT = "h-[75vh]";

/** Customer-facing bottom sheet with the tapped product's details. */
export function ProductSheet({
  product,
  open,
  onOpenChange,
  onClose,
  onAddToList,
}: ProductSheetProps) {
  const [added, setAdded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : product !== null;

  // Every newly opened product starts collapsed, like the mobile sheet.
  useEffect(() => {
    if (isOpen) setIsExpanded(false);
  }, [product, isOpen]);

  // Vaul renders through a modal Radix Dialog, which sets body pointer-events to "none" while open
  // and blocks taps on the flyer behind the sheet. Keep the page interactive while the sheet is open.
  useEffect(() => {
    if (!isOpen) return;
    const body = document.body;
    const allowPointerEvents = () => {
      if (body.style.pointerEvents !== "auto") body.style.pointerEvents = "auto";
    };
    allowPointerEvents();
    const observer = new MutationObserver(allowPointerEvents);
    observer.observe(body, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, [isOpen]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      try {
        onOpenChange(nextOpen);
      } catch (e) {
        console.warn("onOpenChange error", e);
      }
    }
    if (!nextOpen && onClose) {
      try {
        onClose();
      } catch (e) {
        console.warn("onClose error", e);
      }
    }
  };

  const offerPrice = Number(product?.offerPrice || 0);
  const regularPrice = Number(product?.regularPrice || product?.originalPrice || 0);
  const discount =
    regularPrice > offerPrice && regularPrice > 0
      ? Math.round((1 - offerPrice / regularPrice) * 100)
      : 0;

  const imageUrl = resolveImageUrl(product?.imageUrl || product?.image);

  // Extra details revealed when the sheet is expanded (SKU, UPC and product options).
  const detailRows: { label: string; value: string }[] = [
    ...(product?.sku ? [{ label: "SKU", value: String(product.sku) }] : []),
    ...(product?.upc ? [{ label: "UPC", value: String(product.upc) }] : []),
    ...(Array.isArray(product?.options)
      ? product.options
          .filter((o: { label?: string; value?: string }) => o.label && o.value)
          .map((o: { label: string; value: string }) => ({ label: o.label, value: o.value }))
      : []),
  ];

  const handleAdd = () => {
    setAdded(true);
    if (onAddToList && product) {
      onAddToList(product);
    }
    toast.success(`Added ${product?.name} to your shopping list!`);
    setTimeout(() => {
      setAdded(false);
      handleOpenChange(false);
    }, 450);
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange} modal={false}>
      <DrawerContent
        hideOverlay
        // Taps outside the sheet (e.g. another flyer item) must not dismiss it.
        onPointerDownOutside={(event) => event.preventDefault()}
        className={`mx-auto ${isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT} max-w-md transition-[height] duration-300 ease-out bg-background/95 backdrop-blur-md border border-b-0 border-border/80 shadow-[0_-12px_36px_rgba(0,0,0,0.14)] rounded-t-2xl`}
      >
        <DrawerHeader className="text-left pb-2">
          <DrawerDescription asChild>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>
                {product?.brand || "Brand"} · {product?.category || "General"}
              </span>
              {discount > 0 && (
                <Badge variant="destructive" className="text-[10px] h-5 px-1.5 font-bold">
                  {discount}% OFF
                </Badge>
              )}
            </div>
          </DrawerDescription>
          <DrawerTitle className="text-lg font-bold text-foreground mt-1">
            {product?.name || "Product Details"}
          </DrawerTitle>
        </DrawerHeader>

        {product && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-6">
            <div className="flex gap-4 items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/30">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    ${offerPrice.toFixed(2)}
                  </span>
                  {regularPrice > offerPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      ${regularPrice.toFixed(2)}
                    </span>
                  )}
                  {product.unit && (
                    <span className="text-xs text-muted-foreground font-medium">
                      / {product.unit}
                    </span>
                  )}
                </div>
                {product.description && (
                  <p
                    className={`text-xs text-muted-foreground ${isExpanded ? "" : "line-clamp-2"}`}
                  >
                    {product.description}
                  </p>
                )}
              </div>
            </div>

            {isExpanded && detailRows.length > 0 && (
              <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/30 p-3 text-xs">
                {detailRows.map((row) => (
                  <div key={`${row.label}-${row.value}`}>
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="font-semibold text-foreground font-mono">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              aria-expanded={isExpanded}
              className="flex w-full items-center justify-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              {isExpanded ? (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Show details
                </>
              )}
            </button>

            <DrawerFooter className="px-0 pt-2 flex flex-row gap-2">
              <Button
                onClick={handleAdd}
                className="flex-1 h-9 text-xs font-semibold gap-1.5"
                variant={added ? "secondary" : "default"}
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Added to List</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Add to Shopping List</span>
                  </>
                )}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" className="h-9 px-3 text-xs">
                  Close
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
