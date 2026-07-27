"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ShieldAlert, Search, ExternalLink, Flame, Bug } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/state-views";
import { apiGet } from "@/lib/api-client";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { CveItem, KevEntry } from "@/lib/services/threats";

const SEVERITY_VARIANT: Record<string, "danger" | "warning" | "blue" | "default"> = {
  CRITICAL: "danger",
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "blue",
  UNKNOWN: "default",
};

export default function ThreatCentrePage() {
  return (
    <div>
      <PageHeader icon={ShieldAlert} title="Threat Centre" description="Live CVE feed from NVD and the CISA Known Exploited Vulnerabilities catalog." />
      <Tabs defaultValue="cve">
        <TabsList>
          <TabsTrigger value="cve"><Bug className="h-3.5 w-3.5" /> CVE Feed</TabsTrigger>
          <TabsTrigger value="kev"><Flame className="h-3.5 w-3.5" /> Known Exploited (CISA KEV)</TabsTrigger>
        </TabsList>
        <TabsContent value="cve">
          <CveFeed />
        </TabsContent>
        <TabsContent value="kev">
          <KevFeed />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CveFeed() {
  const [keyword, setKeyword] = useState("");
  const [severity, setSeverity] = useState("ALL");
  const debouncedKeyword = useDebouncedValue(keyword, 500);

  const query = useQuery({
    queryKey: ["cve-feed", debouncedKeyword, severity],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "30" });
      if (debouncedKeyword) params.set("keyword", debouncedKeyword);
      if (severity !== "ALL") params.set("severity", severity);
      return apiGet<{ items: CveItem[]; total: number }>(`/api/threats/cve?${params.toString()}`);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-2.5 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Search CVEs by keyword (e.g. 'Apache', 'Chrome', 'VPN')" className="pl-9" />
          </div>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All severities</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {query.isLoading && <LoadingState label="Fetching latest CVEs from the National Vulnerability Database…" />}
      {query.isError && <ErrorState description={(query.error as Error).message} onRetry={() => query.refetch()} />}
      {query.data && query.data.items.length === 0 && <EmptyState icon={Bug} title="No CVEs matched" description="Try a different keyword or severity filter." />}

      {query.data && query.data.items.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">{query.data.total.toLocaleString()} total results in NVD — showing the first {query.data.items.length}.</p>
          {query.data.items.map((cve) => (
            <Card key={cve.id}>
              <CardHeader>
                <CardTitle className="font-mono">{cve.id}</CardTitle>
                <div className="flex items-center gap-2">
                  {cve.cvssScore !== null && <span className="text-xs text-[var(--color-text-muted)]">CVSS {cve.cvssScore}</span>}
                  <Badge variant={SEVERITY_VARIANT[cve.severity]}>{cve.severity}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[var(--color-text-secondary)]">{cve.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
                  <span>Published {new Date(cve.published).toLocaleDateString()}</span>
                  <span>Updated {new Date(cve.lastModified).toLocaleDateString()}</span>
                  {cve.references[0] && (
                    <a href={cve.references[0]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[var(--color-accent-blue)] hover:underline">
                      Reference <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function KevFeed() {
  const query = useQuery({
    queryKey: ["kev-feed"],
    queryFn: () => apiGet<KevEntry[]>("/api/threats/kev"),
  });

  return (
    <div className="flex flex-col gap-3">
      {query.isLoading && <LoadingState label="Fetching CISA Known Exploited Vulnerabilities catalog…" />}
      {query.isError && <ErrorState description={(query.error as Error).message} onRetry={() => query.refetch()} />}
      {query.data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">
            {query.data.length.toLocaleString()} vulnerabilities confirmed as actively exploited in the wild, per CISA.
          </p>
          {query.data
            .slice()
            .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
            .slice(0, 50)
            .map((kev) => (
              <Card key={kev.cveID}>
                <CardHeader>
                  <CardTitle className="font-mono">{kev.cveID}</CardTitle>
                  {kev.knownRansomwareCampaignUse === "Known" && <Badge variant="danger">Ransomware use</Badge>}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[var(--color-text)]">
                    {kev.vendorProject} — {kev.product}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{kev.shortDescription}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--color-text-muted)]">
                    <span>Added {new Date(kev.dateAdded).toLocaleDateString()}</span>
                    <span>Remediate by {new Date(kev.dueDate).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--color-accent-blue)]">→ {kev.requiredAction}</p>
                </CardContent>
              </Card>
            ))}
        </motion.div>
      )}
    </div>
  );
}
