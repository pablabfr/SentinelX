import { handleServiceRoute } from "@/lib/services/api-utils";
import { scanWebsite } from "@/lib/services/http-scan";
import { getTlsCertificate } from "@/lib/services/tls-cert";
import { lookupDnsRecords } from "@/lib/services/dns";
import { lookupDomainRdap } from "@/lib/services/rdap";
import { lookupSubdomains } from "@/lib/services/crtsh";
import { ValidationError } from "@/lib/services/errors";

export async function POST(req: Request) {
  return handleServiceRoute(async () => {
    const body = await req.json().catch(() => ({}));
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!url) throw new ValidationError("A URL is required.");

    let normalized = url;
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
    const { hostname } = new URL(normalized);

    const [httpResult, tlsResult, dnsResult, rdapResult, subdomains] = await Promise.all([
      scanWebsite(normalized),
      getTlsCertificate(hostname).catch((err) => ({ error: err instanceof Error ? err.message : "TLS check failed" })),
      lookupDnsRecords(hostname),
      lookupDomainRdap(hostname).catch(() => null),
      lookupSubdomains(hostname),
    ]);

    return { hostname, http: httpResult, tls: tlsResult, dns: dnsResult, rdap: rdapResult, subdomains };
  });
}
