import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, RefreshCw, Scan, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  applyFlyerExtraction,
  fetchLatestExtraction,
  isExtractionRunning,
  resolveImageUrl,
  startFlyerExtraction,
  type ApiFlyer,
  type ApiProduct,
  type ExtractedItem,
  type ExtractionFlag,
  type ExtractionJob,
  type ExtractionSelection,
} from "@/lib/api-client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flyer: ApiFlyer;
  catalogProducts: ApiProduct[];
  hasUnsavedChanges: boolean;
  onApplied: () => Promise<void>;
}

const FLAG_LABELS: Record<ExtractionFlag, string> = {
  NO_NAME: "No product name found",
  AMBIGUOUS_PRICE: "Check the price: cents may have been joined",
  MULTI_BUY: "Multi-buy offer",
  PRICE_MISMATCH: "Regular price was not above the offer",
  SEVERAL_PRICES: "More than one price nearby",
  LOW_OCR_CONFIDENCE: "Text was hard to read",
  AI_READ: "Read by AI: check the name and price",
};

const NEW_PRODUCT = "new";

interface Draft {
  selected: boolean;
  name: string;
  offerPrice: string;
  regularPrice: string;
  productId: string;
}

const initialDraft = (item: ExtractedItem): Draft => ({
  selected: !item.needsReview && !item.applied,
  name: item.name,
  offerPrice: item.offerPrice.toFixed(2),
  regularPrice: item.regularPrice?.toFixed(2) ?? "",
  productId: item.matchedProductId ?? NEW_PRODUCT,
});

const isValid = (d: Draft) =>
  Boolean(d.name.trim()) &&
  Number(d.offerPrice) > 0 &&
  (d.regularPrice === "" || Number(d.regularPrice) > 0);

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Unknown error");

