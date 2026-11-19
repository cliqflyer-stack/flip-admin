import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LoginPage } from "@/components/admin/LoginPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign In — Snatchup Admin" },
      { name: "description", content: "Sign in to Snatchup Admin" },
    ],
  }),
  component: IndexRouteWrapper,
});

function IndexRouteWrapper() {
  return (
    <AuthProvider>
      <IndexRouteContent />
    </AuthProvider>
  );
}

function IndexRouteContent() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const timeout = setTimeout(() => {
        navigate({ to: "/admin" });
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Checking authorization session...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
        <Card className="max-w-md w-full shadow-lg border">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">Already Authenticated</CardTitle>
            <CardDescription className="text-xs">
              You are signed in as <span className="font-semibold text-foreground">{user.email}</span> ({user.role}).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full gap-2">
              <Link to="/admin">
                <ShieldCheck className="h-4 w-4" />
                Go to Admin
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <LoginPage onLoginSuccess={() => navigate({ to: "/admin" })} />;
}
