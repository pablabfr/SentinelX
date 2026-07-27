import { UpstreamError } from "@/lib/services/errors";

export interface CveItem {
  id: string;
  description: string;
  published: string;
  lastModified: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  cvssScore: number | null;
  vector: string | null;
  references: string[];
}

interface NvdApiResponse {
  vulnerabilities: {
    cve: {
      id: string;
      published: string;
      lastModified: string;
      descriptions: { lang: string; value: string }[];
      metrics?: {
        cvssMetricV31?: { cvssData: { baseScore: number; baseSeverity: string; vectorString: string } }[];
        cvssMetricV30?: { cvssData: { baseScore: number; baseSeverity: string; vectorString: string } }[];
        cvssMetricV2?: { cvssData: { baseScore: number; vectorString: string }; baseSeverity?: string }[];
      };
      references?: { url: string }[];
    };
  }[];
  totalResults: number;
}

function mapCve(item: NvdApiResponse["vulnerabilities"][number]["cve"]): CveItem {
  const desc = item.descriptions.find((d) => d.lang === "en")?.value ?? "No description available.";
  const metric =
    item.metrics?.cvssMetricV31?.[0]?.cvssData ??
    item.metrics?.cvssMetricV30?.[0]?.cvssData ??
    item.metrics?.cvssMetricV2?.[0]?.cvssData;
  const severity =
    item.metrics?.cvssMetricV31?.[0]?.cvssData.baseSeverity ??
    item.metrics?.cvssMetricV30?.[0]?.cvssData.baseSeverity ??
    item.metrics?.cvssMetricV2?.[0]?.baseSeverity ??
    "UNKNOWN";

  return {
    id: item.id,
    description: desc,
    published: item.published,
    lastModified: item.lastModified,
    severity: severity.toUpperCase() as CveItem["severity"],
    cvssScore: metric?.baseScore ?? null,
    vector: metric?.vectorString ?? null,
    references: (item.references ?? []).slice(0, 5).map((r) => r.url),
  };
}

export async function fetchRecentCves(opts: {
  keyword?: string;
  resultsPerPage?: number;
  startIndex?: number;
  severity?: string;
} = {}): Promise<{ items: CveItem[]; total: number }> {
  const params = new URLSearchParams();
  params.set("resultsPerPage", String(opts.resultsPerPage ?? 20));
  params.set("startIndex", String(opts.startIndex ?? 0));
  if (opts.keyword) params.set("keywordSearch", opts.keyword);
  if (opts.severity) params.set("cvssV3Severity", opts.severity.toUpperCase());

  const res = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?${params.toString()}`, {
    signal: AbortSignal.timeout(15_000),
    headers: { "User-Agent": "SentinelX-ThreatCentre/1.0" },
    next: { revalidate: 900 },
  });

  if (!res.ok) {
    throw new UpstreamError(`NVD CVE feed request failed (${res.status}). NVD rate-limits unauthenticated requests — try again shortly.`, res.status);
  }

  const data: NvdApiResponse = await res.json();
  return {
    items: data.vulnerabilities.map((v) => mapCve(v.cve)),
    total: data.totalResults,
  };
}

export interface KevEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
}

let kevCache: { data: KevEntry[]; fetchedAt: number } | null = null;
const KEV_TTL_MS = 30 * 60 * 1000;

export async function fetchKevCatalog(): Promise<KevEntry[]> {
  if (kevCache && Date.now() - kevCache.fetchedAt < KEV_TTL_MS) {
    return kevCache.data;
  }
  const res = await fetch("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", {
    signal: AbortSignal.timeout(15_000),
    next: { revalidate: 1800 },
  });
  if (!res.ok) {
    if (kevCache) return kevCache.data;
    throw new UpstreamError(`CISA KEV feed request failed (${res.status})`, res.status);
  }
  const data = await res.json();
  const entries: KevEntry[] = data.vulnerabilities ?? [];
  kevCache = { data: entries, fetchedAt: Date.now() };
  return entries;
}
