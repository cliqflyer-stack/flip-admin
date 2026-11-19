import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarClock,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Layers,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FlyerExpiryDialog } from "./FlyerExpiryDialog";
import {
  resolveImageUrl,
  isFlyerExpired,
  isFlyerActive,
  isFlyerScheduled,
  getFlyerExpiryInfo,
  updateFlyer,
  getRelativeDateString,
  toEndOfDayIso,
  type ApiFlyer,
  type Merchant,
} from "@/lib/api-client";

interface FlyersViewProps {
  flyers: ApiFlyer[];
  merchants: Merchant[];
  loading: boolean;
  onSelectFlyerToEdit: (flyerId: string) => void;
  onDeleteFlyer?: (flyerId: string) => void;
  onFlyerUpdated: (flyer: ApiFlyer) => void;
  onOpenUpload?: () => void;
}

type ExpiryFilterTab = "all" | "active" | "expired" | "scheduled";

export function FlyersView({
  flyers,
  merchants,
  loading,
  onSelectFlyerToEdit,
  onDeleteFlyer,
  onFlyerUpdated,
  onOpenUpload,
}: FlyersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ExpiryFilterTab>("all");
  const [expiryDialogOpen, setExpiryDialogOpen] = useState(false);
  const [selectedFlyerForExpiry, setSelectedFlyerForExpiry] = useState<ApiFlyer | null>(null);

  const merchantMap = new Map<string, Merchant>(
    merchants.map((m) => [m.id, m])
  );

  const totalCount = flyers.length;
  const activeCount = flyers.filter(isFlyerActive).length;
  const expiredCount = flyers.filter(isFlyerExpired).length;
  const scheduledCount = flyers.filter((f) => isFlyerScheduled(f) || f.status !== "published").length;
  const totalHotspots = flyers.reduce((acc, f) => acc + (f.hotspots?.length || 0), 0);

  const filteredFlyers = flyers.filter((flyer) => {
    // 1. Tab filter
    if (activeTab === "active" && !isFlyerActive(flyer)) return false;
    if (activeTab === "expired" && !isFlyerExpired(flyer)) return false;
    if (activeTab === "scheduled" && isFlyerActive(flyer) && !isFlyerExpired(flyer)) return false;

    // 2. Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const merchant = merchantMap.get(flyer.merchantId);
    return (
      flyer.title.toLowerCase().includes(q) ||
      (flyer.subtitle ?? "").toLowerCase().includes(q) ||
      (merchant?.name ?? "").toLowerCase().includes(q) ||
      (flyer.storeLocation?.name ?? "").toLowerCase().includes(q)
    );
  });

  const handleOpenExpiryDialog = (flyer: ApiFlyer) => {
    setSelectedFlyerForExpiry(flyer);
    setExpiryDialogOpen(true);
  };

  const handleQuickExtend = async (flyer: ApiFlyer, days = 7) => {
    try {
      const newExpiryDate = getRelativeDateString(days);
      const updated = await updateFlyer(flyer.id, {
        validTo: toEndOfDayIso(newExpiryDate),
        status: "published",
      });
      onFlyerUpdated(updated);
      toast.success(`Extended "${flyer.title}" by ${days} days until ${new Date(toEndOfDayIso(newExpiryDate)).toLocaleDateString()}.`);
    } catch (err: any) {
      toast.error(`Could not extend flyer: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Flyers &amp; Circulars
            </h1>
            <Badge variant="secondary" className="text-xs font-semibold">
              {totalCount} Total
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure flyer lifecycle, validity periods, expiry rules, and hotspot mappings. Expired circulars are hidden automatically from shoppers.
          </p>
        </div>

        {onOpenUpload && (
          <Button
            size="sm"
            onClick={onOpenUpload}
            className="h-8 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Upload Circular
          </Button>
        )}
      </div>

      {/* Summary KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card
          onClick={() => setActiveTab("all")}
          className={`p-4 cursor-pointer transition-all border shadow-xs ${
            activeTab === "all" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:border-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Total Circulars</span>
            <Layers className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">{totalCount}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Published &amp; drafts</p>
        </Card>

        <Card
          onClick={() => setActiveTab("active")}
          className={`p-4 cursor-pointer transition-all border shadow-xs ${
            activeTab === "active" ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20" : "hover:border-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
            <span className="font-medium">Active &amp; Visible</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Live on shopper app feed</p>
        </Card>

        <Card
          onClick={() => setActiveTab("expired")}
          className={`p-4 cursor-pointer transition-all border shadow-xs ${
            activeTab === "expired" ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20" : "hover:border-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
            <span className="font-medium">Expired &amp; Hidden</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {expiredCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Hidden past expiration date</p>
        </Card>

        <Card className="p-4 border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Mapped Hotspots</span>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-primary">
            {totalHotspots}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Interactive touch targets</p>
        </Card>
      </div>

      {/* Filter Tabs and Search Bar */}
      <Card className="border shadow-xs">
        <CardContent className="p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center rounded-lg border bg-muted p-0.5 w-full sm:w-auto">
            <Button
              variant={activeTab === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("all")}
              className="h-7 px-2.5 text-xs font-medium"
            >
              All ({totalCount})
            </Button>
            <Button
              variant={activeTab === "active" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("active")}
              className="h-7 px-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
            >
              Active ({activeCount})
            </Button>
            <Button
              variant={activeTab === "expired" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("expired")}
              className="h-7 px-2.5 text-xs font-medium text-amber-600 dark:text-amber-400"
            >
              Expired ({expiredCount})
            </Button>
            <Button
              variant={activeTab === "scheduled" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("scheduled")}
              className="h-7 px-2.5 text-xs font-medium text-muted-foreground"
            >
              Draft/Scheduled ({scheduledCount})
            </Button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search circular title, subtitle, or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card className="border shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 text-xs">
              <TableHead className="w-12">Thumb</TableHead>
              <TableHead>Circular Title</TableHead>
              <TableHead>Brand / Franchise</TableHead>
              <TableHead>Target Branch</TableHead>
              <TableHead>Validity Window</TableHead>
              <TableHead>Expiry Status</TableHead>
              <TableHead className="text-center">Hotspots</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell colSpan={8} className="h-14 bg-muted/10" />
                </TableRow>
              ))
            )}

            {!loading && filteredFlyers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-xs text-muted-foreground py-12"
                >
                  {searchQuery || activeTab !== "all"
                    ? "No circulars found matching the filter."
                    : "No circulars published yet."}
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              filteredFlyers.map((flyer) => {
                const merchant = merchantMap.get(flyer.merchantId) || flyer.merchant;
                const hotspotCount = flyer.hotspots?.length ?? 0;
                const thumbUrl = resolveImageUrl(flyer.flyerImageUrl);
                const expiry = getFlyerExpiryInfo(flyer);

                return (
                  <TableRow
                    key={flyer.id}
                    className={`text-xs group hover:bg-muted/40 transition-colors ${
                      expiry.isExpired ? "opacity-80 bg-amber-500/5" : ""
                    }`}
                  >
                    {/* Thumbnail */}
                    <TableCell className="p-2.5">
                      <div className="w-10 h-12 rounded overflow-hidden border border-border bg-muted shrink-0 shadow-2xs">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={flyer.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Eye className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Title & Subtitle */}
                    <TableCell className="max-w-[220px]">
                      <div className="font-semibold text-foreground leading-tight truncate">
                        {flyer.title}
                      </div>
                      <div className="text-muted-foreground text-[11px] leading-tight mt-0.5 truncate">
                        {flyer.subtitle || "Weekly Circular"}
                      </div>
                      {flyer.badgeText && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 mt-1 font-bold uppercase tracking-wider"
                        >
                          {flyer.badgeText}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Brand */}
                    <TableCell>
                      {merchant ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold shrink-0"
                            style={{
                              backgroundColor: merchant.logoBg || "#075E50",
                              color: merchant.logoColor || "#FFFFFF",
                            }}
                          >
                            {merchant.initial}
                          </span>
                          <span className="font-medium text-foreground truncate max-w-[120px]">
                            {merchant.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Target Branch */}
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                        <span className="truncate max-w-[130px]">
                          {flyer.storeLocation?.name || "Chain-wide (All Stores)"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Validity Window (Start & End Dates) */}
                    <TableCell>
                      <div className="space-y-0.5 text-[11px]">
                        {flyer.validFrom && (
                          <div className="text-muted-foreground">
                            From: <span className="font-medium text-foreground">{expiry.formattedValidFrom}</span>
                          </div>
                        )}
                        {flyer.validTo ? (
                          <div className={expiry.isExpired ? "text-amber-700 dark:text-amber-400 font-semibold" : "text-muted-foreground"}>
                            Expires: <span className="font-medium text-foreground">{expiry.formattedExpiry}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 italic">No expiry set</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Expiry Status Badge */}
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge
                          variant={expiry.badgeVariant}
                          className="text-[10px] font-semibold cursor-pointer gap-1"
                          onClick={() => handleOpenExpiryDialog(flyer)}
                          title="Click to edit validity dates"
                        >
                          {expiry.isExpired ? (
                            <AlertTriangle className="h-3 w-3 text-white" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          <span>{expiry.badgeLabel}</span>
                        </Badge>

                        {expiry.isExpired && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => handleQuickExtend(flyer, 7)}
                            className="h-auto p-0 text-[10px] text-primary hover:underline"
                          >
                            + Extend 7 days
                          </Button>
                        )}
                      </div>
                    </TableCell>

                    {/* Hotspots Count */}
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                        <Layers className="h-3 w-3 text-primary" />
                        {hotspotCount}
                      </span>
                    </TableCell>

                    {/* Action Buttons */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] px-2 font-medium"
                          onClick={() => onSelectFlyerToEdit(flyer.id)}
                        >
                          <Layers className="h-3 w-3 mr-1 text-primary" />
                          Studio
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Configure Expiry & Validity"
                          onClick={() => handleOpenExpiryDialog(flyer)}
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                        </Button>

                        <Button asChild size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Shopper Preview">
                          <Link to="/preview" search={{ flyerId: flyer.id } as any}>
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>

                        {onDeleteFlyer && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete circular"
                            onClick={() => onDeleteFlyer(flyer.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </Card>

      {/* Expiry Configuration Dialog */}
      <FlyerExpiryDialog
        flyer={selectedFlyerForExpiry}
        merchant={selectedFlyerForExpiry ? merchantMap.get(selectedFlyerForExpiry.merchantId) : null}
        open={expiryDialogOpen}
        onOpenChange={setExpiryDialogOpen}
        onFlyerUpdated={(updated) => {
          onFlyerUpdated(updated);
          if (selectedFlyerForExpiry?.id === updated.id) {
            setSelectedFlyerForExpiry(updated);
          }
        }}
      />
    </div>
  );
}
