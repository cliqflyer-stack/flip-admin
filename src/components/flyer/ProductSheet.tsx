import React, { useState } from "react";
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onAddToList?: (product: any) => void;
}

/** Customer-facing bottom sheet with the tapped product's details. */
export function ProductSheet({
  product,
  open,
  onOpenChange,
  onClose,
  onAddToList,
}: ProductSheetProps) {
  const [added, setAdded] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : product !== null;

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
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="mx-auto max-w-md bg-background border-t">
        <DrawerHeader className="text-left pb-2">
          <DrawerDescription asChild>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>{product?.brand || "Brand"} · {product?.category || "General"}</span>
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
          <div className="space-y-4 px-4 pb-6">
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
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {product.description}
                  </p>
                )}
              </div>
            </div>

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
