"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { DatabaseZap, Calendar, ShieldAlert, KeyRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState, EmptyState, RequiresApiKeyState } from "@/components/shared/state-views";
import { AISummaryPanel } from "@/components/shared/ai-summary-panel";
import { apiPost, RequiresApiKeyError } from "@/lib/api-client";
import { useScanHistoryStore } from "@/lib/store/scan-history-store";
import { useNotificationStore } from "@/lib/store/notification-store";
import type { HibpBreach } from "@/lib/services/integrations/hibp";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

export default function DataBreachesPage() {
  const [account, setAccount] = useState("");
  const addEntry = useScanHistoryStore((s) => s.addEntry);
  const pushNotification = useNotificationStore((s) => s.push);

  const mutation = useMutation({
    mutationFn: (target: string) => apiPost<HibpBreach[]>("/api/breach/hibp", { account: target }),
    onSuccess: (breaches, target) => {
      const score = Math.min(100, breaches.length * 15);
      const level = score >= 60 ? "high" : score >= 30 ? "medium" : score > 0 ? "low" : "safe";
      addEntry({
        id: crypto.randomUUID(),
        type: "breach",
        target,
        score,
        level,
        summary: `${breaches.length} breach(es) found`,
        timestamp: new Date().toISOString(),
      });
      if (breaches.length > 0) {
        pushNotification({
          title: `${breaches.length} breach(es) found for ${target}`,
          description: breaches.map((b) => b.title).slice(0, 3).join(", "),
          severity: breaches.length >= 4 ? "high" : "medium",
          href: "/data-breaches",
        });
      }
    },
  });

  const requiresKey = mutation.error instanceof RequiresApiKeyError;
  const breaches = mutation.data;

  return (
    <div>
      <PageHeader icon={DatabaseZap} title="Data Breach Centre" description="Search known breach databases for an email address, username, phone, or domain." />

      <Card className="mb-6">
        <CardContent className="p-4">
          <form
            className="flex flex-col gap-2.5 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (account.trim()) mutation.mutate(account.trim());
            }}
          >
            <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="you@example.com" className="flex-1" autoFocus />
            <Button type="submit" disabled={mutation.isPending || !account.trim()}>
              <DatabaseZap className="h-4 w-4" />
              {mutation.isPending ? "Searching…" : "Search breaches"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {mutation.isPending && <LoadingState label={`Searching breach databases for ${account}…`} />}
      {requiresKey && <RequiresApiKeyState service="Have I Been Pwned" />}
      {mutation.isError && !requiresKey && <ErrorState description={(mutation.error as Error).message} onRetry={() => mutation.mutate(account)} />}

      {!mutation.isPending && !breaches && !mutation.isError && (
        <EmptyState icon={DatabaseZap} title="No search yet" description="Enter an email address to check it against known data breach databases via Have I Been Pwned." />
      )}

      {breaches && breaches.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--color-success)]/20 bg-[var(--color-success)]/5 px-6 py-14 text-center">
          <ShieldAlert className="h-5 w-5 text-[var(--color-success)]" />
          <p className="text-sm font-medium text-[var(--color-text)]">Good news — no breaches found</p>
          <p className="max-w-sm text-xs text-[var(--color-text-muted)]">{account} was not found in any known breach.</p>
        </div>
      )}

      {breaches && breaches.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          {breaches.map((b) => (
            <Card key={b.name}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{b.title}</CardTitle>
                  {b.isSensitive && <Badge variant="danger">Sensitive</Badge>}
                  {!b.isVerified && <Badge variant="outline">Unverified</Badge>}
                </div>
                <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                  <Calendar className="h-3 w-3" /> {new Date(b.breachDate).toLocaleDateString()}
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[var(--color-text-secondary)]">{stripHtml(b.description)}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {b.dataClasses.map((dc) => (
                    <Badge key={dc} variant={dc.toLowerCase().includes("password") ? "danger" : "outline"}>
                      {dc.toLowerCase().includes("password") && <KeyRound className="h-3 w-3" />}
                      {dc}
                    </Badge>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">{b.pwnCount.toLocaleString()} accounts affected in total.</p>
              </CardContent>
            </Card>
          ))}
          <AISummaryPanel context={{ account, breaches }} title="AI remediation plan" />
        </motion.div>
      )}
    </div>
  );
}
