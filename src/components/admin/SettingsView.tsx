import React, { useState } from "react";
import {
  CheckCircle2,
  Database,
  Globe,
  KeyRound,
  Loader2,
  LogOut,
  Moon,
  Palette,
  RefreshCw,
  Server,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { API_BASE } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";
import { AdminFormHeader, AdminFormPage, AdminFormSection } from "./AdminFormLayout";

const SETTINGS_NAV = [
  { id: "settings-appearance", label: "Appearance", icon: Palette },
  { id: "settings-api", label: "API Service", icon: Server },
  { id: "settings-account", label: "Account", icon: UserRound },
  { id: "settings-data", label: "Local Data", icon: Database },
] as const;

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun, description: "Bright surfaces" },
  { value: "dark", label: "Dark", icon: Moon, description: "Low-light friendly" },
  { value: "system", label: "System", icon: Globe, description: "Follows your OS" },
] as const;

export function SettingsView() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [checking, setChecking] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  const checkConnection = async () => {
    setChecking(true);
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();
      const end = performance.now();
      setLatency(Math.round(end - start));
      setHealthStatus(data);
      toast.success("API connection verified!");
    } catch (e: any) {
      toast.error(`Health check failed: ${e.message}`);
    } finally {
      setChecking(false);
    }
  };

  const handleClearCache = () => {
    try {
      localStorage.removeItem("idflyer.meta");
      localStorage.removeItem("idflyer.hotspots");
      toast.success("Local flyer draft storage cleared.");
    } catch (e) {
      toast.error("Could not clear storage.");
    }
  };

  return (
    <AdminFormPage>
      <AdminFormHeader
        title="Settings & Preferences"
        description="Appearance, backend API connection, your administrator session and local data."
      />

      <div className="grid w-full flex-1 gap-6 p-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* Section navigation */}
        <nav
          aria-label="Settings sections"
          className="hidden lg:block lg:sticky lg:top-24 lg:self-start"
        >
          <ul className="space-y-1">
            {SETTINGS_NAV.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-6">
          {/* Appearance */}
          <AdminFormSection
            id="settings-appearance"
            icon={Palette}
            title="Appearance"
            description="Choose how the admin studio looks on this device."
          >
            <div
              role="radiogroup"
              aria-label="Theme"
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              {THEME_OPTIONS.map((opt) => {
                const selected = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-foreground/30 hover:bg-muted/40",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border shadow-xs",
                        opt.value === "light" && "bg-white text-zinc-900",
                        opt.value === "dark" && "border-zinc-800 bg-zinc-950 text-zinc-100",
                        opt.value === "system" &&
                          "bg-gradient-to-r from-zinc-200 to-zinc-800 text-foreground",
                      )}
                    >
                      <opt.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                    {selected && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </AdminFormSection>

          {/* API service */}
          <AdminFormSection
            id="settings-api"
            icon={Server}
            title="REST API Service"
            description="The backend that powers circulars, store locations and the product catalog."
            action={
              <Badge variant="outline" className="font-mono text-[10px]">
                Production API
              </Badge>
            }
          >
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Base URL</p>
                <p className="truncate font-mono text-sm text-foreground">{API_BASE}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={checkConnection}
                disabled={checking}
                className="h-9 shrink-0 gap-1.5 text-xs"
              >
                {checking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Test connection
              </Button>
            </div>

            {latency !== null && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>
                    Service status: <strong>{healthStatus?.status || "OK"}</strong>
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold">{latency} ms</span>
              </div>
            )}
          </AdminFormSection>

          {/* Account */}
          <AdminFormSection
            id="settings-account"
            icon={KeyRound}
            title="Administrator Account"
            description="The session currently signed in to publish flyers and manage the catalog."
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {(user?.name || "Administrator").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {user?.name || "Administrator"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {user?.role || "Super Admin"}
                  </Badge>
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={logout}
                className="h-9 shrink-0 gap-1.5 text-xs"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </div>
          </AdminFormSection>

          {/* Local data */}
          <AdminFormSection
            id="settings-data"
            icon={Database}
            title="Local Data"
            description="Browser-side storage used for offline flyer drafts on this device."
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Clear local draft storage</p>
                <p className="text-xs text-muted-foreground">
                  Removes cached flyer drafts from this browser. Published data is not affected.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearCache}
                className="h-9 shrink-0 gap-1.5 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                Clear drafts
              </Button>
            </div>
          </AdminFormSection>
        </div>
      </div>
    </AdminFormPage>
  );
}
