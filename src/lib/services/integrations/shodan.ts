import { MissingApiKeyError, UpstreamError } from "@/lib/services/errors";

export interface ShodanHostResult {
  ip: string;
  ports: number[];
  hostnames: string[];
  org: string | null;
  os: string | null;
  vulns: string[];
  lastUpdate: string | null;
}

export async function lookupShodanHost(ip: string, apiKey: string | undefined): Promise<ShodanHostResult> {
  if (!apiKey) throw new MissingApiKeyError("Shodan");

  const res = await fetch(`https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${encodeURIComponent(apiKey)}`, {
    signal: AbortSignal.timeout(12_000),
  });

  if (res.status === 401) throw new UpstreamError("Shodan rejected the provided API key.", 401);
  if (res.status === 404) throw new UpstreamError("Shodan has no data for this IP.", 404);
  if (!res.ok) throw new UpstreamError(`Shodan request failed (${res.status})`, res.status);

  const data = await res.json();
  return {
    ip: data.ip_str,
    ports: data.ports ?? [],
    hostnames: data.hostnames ?? [],
    org: data.org ?? null,
    os: data.os ?? null,
    vulns: data.vulns ? Object.keys(data.vulns) : [],
    lastUpdate: data.last_update ?? null,
  };
}
