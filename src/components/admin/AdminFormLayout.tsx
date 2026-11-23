import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Shared building blocks for the admin add/edit form screens
 * (franchise, store location, product, settings). They keep spacing,
 * typography and card chrome identical across screens.
 */

export function AdminFormPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={cn("flex min-h-full w-full flex-col bg-background", className)}>{children}</div>
  );
}

export function AdminFormHeader({
  title,
  description,
  onBack,
  badge,
  actions,
}: {
  title: string;
  description?: string | undefined;
  onBack?: () => void;
  badge?: React.ReactNode | undefined;
  actions?: React.ReactNode | undefined;
}) {
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex min-w-0 items-center gap-3">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onBack}
            className="h-9 w-9 shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {badge}
          </div>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export function AdminFormSection({
  step,
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  id,
}: {
  step?: number | string | undefined;
  icon?: LucideIcon | undefined;
  title: string;
  description?: string | undefined;
  action?: React.ReactNode | undefined;
  children: React.ReactNode;
  className?: string | undefined;
  contentClassName?: string | undefined;
  id?: string | undefined;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 rounded-xl border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 space-y-0.5">
            <h2 className="text-sm font-semibold text-foreground">
              {step !== undefined && (
                <span className="mr-1.5 font-mono text-xs text-muted-foreground">{step}.</span>
              )}
              {title}
            </h2>
            {description && (
              <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={cn("space-y-5 px-6 py-5", contentClassName)}>{children}</div>
    </section>
  );
}

export function AdminFormField({
  label,
  htmlFor,
  required,
  hint,
  description,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string | undefined;
  required?: boolean | undefined;
  hint?: React.ReactNode | undefined;
  description?: React.ReactNode | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {description && (
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

/** Two-column responsive body: main content + optional sticky side rail. */
export function AdminFormBody({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode | undefined;
}) {
  return (
    <div
      className={cn(
        "grid w-full flex-1 gap-6 p-6",
        aside ? "xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]" : "",
      )}
    >
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
      {aside && <aside className="flex min-w-0 flex-col gap-6">{aside}</aside>}
    </div>
  );
}

export function AdminFormFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 flex items-center justify-end gap-3 border-t bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {children}
    </div>
  );
}

export const adminInputClass = "h-10 text-sm";
export const adminSelectTriggerClass = "h-10 w-full text-sm";
