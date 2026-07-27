"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function NetworkStatus() {
  const [online, setOnline] = useState(true);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    let cancelled = false;
    async function ping() {
      const start = performance.now();
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (!cancelled) {
          setLatency(res.ok ? Math.round(performance.now() - start) : null);
          setOnline(res.ok);
        }
      } catch {
        if (!cancelled) setOnline(false);
      }
    }
    ping();
    const id = setInterval(ping, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-[var(--color-border-soft)] bg-white/[0.02] px-2.5 py-1">
      <span className="relative flex h-1.5 w-1.5">
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            online ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-1.5 w-1.5 rounded-full",
            online ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"
          )}
        />
      </span>
      <span className="text-[11px] text-[var(--color-text-muted)]">
        {online ? (latency !== null ? `${latency}ms` : "Online") : "Offline"}
      </span>
    </div>
  );
}
