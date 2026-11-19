import React, { useEffect, useState } from "react";
import {
  CalendarClock,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  updateFlyer,
  formatIsoDateOnly,
  toEndOfDayIso,
  toStartOfDayIso,
  getRelativeDateString,
  getEndOfCurrentMonthString,
  getFlyerExpiryInfo,
  resolveImageUrl,
  type ApiFlyer,
  type Merchant,
} from "@/lib/api-client";

interface FlyerExpiryDialogProps {
  flyer: ApiFlyer | null;
  merchant?: Merchant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFlyerUpdated: (updatedFlyer: ApiFlyer) => void;
}

export function FlyerExpiryDialog({
  flyer,
  merchant,
  open,
  onOpenChange,
  onFlyerUpdated,
}: FlyerExpiryDialogProps) {
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [status, setStatus] = useState<ApiFlyer["status"]>("published");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (flyer) {
      setValidFrom(formatIsoDateOnly(flyer.validFrom));
      setValidTo(formatIsoDateOnly(flyer.validTo));
      setStatus(flyer.status || "published");
    }
  }, [flyer, open]);

  if (!flyer) return null;

  // Compute preview expiry info for current form values
  const simulatedFlyer: ApiFlyer = {
    ...flyer,
    status,
    validFrom: validFrom ? toStartOfDayIso(validFrom) : null,
    validTo: validTo ? toEndOfDayIso(validTo) : null,
  };
  const expiryInfo = getFlyerExpiryInfo(simulatedFlyer);

  const handleApplyPreset = (days: number | "month" | "clear") => {
    if (days === "clear") {
      setValidTo("");
      toast.info("Expiry date cleared. Circular will remain visible indefinitely.");
      return;
    }

    if (days === "month") {
      const eom = getEndOfCurrentMonthString();
      setValidTo(eom);
      toast.info(`Set expiry to end of month (${eom}).`);
      return;
    }

    const futureDate = getRelativeDateString(days);
    setValidTo(futureDate);
    toast.info(`Set expiry to +${days} days (${futureDate}).`);
  };

  const handleSave = async () => {
    if (validFrom && validTo && new Date(validFrom) > new Date(validTo)) {
      toast.error("Valid From date cannot be after Expiry Date.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<ApiFlyer> = {
        status,
        validFrom: validFrom ? toStartOfDayIso(validFrom) : null,
        validTo: validTo ? toEndOfDayIso(validTo) : null,
      };

      const updated = await updateFlyer(flyer.id, payload);
      onFlyerUpdated(updated);
      toast.success(
        validTo
          ? `Expiry date updated. Valid until ${new Date(toEndOfDayIso(validTo)).toLocaleDateString()}.`
          : "Validity updated. Flyer has no expiry date."
      );
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Failed to update validity: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const brand = merchant || flyer.merchant;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b bg-muted/20">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                Configure Circular Validity &amp; Expiry
              </DialogTitle>
              <DialogDescription className="text-xs">
                Set active start and expiration dates. Expired flyers are automatically hidden from shoppers.
              </DialogDescription>
            </div>
            {brand && (
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold shrink-0 shadow-xs"
                style={{ backgroundColor: brand.logoBg || "#075E50", color: brand.logoColor || "#FFFFFF" }}
              >
                {brand.initial}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 text-xs">
          {/* Circular Target Card */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <div className="h-12 w-12 rounded border bg-background overflow-hidden shrink-0">
              <img
                src={resolveImageUrl(flyer.flyerImageUrl)}
                alt={flyer.title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm text-foreground truncate">{flyer.title}</h4>
              <p className="text-[11px] text-muted-foreground truncate">
                {brand?.name} · {flyer.storeLocation?.name || "Chain-wide (All Stores)"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={expiryInfo.badgeVariant} className="text-[10px] font-semibold">
                  {expiryInfo.badgeLabel}
                </Badge>
                {expiryInfo.isVisibleToShoppers ? (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Visible to shoppers
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Hidden from shoppers
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Quick Expiry Presets
            </Label>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleApplyPreset(7)}
                className="h-7 text-xs px-2.5 font-medium"
              >
                +7 Days (1 Wk)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleApplyPreset(14)}
                className="h-7 text-xs px-2.5 font-medium"
              >
                +14 Days (2 Wks)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleApplyPreset(30)}
                className="h-7 text-xs px-2.5 font-medium"
              >
                +30 Days (1 Mo)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleApplyPreset("month")}
                className="h-7 text-xs px-2.5 font-medium"
              >
                End of Month
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleApplyPreset("clear")}
                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
              >
                No Expiry
              </Button>
            </div>
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="valid-from-input" className="text-xs font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Valid From <span className="text-[11px] text-muted-foreground font-normal">(Start)</span>
              </Label>
              <Input
                id="valid-from-input"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="valid-to-input" className="text-xs font-medium flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                Expiry Date <span className="text-[11px] text-muted-foreground font-normal">(Valid To)</span>
              </Label>
              <Input
                id="valid-to-input"
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                className="h-8 text-xs font-medium"
              />
            </div>
          </div>

          {/* Publication Status */}
          <div className="space-y-1.5">
            <Label htmlFor="flyer-status-select" className="text-xs font-medium">
              Publishing State
            </Label>
            <Select value={status} onValueChange={(val: any) => setStatus(val)}>
              <SelectTrigger id="flyer-status-select" className="h-8 text-xs">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published" className="text-xs">
                  Published (Live on feed subject to validity dates)
                </SelectItem>
                <SelectItem value="draft" className="text-xs">
                  Draft (Hidden from all shoppers)
                </SelectItem>
                <SelectItem value="archived" className="text-xs">
                  Archived (Historical reference only)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Visibility Preview Message */}
          {validTo ? (
            simulatedFlyer.validTo && new Date(simulatedFlyer.validTo) < new Date() ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <div className="space-y-0.5">
                  <p className="font-semibold">This circular is Expired &amp; Hidden</p>
                  <p className="text-[11px]">
                    The chosen expiry date ({new Date(toEndOfDayIso(validTo)).toLocaleDateString()}) is in the past. Shoppers cannot see or access this flyer.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 dark:border-emerald-700/60 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Shopper Visibility Scheduled</p>
                  <p className="text-[11px]">
                    This flyer will remain visible to customers until{" "}
                    <strong>
                      {new Date(toEndOfDayIso(validTo)).toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </strong>{" "}
                    at 11:59 PM. After that date and time, it will automatically vanish from public feeds.
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">No Expiry Configured</p>
                <p className="text-[11px]">
                  This circular has no expiration date and will stay visible continuously unless manually archived or set to draft.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-xs"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="h-3.5 w-3.5" />}
            {isSaving ? "Saving Dates..." : "Save Expiry Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
