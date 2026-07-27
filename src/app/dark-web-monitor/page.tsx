"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { EyeOff, Plus, Trash2, ShieldCheck, ShieldAlert, RotateCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, RequiresApiKeyState } from "@/components/shared/state-views";
import { apiPost, RequiresApiKeyError } from "@/lib/api-client";
import { useWatchlistStore, type WatchlistItem } from "@/lib/store/watchlist-store";
import { useNotificationStore } from "@/lib/store/notification-store";
import type { HibpBreach } from "@/lib/services/integrations/hibp";
import { formatDistanceToNow } from "date-fns";

export default function DarkWebMonitorPage() {
  const { items, add, remove, updateResult } = useWatchlistStore();
  const [value, setValue] = useState("");
  const [type, setType] = useState<WatchlistItem["type"]>("email");
  const pushNotification = useNotificationStore((s) => s.push);
  const [checkedError, setCheckedError] = useState<RequiresApiKeyError | null>(null);

  const checkMutation = useMutation({
    mutationFn: async (item: WatchlistItem) => {
      const breaches = await apiPost<HibpBreach[]>("/api/breach/hibp", { account: item.value });
      return { item, breaches };
    },
    onSuccess: ({ item, breaches }) => {
      updateResult(item.id, breaches.length);
      if (breaches.length > 0) {
        pushNotification({
          title: `Dark web exposure: ${item.value}`,
          description: `${breaches.length} breach(es) found for a monitored identity.`,
          severity: "high",
          href: "/dark-web-monitor",
        });
      }
      setCheckedError(null);
    },
    onError: (err) => {
      if (err instanceof RequiresApiKeyError) setCheckedError(err);
    },
  });

  return (
    <div>
      <PageHeader icon={EyeOff} title="Dark Web Monitor" description="Maintain a watchlist of emails and usernames, and check them for breach exposure at any time." />

      <Card className="mb-6">
        <CardContent className="p-4">
          <form
            className="flex flex-col gap-2.5 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (value.trim()) {
                add(value.trim(), type);
                setValue("");
              }
            }}
          >
            <Select value={type} onValueChange={(v) => setType(v as WatchlistItem["type"])}>
              <SelectTrigger className="sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="username">Username</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="you@example.com" className="flex-1" />
            <Button type="submit" disabled={!value.trim()}>
              <Plus className="h-4 w-4" /> Add to watchlist
            </Button>
          </form>
        </CardContent>
      </Card>

      {checkedError && <RequiresApiKeyState service="Have I Been Pwned" className="mb-6" />}

      {items.length === 0 ? (
        <EmptyState icon={EyeOff} title="Watchlist is empty" description="Add an email or username above to start monitoring it for breach exposure." />
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-lg p-2"
                        style={{
                          background:
                            item.breachCount === undefined
                              ? "rgba(255,255,255,0.04)"
                              : item.breachCount > 0
                                ? "color-mix(in srgb, var(--color-danger) 12%, transparent)"
                                : "color-mix(in srgb, var(--color-success) 12%, transparent)",
                        }}
                      >
                        {item.breachCount !== undefined && item.breachCount > 0 ? (
                          <ShieldAlert className="h-4 w-4 text-[var(--color-danger)]" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-[var(--color-text-muted)]" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">{item.value}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          {item.type} · added {formatDistanceToNow(new Date(item.addedAt), { addSuffix: true })}
                          {item.lastChecked && ` · last checked ${formatDistanceToNow(new Date(item.lastChecked), { addSuffix: true })}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.breachCount !== undefined && (
                        <Badge variant={item.breachCount > 0 ? "danger" : "success"}>
                          {item.breachCount > 0 ? `${item.breachCount} breach(es)` : "Clean"}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => checkMutation.mutate(item)}
                        disabled={checkMutation.isPending && checkMutation.variables?.id === item.id}
                      >
                        <RotateCw className={`h-3.5 w-3.5 ${checkMutation.isPending && checkMutation.variables?.id === item.id ? "animate-spin" : ""}`} />
                        Check now
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(item.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-[var(--color-danger)]" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
