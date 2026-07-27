"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Send, Square, Trash2, Sparkles, User } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Markdown } from "@/components/shared/markdown";
import { RequiresApiKeyState } from "@/components/shared/state-views";
import { useAiChat } from "@/lib/hooks/use-ai-chat";
import { useSettingsStore, type AIModel } from "@/lib/store/settings-store";
import { RequiresApiKeyError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Explain CVE-2024-3400 in plain English",
  "What does a CVSS score of 9.8 mean for my risk?",
  "Draft an incident response plan for a phishing email",
  "How do I harden SSH against brute-force attacks?",
];

export default function AiAssistantPage() {
  const { aiModel, setAiModel } = useSettingsStore();
  const { messages, send, isStreaming, error, stop, clear } = useAiChat(aiModel);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const requiresKey = error instanceof RequiresApiKeyError;

  function submit(text: string) {
    if (!text.trim() || isStreaming) return;
    send(text.trim());
    setInput("");
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        icon={Bot}
        title="AI Security Assistant"
        description="Ask about vulnerabilities, CVEs, malware, suspicious URLs, logs, and remediation plans."
        actions={
          <div className="flex items-center gap-2">
            <Select value={aiModel} onValueChange={(v) => setAiModel(v as AIModel)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">GPT-4o mini</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                <SelectItem value="o4-mini">o4-mini</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={clear} disabled={messages.length === 0}>
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-panel)]/40">
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <div className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-panel)] p-4 glow-purple">
                <Sparkles className="h-6 w-6 text-[var(--color-accent-purple)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">Ask the SentinelX AI Security Assistant</p>
                <p className="mt-1 max-w-sm text-xs text-[var(--color-text-muted)]">
                  Explains vulnerabilities, CVEs, malware, and phishing in plain English — and drafts remediation plans and incident reports.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-xl border border-[var(--color-border-soft)] px-3.5 py-2.5 text-left text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent-blue)]/40 hover:text-[var(--color-text)] cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    m.role === "user" ? "bg-white/10" : "bg-gradient-to-br from-[var(--color-accent-blue)] to-[var(--color-accent-purple)]"
                  )}
                >
                  {m.role === "user" ? <User className="h-3.5 w-3.5 text-[var(--color-text)]" /> : <Bot className="h-3.5 w-3.5 text-black" />}
                </div>
                <div className={cn("max-w-[80%] rounded-2xl px-4 py-3", m.role === "user" ? "bg-white/[0.06] text-[var(--color-text)]" : "bg-[var(--color-bg-raised)]")}>
                  {m.role === "assistant" ? (
                    m.content ? <Markdown>{m.content}</Markdown> : <TypingDots />
                  ) : (
                    <p className="text-sm">{m.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
            {requiresKey && <RequiresApiKeyState service="OpenAI" />}
            {error && !requiresKey && <p className="text-xs text-[var(--color-danger)]">{error.message}</p>}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-[var(--color-border-soft)] p-4">
          <form
            className="mx-auto flex max-w-3xl items-end gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              placeholder="Ask about a CVE, suspicious URL, log snippet, or incident…"
              className="min-h-11 max-h-40 flex-1"
              rows={1}
            />
            {isStreaming ? (
              <Button type="button" variant="danger" onClick={stop}>
                <Square className="h-4 w-4" /> Stop
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim()}>
                <Send className="h-4 w-4" /> Send
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-muted)]"
          style={{ animation: `pulse-glow 1s ease-in-out ${i * 0.15}s infinite` }}
        />
      ))}
    </div>
  );
}
