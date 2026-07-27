"use client";

import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileSearch, UploadCloud, Copy, Check, ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AISummaryPanel } from "@/components/shared/ai-summary-panel";
import { RequiresApiKeyState, LoadingState, ErrorState } from "@/components/shared/state-views";
import { apiPost, RequiresApiKeyError } from "@/lib/api-client";
import {
  computeFileHashes,
  computeShannonEntropy,
  detectFileType,
  extractStrings,
  parsePeHeader,
  type FileHashes,
  type PeInfo,
} from "@/lib/services/file-analysis";
import { formatBytes, cn } from "@/lib/utils";
import type { VtFileResult } from "@/lib/services/integrations/virustotal";

interface AnalysisResult {
  fileName: string;
  size: number;
  hashes: FileHashes;
  entropy: number;
  detectedType: { type: string; mime: string } | null;
  extensionMismatch: boolean;
  strings: string[];
  pe: PeInfo;
}

export default function FileAnalysisPage() {
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const vtMutation = useMutation({
    mutationFn: (hash: string) => apiPost<VtFileResult>("/api/file/virustotal", { hash }),
  });

  const handleFile = useCallback(async (file: File) => {
    setAnalyzing(true);
    setResult(null);
    vtMutation.reset();
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const hashes = await computeFileHashes(buffer);
      const entropy = computeShannonEntropy(bytes);
      const extension = file.name.includes(".") ? file.name.split(".").pop() : undefined;
      const { detected, extensionMismatch } = detectFileType(bytes, extension);
      const strings = extractStrings(bytes);
      const pe = parsePeHeader(bytes);

      setResult({
        fileName: file.name,
        size: file.size,
        hashes,
        entropy,
        detectedType: detected,
        extensionMismatch,
        strings,
        pe,
      });
    } finally {
      setAnalyzing(false);
    }
  }, [vtMutation]);

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const requiresVtKey = vtMutation.error instanceof RequiresApiKeyError;

  return (
    <div>
      <PageHeader icon={FileSearch} title="File Analysis" description="Drop a file to compute cryptographic hashes, entropy, and static indicators — entirely in your browser." />

      <Card
        className={cn(
          "mb-6 flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-12 text-center transition-colors",
          dragging ? "border-[var(--color-accent-blue)] bg-[var(--color-accent-blue)]/5" : "border-[var(--color-border)]"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <UploadCloud className="h-8 w-8 text-[var(--color-text-muted)]" />
        <p className="text-sm text-[var(--color-text)]">Drag &amp; drop a file here, or click to browse</p>
        <p className="text-xs text-[var(--color-text-muted)]">Files are analyzed locally and never uploaded. Only the resulting hash is optionally sent to VirusTotal.</p>
      </Card>

      {analyzing && <LoadingState label="Computing hashes, entropy, and static indicators…" />}

      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Card className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">File</p>
              <p className="mt-1 truncate text-sm text-[var(--color-text)]">{result.fileName}</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{formatBytes(result.size)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">Detected type</p>
              <p className="mt-1 text-sm text-[var(--color-text)]">{result.detectedType?.type ?? "Unknown / raw data"}</p>
              {result.extensionMismatch && (
                <Badge variant="danger" className="mt-1.5">Extension mismatch</Badge>
              )}
            </Card>
            <Card className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">Shannon entropy</p>
              <p className="mt-1 text-sm text-[var(--color-text)]">{result.entropy.toFixed(3)} / 8.0</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{result.entropy > 7.5 ? "High — likely packed/encrypted" : "Normal"}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">Executable format</p>
              <p className="mt-1 text-sm text-[var(--color-text)]">{result.pe.isPe ? `PE (${result.pe.machine})` : "Not a PE executable"}</p>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cryptographic hashes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {(["sha256", "sha1", "sha512"] as const).map((key) => (
                <div key={key} className="flex items-center gap-2 rounded-lg border border-[var(--color-border-soft)] p-2.5">
                  <span className="w-16 shrink-0 text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{key}</span>
                  <code className="flex-1 truncate font-mono text-xs text-[var(--color-text-secondary)]">{result.hashes[key]}</code>
                  <Button variant="ghost" size="icon" onClick={() => copy(result.hashes[key], key)}>
                    {copied === key ? <Check className="h-3.5 w-3.5 text-[var(--color-success)]" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ))}
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                MD5 is omitted — the browser&apos;s Web Crypto API does not implement it. SHA-256 is the recommended hash for lookups.
              </p>
            </CardContent>
          </Card>

          {result.pe.isPe && result.pe.suspicious.length > 0 && (
            <div className="flex flex-col gap-2">
              {result.pe.suspicious.map((s, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl border border-[var(--color-warning)]/25 bg-[var(--color-warning)]/8 p-3.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
                  <p className="text-xs text-[var(--color-text)]">{s}</p>
                </div>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>VirusTotal reputation</CardTitle>
              {!vtMutation.data && (
                <Button size="sm" onClick={() => vtMutation.mutate(result.hashes.sha256)} disabled={vtMutation.isPending}>
                  {vtMutation.isPending ? "Checking…" : "Check hash on VirusTotal"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {requiresVtKey && <RequiresApiKeyState service="VirusTotal" />}
              {vtMutation.isError && !requiresVtKey && <ErrorState description={(vtMutation.error as Error).message} />}
              {vtMutation.data && (
                <VtResultView result={vtMutation.data} />
              )}
              {!vtMutation.data && !vtMutation.isPending && !vtMutation.isError && (
                <p className="text-xs text-[var(--color-text-muted)]">Only the SHA-256 hash is sent — never the file itself.</p>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="strings">
            <TabsList>
              <TabsTrigger value="strings">Extracted strings ({result.strings.length})</TabsTrigger>
              {result.pe.isPe && <TabsTrigger value="pe">PE header</TabsTrigger>}
            </TabsList>
            <TabsContent value="strings">
              <Card>
                <CardContent className="max-h-80 overflow-y-auto p-4">
                  <div className="flex flex-col gap-1 font-mono text-[11px] text-[var(--color-text-secondary)]">
                    {result.strings.length === 0 ? <p>No printable strings ≥ 4 characters found.</p> : result.strings.map((s, i) => <p key={i} className="truncate">{s}</p>)}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            {result.pe.isPe && (
              <TabsContent value="pe">
                <Card>
                  <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
                    <Field label="Machine" value={result.pe.machine ?? "—"} />
                    <Field label="Sections" value={String(result.pe.numberOfSections ?? "—")} />
                    <Field label="Compiled" value={result.pe.timestamp ?? "—"} />
                    <Field label="Subsystem" value={result.pe.subsystem ?? "—"} />
                    <Field label="Characteristics" value={result.pe.characteristics?.join(", ") || "—"} />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>

          <AISummaryPanel
            context={{
              fileName: result.fileName,
              detectedType: result.detectedType,
              extensionMismatch: result.extensionMismatch,
              entropy: result.entropy,
              pe: result.pe,
              vt: vtMutation.data,
            }}
          />
        </motion.div>
      )}
    </div>
  );
}

function VtResultView({ result }: { result: VtFileResult }) {
  if (!result.found) {
    return (
      <div className="flex items-center gap-2.5">
        <ShieldCheck className="h-4 w-4 text-[var(--color-text-muted)]" />
        <p className="text-xs text-[var(--color-text-secondary)]">
          Not found in VirusTotal&apos;s database — this file hasn&apos;t been scanned before, which is not itself a signal of safety.
        </p>
      </div>
    );
  }
  const malicious = (result.stats?.malicious ?? 0) + (result.stats?.suspicious ?? 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        {malicious > 0 ? <ShieldAlert className="h-4 w-4 text-[var(--color-danger)]" /> : <ShieldCheck className="h-4 w-4 text-[var(--color-success)]" />}
        <p className="text-sm text-[var(--color-text)]">
          <span className="font-semibold">{malicious}</span> of{" "}
          {(result.stats?.malicious ?? 0) + (result.stats?.suspicious ?? 0) + (result.stats?.undetected ?? 0) + (result.stats?.harmless ?? 0)} engines flagged
          this file
        </p>
      </div>
      <a href={result.permalink} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-accent-blue)] hover:underline">
        View full report on VirusTotal →
      </a>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</dt>
      <dd className="mt-0.5 break-all text-xs text-[var(--color-text)]">{value}</dd>
    </div>
  );
}
