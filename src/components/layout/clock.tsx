"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    const timeout = setTimeout(() => setNow(new Date()), 0);
    return () => {
      clearInterval(id);
      clearTimeout(timeout);
    };
  }, []);

  if (!now) {
    return <span className="tabular-nums text-xs text-[var(--color-text-muted)]">--:--:--</span>;
  }

  return (
    <span className="tabular-nums text-xs text-[var(--color-text-secondary)]">
      {now.toLocaleTimeString("en-US", { hour12: false })}{" "}
      <span className="text-[var(--color-text-muted)]">
        {now.toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
      </span>
    </span>
  );
}
