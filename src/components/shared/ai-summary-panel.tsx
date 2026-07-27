"use client";

import { useState } from "react";
import { Sparkles, RotateCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/shared/markdown";
import { RequiresApiKeyState, LoadingState, ErrorState } from "@/components/shared/state-views";
import { apiPost, RequiresApiKeyError } from "@/lib/api-client";
import { useSettingsStore } from "@/lib/store/settings-store";

export function AISummaryPanel({ context, title = "AI Analysis" }: { context: unknown; title?: string }) {
  const model = useSettingsStore((s) => s.aiModel);
  const [markdown, setMarkdown] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => apiPost<{ markdown: string }>("/api/ai/explain", { context, model }),
    onSuccess: (data) => setMarkdown(data.markdown),
  });

  const requiresKey = mutation.error instanceof RequiresApiKeyError;

  return (
    <Card className="glow-purple">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--color-accent-purple)]" />
          {title}
        </CardTitle>
        {markdown && (
          <Button variant="ghost" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            <RotateCw className="h-3.5 w-3.5" /> Regenerate
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!markdown && !mutation.isPending && !mutation.isError && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="max-w-sm text-xs text-[var(--color-text-muted)]">
              Generate a plain-English summary, technical breakdown, and prioritized remediation plan from these findings.
            </p>
            <Button variant="purple" size="sm" onClick={() => mutation.mutate()}>
              <Sparkles className="h-3.5 w-3.5" /> Generate AI summary
            </Button>
          </div>
        )}
        {mutation.isPending && <LoadingState label="Analyzing findings…" />}
        {requiresKey && <RequiresApiKeyState service="OpenAI" />}
        {mutation.isError && !requiresKey && (
          <ErrorState description={(mutation.error as Error).message} onRetry={() => mutation.mutate()} />
        )}
        {markdown && <Markdown>{markdown}</Markdown>}
      </CardContent>
    </Card>
  );
}
