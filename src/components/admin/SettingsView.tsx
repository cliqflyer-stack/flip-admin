import React, { useState } from "react";
import {
  CheckCircle2,
  Globe,
  Loader2,
  LogOut,
  Moon,
  RefreshCw,
  Server,
  Shield,
  Sun,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { API_BASE } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-provider";

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
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Appearance, backend API endpoints, and administrator profile.
        </p>
      </div>

      {/* Theme & Appearance Card */}
      <Card className="shadow-xs border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Theme & Appearance</CardTitle>
          <CardDescription className="text-xs">
            Choose your preferred interface theme for the administration studio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-center transition-all ${
                theme === "light"
                  ? "border-primary bg-primary/5 text-foreground font-semibold"
                  : "border-border hover:border-foreground/40 text-muted-foreground"
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white border shadow-xs text-zinc-900">
                <Sun className="h-5 w-5" />
              </div>
              <span className="text-xs">Light</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-center transition-all ${
                theme === "dark"
                  ? "border-primary bg-primary/5 text-foreground font-semibold"
                  : "border-border hover:border-foreground/40 text-muted-foreground"
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-950 border border-zinc-800 shadow-xs text-zinc-100">
                <Moon className="h-5 w-5" />
              </div>
              <span className="text-xs">Dark</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("system")}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-center transition-all ${
                theme === "system"
                  ? "border-primary bg-primary/5 text-foreground font-semibold"
                  : "border-border hover:border-foreground/40 text-muted-foreground"
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-r from-zinc-200 to-zinc-800 border shadow-xs text-foreground">
                <Globe className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
              </div>
              <span className="text-xs">System</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Backend API Connection Card */}
      <Card className="shadow-xs border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">REST API Service</CardTitle>
            <Badge variant="outline" className="text-xs font-mono">
              Production API
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Active backend service powering the circulars, store locations, and catalog products.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border font-mono">
            <span className="text-foreground font-semibold truncate pr-2">{API_BASE}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={checkConnection}
              disabled={checking}
              className="h-7 text-xs gap-1.5 shrink-0"
            >
              {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Test Health Ping
            </Button>
          </div>

          {latency !== null && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Service Status: <strong>{healthStatus?.status || "OK"}</strong></span>
              </div>
              <span className="font-mono font-bold text-xs">{latency} ms</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Administrator Profile Card */}
      <Card className="shadow-xs border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Administrator Profile</CardTitle>
          <CardDescription className="text-xs">
            Current active session authenticated for flyer publishing and catalog modifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-foreground">{user?.name || "Administrator"}</p>
              <p className="text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="mt-1 text-[10px]">
                {user?.role || "Super Admin"}
              </Badge>
            </div>
            <Button variant="destructive" size="sm" onClick={logout} className="gap-1.5 text-xs">
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Clear Local Draft Storage</p>
              <p className="text-muted-foreground text-[11px]">
                Removes offline cached drafts from your browser storage.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearCache} className="h-8 text-xs gap-1">
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              Clear Drafts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
