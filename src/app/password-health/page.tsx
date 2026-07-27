"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Eye, EyeOff, Copy, Check, RefreshCw, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  analyzePasswordStrength,
  checkPasswordBreached,
  generatePassword,
  generatePassphrase,
  type BreachCheckResult,
} from "@/lib/services/password";
import { cn } from "@/lib/utils";

const STRENGTH_COLOR: Record<string, string> = {
  "Very Weak": "var(--color-danger)",
  Weak: "var(--color-danger)",
  Fair: "var(--color-warning)",
  Strong: "var(--color-accent-blue)",
  "Very Strong": "var(--color-success)",
};

export default function PasswordHealthPage() {
  return (
    <div>
      <PageHeader icon={KeyRound} title="Password Health" description="Check strength and breach exposure locally, then generate stronger credentials. Nothing is ever uploaded." />
      <Tabs defaultValue="analyze">
        <TabsList>
          <TabsTrigger value="analyze">Analyze</TabsTrigger>
          <TabsTrigger value="generate">Generate</TabsTrigger>
        </TabsList>
        <TabsContent value="analyze">
          <AnalyzePanel />
        </TabsContent>
        <TabsContent value="generate">
          <GeneratePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AnalyzePanel() {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const strength = useMemo(() => analyzePasswordStrength(password), [password]);

  const breachMutation = useMutation({
    mutationFn: (pw: string) => checkPasswordBreached(pw),
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Enter a password to analyze</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="relative">
            <Input
              type={visible ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                breachMutation.reset();
              }}
              placeholder="Type or paste a password"
              className="pr-10 font-mono"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {password && (
            <>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span style={{ color: STRENGTH_COLOR[strength.label] }} className="font-medium">
                    {strength.label}
                  </span>
                  <span className="text-[var(--color-text-muted)]">{strength.entropy} bits entropy</span>
                </div>
                <Progress value={strength.score} indicatorColor={STRENGTH_COLOR[strength.label]} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <CheckItem label="12+ characters" ok={strength.length >= 12} />
                <CheckItem label="Uppercase" ok={strength.hasUpper} />
                <CheckItem label="Lowercase" ok={strength.hasLower} />
                <CheckItem label="Numbers" ok={strength.hasDigit} />
                <CheckItem label="Symbols" ok={strength.hasSymbol} />
                <CheckItem label="Not a common password" ok={!strength.issues.some((i) => i.includes("commonly breached"))} />
              </div>

              <div className="rounded-xl border border-[var(--color-border-soft)] bg-white/[0.02] p-3.5">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Estimated offline crack time: <span className="font-medium text-[var(--color-text)]">{strength.crackTimeDisplay}</span>
                </p>
              </div>

              {strength.issues.length > 0 && (
                <ul className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
                  {strength.issues.map((issue, i) => (
                    <li key={i}>• {issue}</li>
                  ))}
                </ul>
              )}

              <Button variant="secondary" onClick={() => breachMutation.mutate(password)} disabled={breachMutation.isPending}>
                <ShieldCheck className="h-4 w-4" />
                {breachMutation.isPending ? "Checking against breach database…" : "Check if this password has been breached"}
              </Button>

              {breachMutation.data && <BreachResult result={breachMutation.data} />}
              {breachMutation.isError && (
                <p className="text-xs text-[var(--color-danger)]">{(breachMutation.error as Error).message}</p>
              )}

              <p className="text-[11px] text-[var(--color-text-muted)]">
                Breach checks use the Have I Been Pwned k-anonymity API: only the first 5 characters of your password&apos;s SHA-1 hash ever leave your
                browser. The full password and full hash never leave your device.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BreachResult({ result }: { result: BreachCheckResult }) {
  if (result.breached) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/8 p-3.5">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-danger)]" />
        <p className="text-xs text-[var(--color-text)]">
          This password has appeared in <span className="font-semibold">{result.timesSeen.toLocaleString()}</span> known data breaches. Stop using it
          immediately.
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-success)]/25 bg-[var(--color-success)]/8 p-3.5">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
      <p className="text-xs text-[var(--color-text)]">Not found in any known breach database.</p>
    </div>
  );
}

function CheckItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5", ok ? "border-[var(--color-success)]/25 bg-[var(--color-success)]/5" : "border-[var(--color-border-soft)]")}>
      {ok ? <Check className="h-3 w-3 text-[var(--color-success)]" /> : <span className="h-3 w-3 rounded-full border border-[var(--color-text-muted)]" />}
      <span className={ok ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}>{label}</span>
    </div>
  );
}

function GeneratePanel() {
  const [length, setLength] = useState(20);
  const [lower, setLower] = useState(true);
  const [upper, setUpper] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);
  const [password, setPassword] = useState(() => generatePassword({ length: 20, lower: true, upper: true, digits: true, symbols: true, excludeAmbiguous: true }));
  const [passphrase, setPassphrase] = useState(() => generatePassphrase());
  const [copied, setCopied] = useState<string | null>(null);

  function regenerate() {
    setPassword(generatePassword({ length, lower, upper, digits, symbols, excludeAmbiguous }));
  }

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const strength = useMemo(() => analyzePasswordStrength(password), [password]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Secure password</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border-soft)] bg-white/[0.02] p-3.5">
            <code className="flex-1 break-all font-mono text-sm text-[var(--color-text)]">{password}</code>
            <Button variant="ghost" size="icon" onClick={() => copy(password, "password")}>
              {copied === "password" ? <Check className="h-4 w-4 text-[var(--color-success)]" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={regenerate}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs" style={{ color: STRENGTH_COLOR[strength.label] }}>
            {strength.label} · {strength.entropy} bits · cracks in {strength.crackTimeDisplay}
          </p>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-secondary)]">Length: {length}</span>
            <input
              type="range"
              min={8}
              max={64}
              value={length}
              onChange={(e) => {
                const v = Number(e.target.value);
                setLength(v);
                setPassword(generatePassword({ length: v, lower, upper, digits, symbols, excludeAmbiguous }));
              }}
              className="w-40 accent-[var(--color-accent-blue)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ToggleRow label="Lowercase (a-z)" checked={lower} onChange={(v) => { setLower(v); setPassword(generatePassword({ length, lower: v, upper, digits, symbols, excludeAmbiguous })); }} />
            <ToggleRow label="Uppercase (A-Z)" checked={upper} onChange={(v) => { setUpper(v); setPassword(generatePassword({ length, lower, upper: v, digits, symbols, excludeAmbiguous })); }} />
            <ToggleRow label="Numbers (0-9)" checked={digits} onChange={(v) => { setDigits(v); setPassword(generatePassword({ length, lower, upper, digits: v, symbols, excludeAmbiguous })); }} />
            <ToggleRow label="Symbols (!@#$)" checked={symbols} onChange={(v) => { setSymbols(v); setPassword(generatePassword({ length, lower, upper, digits, symbols: v, excludeAmbiguous })); }} />
            <ToggleRow label="Exclude ambiguous (l1IO0)" checked={excludeAmbiguous} onChange={(v) => { setExcludeAmbiguous(v); setPassword(generatePassword({ length, lower, upper, digits, symbols, excludeAmbiguous: v })); }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-accent-purple)]" /> Passphrase
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border-soft)] bg-white/[0.02] p-3.5">
            <code className="flex-1 break-all font-mono text-sm text-[var(--color-text)]">{passphrase}</code>
            <Button variant="ghost" size="icon" onClick={() => copy(passphrase, "passphrase")}>
              {copied === "passphrase" ? <Check className="h-4 w-4 text-[var(--color-success)]" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setPassphrase(generatePassphrase())}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Passphrases combine memorable words with random capitalization and a number — easier to type and remember than random strings, while
            remaining high-entropy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Label className="flex items-center justify-between gap-2 normal-case font-normal text-[var(--color-text-secondary)]">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </Label>
  );
}
