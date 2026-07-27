"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  LayoutDashboard,
  Cpu,
  MemoryStick,
  HardDrive,
  Radar,
  Flame,
  ShieldCheck,
  Globe,
  KeyRound,
  Bot,
  FileBarChart,
  ArrowRight,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScoreRadial } from "@/components/shared/score-radial";
import { RiskBadge } from "@/components/shared/risk-badge";
import { EmptyState } from "@/components/shared/state-views";
import { apiGet } from "@/lib/api-client";
import { useScanHistoryStore } from "@/lib/store/scan-history-store";
import { useWatchlistStore } from "@/lib/store/watchlist-store";
import { scanTypeMeta } from "@/lib/scan-type-meta";
import { computeStreak, computeOverallScore, tallyCountries, todaysRiskLabel } from "@/lib/scoring/dashboard";
import type { SystemSnapshot } from "@/lib/services/system";
import type { CveItem } from "@/lib/services/threats";

const QUICK_ACTIONS = [
  { label: "Scan a website", icon: Globe, href: "/website-scanner", accent: "blue" as const },
  { label: "Check a password", icon: KeyRound, href: "/password-health", accent: "purple" as const },
  { label: "Ask the AI Assistant", icon: Bot, href: "/ai-assistant", accent: "purple" as const },
  { label: "Generate a report", icon: FileBarChart, href: "/reports", accent: "blue" as const },
];

