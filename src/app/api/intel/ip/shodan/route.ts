import { handleServiceRoute, getApiKeyFromRequest } from "@/lib/services/api-utils";
import { lookupShodanHost } from "@/lib/services/integrations/shodan";
import { API_KEY_HEADERS } from "@/lib/api-keys";
import { ValidationError } from "@/lib/services/errors";

export async function POST(req: Request) {
  return handleServiceRoute(async () => {
    const body = await req.json().catch(() => ({}));
    const ip = typeof body.ip === "string" ? body.ip.trim() : "";
    if (!ip) throw new ValidationError("An IP address is required.");
    const key = getApiKeyFromRequest(req, API_KEY_HEADERS.shodan);
    return lookupShodanHost(ip, key);
  });
}
