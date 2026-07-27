"use client";

import { useMemo, useState } from "react";
import { FileBarChart, Download, CheckSquare, Square, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RiskBadge } from "@/components/shared/risk-badge";
import { EmptyState } from "@/components/shared/state-views";
import { useScanHistoryStore } from "@/lib/store/scan-history-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { formatDistanceToNow } from "date-fns";

export default function ReportsPage() {
  const entries = useScanHistoryStore((s) => s.entries);
  const { companyName, companyLogo } = useSettingsStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const selectedEntries = useMemo(() => entries.filter((e) => selected.has(e.id)), [entries, selected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === entries.length ? new Set() : new Set(entries.map((e) => e.id))));
  }

  async function generatePdf() {
    setGenerating(true);
    try {
      const [{ pdf }, { SecurityReportDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/reports/pdf-report"),
      ]);
      const blob = await pdf(
        <SecurityReportDocument
          companyName={companyName}
          companyLogo={companyLogo}
          generatedAt={new Date().toISOString()}
          entries={selectedEntries.length > 0 ? selectedEntries : entries}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sentinelx-security-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader
        icon={FileBarChart}
        title="Reports"
        description="Generate a branded PDF security report from your scan history."
        actions={
          <Button onClick={generatePdf} disabled={generating || entries.length === 0}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {generating ? "Generating…" : `Generate PDF (${selectedEntries.length || entries.length})`}
          </Button>
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={FileBarChart}
          title="No scans to report on yet"
          description="Run scans across the platform — Website Scanner, IP Intelligence, Domain Intelligence, and more — and they'll appear here for inclusion in a report."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Scan history ({entries.length})</CardTitle>
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {selected.size === entries.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
              {selected.size === entries.length ? "Deselect all" : "Select all"}
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="mb-1 text-[11px] text-[var(--color-text-muted)]">
              Nothing selected includes every scan below. Select specific scans to build a focused report.
            </p>
            {entries.map((e) => (
              <label
                key={e.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-border-soft)] p-3 hover:border-[#333]"
              >
                <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggle(e.id)} />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-[var(--color-text)]">{e.target}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {e.type} · {e.summary} · {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
                  </p>
                </div>
                <RiskBadge level={e.level} />
              </label>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
