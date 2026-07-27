"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AtSign, FileSearch, ShieldCheck, Link2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreRadial } from "@/components/shared/score-radial";
import { AISummaryPanel } from "@/components/shared/ai-summary-panel";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/state-views";
import { apiPost } from "@/lib/api-client";
import { analyzeEmailHeaders, type EmailHeaderAnalysis } from "@/lib/services/email-headers";
import type { SpfResult, DmarcResult, DkimResult } from "@/lib/services/email-auth";

interface EmailDomainResponse {
  domain: string;
  spf: SpfResult;
  dmarc: DmarcResult;
  dkim: DkimResult[];
}

export default function EmailIntelligencePage() {
  return (
    <div>
      <PageHeader icon={AtSign} title="Email Intelligence" description="Verify sender domains and analyze raw email headers for spoofing and phishing signals." />
      <Tabs defaultValue="domain">
        <TabsList>
          <TabsTrigger value="domain"><ShieldCheck className="h-3.5 w-3.5" /> Domain check</TabsTrigger>
          <TabsTrigger value="headers"><FileSearch className="h-3.5 w-3.5" /> Header analysis</TabsTrigger>
        </TabsList>
        <TabsContent value="domain">
          <DomainCheckPanel />
        </TabsContent>
        <TabsContent value="headers">
          <HeaderAnalysisPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DomainCheckPanel() {
  const [domain, setDomain] = useState("");
  const mutation = useMutation({
    mutationFn: (target: string) => apiPost<EmailDomainResponse>("/api/intel/email", { domain: target }),
  });
  const data = mutation.data;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="p-4">
          <form
            className="flex flex-col gap-2.5 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (domain.trim()) mutation.mutate(domain.trim());
            }}
          >
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="sender@example.com or example.com" className="flex-1" />
            <Button type="submit" disabled={mutation.isPending || !domain.trim()}>
              {mutation.isPending ? "Checking…" : "Check domain"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {mutation.isPending && <LoadingState label="Checking SPF, DKIM, and DMARC…" />}
      {mutation.isError && <ErrorState description={(mutation.error as Error).message} onRetry={() => mutation.mutate(domain)} />}
      {!mutation.isPending && !data && !mutation.isError && (
        <EmptyState icon={ShieldCheck} title="No domain checked yet" description="Enter a sending domain or email address to verify SPF, DKIM, and DMARC configuration." />
      )}

      {data && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <GradeCard title="SPF" grade={data.spf.grade} issues={data.spf.issues} record={data.spf.record} />
          <GradeCard title="DMARC" grade={data.dmarc.grade} issues={data.dmarc.issues} record={data.dmarc.record} />
          <Card>
            <CardHeader>
              <CardTitle>DKIM selectors probed</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {data.dkim.map((d) => (
                <div key={d.selector} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[var(--color-text-secondary)]">{d.selector}._domainkey</span>
                  <Badge variant={d.found ? "success" : "outline"}>{d.found ? "Found" : "Not found"}</Badge>
                </div>
              ))}
              <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
                DKIM selectors are chosen by the sender and not discoverable via DNS alone — only common selectors are probed here.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function GradeCard({ title, grade, issues, record }: { title: string; grade: string; issues: string[]; record?: string }) {
  const variant = grade === "A" ? "success" : grade === "F" ? "danger" : "warning";
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Badge variant={variant}>Grade {grade}</Badge>
      </CardHeader>
      <CardContent>
        {record && <p className="mb-2 break-all font-mono text-[11px] text-[var(--color-text-secondary)]">{record}</p>}
        <ul className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
          {issues.length === 0 ? <li>No issues found.</li> : issues.map((i, idx) => <li key={idx}>• {i}</li>)}
        </ul>
      </CardContent>
    </Card>
  );
}

function HeaderAnalysisPanel() {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<EmailHeaderAnalysis | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <Textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"Paste full raw email headers here (From, Received, Authentication-Results, etc.)"}
            className="min-h-48 font-mono text-xs"
          />
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Analysis runs entirely in your browser — headers are never sent to a server.
          </p>
          <div>
            <Button onClick={() => setResult(analyzeEmailHeaders(raw))} disabled={!raw.trim()}>
              <FileSearch className="h-4 w-4" /> Analyze headers
            </Button>
          </div>
        </CardContent>
      </Card>

      {!result && (
        <EmptyState icon={FileSearch} title="No headers analyzed yet" description="Paste raw email headers above to check for SPF/DKIM/DMARC failures, spoofed senders, and suspicious links." />
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
            <Card className="flex flex-col items-center justify-center p-6">
              <ScoreRadial
                score={result.spoofingScore}
                label="Phishing Likelihood"
                colorFor={(s) => (s >= 60 ? "var(--color-danger)" : s >= 30 ? "var(--color-warning)" : "var(--color-success)")}
              />
            </Card>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <MiniStat label="From" value={result.from ?? "Unknown"} />
              <MiniStat label="Return-Path" value={result.returnPath ?? "Unknown"} warn={result.fromReturnPathMismatch} />
              <MiniStat label="Subject" value={result.subject ?? "—"} />
              <MiniStat label="SPF" value={result.authResults.spf} warn={result.authResults.spf === "fail"} />
              <MiniStat label="DKIM" value={result.authResults.dkim} warn={result.authResults.dkim === "fail"} />
              <MiniStat label="DMARC" value={result.authResults.dmarc} warn={result.authResults.dmarc === "fail"} />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Signals</CardTitle>
            </CardHeader>
            <CardContent>
              {result.signals.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">No suspicious signals detected.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {result.signals.map((s, i) => (
                    <li key={i} className="rounded-xl border border-[var(--color-border-soft)] p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={s.severity === "critical" || s.severity === "high" ? "danger" : s.severity === "medium" ? "warning" : "default"}>
                          {s.severity}
                        </Badge>
                        <p className="text-sm text-[var(--color-text)]">{s.label}</p>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{s.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {result.urls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" /> Embedded URLs ({result.urls.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-1.5">
                  {result.urls.map((u, i) => (
                    <li key={i} className="break-all font-mono text-xs text-[var(--color-text-secondary)]">
                      {u}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <AISummaryPanel context={result} title="AI phishing assessment" />
        </motion.div>
      )}
    </div>
  );
}

function MiniStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <Card className="p-3.5">
      <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className={`mt-1 truncate text-sm font-medium ${warn ? "text-[var(--color-danger)]" : "text-[var(--color-text)]"}`}>{value}</p>
    </Card>
  );
}