export default function DashboardPage() {
  const entries = useScanHistoryStore((s) => s.entries);
  const watchlist = useWatchlistStore((s) => s.items);

  const systemQuery = useQuery({
    queryKey: ["system-scan"],
    queryFn: () => apiGet<SystemSnapshot>("/api/system/scan"),
    refetchInterval: 15_000,
  });

  const cveQuery = useQuery({
    queryKey: ["cve-feed", "CRITICAL", "dashboard"],
    queryFn: () => apiGet<{ items: CveItem[]; total: number }>("/api/threats/cve?limit=4&severity=CRITICAL"),
    staleTime: 5 * 60_000,
  });

  const overallScore = computeOverallScore(entries);
  const streak = computeStreak(entries);
  const risk = todaysRiskLabel(overallScore);
  const countries = tallyCountries(entries);
  const exposedWatchlist = watchlist.filter((w) => (w.breachCount ?? 0) > 0);
  const criticalScans = entries.filter((e) => e.level === "critical" || e.level === "high");

  const snapshot = systemQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={LayoutDashboard} title="Dashboard" description="Your complete security overview, updated in real time." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center justify-center gap-3 p-6">
          <ScoreRadial score={overallScore} label="Security Score" />
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--color-text)]">{risk.label}</p>
            <p className="mt-0.5 max-w-[14rem] text-[11px] text-[var(--color-text-muted)]">{risk.description}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--color-warning)]/25 bg-[var(--color-warning)]/8 px-3 py-1">
            <Flame className="h-3 w-3 text-[var(--color-warning)]" />
            <span className="text-[11px] text-[var(--color-warning)]">{streak}-day streak</span>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <LiveGauge icon={Cpu} label="CPU" value={snapshot?.cpu.currentLoad ?? null} loading={systemQuery.isLoading} />
          <LiveGauge icon={MemoryStick} label="Memory" value={snapshot?.memory.usedPercent ?? null} loading={systemQuery.isLoading} />
          <LiveGauge icon={HardDrive} label="Disk" value={snapshot?.disks[0]?.usedPercent ?? null} loading={systemQuery.isLoading} />
          <Card className="flex flex-col justify-between p-4">
            <div className="flex items-center gap-2">
              <Radar className="h-4 w-4 text-[var(--color-accent-blue)]" />
              <p className="text-xs font-medium text-[var(--color-text-secondary)]">Listening ports</p>
            </div>
            <p className="font-display text-2xl font-semibold text-[var(--color-text)]">{snapshot?.network.connections.length ?? "—"}</p>
          </Card>

          <div className="col-span-2 lg:col-span-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {QUICK_ACTIONS.map((action) => (
                <Button key={action.href} asChild variant={action.accent === "purple" ? "purple" : "default"} size="sm" className="justify-start">
                  <Link href={action.href}>
                    <action.icon className="h-3.5 w-3.5" />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Threat Timeline</CardTitle>
            {entries.length > 0 && (
              <Link href="/reports" className="text-xs text-[var(--color-accent-blue)] hover:underline">
                View all →
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <EmptyState icon={Zap} title="No scans yet" description="Run your first scan to start building your security timeline." />
            ) : (
              <ul className="flex flex-col gap-1">
                {entries.slice(0, 8).map((e) => {
                  const meta = scanTypeMeta[e.type];
                  return (
                    <li key={e.id}>
                      <Link
                        href={meta.href}
                        className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.03]"
                      >
                        <div className="rounded-lg bg-white/5 p-2">
                          <meta.icon className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-[var(--color-text)]">{e.target}</p>
                          <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                            {meta.label} · {e.summary} · {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                        <RiskBadge level={e.level} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Threat Origins</CardTitle>
          </CardHeader>
          <CardContent>
            {countries.length === 0 ? (
              <EmptyState icon={Radar} title="No geographic data yet" description="Run IP Intelligence lookups to populate this." className="py-8" />
            ) : (
              <ul className="flex flex-col gap-3">
                {countries.map((c) => (
                  <li key={c.code} className="flex items-center gap-3">
                    <span className="w-8 text-xs font-medium text-[var(--color-text-secondary)]">{c.code}</span>
                    <div className="flex-1">
                      <Progress value={(c.count / countries[0].count) * 100} />
                    </div>
                    <span className="w-4 text-right text-xs text-[var(--color-text-muted)]">{c.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--color-accent-purple)]" /> Live Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2.5">
              {criticalScans.length > 0 && (
                <Recommendation
                  text={`${criticalScans.length} scan(s) currently at high or critical risk — review and remediate.`}
                  href="/reports"
                />
              )}
              {exposedWatchlist.length > 0 && (
                <Recommendation
                  text={`${exposedWatchlist.length} monitored identity(ies) found in data breaches — rotate those passwords.`}
                  href="/dark-web-monitor"
                />
              )}
              {entries.length === 0 && exposedWatchlist.length === 0 && (
                <Recommendation text="Run a Website Scan on your primary domain to establish a security baseline." href="/website-scanner" />
              )}
              <Recommendation text="Generate secure, unique passwords for any reused or weak credentials." href="/password-health" />
              <Recommendation text="Add key identities to the Dark Web Monitor watchlist for ongoing breach checks." href="/dark-web-monitor" />
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-[var(--color-danger)]" /> Today&apos;s Threat Forecast
            </CardTitle>
            <Link href="/threat-centre" className="text-xs text-[var(--color-accent-blue)] hover:underline">
              Threat Centre →
            </Link>
          </CardHeader>
          <CardContent>
            {cveQuery.isLoading && <p className="text-xs text-[var(--color-text-muted)]">Loading latest critical CVEs…</p>}
            {cveQuery.isError && <p className="text-xs text-[var(--color-text-muted)]">Could not reach the NVD feed right now.</p>}
            {cveQuery.data && cveQuery.data.items.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)]">No new critical CVEs published recently.</p>
            )}
            {cveQuery.data && cveQuery.data.items.length > 0 && (
              <ul className="flex flex-col gap-2.5">
                {cveQuery.data.items.slice(0, 4).map((cve) => (
                  <li key={cve.id} className="flex items-start gap-2.5">
                    <Badge variant="danger" className="mt-0.5 shrink-0">
                      {cve.cvssScore ?? "—"}
                    </Badge>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-[var(--color-text)]">{cve.id}</p>
                      <p className="truncate text-[11px] text-[var(--color-text-muted)]">{cve.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LiveGauge({ icon: Icon, label, value, loading }: { icon: typeof Cpu; label: string; value: number | null; loading: boolean }) {
  return (
    <Card className="flex flex-col justify-between p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--color-accent-blue)]" />
        <p className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</p>
      </div>
      <motion.p
        key={value ?? "loading"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-display text-2xl font-semibold tabular-nums text-[var(--color-text)]"
      >
        {loading ? "…" : value !== null ? `${value}%` : "—"}
      </motion.p>
    </Card>
  );
}

function Recommendation({ text, href }: { text: string; href: string }) {
  return (
    <li>
      <Link href={href} className="group flex items-start gap-2.5 rounded-lg p-2 transition-colors hover:bg-white/[0.03]">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent-purple)]" />
        <span className="flex-1 text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text)]">{text}</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    </li>
  );
}
