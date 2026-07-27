"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  Key,
  Bell,
  Palette,
  Bot,
  Building2,
  ShieldQuestion,
  Trash2,
  Upload,
  Code2,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettingsStore, type AIModel } from "@/lib/store/settings-store";
import { useScanHistoryStore } from "@/lib/store/scan-history-store";
import { useNotificationStore } from "@/lib/store/notification-store";
import { useWatchlistStore } from "@/lib/store/watchlist-store";
import type { ApiKeys } from "@/lib/types";

const API_KEY_FIELDS: { key: keyof ApiKeys; label: string; help: string; getUrl: string }[] = [
  { key: "openai", label: "OpenAI", help: "Powers the AI Assistant and every AI-generated summary.", getUrl: "https://platform.openai.com/api-keys" },
  { key: "virustotal", label: "VirusTotal", help: "File hash and URL reputation lookups.", getUrl: "https://www.virustotal.com/gui/my-apikey" },
  { key: "abuseipdb", label: "AbuseIPDB", help: "IP abuse-report reputation in IP Intelligence.", getUrl: "https://www.abuseipdb.com/account/api" },
  { key: "shodan", label: "Shodan", help: "Open ports and exposed services for an IP.", getUrl: "https://account.shodan.io/" },
  { key: "hibp", label: "Have I Been Pwned", help: "Data Breach Centre and Dark Web Monitor.", getUrl: "https://haveibeenpwned.com/API/Key" },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={SettingsIcon} title="Settings" description="Configure API keys, AI model, appearance, notifications, and privacy." />
      <ApiKeysSection />
      <AiModelSection />
      <BrandingSection />
      <NotificationsSection />
      <AccessibilitySection />
      <DeveloperSection />
      <PrivacySection />
    </div>
  );
}

