import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  Layers,
  MapPin,
  Package,
  Plus,
  Sparkles,
  Store,
  Trash2,
  Upload,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FlyerExpiryDialog } from "./FlyerExpiryDialog";
import {
  resolveImageUrl,
  isFlyerExpired,
  isFlyerActive,
  getFlyerExpiryInfo,
  type ApiFlyer,
  type DashboardStats,
} from "@/lib/api-client";
import type { AdminView } from "./AdminSidebar";

interface DashboardViewProps {
  stats: DashboardStats | null;
  flyers: ApiFlyer[];
  loading: boolean;
  onSelectFlyerToEdit: (flyerId: string) => void;
  onOpenUpload: () => void;
  onSelectView: (view: AdminView) => void;
  onDeleteFlyer?: (flyerId: string) => void;
  onFlyerUpdated?: (flyer: ApiFlyer) => void;
}

export function DashboardView({
  stats,
  flyers,
  loading,
  onSelectFlyerToEdit,
  onOpenUpload,
  onSelectView,
  onDeleteFlyer,
  onFlyerUpdated,
}: DashboardViewProps) {
  const [expiryDialogOpen, setExpiryDialogOpen] = useState(false);
  const [selectedFlyerForExpiry, setSelectedFlyerForExpiry] = useState<ApiFlyer | null>(null);

  const activeFlyersCount = flyers.filter(isFlyerActive).length;
  const expiredFlyersCount = flyers.filter(isFlyerExpired).length;
  const totalHotspots = stats ? stats.hotspots : flyers.reduce((acc, f) => acc + (f.hotspots?.length || 0), 0);

  const statCards = [
    {
      title: "Active Circulars",
      value: activeFlyersCount,
      subtext: "Published on customer mobile feed",
      icon: CheckCircle2,
      accent: "text-emerald-600 dark:text-emerald-400",
      bgAccent: "border-emerald-500/20 bg-emerald-500/5",
      onClick: () => onSelectView("flyers"),
    },
    {
      title: "Expired Circulars",
      value: expiredFlyersCount,
      subtext: "Automatically hidden from shoppers",
      icon: AlertTriangle,
      accent: "text-amber-600 dark:text-amber-400",
      bgAccent: "border-amber-500/20 bg-amber-500/5",
      onClick: () => onSelectView("flyers"),
    },
    {
      title: "Interactive Hotspots",
      value: totalHotspots,
      subtext: "Mapped shoppable touch targets",
      icon: Layers,
      accent: "text-primary",
      bgAccent: "border-primary/20 bg-primary/5",
      onClick: () => onSelectView("editor"),
    },
    {
      title: "Store Locations",
      value: stats ? stats.merchants : 5,
      subtext: "Franchise branches configured",
      icon: Store,
      accent: "text-foreground",
      bgAccent: "",
      onClick: () => onSelectView("stores"),
    },
  ];

  const handleOpenExpiry = (flyer: ApiFlyer) => {
    setSelectedFlyerForExpiry(flyer);
    setExpiryDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Dashboard Overview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time status of active circulars, validity periods, shoppable hotspots, and franchise store branches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectView("templates")}
            className="h-8 text-xs font-medium"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
            Browse Templates
          </Button>

          <Button
            size="sm"
            onClick={onOpenUpload}
            className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Circular
          </Button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border shadow-xs">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-7 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))
          : statCards.map((card) => (
              <Card
                key={card.title}
                onClick={card.onClick}
                className={`shadow-xs border cursor-pointer hover:border-primary/50 transition-all ${card.bgAccent}`}
              >
                <CardHeader className="pb-2 space-y-0 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <card.icon className={`h-4 w-4 ${card.accent}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold tracking-tight ${card.accent}`}>{card.value}</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{card.subtext}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Circulars Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Recent Circulars &amp; Validity Status
            </h2>
            <p className="text-xs text-muted-foreground">
              Click any flyer to edit hotspots in the studio, manage expiry dates, or preview shopper experience.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectView("flyers")}
              className="text-xs gap-1 font-medium h-8"
            >
              All Flyers ({flyers.length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectView("editor")}
              className="text-xs text-primary gap-1 font-medium h-8"
            >
              Open Studio <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border shadow-xs">
                <Skeleton className="h-44 w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : flyers.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <h3 className="font-semibold text-sm">No circulars published</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Get started by uploading your first digital circular or creating one from a pre-made template.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button size="sm" onClick={onOpenUpload} className="gap-1.5 text-xs font-semibold">
                <Upload className="h-3.5 w-3.5" /> Upload Flyer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectView("templates")}
                className="text-xs"
              >
                Use Template
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {flyers.map((flyer) => {
              const hotspotCount = flyer.hotspots?.length || 0;
              const expiry = getFlyerExpiryInfo(flyer);

              return (
                <Card
                  key={flyer.id}
                  className={`group overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between border ${
                    expiry.isExpired ? "opacity-85 border-amber-300 dark:border-amber-700/60 bg-amber-500/5" : "bg-card"
                  }`}
                >
                  <div>
                    {/* Flyer Preview Image Frame */}
                    <div className="relative aspect-[16/10] bg-muted/40 overflow-hidden border-b">
                      <img
                        src={resolveImageUrl(flyer.flyerImageUrl)}
                        alt={flyer.title}
                        className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <Badge
                          variant={expiry.badgeVariant}
                          className="text-[10px] uppercase font-bold tracking-wider shadow-xs"
                        >
                          {expiry.badgeLabel}
                        </Badge>
                        {flyer.badgeText && (
                          <Badge variant="outline" className="text-[10px] bg-background/90 backdrop-blur font-semibold">
                            {flyer.badgeText}
                          </Badge>
                        )}
                      </div>

                      <div className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                        {hotspotCount} hotspot{hotspotCount === 1 ? "" : "s"}
                      </div>

                      {expiry.isExpired && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider shadow-xs flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Hidden from app
                          </Badge>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm truncate text-foreground">{flyer.title}</h3>
                        {flyer.merchant && (
                          <span
                            className="inline-flex items-center justify-center h-6 w-6 rounded-md text-[10px] font-bold shrink-0 shadow-2xs"
                            style={{
                              backgroundColor: flyer.merchant.logoBg || "#075E50",
                              color: flyer.merchant.logoColor || "#FFFFFF",
                            }}
                          >
                            {flyer.merchant.initial || flyer.merchant.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate font-medium">
                          {flyer.storeLocation?.name || "Chain-wide (All Stores)"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {flyer.subtitle || "Weekly digital circular"}
                      </p>

                      {/* Expiry date line */}
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <div className={`flex items-center gap-1 ${expiry.isExpired ? "text-amber-700 dark:text-amber-400 font-semibold" : "text-muted-foreground"}`}>
                          <CalendarClock className="h-3 w-3 shrink-0" />
                          <span>
                            {expiry.isExpired
                              ? `Expired: ${expiry.formattedExpiry}`
                              : flyer.validTo
                              ? `Expires: ${expiry.formattedExpiry}`
                              : "No expiration set"}
                          </span>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenExpiry(flyer)}
                          className="h-5 px-1.5 text-[10px] text-primary hover:underline"
                        >
                          Configure
                        </Button>
                      </div>
                    </CardContent>
                  </div>

                  <div className="p-4 pt-2 border-t mt-2 flex items-center justify-between gap-2 bg-muted/20">
                    <Button
                      size="sm"
                      onClick={() => onSelectFlyerToEdit(flyer.id)}
                      className="h-8 flex-1 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-xs"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Studio Hotspots
                    </Button>

                    <Button asChild variant="outline" size="sm" className="h-8 px-2.5" title="Shopper Preview">
                      <Link to="/preview" search={{ flyerId: flyer.id } as any}>
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                    </Button>

                    {onDeleteFlyer && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteFlyer(flyer.id)}
                        className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete Circular"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Expiry Dialog */}
      <FlyerExpiryDialog
        flyer={selectedFlyerForExpiry}
        open={expiryDialogOpen}
        onOpenChange={setExpiryDialogOpen}
        onFlyerUpdated={(updated) => {
          if (onFlyerUpdated) onFlyerUpdated(updated);
        }}
      />
    </div>
  );
}
