"use client";

import { useMemo } from "react";
import { useScanHistoryStore } from "@/lib/store/scan-history-store";
import { riskColor } from "@/lib/risk";
import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ThreatLevelIndicator() {
  const entries = useScanHistoryStore((s) => s.entries);

  const { level, label } = useMemo(() => {
    if (entries.length === 0) {
      return { level: "safe" as RiskLevel, label: "Monitoring" };
    }
    const recent = entries.slice(0, 10);
    const avg = recent.reduce((sum, e) => sum + e.score, 0) / recent.length;
    if (avg >= 80) return { level: "critical" as RiskLevel, label: "Critical" };
    if (avg >= 60) return { level: "high" as RiskLevel, label: "Elevated" };
    if (avg >= 35) return { level: "medium" as RiskLevel, label: "Guarded" };
    if (avg >= 15) return { level: "low" as RiskLevel, label: "Low" };
    return { level: "safe" as RiskLevel, label: "Secure" };
  }, [entries]);

  const color = riskColor[level];

  return (
    <div
      className="flex items-center gap-2 rounded-full border px-3 py-1"
      style={{ borderColor: `color-mix(in srgb, ${color} 30%, transparent)`, background: `color-mix(in srgb, ${color} 8%, transparent)` }}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse-glow")} style={{ background: color, color }} />
      <span className="text-[11px] font-medium" style={{ color }}>
        Threat level: {label}
      </span>
    </div>
  );
}
