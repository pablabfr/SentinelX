import { handleServiceRoute, getApiKeyFromRequest } from "@/lib/services/api-utils";
import { lookupHibpBreaches } from "@/lib/services/integrations/hibp";
import { API_KEY_HEADERS } from "@/lib/api-keys";
import { ValidationError } from "@/lib/services/errors";

export async function POST(req: Request) {
  return handleServiceRoute(async () => {
    const body = await req.json().catch(() => ({}));
    const account = typeof body.account === "string" ? body.account.trim() : "";
    if (!account) throw new ValidationError("An email, username, or phone number is required.");
    const key = getApiKeyFromRequest(req, API_KEY_HEADERS.hibp);
    return lookupHibpBreaches(account, key);
  });
}