export function AutoDetectHotspotsDialog({
  open,
  onOpenChange,
  flyer,
  catalogProducts,
  hasUnsavedChanges,
  onApplied,
}: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["flyer-extraction", flyer.id];
  // Edits are keyed by job, so a new reading starts clean.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);

  const extraction = useQuery({
    queryKey,
    queryFn: () => fetchLatestExtraction(flyer.id),
    enabled: open,
    refetchInterval: (query) => (isExtractionRunning(query.state.data) ? 2000 : false),
  });
  const job: ExtractionJob | null = extraction.data ?? null;
  const running = isExtractionRunning(job);
  const outdated = Boolean(job && job.imageUrl !== flyer.flyerImageUrl);
  const items = job && !running && !outdated ? job.items : [];

  // Keys that used to be typed into this dialog are no longer used.
  useEffect(() => localStorage.removeItem("flip_ai_key"), []);

  const draftFor = (item: ExtractedItem) => drafts[`${job?.id}:${item.id}`] ?? initialDraft(item);
  const edit = (item: ExtractedItem, change: Partial<Draft>) =>
    setDrafts((prev) => {
      const key = `${job?.id}:${item.id}`;
      return { ...prev, [key]: { ...(prev[key] ?? initialDraft(item)), ...change } };
    });

  const chosen = items.filter((item) => draftFor(item).selected);
  const invalid = chosen.some((item) => !isValid(draftFor(item)));

  const start = useMutation({
    mutationFn: () => startFlyerExtraction(flyer.id),
    onSuccess: (started) => queryClient.setQueryData(queryKey, started),
    onError: (err) => toast.error(`Could not read the flyer: ${messageOf(err)}`),
  });

  const apply = useMutation({
    mutationFn: async (jobId: string) => {
      const selections: ExtractionSelection[] = chosen.map((item) => {
        const d = draftFor(item);
        return {
          itemId: item.id,
          name: d.name.trim(),
          brand: item.brand,
          description: item.description,
          category: item.category,
          unit: item.unit,
          offerPrice: Number(d.offerPrice),
          regularPrice: d.regularPrice === "" ? null : Number(d.regularPrice),
          box: item.box,
          productId: d.productId === NEW_PRODUCT ? null : d.productId,
        };
      });
      const result = await applyFlyerExtraction(jobId, selections, replaceExisting);
      await onApplied();
      return result;
    },
    onSuccess: async ({ applied, skipped }) => {
      await queryClient.invalidateQueries({ queryKey });
      const note = skipped ? `; ${skipped} skipped because that area is already mapped` : "";
      toast.success(`Saved ${applied} hotspots${note}.`);
      onOpenChange(false);
    },
    onError: (err) => toast.error(`Could not save hotspots: ${messageOf(err)}`),
  });

  const status = (() => {
    if (extraction.isLoading) return "Loading...";
    if (running) return "Reading the flyer. You can close this and come back.";
    if (extraction.isError) return `Could not load results: ${messageOf(extraction.error)}`;
    if (outdated) return "The flyer image changed. Read it again.";
    if (job?.status === "failed") return `Reading failed: ${job.errorMessage}`;
    if (!job) return "This flyer has not been read yet.";
    return items.length === 0 ? "No prices were found on this flyer." : null;
  })();
  const busy = running || start.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden />
              <div>
                <DialogTitle className="text-lg font-bold">Flyer Auto-Detection</DialogTitle>
                <DialogDescription className="text-xs">
                  Review the deals read from this flyer. Nothing here is saved until you add it.
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => start.mutate()}
              disabled={busy}
              className="mr-6 h-11 gap-1.5 text-xs"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {job ? "Read again" : "Read flyer"}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden py-3 md:flex-row">
          <div className="min-h-[300px] flex-1 overflow-auto rounded-xl border bg-muted/20 p-2">
            <div className="relative mx-auto w-full max-w-md">
              <img
                src={resolveImageUrl(flyer.flyerImageUrl)}
                alt={flyer.title}
                className="block w-full select-none"
              />
              {items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-label={`Highlight ${draftFor(item).name}`}
                  onClick={() => {
                    setActiveId(item.id);
                    document
                      .getElementById(`extracted-${item.id}`)
                      ?.scrollIntoView({ block: "nearest" });
                  }}
                  style={{
                    left: `${item.box.x * 100}%`,
                    top: `${item.box.y * 100}%`,
                    width: `${item.box.width * 100}%`,
                    height: `${item.box.height * 100}%`,
                  }}
                  className={`absolute rounded-sm border-2 ${
                    activeId === item.id
                      ? "z-10 border-primary bg-primary/25"
                      : item.needsReview
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-emerald-500 bg-emerald-500/10"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border bg-card md:w-[26rem] md:flex-none">
            <div className="flex items-center justify-between border-b bg-muted/30 p-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Deals ({items.length})
              </h4>
              <Badge variant="outline" className="text-[10px]">
                {items.filter((i) => i.needsReview && !i.applied).length} need review
              </Badge>
              {items.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    const selected = chosen.length < items.length;
                    items.forEach((item) => edit(item, { selected }));
                  }}
                  className="h-11 text-xs"
                >
                  {chosen.length < items.length ? "Select all" : "Select none"}
                </Button>
              )}
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {status && (
                <div
                  role="status"
                  className="space-y-2 p-8 text-center text-xs text-muted-foreground"
                >
                  {running ? (
                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                  ) : (
                    <Scan className="mx-auto h-8 w-8 opacity-50" />
                  )}
                  <p>{status}</p>
                </div>
              )}
              {items.map((item) => {
                const d = draftFor(item);
                return (
                  <div
                    key={item.id}
                    id={`extracted-${item.id}`}
                    onFocusCapture={() => setActiveId(item.id)}
                    className={`space-y-2 rounded-lg border p-2.5 text-xs ${
                      activeId === item.id ? "border-primary bg-primary/5" : "bg-background"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={d.selected}
                        onCheckedChange={(v) => edit(item, { selected: v === true })}
                        aria-label={`Include ${d.name}`}
                      />
                      <Input
                        value={d.name}
                        onChange={(e) => edit(item, { name: e.target.value })}
                        aria-label="Product name"
                        className="h-8 flex-1 text-xs font-semibold"
                      />
                      {item.applied && <Badge variant="secondary">Added</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`offer-${item.id}`} className="text-[10px]">
                        Deal $
                      </Label>
                      <Input
                        id={`offer-${item.id}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={d.offerPrice}
                        onChange={(e) => edit(item, { offerPrice: e.target.value })}
                        className="h-8 w-20 text-xs font-bold"
                      />
                      <Label htmlFor={`regular-${item.id}`} className="text-[10px]">
                        Regular $
                      </Label>
                      <Input
                        id={`regular-${item.id}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="none"
                        value={d.regularPrice}
                        onChange={(e) => edit(item, { regularPrice: e.target.value })}
                        className="h-8 w-20 text-xs"
                      />
                      {item.badgeText && (
                        <Badge variant="outline" className="truncate text-[9px]">
                          {item.badgeText}
                        </Badge>
                      )}
                    </div>
                    {item.flags.length > 0 && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        {item.flags.map((f) => FLAG_LABELS[f]).join(" · ")}
                      </p>
                    )}
                    <Select
                      value={d.productId}
                      onValueChange={(productId) => edit(item, { productId })}
                    >
                      <SelectTrigger className="h-8 text-[11px]" aria-label="Product to link">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NEW_PRODUCT} className="text-xs font-medium">
                          + New product (photo cropped from flyer)
                        </SelectItem>
                        {catalogProducts.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name} (${Number(p.offerPrice || 0).toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-wrap items-center gap-3 border-t pt-3">
          <div className="mr-auto flex items-center gap-2">
            <Switch
              id="replace-hotspots"
              checked={replaceExisting}
              onCheckedChange={setReplaceExisting}
            />
            <Label htmlFor="replace-hotspots" className="text-xs">
              Remove this flyer's current hotspots first
            </Label>
          </div>
          {hasUnsavedChanges && (
            <p role="alert" className="text-xs text-destructive">
              Save your studio changes before adding deals.
            </p>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11 text-xs">
            Close
          </Button>
          <Button
            onClick={() => job && apply.mutate(job.id)}
            disabled={!chosen.length || invalid || hasUnsavedChanges || apply.isPending}
            className="h-11 gap-1.5 text-xs font-semibold"
          >
            {apply.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Add {chosen.length} hotspots
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