function ApiKeysSection() {
  const { apiKeys, setApiKey, clearApiKey } = useSettingsStore();
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  return (
    <Card id="api-keys">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-4 w-4 text-[var(--color-accent-blue)]" /> API Keys
          </CardTitle>
          <CardDescription className="mt-1">
            Stored only in this browser&apos;s local storage. Sent directly to the corresponding provider via a server pass-through — never persisted on any
            SentinelX server.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {API_KEY_FIELDS.map((field) => {
          const value = apiKeys[field.key] ?? "";
          const isVisible = visible[field.key];
          return (
            <div key={field.key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="normal-case font-medium text-[var(--color-text)]">{field.label}</Label>
                <a href={field.getUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--color-accent-blue)] hover:underline">
                  Get a key →
                </a>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type={isVisible ? "text" : "password"}
                    value={value}
                    onChange={(e) => setApiKey(field.key, e.target.value)}
                    placeholder={`Paste your ${field.label} API key`}
                    className="pr-9 font-mono text-xs"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setVisible((v) => ({ ...v, [field.key]: !v[field.key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                  >
                    {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {value && (
                  <Button variant="ghost" size="icon" onClick={() => clearApiKey(field.key)}>
                    <Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" />
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">{field.help}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AiModelSection() {
  const { aiModel, setAiModel } = useSettingsStore();
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[var(--color-accent-purple)]" /> AI Model
          </CardTitle>
          <CardDescription className="mt-1">Used by the AI Assistant and every &quot;Generate AI summary&quot; action.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Select value={aiModel} onValueChange={(v) => setAiModel(v as AIModel)}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-4o-mini">GPT-4o mini (fastest, cheapest)</SelectItem>
            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
            <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
            <SelectItem value="o4-mini">o4-mini (reasoning)</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}

function BrandingSection() {
  const { companyName, setCompanyName, companyLogo, setCompanyLogo } = useSettingsStore();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleLogoUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => setCompanyLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[var(--color-accent-blue)]" /> Report Branding
          </CardTitle>
          <CardDescription className="mt-1">Applied to generated PDF reports.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Label className="normal-case font-medium text-[var(--color-text)]">Company name</Label>
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label className="normal-case font-medium text-[var(--color-text)]">Logo</Label>
          <div className="mt-1.5 flex items-center gap-3">
            {companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyLogo} alt="Company logo" className="h-10 w-10 rounded-lg border border-[var(--color-border)] object-contain bg-white/5" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
                <Building2 className="h-4 w-4" />
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
            />
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
            {companyLogo && (
              <Button variant="ghost" size="sm" onClick={() => setCompanyLogo(null)}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsSection() {
  const { notifications, toggleNotification } = useSettingsStore();
  const labels: Record<keyof typeof notifications, string> = {
    threatDetected: "New threat detected",
    newBreach: "New data breach found",
    weakPassword: "Weak password identified",
    expiredSsl: "SSL certificate expiring/expired",
    suspiciousLogin: "Suspicious login activity",
    criticalCve: "Critical CVE published",
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--color-warning)]" /> Notifications
          </CardTitle>
          <CardDescription className="mt-1">Choose which real-time alerts appear in the notification centre.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {(Object.keys(notifications) as (keyof typeof notifications)[]).map((key) => (
          <Label key={key} className="flex items-center justify-between gap-2 normal-case font-normal text-[var(--color-text-secondary)]">
            {labels[key]}
            <Switch checked={notifications[key]} onCheckedChange={() => toggleNotification(key)} />
          </Label>
        ))}
      </CardContent>
    </Card>
  );
}

function AccessibilitySection() {
  const { reduceMotion, setReduceMotion, highContrast, setHighContrast } = useSettingsStore();
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-[var(--color-accent-blue)]" /> Appearance &amp; Accessibility
          </CardTitle>
          <CardDescription className="mt-1">SentinelX currently ships a single dark theme; these controls apply immediately.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Label className="flex items-center justify-between gap-2 normal-case font-normal text-[var(--color-text-secondary)]">
          Reduce motion (disables animations)
          <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
        </Label>
        <Label className="flex items-center justify-between gap-2 normal-case font-normal text-[var(--color-text-secondary)]">
          High contrast mode
          <Switch checked={highContrast} onCheckedChange={setHighContrast} />
        </Label>
      </CardContent>
    </Card>
  );
}

function DeveloperSection() {
  const { developerMode, setDeveloperMode } = useSettingsStore();
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-[var(--color-text-secondary)]" /> Developer Mode
          </CardTitle>
          <CardDescription className="mt-1">Shows a raw JSON response panel on scan result pages.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Label className="flex items-center justify-between gap-2 normal-case font-normal text-[var(--color-text-secondary)]">
          Enable developer mode
          <Switch checked={developerMode} onCheckedChange={setDeveloperMode} />
        </Label>
      </CardContent>
    </Card>
  );
}

function PrivacySection() {
  const clearHistory = useScanHistoryStore((s) => s.clear);
  const clearNotifications = useNotificationStore((s) => s.clear);
  const watchlistItems = useWatchlistStore((s) => s.items);
  const [confirming, setConfirming] = useState(false);

  function resetAll() {
    clearHistory();
    clearNotifications();
    useWatchlistStore.setState({ items: [] });
    setConfirming(false);
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldQuestion className="h-4 w-4 text-[var(--color-danger)]" /> Privacy &amp; Data
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-accent-blue)]/20 bg-[var(--color-accent-blue)]/5 p-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-blue)]" />
          <p className="text-xs text-[var(--color-text-secondary)]">
            This build of SentinelX has no server-side account system — all scan history, notifications, watchlist entries, and API keys live only in
            this browser&apos;s local storage. Passwords analyzed in Password Health are never transmitted; only a 5-character SHA-1 hash prefix is sent
            during breach checks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">{watchlistItems.length} watchlist item(s) stored locally.</p>
        </div>
        {!confirming ? (
          <Button variant="danger" className="w-fit" onClick={() => setConfirming(true)}>
            <Trash2 className="h-4 w-4" /> Reset all local data
          </Button>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <p className="text-xs text-[var(--color-text)]">Clear scan history, notifications, and watchlist? API keys are kept.</p>
            <Button variant="danger" size="sm" onClick={resetAll}>
              Confirm
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
