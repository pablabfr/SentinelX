import { NextResponse } from "next/server";
import { streamChatCompletion, type ChatMessage } from "@/lib/services/integrations/openai";
import { getApiKeyFromRequest } from "@/lib/services/api-utils";
import { API_KEY_HEADERS } from "@/lib/api-keys";
import { MissingApiKeyError, UpstreamError } from "@/lib/services/errors";

const SYSTEM_PROMPT = `You are the SentinelX AI Security Analyst, built into a cybersecurity intelligence platform.
You help users understand vulnerabilities, CVEs, malware, suspicious URLs/emails, log files, and packet captures,
and you generate incident reports and remediation plans. Be precise and practical. Use Markdown formatting
(headings, bullet lists, tables, and fenced code blocks) where it improves clarity. When discussing risk, state
a clear severity and concrete next steps. If you are not certain about a fast-moving fact (like a brand-new CVE),
say so plainly instead of guessing.`;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
  const model = typeof body.model === "string" ? body.model : "gpt-4o-mini";
  const apiKey = getApiKeyFromRequest(req, API_KEY_HEADERS.openai);

  try {
    const upstream = await streamChatCompletion([{ role: "system", content: SYSTEM_PROMPT }, ...messages], apiKey, model);
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return NextResponse.json({ ok: false, requiresApiKey: true, service: err.service }, { status: 200 });
    }
    if (err instanceof UpstreamError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status ?? 502 });
    }
    return NextResponse.json({ ok: false, error: "Unknown error" }, { status: 500 });
  }
}
