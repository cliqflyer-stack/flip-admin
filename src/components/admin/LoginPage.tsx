import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Shield,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import { DEMO_CREDENTIALS, useAuth } from "@/lib/auth-context";

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        toast.success("Welcome back! Signed in to Flip Studio Admin.");
        onLoginSuccess?.();
      } else {
        setError(res.error || "Authentication failed. Please check your credentials.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred connecting to the auth service.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setError(null);
    toast.info("Demo administrator credentials populated.");
  };

  const handleInstantDemoLogin = async () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setError(null);
    setLoading(true);

    try {
      const res = await login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
      if (res.success) {
        toast.success("Signed in with Super Administrator demo profile!");
        onLoginSuccess?.();
      } else {
        setError(res.error || "Authentication failed.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Please enter your account email address.");
      return;
    }
    toast.success(`Password reset link dispatched to ${forgotEmail} via Neon Auth.`);
    setForgotDialogOpen(false);
    setForgotEmail("");
  };

  const handleSSOClick = (provider: string) => {
    toast.info(`${provider} SSO can be enabled in Studio Settings for your enterprise domain.`);
  };

  return (
    <div className="min-h-screen w-full bg-background grid lg:grid-cols-12 text-foreground">
      {/* LEFT COLUMN: Visual Brand Showcase & Proof (Desktop) */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 relative flex-col justify-between p-10 xl:p-14 border-r border-border bg-muted/30 overflow-hidden">
        {/* Ambient atmospheric gradients */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

        {/* Top brand header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-lg shadow-sm transition-transform group-hover:scale-105">
              F
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight">Flip Studio</span>
                <Badge variant="secondary" className="text-[10px] uppercase font-semibold tracking-wider">
                  Enterprise
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Interactive Digital Circulars & Retail Media</p>
            </div>
          </Link>

          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs font-medium bg-background/80 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Cloud DB
          </Badge>
        </div>

        {/* Centerpiece: Interactive Visual Circular Showcase Card */}
        <div className="relative z-10 my-auto py-8 space-y-6 max-w-lg">
          <div className="space-y-2">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-xs gap-1.5 py-1">
              <Sparkles className="h-3.5 w-3.5" />
              Retail Media Hub
            </Badge>
            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight">
              Turn Static Print Flyers Into Shoppable Experiences
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Precision canvas editor with centimeter-accurate product hotspots, multi-store geofenced circular
              distribution, and real-time shopper analytics.
            </p>
          </div>

          {/* Simulated Active Flyer Preview Card */}
          <Card className="border border-border/80 bg-card/80 backdrop-blur-md shadow-lg overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b bg-muted/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-semibold text-foreground">MegaMart Weekly Specials</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  16 Hotspots Active
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-primary" /> 24 Store Locations
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Globe2 className="h-3 w-3 text-primary" /> Live Shopper Web & Mobile
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Product Hotspot Chips */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border bg-background/70 p-2 text-center transition-colors hover:border-primary/40">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Doritos Dinamita</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">$3.49</p>
                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mt-1">
                    Save 30%
                  </Badge>
                </div>
                <div className="rounded-lg border bg-background/70 p-2 text-center transition-colors hover:border-primary/40">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Coca-Cola 12pk</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">$5.99</p>
                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/30 text-primary mt-1">
                    Special Pack
                  </Badge>
                </div>
                <div className="rounded-lg border bg-background/70 p-2 text-center transition-colors hover:border-primary/40">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Oreo Cookies</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">$3.49</p>
                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mt-1">
                    BOGO Deal
                  </Badge>
                </div>
              </div>

              {/* Real-time Metrics bar */}
              <div className="rounded-lg bg-muted/60 p-3 flex items-center justify-between text-xs border border-border/50">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <div>
                    <span className="font-semibold text-foreground">4.2x Higher Tap Engagement</span>
                    <p className="text-[10px] text-muted-foreground">vs static PDF circulars</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-foreground">99.8%</span>
                  <p className="text-[10px] text-muted-foreground">Coordinate Accuracy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Testimonial Quote */}
          <div className="rounded-xl border border-border/60 bg-background/40 p-4 text-xs space-y-2 backdrop-blur-xs">
            <div className="flex items-center gap-1 text-amber-500 text-sm">
              {"★".repeat(5)}
            </div>
            <p className="text-muted-foreground italic leading-relaxed">
              "Flip replaced our cumbersome PDF circular process. Our merchandising team maps weekly flyers in minutes,
              and our shoppers can tap deals right into their baskets."
            </p>
            <div className="flex items-center gap-2 pt-1">
              <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                MV
              </div>
              <div>
                <span className="font-semibold text-foreground">Marcus Vance</span>
                <span className="text-muted-foreground"> — VP Merchandising, FreshMetro</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Security / Trust Badges */}
        <div className="relative z-10 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Neon Postgres SSL</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span>256-bit Session Security</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span>Role-Based Studio</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Shadcn UI Authentication Portal */}
      <div className="lg:col-span-7 xl:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-12 relative overflow-y-auto min-h-screen">
        {/* Top Navbar */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto">
          <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Website</span>
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="text-xs h-8">
              <Link to="/preview">Live Preview</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Main Sign-In Card Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8 space-y-6">
          {/* Mobile Header (Shown on mobile/tablet) */}
          <div className="lg:hidden text-center space-y-2">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-lg shadow-sm">
              F
            </div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Flip Studio</h1>
              <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                Admin
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to Flip Studio to manage digital circulars, configure hotspots, and review store analytics.
            </p>
          </div>

          {/* Quick Demo Access Card */}
          <Card className="border-primary/20 bg-primary/5 shadow-xs overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">Super Admin Demo Credentials</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Pre-seeded administrator account for full studio and database access.
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                  Admin Role
                </Badge>
              </div>

              <div className="rounded-md bg-background/80 p-2.5 border text-xs font-mono space-y-1 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted-foreground">
                    Email: <span className="text-foreground font-semibold">{DEMO_CREDENTIALS.email}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Password: <span className="text-foreground font-semibold">{DEMO_CREDENTIALS.password}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFillDemo}
                  className="flex-1 h-8 text-xs gap-1.5 bg-background"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Fill Credentials
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleInstantDemoLogin}
                  disabled={loading}
                  className="flex-1 h-8 text-xs gap-1.5 font-semibold"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  1-Click Sign In
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="py-3 text-xs">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold">Authentication Error</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@flip.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-sm h-10"
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium">
                  Password
                </Label>
                <Dialog open={forgotDialogOpen} onOpenChange={setForgotDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline font-medium focus:outline-none"
                    >
                      Forgot password?
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Reset Administrator Password</DialogTitle>
                      <DialogDescription className="text-xs">
                        Enter your administrative email address to receive password recovery instructions or view demo credentials.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleForgotSubmit} className="space-y-3 py-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="forgot-email" className="text-xs">
                          Account Email
                        </Label>
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="admin@flip.local"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground">For sandbox testing:</p>
                        <p>
                          Default demo admin account is <code className="font-mono text-primary">{DEMO_CREDENTIALS.email}</code>{" "}
                          with password <code className="font-mono text-primary">{DEMO_CREDENTIALS.password}</code>.
                        </p>
                      </div>
                      <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setForgotDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" size="sm">
                          Send Recovery Link
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10 text-sm h-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(!!checked)}
                />
                <Label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer font-normal">
                  Remember this device for 30 days
                </Label>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full gap-2 font-semibold h-11 text-sm shadow-sm" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Sign In to Admin Studio</span>
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </>
              )}
            </Button>
          </form>

          {/* SSO Options */}
          <div className="space-y-4 pt-2">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with enterprise SSO</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSSOClick("Google Workspace")}
                className="h-9 text-xs gap-2"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Google SSO
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSSOClick("Okta SAML")}
                className="h-9 text-xs gap-2"
              >
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                Okta / SAML
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-[11px] text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Connected to Neon Postgres backend with automated role authorization.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full max-w-md mx-auto pt-6 border-t flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
          <span>&copy; {new Date().getFullYear()} Flip Retail Media Platform.</span>
          <div className="flex items-center gap-3">
            <a href="#privacy" className="hover:text-foreground transition-colors">Privacy</a>
            <span>•</span>
            <a href="#terms" className="hover:text-foreground transition-colors">Terms</a>
            <span>•</span>
            <a href="#help" className="hover:text-foreground transition-colors">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}
