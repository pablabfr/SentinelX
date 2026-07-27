import { MissingApiKeyError, UpstreamError } from "@/lib/services/errors";

export interface AbuseIpDbResult {
  abuseConfidenceScore: number;
  totalReports: number;
  lastReportedAt: string | null;
  isWhitelisted: boolean;
  usageType: string | null;
  domain: string | null;
  countryCode: string | null;
}

export async function checkAbuseIpDb(ip: string, apiKey: string | undefined): Promise<AbuseIpDbResult> {
  if (!apiKey) throw new MissingApiKeyError("AbuseIPDB");

  const res = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`, {
    headers: { Key: apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (res.status === 401 || res.status === 403) {
    throw new UpstreamError("AbuseIPDB rejected the provided API key.", res.status);
  }
  if (!res.ok) throw new UpstreamError(`AbuseIPDB request failed (${res.status})`, res.status);

  const json = await res.json();
  const data = json.data;
  return {
    abuseConfidenceScore: data.abuseConfidenceScore,
    totalReports: data.totalReports,
    lastReportedAt: data.lastReportedAt,
    isWhitelisted: Boolean(data.isWhitelisted),
    usageType: data.usageType,
    domain: data.domain,
    countryCode: data.countryCode,
  };
}
