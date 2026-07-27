"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MonitorCog, Cpu, MemoryStick, HardDrive, Clock, Info, RotateCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScoreRadial } from "@/components/shared/score-radial";
import { FindingsList } from "@/components/shared/findings-list";
import { AISummaryPanel } from "@/components/shared/ai-summary-panel";
import { LoadingState, ErrorState } from "@/components/shared/state-views";
import { RiskBadge } from "@/components/shared/risk-badge";
import { apiGet } from "@/lib/api-client";
import { scoreSystem } from "@/lib/scoring/system";
import { formatBytes, formatDuration } from "@/lib/utils";
import type { SystemSnapshot } from "@/lib/services/system";

export default function SystemScannerPage() {
  const query = useQuery({
    queryKey: ["system-scan"],
    queryFn: () => apiGet<SystemSnapshot>("/api/system/scan"),
    refetchInterval: 10_000,
  });

  const snapshot = query.data;
  const scored = snapshot ? scoreSystem(snapshot) : null;

  return (
    <div>
      <PageHeader
        icon={MonitorCog}
        title="System Scanner"
        description="Live inspection of the host running SentinelX — CPU, memory, disk, processes, and exposed ports."
        actions={
          <Button variant="secondary" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RotateCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} /> Rescan
          </Button>
        }
      />

      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-[var(--color-accent-blue)]/20 bg-[var(--color-accent-blue)]/5 p-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-blue)]" />
        <p className="text-xs text-[var(--color-text-secondary)]">
          This scans the server host running the SentinelX application in this environment, using real live system telemetry — not a simulation. A
          desktop/Electron build would instead scan the end user&apos;s local machine.
        </p>
      </div>

      {query.isLoading && <LoadingState label="Reading host telemetry…" />}
      {query.isError && <ErrorState description={(query.error as Error).message} onRetry={() => query.refetch()} />}

      {snapshot && scored && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
            <Card className="flex flex-col items-center justify-center p-6">
              <ScoreRadial score={100 - scored.riskScore} label="System Score" />
              <RiskBadge level={scored.level} className="mt-4" />
            </Card>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <GaugeCard icon={Cpu} label="CPU Load" value={snapshot.cpu.currentLoad} suffix="%" detail={`${snapshot.cpu.brand} · ${snapshot.cpu.cores} cores`} />
              <GaugeCard icon={MemoryStick} label="Memory" value={snapshot.memory.usedPercent} suffix="%" detail={`${formatBytes(snapshot.memory.usedBytes)} / ${formatBytes(snapshot.memory.totalBytes)}`} />
              <GaugeCard
                icon={HardDrive}
                label="Disk"
                value={snapshot.disks[0]?.usedPercent ?? null}
                suffix="%"
                detail={snapshot.disks[0] ? `${formatBytes(snapshot.disks[0].usedBytes)} / ${formatBytes(snapshot.disks[0].sizeBytes)}` : "No disk data"}
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> Host details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Hostname" value={snapshot.hostname} />
              <Field label="Platform" value={`${snapshot.platform} (${snapshot.arch})`} />
              <Field label="Distro" value={snapshot.distro} />
              <Field label="Uptime" value={formatDuration(snapshot.uptimeSeconds)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Findings</CardTitle>
            </CardHeader>
            <CardContent>
              <FindingsList findings={scored.findings} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top processes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>CPU%</TableHead>
                      <TableHead>Mem%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshot.processes.map((p) => (
                      <TableRow key={p.pid}>
                        <TableCell className="font-mono text-xs">{p.pid}</TableCell>
                        <TableCell className="text-xs">{p.name}</TableCell>
                        <TableCell className="text-xs">{p.cpu}</TableCell>
                        <TableCell className="text-xs">{p.mem}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Listening ports</CardTitle>
              </CardHeader>
              <CardContent>
                {snapshot.network.connections.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)]">No listening ports detected (or insufficient permissions to enumerate them).</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Port</TableHead>
                        <TableHead>Protocol</TableHead>
                        <TableHead>Process</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {snapshot.network.connections.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{c.localPort}</TableCell>
                          <TableCell className="text-xs uppercase">{c.protocol}</TableCell>
                          <TableCell className="text-xs">{c.process ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {snapshot.services.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Running services</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {snapshot.services.map((s) => (
                  <Badge key={s.name} variant="success">
                    {s.name}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <AISummaryPanel context={{ snapshot: { cpu: snapshot.cpu, memory: snapshot.memory, disks: snapshot.disks }, findings: scored.findings }} />
        </motion.div>
      )}
    </div>
  );
}

function GaugeCard({ icon: Icon, label, value, suffix, detail }: { icon: typeof Cpu; label: string; value: number | null; suffix: string; detail: string }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--color-accent-blue)]" />
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</p>
        </div>
        <p className="font-display text-lg font-semibold tabular-nums text-[var(--color-text)]">
          {value !== null ? `${value}${suffix}` : "—"}
        </p>
      </div>
      <Progress value={value ?? 0} indicatorColor={value !== null && value >= 85 ? "var(--color-danger)" : value !== null && value >= 65 ? "var(--color-warning)" : "var(--color-accent-blue)"} />
      <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">{detail}</p>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</dt>
      <dd className="mt-0.5 truncate text-xs text-[var(--color-text)]">{value}</dd>
    </div>
  );
}
