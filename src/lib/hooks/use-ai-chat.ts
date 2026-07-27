import { useCallback, useRef, useState } from "react";
import { getKeyHeaders, RequiresApiKeyError } from "@/lib/api-client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function useAiChat(model: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (content: string) => {
      setError(null);
      const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
      const assistantId = crypto.randomUUID();
      const history = [...messages, userMessage];
      setMessages([...history, { id: assistantId, role: "assistant", content: "" }]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getKeyHeaders() },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            model,
          }),
          signal: controller.signal,
        });

        const contentType = res.headers.get("content-type") ?? "";

        if (contentType.includes("application/json")) {
          const json = await res.json();
          if (json.requiresApiKey) throw new RequiresApiKeyError(json.service ?? "OpenAI");
          throw new Error(json.error ?? "Request failed");
        }

        if (!res.body) throw new Error("No response body from server.");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              const delta: string | undefined = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                full += delta;
                setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m)));
              }
            } catch {
              // ignore malformed keep-alive chunks
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, model]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, send, isStreaming, error, stop, clear };
}
