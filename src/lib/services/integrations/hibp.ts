import { MissingApiKeyError, UpstreamError } from "@/lib/services/errors";

export interface HibpBreach {
  name: string;
  title: string;
  domain: string;
  breachDate: string;
  addedDate: string;
  pwnCount: number;
  description: string;
  dataClasses: string[];
  isSensitive: boolean;
  isVerified: boolean;
}

export async function lookupHibpBreaches(account: string, apiKey: string | undefined): Promise<HibpBreach[]> {
  if (!apiKey) throw new MissingApiKeyError("Have I Been Pwned");

  const res = await fetch(
    `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(account)}?truncateResponse=false`,
    {
      headers: { "hibp-api-key": apiKey, "User-Agent": "SentinelX-DarkWebMonitor" },
      signal: AbortSignal.timeout(12_000),
    }
  );

  if (res.status === 404) return [];
  if (res.status === 401) throw new UpstreamError("Have I Been Pwned rejected the provided API key.", 401);
  if (res.status === 429) throw new UpstreamError("Rate limited by Have I Been Pwned — try again shortly.", 429);
  if (!res.ok) throw new UpstreamError(`HIBP request failed (${res.status})`, res.status);

  const data = await res.json();
  return data.map((b: Record<string, unknown>) => ({
    name: b.Name,
    title: b.Title,
    domain: b.Domain,
    breachDate: b.BreachDate,
    addedDate: b.AddedDate,
    pwnCount: b.PwnCount,
    description: b.Description,
    dataClasses: b.DataClasses,
    isSensitive: b.IsSensitive,
    isVerified: b.IsVerified,
  }));
}
