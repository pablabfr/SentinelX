"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Globe2, Building2, Calendar, ShieldCheck, ExternalLink } from "lucide-react";
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
import { scoreDomain } from "@/lib/scoring/domain";
import { useScanHistoryStore } from "@/lib/store/scan-history-store";
import type { DnsRecords } from "@/lib/services/dns";
import type { RdapResult } from "@/lib/services/rdap";
import type { SpfResult, DmarcResult } from "@/lib/services/email-auth";

interface DomainIntelResponse {
  domain: string;
  dns: DnsRecords;
  rdap: RdapResult | { error: string };
  subdomains: { subdomain: string; firstSeen?: string }[];
  spf: SpfResult;
  dmarc: DmarcResult;
}

export default function DomainIntelligencePage() {
  const [domain, setDomain] = useState("");
  const addEntry = useScanHistoryStore((s) => s.addEntry);

  const mutation = useMutation({
    mutationFn: (target: string) => apiPost<DomainIntelResponse>("/api/intel/domain", { domain: target }),
    onSuccess: (data) => {
      const scored = scoreDomain(data);
      addEntry({
        id: crypto.randomUUID(),
        type: "domain",
        target: data.domain,
        score: scored.riskScore,
        level: scored.level,
        summary: `${data.subdomains.length} subdomain(s) found`,
        timestamp: new Date().toISOString(),
      });
    },
  });

  const data = mutation.data;
  const scored = data ? scoreDomain(data) : null;
  const rdap = data && !("error" in data.rdap) ? data.rdap : null;
  const regEvent = rdap?.events.find((e) => e.action === "registration");
  const expEvent = rdap?.events.find((e) => e.action === "expiration");

  return (
    <div>
      <PageHeader icon={Globe2} title="Domain Intelligence" description="WHOIS, DNS, email authentication, and certificate transparency for any domain." />

      <Card className="mb-6">
        <CardContent className="p-4">
          <form
            className="flex flex-col gap-2.5 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (domain.trim()) mutation.mutate(domain.trim());
            }}
          >
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" className="flex-1" autoFocus />
            <Button type="submit" disabled={mutation.isPending || !domain.trim()}>
              <Globe2 className="h-4 w-4" />
              {mutation.isPending ? "Investigating…" : "Investigate"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {mutation.isPending && <LoadingState label={`Investigating ${domain}…`} />}
        {mutation.isError && <ErrorState description={(mutation.error as Error).message} onRetry={() => mutation.mutate(domain)} />}
        {!mutation.isPending && !data && !mutation.isError && (
          <EmptyState icon={Globe2} title="No lookup yet" description="Enter a domain to pull WHOIS, DNS, SPF/DMARC, and subdomain data." />
        )}

        {data && scored && (
          <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
              <Card className="flex flex-col items-center justify-center p-6">
                <ScoreRadial score={100 - scored.riskScore} label="Trust Score" />
                <RiskBadge level={scored.level} className="mt-4" />
              </Card>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard icon={Building2} label="Registrar" value={rdap?.registrar ?? "Unknown"} accent="blue" />
                <StatCard icon={Calendar} label="Registered" value={regEvent ? new Date(regEvent.date).toLocaleDateString() : "Unknown"} accent="purple" />
                <StatCard icon={Calendar} label="Expires" value={expEvent ? new Date(expEvent.date).toLocaleDateString() : "Unknown"} accent="warning" />
                <StatCard icon={ShieldCheck} label="Email Auth" value={`SPF ${data.spf.grade} · DMARC ${data.dmarc.grade}`} accent={data.spf.grade === "A" && data.dmarc.grade === "A" ? "success" : "warning"} />
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
                  <CardTitle>DNS records</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-xs">
                  <RecordRow label="A" values={data.dns.a} />
                  <RecordRow label="AAAA" values={data.dns.aaaa} />
                  <RecordRow label="NS" values={data.dns.ns} />
                  <RecordRow label="MX" values={data.dns.mx.map((m) => `${m.priority} ${m.exchange}`)} />
                  <RecordRow label="TXT" values={data.dns.txt.map((t) => t.join(""))} />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>SPF</CardTitle>
                  <Badge variant={data.spf.grade === "A" ? "success" : data.spf.grade === "F" ? "danger" : "warning"}>Grade {data.spf.grade}</Badge>
                </CardHeader>
                <CardContent>
                  {data.spf.record && <p className="mb-2 break-all font-mono text-[11px] text-[var(--color-text-secondary)]">{data.spf.record}</p>}
                  <ul className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
                    {data.spf.issues.map((i, idx) => <li key={idx}>• {i}</li>)}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>DMARC</CardTitle>
                  <Badge variant={data.dmarc.grade === "A" ? "success" : data.dmarc.grade === "F" ? "danger" : "warning"}>Grade {data.dmarc.grade}</Badge>
                </CardHeader>
                <CardContent>
                  {data.dmarc.record && <p className="mb-2 break-all font-mono text-[11px] text-[var(--color-text-secondary)]">{data.dmarc.record}</p>}
                  <ul className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
                    {data.dmarc.issues.map((i, idx) => <li key={idx}>• {i}</li>)}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Subdomains from certificate transparency ({data.subdomains.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {data.subdomains.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)]">No subdomains found in crt.sh logs.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.subdomains.map((s) => (
                      <a
                        key={s.subdomain}
                        href={`https://${s.subdomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-accent-blue)]/50 hover:text-[var(--color-accent-blue)]"
                      >
                        {s.subdomain} <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <AISummaryPanel context={{ domain: data.domain, findings: scored.findings, spf: data.spf, dmarc: data.dmarc }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RecordRow({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span key={i} className="rounded-md bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-[var(--color-text-secondary)]">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
