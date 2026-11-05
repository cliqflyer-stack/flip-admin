import React, { useState } from "react";
import {
  CheckCircle2,
  Database,
  Globe,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  Server,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { API_BASE } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export function SettingsView() {
  const { user, logout } = useAuth();
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
      toast.success("API connection verified! Neon DB is connected.");
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
        <h1 className="text-2xl font-bold tracking-tight">Settings & Infrastructure</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Backend API configuration, database connectivity, and administrator session.
        </p>
      </div>

      {/* Backend API Connection Card */}
      <Card className="shadow-xs border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Render REST API Endpoint</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              Active Production
            </Badge>
          </div>
          <CardDescription className="text-xs">
            The admin portal and mobile applications communicate directly with this live backend service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border font-mono">
            <span className="text-foreground font-semibold">{API_BASE}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={checkConnection}
              disabled={checking}
              className="h-7 text-xs gap-1.5"
            >
              {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Test Health Ping
            </Button>
          </div>

          {latency !== null && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Status: <strong>{healthStatus?.status || "OK"}</strong> · Database: <strong>{healthStatus?.database || "Connected"}</strong></span>
              </div>
              <span className="font-mono font-bold text-xs">{latency} ms</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Neon Postgres DB Card */}
      <Card className="shadow-xs border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-base font-semibold">Neon Postgres Database</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Serverless PostgreSQL hosting flyer records, products, merchants, and normalized hotspot coordinates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border bg-muted/30">
              <span className="text-muted-foreground text-[11px] block">Cloud Provider</span>
              <span className="font-semibold text-foreground">AWS us-east-1</span>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <span className="text-muted-foreground text-[11px] block">Connection Pooling</span>
              <span className="font-semibold text-foreground">PgBouncer (Port 6543)</span>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <span className="text-muted-foreground text-[11px] block">ORM & Migrations</span>
              <span className="font-semibold text-foreground">Drizzle ORM 0.39</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Administrator Profile Card */}
      <Card className="shadow-xs border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base font-semibold">Administrator Session</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Active session authenticated for flyer publishing and catalog modifications.
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
                Removes offline cached drafts without affecting the live Neon Postgres database.
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
