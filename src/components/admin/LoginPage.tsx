import React, { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DEMO_CREDENTIALS, useAuth } from "@/lib/auth-context";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        toast.success("Welcome back! Signed in to Flip Admin.");
      } else {
        setError(res.error || "Authentication failed.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setError(null);
    toast.info("Demo credentials loaded! Click Sign In to proceed.");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-muted/30">
      {/* Background radial gradient decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 dark:opacity-20 pointer-events-none" />

      <Card className="relative w-full max-w-md shadow-xl border bg-card/95 backdrop-blur">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <CardTitle className="text-2xl font-bold tracking-tight">Flip Admin</CardTitle>
              <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                Studio
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Interactive Digital Flyer & Hotspot Management Portal
            </CardDescription>
          </div>

          <div className="inline-flex items-center gap-1.5 self-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Connected to Neon Postgres (Render API)
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2.5 text-xs">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@flip.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-sm"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Quick Demo Helper Pill */}
            <div className="rounded-lg border border-dashed bg-muted/50 p-2.5 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">Need quick demo access?</p>
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-mono text-primary font-medium">{DEMO_CREDENTIALS.email}</span> /{" "}
                  <span className="font-mono">{DEMO_CREDENTIALS.password}</span>
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFillDemo}
                className="h-7 text-xs gap-1"
              >
                <KeyRound className="h-3 w-3" />
                Auto-fill
              </Button>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button type="submit" className="w-full gap-2 font-medium" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {loading ? "Authenticating..." : "Sign In to Admin Portal"}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground">
              Protected administration workspace for Flip flyer publishers.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
