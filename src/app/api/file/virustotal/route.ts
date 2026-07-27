import { handleServiceRoute, getApiKeyFromRequest } from "@/lib/services/api-utils";
import { lookupVtFileHash } from "@/lib/services/integrations/virustotal";
import { API_KEY_HEADERS } from "@/lib/api-keys";
import { ValidationError } from "@/lib/services/errors";

export async function POST(req: Request) {
  return handleServiceRoute(async () => {
    const body = await req.json().catch(() => ({}));
    const hash = typeof body.hash === "string" ? body.hash.trim() : "";
    if (!hash) throw new ValidationError("A file hash is required.");
    const key = getApiKeyFromRequest(req, API_KEY_HEADERS.virustotal);
    return lookupVtFileHash(hash, key);
  });
}
