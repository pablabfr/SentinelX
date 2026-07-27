import { handleServiceRoute } from "@/lib/services/api-utils";
import { lookupDnsRecords } from "@/lib/services/dns";
import { lookupDomainRdap } from "@/lib/services/rdap";
import { lookupSubdomains } from "@/lib/services/crtsh";
import { checkSpf, checkDmarc } from "@/lib/services/email-auth";
import { ValidationError } from "@/lib/services/errors";

export async function POST(req: Request) {
  return handleServiceRoute(async () => {
    const body = await req.json().catch(() => ({}));
    const domain = typeof body.domain === "string" ? body.domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "") : "";
    if (!domain) throw new ValidationError("A domain is required.");

    const [dnsRecords, rdap, subdomains, spf, dmarc] = await Promise.all([
      lookupDnsRecords(domain),
      lookupDomainRdap(domain).catch((err) => ({ error: err instanceof Error ? err.message : "RDAP lookup failed" })),
      lookupSubdomains(domain),
      checkSpf(domain),
      checkDmarc(domain),
    ]);

    return { domain, dns: dnsRecords, rdap, subdomains, spf, dmarc };
  });
}
