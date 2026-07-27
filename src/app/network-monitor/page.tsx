"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as ChartTooltip, CartesianGrid } from "recharts";
import { Radar, Wifi, Globe2, Search, RotateCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/state-views";
import { apiGet, apiPost } from "@/lib/api-client";
import type { IpGeoResult } from "@/lib/services/ip-geo";
import type { LatencyTarget } from "@/lib/services/network";
import type { DnsRecords } from "@/lib/services/dns";

interface NetworkInfoResponse {
  publicIp: string;
  geo: IpGeoResult | null;
  latency: LatencyTarget[];
  interfaces: { iface: string; ip4: string; ip6: string; mac: string; type: string; internal: boolean }[];
  connections: { protocol: string; localPort: string; state: string; process?: string }[];
}

export default function NetworkMonitorPage() {
  const query = useQuery({
    queryKey: ["network-info"],
    queryFn: () => apiGet<NetworkInfoResponse>("/api/network/info"),
    refetchInterval: 20_000,
  });

  const [domain, setDomain] = useState("");
  const dnsMutation = useMutation({
    mutationFn: (target: string) => apiPost<DnsRecords>("/api/network/dns-lookup", { domain: target }),
  });

  const data = query.data;

  return (
    <div>
      <PageHeader
        icon={Radar}
        title="Network Monitor"
        description="Public IP, latency to key network hubs, local interfaces, and a DNS lookup tool."
        actions={
          <Button variant="secondary" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RotateCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      {query.isLoading && <LoadingState label="Gathering network telemetry…" />}
      {query.isError && <ErrorState description={(query.error as Error).message} onRetry={() => query.refetch()} />}

      {data && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">Public IP</p>
              <p className="mt-1 font-mono text-lg text-[var(--color-text)]">{data.publicIp}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">Location</p>
              <p className="mt-1 text-lg text-[var(--color-text)]">{data.geo ? `${data.geo.city ?? "—"}, ${data.geo.countryCode ?? "—"}` : "Unknown"}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">ISP</p>
              <p className="mt-1 truncate text-lg text-[var(--color-text)]">{data.geo?.isp ?? "Unknown"}</p>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-4 w-4" /> Latency to key network hubs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.latency.map((l) => ({ name: l.name, ms: l.latencyMs ?? 0, ok: l.ok }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} unit="ms" />
                    <ChartTooltip
                      contentStyle={{ background: "#111111", border: "1px solid #262626", borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="ms" radius={[6, 6, 0, 0]} fill="#00c2ff" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.latency.map((l) => (
                  <Badge key={l.name} variant={l.ok ? "success" : "danger"}>
                    {l.name}: {l.ok ? `${l.latencyMs}ms` : "unreachable"}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Network interfaces</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Interface</TableHead>
                      <TableHead>IPv4</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.interfaces
                      .filter((i) => !i.internal)
                      .map((i) => (
                        <TableRow key={i.iface}>
                          <TableCell className="text-xs">{i.iface}</TableCell>
                          <TableCell className="font-mono text-xs">{i.ip4 || "—"}</TableCell>
                          <TableCell className="text-xs">{i.type}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Listening connections</CardTitle>
              </CardHeader>
              <CardContent>
                {data.connections.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)]">No listening connections detected.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Port</TableHead>
                        <TableHead>Protocol</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.connections.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{c.localPort}</TableCell>
                          <TableCell className="text-xs uppercase">{c.protocol}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe2 className="h-4 w-4" /> DNS lookup tool
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <form
                className="flex gap-2.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (domain.trim()) dnsMutation.mutate(domain.trim());
                }}
              >
                <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" className="flex-1" />
                <Button type="submit" disabled={dnsMutation.isPending || !domain.trim()}>
                  <Search className="h-4 w-4" /> Lookup
                </Button>
              </form>
              {dnsMutation.isPending && <LoadingState label="Resolving…" />}
              {dnsMutation.isError && <ErrorState description={(dnsMutation.error as Error).message} />}
              {!dnsMutation.data && !dnsMutation.isPending && (
                <EmptyState icon={Globe2} title="No lookup yet" description="Enter a domain above to resolve A, AAAA, MX, NS, and TXT records." />
              )}
              {dnsMutation.data && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <RecordBlock label="A" values={dnsMutation.data.a} />
                  <RecordBlock label="AAAA" values={dnsMutation.data.aaaa} />
                  <RecordBlock label="NS" values={dnsMutation.data.ns} />
                  <RecordBlock label="MX" values={dnsMutation.data.mx.map((m) => `${m.priority} ${m.exchange}`)} />
                  <RecordBlock label="TXT" values={dnsMutation.data.txt.map((t) => t.join(""))} />
                  <RecordBlock label="CNAME" values={dnsMutation.data.cname} />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function RecordBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-soft)] p-3">
      <p className="mb-1.5 text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      {values.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)]">—</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span key={i} className="rounded-md bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-[var(--color-text-secondary)]">
              {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
