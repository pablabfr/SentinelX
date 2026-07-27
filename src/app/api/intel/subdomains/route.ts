import { handleServiceRoute } from "@/lib/services/api-utils";
import { lookupSubdomains } from "@/lib/services/crtsh";
import { ValidationError } from "@/lib/services/errors";

export async function POST(req: Request) {
  return handleServiceRoute(async () => {
    const body = await req.json().catch(() => ({}));
    const domain = typeof body.domain === "string" ? body.domain.trim() : "";
    if (!domain) throw new ValidationError("A domain is required.");
    return lookupSubdomains(domain);
  });
}
