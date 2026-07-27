"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Network, MapPin, Building2, Radio, ShieldOff, Server } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreRadial } from "@/components/shared/score-radial";
import { StatCard } from "@/components/shared/stat-card";
import { FindingsList } from "@/components/shared/findings-list";
import { AISummaryPanel } from "@/components/shared/ai-summary-panel";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/state-views";
import { RiskBadge } from "@/components/shared/risk-badge";
import { apiPost } from "@/lib/api-client";
import { scoreIp } from "@/lib/scoring/ip";
import { useScanHistoryStore } from "@/lib/store/scan-history-store";
import type { IpGeoResult } from "@/lib/services/ip-geo";
import type { AbuseIpDbResult } from "@/lib/services/integrations/abuseipdb";

interface IpIntelResponse {
  geo: IpGeoResult;
  rdap: unknown;
  hostnames: string[];
  abuse: AbuseIpDbResult | { error: string } | null;
  abuseKeyConfigured: boolean;
}

export default function IpIntelligencePage() {
  const [ip, setIp] = useState("");
  const addEntry = useScanHistoryStore((s) => s.addEntry);

  const mutation = useMutation({
    mutationFn: (target: string) => apiPost<IpIntelResponse>("/api/intel/ip", { ip: target }),
    onSuccess: (data) => {
      const abuse = data.abuse && !("error" in data.abuse) ? data.abuse : null;
      const scored = scoreIp(data.geo, abuse);
      addEntry({
        id: crypto.randomUUID(),
        type: "ip",
        target: data.geo.ip,
        score: scored.riskScore,
        level: scored.level,
        summary: `${data.geo.city ?? "Unknown"}, ${data.geo.country ?? "Unknown"}`,
        timestamp: new Date().toISOString(),
      });
    },
  });

  const data = mutation.data;
  const abuse = data?.abuse && !("error" in data.abuse) ? data.abuse : null;
  const scored = data ? scoreIp(data.geo, abuse) : null;

  return (
    <div>
      <PageHeader icon={Network} title="IP Intelligence" description="Geolocation, ASN, reputation, and anonymization signals for any IP address." />

      <Card className="mb-6">
        <CardContent className="p-4">
          <form
            className="flex flex-col gap-2.5 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (ip.trim()) mutation.mutate(ip.trim());
            }}
          >
            <Input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="8.8.8.8 or 2606:4700:4700::1111" className="flex-1" autoFocus />
            <Button type="submit" disabled={mutation.isPending || !ip.trim()}>
              <Network className="h-4 w-4" />
              {mutation.isPending ? "Looking up…" : "Investigate"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {mutation.isPending && <LoadingState label={`Looking up ${ip}…`} />}
        {mutation.isError && <ErrorState description={(mutation.error as Error).message} onRetry={() => mutation.mutate(ip)} />}
        {!mutation.isPending && !data && !mutation.isError && (
          <EmptyState icon={Network} title="No lookup yet" description="Enter an IPv4 or IPv6 address to investigate geolocation, ownership, and reputation." />
        )}

        {data && scored && (
          <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
              <Card className="flex flex-col items-center justify-center p-6">
                <ScoreRadial score={100 - scored.riskScore} label="Trust Score" />
                <RiskBadge level={scored.level} className="mt-4" />
              </Card>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard icon={MapPin} label="Location" value={data.geo.city ? `${data.geo.city}, ${data.geo.countryCode}` : data.geo.country ?? "Unknown"} accent="blue" />
                <StatCard icon={Building2} label="ISP / Org" value={data.geo.isp ?? "Unknown"} accent="purple" />
                <StatCard icon={Radio} label="ASN" value={data.geo.asn ?? "Unknown"} accent="blue" />
                <StatCard
                  icon={data.geo.isProxy || data.geo.isTor ? ShieldOff : Server}
                  label="Anonymization"
                  value={data.geo.isTor ? "Tor" : data.geo.isProxy ? "Proxy/VPN" : "None detected"}
                  accent={data.geo.isProxy || data.geo.isTor ? "danger" : "success"}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Findings</CardTitle>
                </CardHeader>
                <CardContent>
                  <FindingsList findings={scored.findings} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-xs">
                  <Field label="IP" value={data.geo.ip} mono />
                  <Field label="Timezone" value={data.geo.timezone ?? "—"} />
                  <Field label="Coordinates" value={data.geo.lat && data.geo.lon ? `${data.geo.lat.toFixed(3)}, ${data.geo.lon.toFixed(3)}` : "—"} />
                  <Field label="Reverse DNS" value={data.hostnames[0] ?? "—"} />
                  <Field label="Mobile network" value={data.geo.isMobile ? "Yes" : "No"} />
                  <Field label="Hosting/Datacenter" value={data.geo.isHosting ? "Yes" : "No"} />
                  {!data.abuseKeyConfigured && (
                    <div className="col-span-2 mt-2">
                      <Badge variant="outline">Add an AbuseIPDB key in Settings for abuse-report reputation data</Badge>
                    </div>
                  )}
                  {abuse && (
                    <>
                      <Field label="Abuse confidence" value={`${abuse.abuseConfidenceScore}%`} />
                      <Field label="Total reports" value={String(abuse.totalReports)} />
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <AISummaryPanel context={{ ip: data.geo, findings: scored.findings, abuse }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</dt>
      <dd className={`mt-0.5 break-all text-xs text-[var(--color-text)] ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
