import React from "react";
import { Link } from "@tanstack/react-router";
import { Eye, Plus, Sparkles, Upload } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AdminView } from "./AdminSidebar";

interface AdminHeaderProps {
  currentView: AdminView;
  onSelectView: (view: AdminView) => void;
  onOpenUpload: () => void;
  selectedFlyerTitle?: string;
}

const VIEW_NAMES: Record<AdminView, string> = {
  dashboard: "Dashboard Overview",
  editor: "Interactive Flyer Studio",
  templates: "Templates Library",
  stores: "Franchises & Store Locations",
  products: "Product Catalog",
  settings: "Settings & API",
};

export function AdminHeader({
  currentView,
  onSelectView,
  onOpenUpload,
  selectedFlyerTitle,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur transition-all">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />

        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => onSelectView("dashboard")}
                className="cursor-pointer text-muted-foreground hover:text-foreground"
              >
                Admin
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-foreground">
                {VIEW_NAMES[currentView]}
              </BreadcrumbPage>
            </BreadcrumbItem>
            {currentView === "editor" && selectedFlyerTitle && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <span className="max-w-[180px] truncate text-muted-foreground font-medium">
                    {selectedFlyerTitle}
                  </span>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Neon Postgres live badge */}
        <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Neon DB Live</span>
        </div>

        {currentView !== "editor" && (
          <Button
            size="sm"
            onClick={onOpenUpload}
            className="h-8 gap-1.5 text-xs font-medium bg-primary text-primary-foreground shadow-sm"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Upload Flyer</span>
          </Button>
        )}

        <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Link to="/preview">
            <Eye className="h-3.5 w-3.5 text-primary" />
            <span className="hidden md:inline">Shopper Preview</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
