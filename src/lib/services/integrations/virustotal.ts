import { MissingApiKeyError, UpstreamError } from "@/lib/services/errors";

export interface VtAnalysisStats {
  malicious: number;
  suspicious: number;
  undetected: number;
  harmless: number;
  timeout: number;
}

export interface VtFileResult {
  found: boolean;
  stats?: VtAnalysisStats;
  meaningfulName?: string;
  type?: string;
  reputation?: number;
  permalink: string;
}

export interface VtUrlResult {
  found: boolean;
  stats?: VtAnalysisStats;
  categories?: Record<string, string>;
  permalink: string;
}

function b64url(input: string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function lookupVtFileHash(hash: string, apiKey: string | undefined): Promise<VtFileResult> {
  if (!apiKey) throw new MissingApiKeyError("VirusTotal");

  const res = await fetch(`https://www.virustotal.com/api/v3/files/${encodeURIComponent(hash)}`, {
    headers: { "x-apikey": apiKey },
    signal: AbortSignal.timeout(15_000),
  });

  const permalink = `https://www.virustotal.com/gui/file/${hash}`;
  if (res.status === 404) return { found: false, permalink };
  if (res.status === 401) throw new UpstreamError("VirusTotal rejected the provided API key.", 401);
  if (!res.ok) throw new UpstreamError(`VirusTotal request failed (${res.status})`, res.status);

  const json = await res.json();
  const attrs = json.data.attributes;
  return {
    found: true,
    stats: attrs.last_analysis_stats,
    meaningfulName: attrs.meaningful_name,
    type: attrs.type_description,
    reputation: attrs.reputation,
    permalink,
  };
}

export async function lookupVtUrl(url: string, apiKey: string | undefined): Promise<VtUrlResult> {
  if (!apiKey) throw new MissingApiKeyError("VirusTotal");

  const id = b64url(url);
  const permalink = `https://www.virustotal.com/gui/url/${id}`;
  const res = await fetch(`https://www.virustotal.com/api/v3/urls/${id}`, {
    headers: { "x-apikey": apiKey },
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 404) return { found: false, permalink };
  if (res.status === 401) throw new UpstreamError("VirusTotal rejected the provided API key.", 401);
  if (!res.ok) throw new UpstreamError(`VirusTotal request failed (${res.status})`, res.status);

  const json = await res.json();
  const attrs = json.data.attributes;
  return { found: true, stats: attrs.last_analysis_stats, categories: attrs.categories, permalink };
}
