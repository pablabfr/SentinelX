import { handleServiceRoute } from "@/lib/services/api-utils";
import { checkSpf, checkDmarc, checkDkim } from "@/lib/services/email-auth";
import { ValidationError } from "@/lib/services/errors";

export async function POST(req: Request) {
  return handleServiceRoute(async () => {
    const body = await req.json().catch(() => ({}));
    const raw = typeof body.domain === "string" ? body.domain.trim().toLowerCase() : "";
    const domain = raw.includes("@") ? raw.split("@")[1] : raw;
    if (!domain) throw new ValidationError("A domain or email address is required.");

    const [spf, dmarc, dkim] = await Promise.all([checkSpf(domain), checkDmarc(domain), checkDkim(domain)]);
    return { domain, spf, dmarc, dkim };
  });
}
