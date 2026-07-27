"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendPositive,
  accent = "blue",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  trendPositive?: boolean;
  accent?: "blue" | "purple" | "success" | "warning" | "danger";
  className?: string;
}) {
  const accentVar = `var(--color-${accent === "success" ? "success" : accent === "danger" ? "danger" : accent === "warning" ? "warning" : accent === "purple" ? "accent-purple" : "accent-blue"})`;
  return (
    <Card className={cn("group relative overflow-hidden p-4 hover:border-[#333] transition-colors", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-[var(--color-text)]"
          >
            {value}
          </motion.p>
          {trend && (
            <p
              className="mt-1 text-xs"
              style={{ color: trendPositive ? "var(--color-success)" : "var(--color-danger)" }}
            >
              {trend}
            </p>
          )}
        </div>
        <div
          className="rounded-lg p-2 transition-transform group-hover:scale-110"
          style={{ background: `color-mix(in srgb, ${accentVar} 12%, transparent)` }}
        >
          <Icon className="h-4 w-4" style={{ color: accentVar }} />
        </div>
      </div>
    </Card>
  );
}
