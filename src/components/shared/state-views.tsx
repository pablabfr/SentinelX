"use client";

import { AlertTriangle, Inbox, Key, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-14 text-center", className)}>
      <div className="rounded-full bg-white/5 p-3">
        <Icon className="h-5 w-5 text-[var(--color-text-muted)]" />
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
        {description && <p className="mt-1 max-w-sm text-xs text-[var(--color-text-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/5 px-6 py-14 text-center", className)}>
      <div className="rounded-full bg-[var(--color-danger)]/10 p-3">
        <AlertTriangle className="h-5 w-5 text-[var(--color-danger)]" />
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
        {description && <p className="mt-1 max-w-sm text-xs text-[var(--color-text-muted)]">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function RequiresApiKeyState({
  service,
  settingsHref = "/settings",
  className,
}: {
  service: string;
  settingsHref?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--color-accent-purple)]/30 bg-[var(--color-accent-purple)]/5 px-6 py-14 text-center", className)}>
      <div className="rounded-full bg-[var(--color-accent-purple)]/10 p-3">
        <Key className="h-5 w-5 text-[var(--color-accent-purple)]" />
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--color-text)]">{service} API key required</p>
        <p className="mt-1 max-w-sm text-xs text-[var(--color-text-muted)]">
          Add your {service} API key in Settings to enable this integration. Without it, SentinelX cannot fetch real data for this feature — nothing is simulated.
        </p>
      </div>
      <Button asChild variant="purple" size="sm">
        <a href={settingsHref}>Open Settings</a>
      </Button>
    </div>
  );
}

export function LoadingState({ label = "Running scan…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      <LoaderCircle className="h-5 w-5 animate-spin text-[var(--color-accent-blue)]" />
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}
