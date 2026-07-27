import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-panel)] p-2.5 glow-blue">
            <Icon className="h-5 w-5 text-[var(--color-accent-blue)]" />
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--color-text)]">{title}</h1>
          {description && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
