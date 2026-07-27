import type { ScanHistoryEntry } from "@/lib/store/scan-history-store";

export function computeStreak(entries: ScanHistoryEntry[]): number {
  if (entries.length === 0) return 0;
  const days = new Set(entries.map((e) => new Date(e.timestamp).toDateString()));
  let streak = 0;
  const cursor = new Date();
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeOverallScore(entries: ScanHistoryEntry[]): number {
  if (entries.length === 0) return 100;
  const recent = entries.slice(0, 20);
  const avgRisk = recent.reduce((sum, e) => sum + e.score, 0) / recent.length;
  return Math.round(100 - avgRisk);
}

export function tallyCountries(entries: ScanHistoryEntry[]): { code: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (!e.countryCode) continue;
    counts.set(e.countryCode, (counts.get(e.countryCode) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function todaysRiskLabel(score: number): { label: string; description: string } {
  if (score >= 80) return { label: "Low Risk", description: "Your monitored assets look healthy today." };
  if (score >= 60) return { label: "Guarded", description: "A few issues need attention, nothing urgent yet." };
  if (score >= 35) return { label: "Elevated", description: "Multiple findings warrant review this week." };
  return { label: "High Risk", description: "Critical findings detected — act now." };
}
