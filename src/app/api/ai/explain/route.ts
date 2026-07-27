import { handleServiceRoute, getApiKeyFromRequest } from "@/lib/services/api-utils";
import { completeText } from "@/lib/services/integrations/openai";
import { API_KEY_HEADERS } from "@/lib/api-keys";
import { ValidationError } from "@/lib/services/errors";

const EXPLAIN_SYSTEM_PROMPT = `You are the SentinelX AI Security Analyst. You will be given raw scan findings in JSON
or plain text. Produce a concise Markdown summary with these exact sections, in this order:
## Plain-English Summary
## Technical Details
## Recommended Actions
(as a numbered list, most important first)
## Risk Priority
(one of: Immediate, High, Moderate, Low — with a one-line justification)
Keep the whole response under 350 words. Be specific to the data given; never invent findings that are not present.`;

export async function POST(req: Request) {
  return handleServiceRoute(async () => {
    const body = await req.json().catch(() => ({}));
    const context = typeof body.context === "string" ? body.context : JSON.stringify(body.context ?? {});
    const model = typeof body.model === "string" ? body.model : "gpt-4o-mini";
    if (!context.trim()) throw new ValidationError("Scan context is required to generate an explanation.");

    const apiKey = getApiKeyFromRequest(req, API_KEY_HEADERS.openai);
    const markdown = await completeText(
      `Here are the scan findings to explain:\n\n${context.slice(0, 12000)}`,
      apiKey,
      model,
      EXPLAIN_SYSTEM_PROMPT
    );
    return { markdown };
  });
}
