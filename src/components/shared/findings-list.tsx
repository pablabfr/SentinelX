import { CheckCircle2 } from "lucide-react";
import { SeverityBadge } from "@/components/shared/risk-badge";
import type { Finding } from "@/lib/types";

export function FindingsList({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-success)]/20 bg-[var(--color-success)]/5 px-4 py-3.5">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
        <p className="text-sm text-[var(--color-text)]">No issues detected in this scan.</p>
      </div>
    );
  }

  const sorted = [...findings].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((f) => (
        <li key={f.id} className="rounded-xl border border-[var(--color-border-soft)] bg-white/[0.015] p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <SeverityBadge severity={f.severity} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">{f.title}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{f.description}</p>
                {f.recommendation && (
                  <p className="mt-1.5 text-xs text-[var(--color-accent-blue)]">→ {f.recommendation}</p>
                )}
              </div>
            </div>
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{f.category}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function severityRank(s: Finding["severity"]) {
  return { critical: 0, high: 1, medium: 2, low: 3, info: 4 }[s];
}
