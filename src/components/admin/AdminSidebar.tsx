import React from "react";
import {
  ExternalLink,
  Eye,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Sparkles,
  Store,
  User,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandLogo, BrandIcon } from "@/components/ui/BrandLogo";
import { useAuth } from "@/lib/auth-context";

export type AdminView =
  | "dashboard"
  | "editor"
  | "flyers"
  | "upload-flyer"
  | "templates"
  | "stores"
  | "add-store"
  | "edit-store"
  | "products"
  | "add-product"
  | "edit-product"
  | "settings";

interface AdminSidebarProps {
  currentView: AdminView;
  onSelectView: (view: AdminView) => void;
  flyersCount?: number;
  productsCount?: number;
  storeLocationsCount?: number;
}

export function AdminSidebar({
  currentView,
  onSelectView,
  flyersCount = 0,
  productsCount = 0,
  storeLocationsCount = 0,
}: AdminSidebarProps) {
  const { user, logout } = useAuth();

  const isStoresActive = currentView === "stores" || currentView === "add-store" || currentView === "edit-store";
  const isProductsActive = currentView === "products" || currentView === "add-product" || currentView === "edit-product";
  const isEditorActive = currentView === "editor" || currentView === "upload-flyer";

  const studioNavItems = [
    {
      id: "dashboard" as AdminView,
      title: "Overview",
      icon: LayoutDashboard,
      isActive: currentView === "dashboard",
      badge: undefined,
    },
    {
      id: "editor" as AdminView,
      title: "Studio",
      icon: Layers,
      isActive: isEditorActive,
      badge: flyersCount > 0 ? `${flyersCount}` : undefined,
    },
    {
      id: "flyers" as AdminView,
      title: "Flyers",
      icon: FileText,
      isActive: currentView === "flyers",
      badge: flyersCount > 0 ? `${flyersCount}` : undefined,
    },
    {
      id: "templates" as AdminView,
      title: "Templates",
      icon: Sparkles,
      isActive: currentView === "templates",
      badge: "5",
    },
  ];

  const inventoryNavItems = [
    {
      id: "stores" as AdminView,
      title: "Stores",
      icon: Store,
      isActive: isStoresActive,
      badge: storeLocationsCount > 0 ? `${storeLocationsCount}` : undefined,
    },
    {
      id: "products" as AdminView,
      title: "Products",
      icon: Package,
      isActive: isProductsActive,
      badge: productsCount > 0 ? `${productsCount}` : undefined,
    },
  ];

  const systemNavItems = [
    {
      id: "settings" as AdminView,
      title: "Settings",
      icon: Settings,
      isActive: currentView === "settings",
      badge: undefined,
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r">
      {/* Brand Header */}
      <SidebarHeader className="p-3">
        <div className="flex items-center group-data-[collapsible=icon]:justify-center">
          <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <BrandLogo className="h-9 w-auto" />
            <span className="truncate text-[10px] text-muted-foreground font-medium mt-1">Admin</span>
          </div>
          <div className="hidden group-data-[collapsible=icon]:block">
            <BrandIcon className="h-8 w-8" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Studio Navigation Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground">
            Studio
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {studioNavItems.map((item) => {
                const isActive = item.isActive;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      onClick={() => onSelectView(item.id)}
                      className={`cursor-pointer font-medium text-xs h-9 transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-semibold dark:bg-primary/20 dark:text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    {item.badge && (
                      <SidebarMenuBadge className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20">
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Catalog Navigation Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground">
            Catalog
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {inventoryNavItems.map((item) => {
                const isActive = item.isActive;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      onClick={() => onSelectView(item.id)}
                      className={`cursor-pointer font-medium text-xs h-9 transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-semibold dark:bg-primary/20 dark:text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    {item.badge && (
                      <SidebarMenuBadge className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20">
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Customer Preview" className="font-medium text-xs h-9 text-muted-foreground hover:text-foreground">
                  <Link to="/preview">
                    <Eye className="h-4 w-4 text-primary" />
                    <span>Shopper Preview</span>
                    <ExternalLink className="ml-auto h-3 w-3 opacity-60" />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Group */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      onClick={() => onSelectView(item.id)}
                      className={`cursor-pointer font-medium text-xs h-9 transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-semibold dark:bg-primary/20 dark:text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      {/* User Footer Profile & Dropdown */}
      <SidebarFooter className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left text-xs transition-colors hover:bg-muted focus:outline-none">
              <Avatar className="h-8 w-8 rounded-lg border">
                <AvatarImage src={user?.avatarUrl} alt={user?.name || "Admin"} />
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">
                  {user?.name?.slice(0, 2).toUpperCase() || "AD"}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate font-semibold">{user?.name || "Administrator"}</span>
                <span className="truncate text-[11px] text-muted-foreground">{user?.email || "admin@flip.local"}</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" side="right" sideOffset={8}>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-semibold leading-none">{user?.name || "Administrator"}</p>
                <p className="text-[11px] leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSelectView("settings")} className="cursor-pointer gap-2 text-xs">
              <Settings className="h-3.5 w-3.5" />
              Settings & API
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive">
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
