import { MissingApiKeyError, UpstreamError } from "@/lib/services/errors";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const OPENAI_BASE = "https://api.openai.com/v1";

export async function streamChatCompletion(
  messages: ChatMessage[],
  apiKey: string | undefined,
  model: string
): Promise<Response> {
  if (!apiKey) throw new MissingApiKeyError("OpenAI");

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.4,
    }),
  });

  if (res.status === 401) throw new UpstreamError("OpenAI rejected the provided API key.", 401);
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new UpstreamError(`OpenAI request failed (${res.status}): ${text.slice(0, 300)}`, res.status);
  }

  return res;
}

export async function completeText(
  prompt: string,
  apiKey: string | undefined,
  model: string,
  system?: string
): Promise<string> {
  if (!apiKey) throw new MissingApiKeyError("OpenAI");

  const messages: ChatMessage[] = [
    ...(system ? [{ role: "system" as const, content: system }] : []),
    { role: "user", content: prompt },
  ];

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature: 0.3 }),
    signal: AbortSignal.timeout(45_000),
  });

  if (res.status === 401) throw new UpstreamError("OpenAI rejected the provided API key.", 401);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new UpstreamError(`OpenAI request failed (${res.status}): ${text.slice(0, 300)}`, res.status);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}
