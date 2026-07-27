"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Lock,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Cookie,
  Layers,
  Network,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreRadial } from "@/components/shared/score-radial";
import { StatCard } from "@/components/shared/stat-card";
import { FindingsList } from "@/components/shared/findings-list";
import { AISummaryPanel } from "@/components/shared/ai-summary-panel";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/state-views";
import { RiskBadge } from "@/components/shared/risk-badge";
import { apiPost } from "@/lib/api-client";
import { scoreWebsiteBundle } from "@/lib/scoring/website";
import { useScanHistoryStore } from "@/lib/store/scan-history-store";
import { useNotificationStore } from "@/lib/store/notification-store";
import type { HttpScanResult } from "@/lib/services/http-scan";
import type { TlsCertInfo } from "@/lib/services/tls-cert";
import type { DnsRecords } from "@/lib/services/dns";
import type { RdapResult } from "@/lib/services/rdap";

interface WebsiteScanResponse {
  hostname: string;
  http: HttpScanResult;
  tls: TlsCertInfo | { error: string };
  dns: DnsRecords;
  rdap: RdapResult | { error: string } | null;
  subdomains: { subdomain: string; firstSeen?: string }[];
}

export default function WebsiteScannerPage() {
  const [url, setUrl] = useState("");
  const addEntry = useScanHistoryStore((s) => s.addEntry);
  const pushNotification = useNotificationStore((s) => s.push);

  const mutation = useMutation({
    mutationFn: (target: string) => apiPost<WebsiteScanResponse>("/api/scan/website", { url: target }),
    onSuccess: (data) => {
      const { riskScore, level, findings } = scoreWebsiteBundle(data);
      addEntry({
        id: crypto.randomUUID(),
        type: "website",
        target: data.hostname,
        score: riskScore,
        level,
        summary: `${findings.length} finding(s) detected`,
        timestamp: new Date().toISOString(),
      });
      if (level === "critical" || level === "high") {
        pushNotification({
          title: `Elevated risk on ${data.hostname}`,
          description: `Website scan found ${findings.length} issue(s), including ${findings.filter((f) => f.severity === "critical" || f.severity === "high").length} high/critical.`,
          severity: level === "critical" ? "critical" : "high",
          href: "/website-scanner",
        });
      }
    },
  });

  const data = mutation.data;
  const scored = data ? scoreWebsiteBundle(data) : null;

  return (
    <div>
      <PageHeader
        icon={Globe}
        title="Website Scanner"
        description="Analyze HTTPS, security headers, cookies, DNS, WHOIS, and technology stack for any site."
      />

      <Card className="mb-6">
        <CardContent className="p-4">
          <form
            className="flex flex-col gap-2.5 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (url.trim()) mutation.mutate(url.trim());
            }}
          >
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com or https://example.com"
              className="flex-1"
              autoFocus
            />
            <Button type="submit" disabled={mutation.isPending || !url.trim()}>
              <ShieldCheck className="h-4 w-4" />
              {mutation.isPending ? "Scanning…" : "Run scan"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {mutation.isPending && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoadingState label={`Scanning ${url}… checking HTTPS, headers, DNS, WHOIS, and certificate transparency logs`} />
          </motion.div>
        )}

        {mutation.isError && (
          <ErrorState
            title="Scan failed"
            description={(mutation.error as Error).message}
            onRetry={() => mutation.mutate(url)}
          />
        )}

        {!mutation.isPending && !data && !mutation.isError && (
          <EmptyState
            icon={Globe}
            title="No scan yet"
            description="Enter a URL above to run a full security scan — HTTPS, headers, SSL certificate, cookies, DNS, WHOIS, tech stack, and subdomains."
          />
        )}

        {data && scored && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col gap-6"
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
              <Card className="flex flex-col items-center justify-center p-6">
                <ScoreRadial score={scored.securityScore} label="Security Score" />
                <RiskBadge level={scored.level} className="mt-4" />
              </Card>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  icon={data.http.https ? Lock : ShieldAlert}
                  label="HTTPS"
                  value={data.http.https ? "Enabled" : "Missing"}
                  accent={data.http.https ? "success" : "danger"}
                />
                <StatCard
                  icon={ShieldCheck}
                  label="Security Headers"
                  value={`${data.http.securityHeaders.filter((h) => h.present).length}/${data.http.securityHeaders.length}`}
                  accent="blue"
                />
                <StatCard icon={Cookie} label="Cookies" value={String(data.http.cookies.length)} accent="purple" />
                <StatCard icon={Layers} label="Technologies" value={String(data.http.technologies.length)} accent="blue" />
              </div>
            </div>

            <Tabs defaultValue="overview">
              <TabsList className="flex-wrap">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="headers">Headers</TabsTrigger>
                <TabsTrigger value="ssl">SSL / TLS</TabsTrigger>
                <TabsTrigger value="dns">DNS &amp; WHOIS</TabsTrigger>
                <TabsTrigger value="tech">Cookies &amp; Tech</TabsTrigger>
                <TabsTrigger value="subdomains">Subdomains ({data.subdomains.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle>Findings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FindingsList findings={scored.findings} />
                  </CardContent>
                </Card>
                {data.http.redirectChain.length > 1 && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle>Redirect chain</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {data.http.redirectChain.map((hop, i) => (
                          <span key={i} className="flex items-center gap-2">
                            <span className="rounded-md border border-[var(--color-border)] px-2 py-1 font-mono text-[var(--color-text-secondary)]">
                              {hop.status} {new URL(hop.url).hostname}
                            </span>
                            {i < data.http.redirectChain.length - 1 && <ArrowRight className="h-3 w-3 text-[var(--color-text-muted)]" />}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="headers">
                <Card>
                  <CardHeader>
                    <CardTitle>Security headers</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {data.http.securityHeaders.map((h) => (
                      <div
                        key={h.name}
                        className="flex flex-col gap-1 rounded-lg border border-[var(--color-border-soft)] p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-mono text-xs text-[var(--color-text)]">{h.name}</p>
                          {h.value && <p className="mt-0.5 max-w-lg truncate text-[11px] text-[var(--color-text-muted)]">{h.value}</p>}
                        </div>
                        <Badge variant={h.present ? "success" : "danger"}>{h.present ? "Present" : "Missing"}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ssl">
                <Card>
                  <CardHeader>
                    <CardTitle>TLS certificate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {"error" in data.tls ? (
                      <ErrorState description={data.tls.error} />
                    ) : (
                      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Subject" value={data.tls.subject.CN ?? "—"} />
                        <Field label="Issuer" value={data.tls.issuer.O ?? data.tls.issuer.CN ?? "—"} />
                        <Field label="Valid from" value={new Date(data.tls.validFrom).toLocaleDateString()} />
                        <Field label="Valid to" value={new Date(data.tls.validTo).toLocaleDateString()} />
                        <Field label="Days until expiry" value={String(data.tls.daysUntilExpiry)} />
                        <Field label="Protocol" value={data.tls.protocol ?? "—"} />
                        <Field label="Cipher" value={data.tls.cipher?.name ?? "—"} />
                        <Field label="Trusted" value={data.tls.authorized ? "Yes" : `No — ${data.tls.authorizationError ?? ""}`} />
                        <Field label="Fingerprint (SHA-256)" value={data.tls.fingerprint256} mono />
                        <Field label="Alt names" value={data.tls.subjectAltNames.join(", ") || "—"} />
                      </dl>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dns">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>DNS records</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 text-xs">
                      <RecordRow label="A" values={data.dns.a} />
                      <RecordRow label="AAAA" values={data.dns.aaaa} />
                      <RecordRow label="NS" values={data.dns.ns} />
                      <RecordRow label="CNAME" values={data.dns.cname} />
                      <RecordRow label="MX" values={data.dns.mx.map((m) => `${m.priority} ${m.exchange}`)} />
                      <RecordRow label="TXT" values={data.dns.txt.map((t) => t.join(""))} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>WHOIS / RDAP</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!data.rdap || "error" in data.rdap ? (
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {data.rdap && "error" in data.rdap ? data.rdap.error : "No RDAP record available."}
                        </p>
                      ) : (
                        <dl className="grid grid-cols-1 gap-3">
                          <Field label="Registrar" value={data.rdap.registrar ?? "—"} />
                          <Field label="Status" value={data.rdap.status.join(", ") || "—"} />
                          <Field label="Nameservers" value={data.rdap.nameservers.join(", ") || "—"} />
                          <Field label="Abuse contact" value={data.rdap.abuseEmail ?? "—"} />
                          {data.rdap.events.slice(0, 4).map((ev) => (
                            <Field key={ev.action} label={ev.action} value={new Date(ev.date).toLocaleDateString()} />
                          ))}
                        </dl>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="tech">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Cookies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.http.cookies.length === 0 ? (
                        <p className="text-xs text-[var(--color-text-muted)]">No cookies set on the initial response.</p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {data.http.cookies.map((c) => (
                            <li key={c.name} className="rounded-lg border border-[var(--color-border-soft)] p-3">
                              <p className="font-mono text-xs text-[var(--color-text)]">{c.name}</p>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                <Badge variant={c.secure ? "success" : "danger"}>Secure {c.secure ? "✓" : "✗"}</Badge>
                                <Badge variant={c.httpOnly ? "success" : "warning"}>HttpOnly {c.httpOnly ? "✓" : "✗"}</Badge>
                                <Badge variant="outline">SameSite: {c.sameSite ?? "None"}</Badge>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Technology stack</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.http.technologies.length === 0 ? (
                        <p className="text-xs text-[var(--color-text-muted)]">No technology signals detected.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {data.http.technologies.map((t) => (
                            <Badge key={t.name} variant="blue">
                              {t.name} · {t.category}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <Field label="robots.txt" value={data.http.robotsTxt.found ? `Found (${data.http.robotsTxt.disallowCount} disallow)` : "Not found"} />
                        <Field label="sitemap.xml" value={data.http.sitemapXml.found ? `Found (${data.http.sitemapXml.urlCount} URLs)` : "Not found"} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="subdomains">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="h-4 w-4" /> Subdomains from certificate transparency logs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.subdomains.length === 0 ? (
                      <p className="text-xs text-[var(--color-text-muted)]">No subdomains found in crt.sh certificate transparency logs.</p>
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
              </TabsContent>
            </Tabs>

            <AISummaryPanel context={{ hostname: data.hostname, findings: scored.findings, riskScore: scored.riskScore }} />
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
