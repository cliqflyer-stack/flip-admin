import React, { useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
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
import { BrandLogo, BrandIcon } from "@/components/ui/BrandLogo";
import { useAuth } from "@/lib/auth-context";

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
        toast.success("Welcome back! Signed in to Flip Admin.");
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

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Please enter your account email address.");
      return;
    }
    toast.success(`Password reset instructions sent to ${forgotEmail}.`);
    setForgotDialogOpen(false);
    setForgotEmail("");
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-background text-foreground px-4 py-8">
      {/* Top Bar with Brand & Theme Toggle */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrandIcon className="h-8 w-8" />
          <BrandLogo className="h-5 w-auto" />
        </div>
        <ThemeToggle />
      </header>

      {/* Main Centered Authentication Form */}
      <main className="w-full max-w-sm sm:max-w-md mx-auto my-auto py-8">
        <Card className="border border-border/80 shadow-md">
          <CardHeader className="space-y-1 text-center pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight">Sign In</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter your administrative credentials to continue
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2.5 text-xs">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

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
                    placeholder="name@company.com"
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
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription className="text-xs">
                          Enter your account email to receive a password reset link.
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
                            placeholder="name@company.com"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            required
                          />
                        </div>
                        <DialogFooter className="pt-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setForgotDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" size="sm">
                            Send Reset Link
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
                    Remember me
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 font-semibold h-10 text-sm shadow-sm"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Sign In</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full max-w-5xl mx-auto text-center text-xs text-muted-foreground pt-4">
        <span>&copy; {new Date().getFullYear()} Flip Admin. All rights reserved.</span>
      </footer>
    </div>
  );
}
