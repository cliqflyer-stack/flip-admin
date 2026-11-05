import React, { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Copy,
  Layers,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Store,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  TEMPLATES_LIBRARY,
  type FlyerTemplate,
} from "@/lib/templates-data";
import {
  createFlyer,
  saveHotspotsBatch,
  resolveImageUrl,
  type ApiFlyer,
  type ApiProduct,
  type Merchant,
} from "@/lib/api-client";
import { newId } from "@/lib/flyer-storage";

interface TemplatesViewProps {
  merchants: Merchant[];
  catalogProducts: ApiProduct[];
  onFlyerCreated: (flyer: ApiFlyer) => void;
  currentFlyer?: ApiFlyer | null;
}

export function TemplatesView({
  merchants,
  catalogProducts,
  onFlyerCreated,
  currentFlyer,
}: TemplatesViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<FlyerTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedMerchantId, setSelectedMerchantId] = useState("");
  const [isInstantiating, setIsInstantiating] = useState(false);

  const categories = ["all", "Grocery", "Pharmacy", "Hardware", "Retail"];

  const filteredTemplates = TEMPLATES_LIBRARY.filter((t) => {
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    const matchesSearch =
      !templateSearch.trim() ||
      t.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.description.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(templateSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleOpenUseTemplate = (tpl: FlyerTemplate) => {
    setActiveTemplate(tpl);
    setNewTitle(`${tpl.title} — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
    setSelectedMerchantId(tpl.defaultMerchantId || (merchants[0]?.id ?? "merch_longos"));
    setDialogOpen(true);
  };

  const handleCreateFromTemplate = async () => {
    if (!activeTemplate) return;
    setIsInstantiating(true);

    try {
      // 1. Create flyer in Neon Postgres
      const created = await createFlyer({
        merchantId: selectedMerchantId,
        title: newTitle || activeTemplate.title,
        subtitle: `Created from ${activeTemplate.title}`,
        badgeText: activeTemplate.badgeText,
        badgeVariant: activeTemplate.badgeVariant,
        flyerImageUrl: activeTemplate.previewImageUrl,
        aspectRatio: activeTemplate.aspectRatio,
        status: "published",
        pageCount: 1,
      });

      // 2. Map preset hotspots to catalog products
      if (activeTemplate.presetHotspots.length > 0 && catalogProducts.length > 0) {
        const batchPayload = activeTemplate.presetHotspots.map((preset, idx) => {
          // Find matching or sequential product
          const matchedProd =
            catalogProducts.find((p) => p.category.toLowerCase() === preset.category.toLowerCase()) ||
            catalogProducts[idx % catalogProducts.length];

          return {
            productId: matchedProd.id,
            x: preset.x,
            y: preset.y,
            width: preset.width,
            height: preset.height,
          };
        });

        await saveHotspotsBatch(created.id, batchPayload);
      }

      toast.success(`Created flyer from template: ${activeTemplate.title}!`);
      setDialogOpen(false);
      onFlyerCreated(created);
    } catch (err: any) {
      toast.error(`Failed to instantiate template: ${err.message}`);
    } finally {
      setIsInstantiating(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Templates Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Flyer Templates & Blueprints</h1>
            <Badge variant="secondary" className="text-xs font-semibold">
              {TEMPLATES_LIBRARY.length} Ready
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Launch professional circulars instantly with pre-calculated hotspot matrices and responsive aspect ratios.
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Template Title/Keyword Search */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search templates..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>

          {/* Search & Select Category Combobox */}
          <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={categoryOpen}
                size="sm"
                className="h-8 min-w-[150px] justify-between text-xs"
              >
                <span>
                  {selectedCategory === "all"
                    ? "All Categories"
                    : selectedCategory}
                </span>
                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search category..." className="h-8 text-xs" />
                <CommandList>
                  <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                    No category found.
                  </CommandEmpty>
                  <CommandGroup>
                    {categories.map((cat) => (
                      <CommandItem
                        key={cat}
                        value={cat}
                        onSelect={() => {
                          setSelectedCategory(cat);
                          setCategoryOpen(false);
                        }}
                        className="text-xs flex items-center justify-between"
                      >
                        <span>{cat === "all" ? "All Categories" : cat}</span>
                        {selectedCategory === cat && <Check className="h-3 w-3 text-primary" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center bg-card">
          <p className="text-sm font-semibold text-foreground">No templates match your filter</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try resetting your category filter or searching for another retail circular style.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCategory("all");
              setTemplateSearch("");
            }}
            className="mt-4 text-xs"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((tpl) => (
          <Card
            key={tpl.id}
            className="group overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between border"
          >
            <div>
              {/* Template Preview Image Frame */}
              <div className="relative aspect-[16/11] bg-muted/50 overflow-hidden border-b">
                <img
                  src={resolveImageUrl(tpl.previewImageUrl)}
                  alt={tpl.title}
                  className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <Badge variant="default" className="text-[10px] font-bold uppercase shadow-xs">
                    {tpl.category}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-background/90 backdrop-blur font-semibold">
                    Ratio {tpl.aspectRatio}:1
                  </Badge>
                </div>

                <div className="absolute bottom-2.5 right-2.5 rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                  {tpl.hotspotCount} Preset Hotspots
                </div>
              </div>

              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-semibold">{tpl.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed line-clamp-2 mt-1">
                  {tpl.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-1 pb-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Preset Hotspot Regions:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tpl.presetHotspots.slice(0, 4).map((h, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      <CheckCircle2 className="h-2.5 w-2.5 text-primary" />
                      {h.title}
                    </span>
                  ))}
                  {tpl.presetHotspots.length > 4 && (
                    <span className="text-[10px] text-muted-foreground self-center">
                      +{tpl.presetHotspots.length - 4} more
                    </span>
                  )}
                </div>
              </CardContent>
            </div>

            <CardFooter className="p-4 pt-2 border-t bg-muted/15 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {tpl.recommendedWidth} × {tpl.recommendedHeight} px
              </span>

              <Button
                size="sm"
                onClick={() => handleOpenUseTemplate(tpl)}
                className="h-8 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Use Template
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      )}

      {/* Modal: Instantiate Flyer from Template */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-bold">
                Create Flyer from Template
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              This will create a new live flyer in Neon Postgres with {activeTemplate?.hotspotCount} pre-mapped interactive hotspots.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="flyer-title" className="text-xs font-semibold">
                Flyer Title
              </Label>
              <Input
                id="flyer-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. My Supermarket Weekly Specials"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="merchant-select" className="text-xs font-semibold">
                Store / Merchant
              </Label>
              <Select value={selectedMerchantId} onValueChange={setSelectedMerchantId}>
                <SelectTrigger id="merchant-select" className="text-xs">
                  <SelectValue placeholder="Select a merchant" />
                </SelectTrigger>
                <SelectContent>
                  {merchants.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.name} ({m.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeTemplate && (
              <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1.5 border">
                <div className="flex justify-between text-muted-foreground">
                  <span>Template Blueprint:</span>
                  <span className="font-semibold text-foreground">{activeTemplate.title}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Aspect Ratio:</span>
                  <span>{activeTemplate.aspectRatio}:1 ({activeTemplate.recommendedWidth}×{activeTemplate.recommendedHeight})</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Preset Hotspots:</span>
                  <span className="text-emerald-600 font-semibold">{activeTemplate.hotspotCount} Touch Targets</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={isInstantiating}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateFromTemplate}
              disabled={isInstantiating || !newTitle.trim()}
              className="gap-1.5 bg-primary text-primary-foreground font-semibold"
            >
              {isInstantiating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {isInstantiating ? "Provisioning in Postgres..." : "Create & Open Studio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
