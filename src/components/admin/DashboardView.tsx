import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Database,
  ExternalLink,
  Eye,
  Layers,
  Package,
  Plus,
  Sparkles,
  Store,
  Trash2,
  Upload,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveImageUrl, type ApiFlyer, type DashboardStats } from "@/lib/api-client";
import type { AdminView } from "./AdminSidebar";

interface DashboardViewProps {
  stats: DashboardStats | null;
  flyers: ApiFlyer[];
  loading: boolean;
  onSelectFlyerToEdit: (flyerId: string) => void;
  onOpenUpload: () => void;
  onSelectView: (view: AdminView) => void;
  onDeleteFlyer?: (flyerId: string) => void;
}

export function DashboardView({
  stats,
  flyers,
  loading,
  onSelectFlyerToEdit,
  onOpenUpload,
  onSelectView,
  onDeleteFlyer,
}: DashboardViewProps) {
  const statCards = [
    {
      title: "Active Flyers",
      value: stats ? stats.flyers : flyers.length,
      subtext: "Published on mobile feed",
      icon: Layers,
      color: "text-blue-600 bg-blue-500/10",
    },
    {
      title: "Interactive Hotspots",
      value: stats ? stats.hotspots : flyers.reduce((acc, f) => acc + (f.hotspots?.length || 0), 0),
      subtext: "Shoppable touch targets mapped",
      icon: Sparkles,
      color: "text-amber-600 bg-amber-500/10",
    },
    {
      title: "Catalog Products",
      value: stats ? stats.products : 11,
      subtext: "Tagged with prices & deals",
      icon: Package,
      color: "text-emerald-600 bg-emerald-500/10",
    },
    {
      title: "Partner Merchants",
      value: stats ? stats.merchants : 5,
      subtext: "Grocery, pharmacy, retail",
      icon: Store,
      color: "text-purple-600 bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interactive Flyer Studio</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage digital store circulars, map shoppable hotspots, and publish directly to Neon Postgres.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectView("templates")}
            className="h-8 text-xs gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Browse Templates
          </Button>

          <Button
            size="sm"
            onClick={onOpenUpload}
            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground shadow-sm"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Flyer
          </Button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))
          : statCards.map((card) => (
              <Card key={card.title} className="shadow-xs hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${card.color}`}>
                    <card.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">{card.subtext}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Recent Flyers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Active Circulars & Flyers</h2>
            <p className="text-xs text-muted-foreground">
              Select any flyer to edit hotspots in the studio or preview shopper interaction.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectView("editor")}
            className="text-xs text-primary gap-1"
          >
            Open Studio <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
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
            <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-sm">No flyers found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Get started by uploading your first digital circular or creating one from a pre-made template.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button size="sm" onClick={onOpenUpload} className="gap-1.5 text-xs">
                <Upload className="h-3.5 w-3.5" /> Upload Flyer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectView("templates")}
                className="gap-1.5 text-xs"
              >
                <Sparkles className="h-3.5 w-3.5" /> Use Template
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {flyers.map((flyer) => {
              const hotspotCount = flyer.hotspots?.length || 0;
              return (
                <Card
                  key={flyer.id}
                  className="group overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
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
                          variant={flyer.status === "published" ? "default" : "secondary"}
                          className="text-[10px] uppercase font-bold tracking-wider shadow-xs"
                        >
                          {flyer.status}
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
                    </div>

                    <CardContent className="p-4 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm truncate">{flyer.title}</h3>
                        {flyer.merchant && (
                          <span
                            className="inline-flex items-center justify-center h-6 w-6 rounded-md text-[10px] font-bold shrink-0"
                            style={{
                              backgroundColor: flyer.merchant.logoBg || "#075E50",
                              color: flyer.merchant.logoColor || "#FFFFFF",
                            }}
                          >
                            {flyer.merchant.initial || flyer.merchant.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {flyer.subtitle || "Weekly digital circular"}
                      </p>
                    </CardContent>
                  </div>

                  <div className="p-4 pt-2 border-t mt-3 flex items-center justify-between gap-2 bg-muted/20">
                    <Button
                      size="sm"
                      onClick={() => onSelectFlyerToEdit(flyer.id)}
                      className="h-8 flex-1 text-xs font-medium gap-1.5 bg-primary text-primary-foreground"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Edit Hotspots
                    </Button>

                    <Button asChild variant="outline" size="sm" className="h-8 px-2.5">
                      <Link to="/preview">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                    </Button>

                    {onDeleteFlyer && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteFlyer(flyer.id)}
                        className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
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

      {/* Quick Tips Callout */}
      <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent border-primary/20">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Pro Tip: Standard Normalized Coordinates
            </h4>
            <p className="text-xs text-muted-foreground max-w-xl">
              All hotspots drawn in the interactive editor automatically use normalized 0..1 bounding boxes.
              This guarantees that flyers scale with millimeter precision across any iPhone, Android, or tablet screen.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectView("templates")}
            className="shrink-0 text-xs gap-1.5"
          >
            Explore Templates <ArrowRight className="h-3 w-3" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
