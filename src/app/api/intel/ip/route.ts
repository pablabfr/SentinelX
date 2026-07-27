import { handleServiceRoute, getApiKeyFromRequest } from "@/lib/services/api-utils";
import { lookupIpGeo } from "@/lib/services/ip-geo";
import { lookupIpRdap } from "@/lib/services/rdap";
import { reverseDns } from "@/lib/services/dns";
import { checkAbuseIpDb } from "@/lib/services/integrations/abuseipdb";
import { API_KEY_HEADERS } from "@/lib/api-keys";
import { ValidationError } from "@/lib/services/errors";

export async function POST(req: Request) {
  return handleServiceRoute(async () => {
    const body = await req.json().catch(() => ({}));
    const ip = typeof body.ip === "string" ? body.ip.trim() : "";
    if (!ip) throw new ValidationError("An IP address is required.");

    const abuseKey = getApiKeyFromRequest(req, API_KEY_HEADERS.abuseipdb);

    const [geo, rdap, hostnames, abuse] = await Promise.all([
      lookupIpGeo(ip),
      lookupIpRdap(ip).catch(() => null),
      reverseDns(ip),
      abuseKey
        ? checkAbuseIpDb(ip, abuseKey).catch((err) => ({ error: err instanceof Error ? err.message : "AbuseIPDB failed" }))
        : Promise.resolve(null),
    ]);

    return { geo, rdap, hostnames, abuse, abuseKeyConfigured: Boolean(abuseKey) };
  });
}
