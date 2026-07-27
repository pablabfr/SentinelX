import type { RiskLevel, Severity } from "@/lib/types";

export function levelFromScore(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  if (score >= 15) return "low";
  return "safe";
}

export const riskColor: Record<RiskLevel, string> = {
  critical: "var(--color-danger)",
  high: "var(--color-danger)",
  medium: "var(--color-warning)",
  low: "var(--color-accent-blue)",
  safe: "var(--color-success)",
};

export const riskBadgeVariant: Record<RiskLevel, "danger" | "warning" | "blue" | "success"> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "blue",
  safe: "success",
};

export const severityColor: Record<Severity, string> = {
  critical: "var(--color-danger)",
  high: "var(--color-danger)",
  medium: "var(--color-warning)",
  low: "var(--color-accent-blue)",
  info: "var(--color-text-secondary)",
};

export const severityBadgeVariant: Record<Severity, "danger" | "warning" | "blue" | "default"> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "blue",
  info: "default",
};

export const severityWeight: Record<Severity, number> = {
  critical: 30,
  high: 20,
  medium: 10,
  low: 4,
  info: 0,
};

export function scoreFromFindings(findings: { severity: Severity }[], base = 0): number {
  const raw = base + findings.reduce((sum, f) => sum + severityWeight[f.severity], 0);
  return Math.max(0, Math.min(100, raw));
}
