"use client";

import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNotificationStore } from "@/lib/store/notification-store";
import { severityColor } from "@/lib/risk";
import { cn } from "@/lib/utils";

export function NotificationCenter() {
  const { items, markAllRead } = useNotificationStore();
  const unread = items.filter((i) => !i.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border-soft)] text-[var(--color-text-secondary)] transition-colors hover:bg-white/5 hover:text-[var(--color-text)] cursor-pointer">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[9px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-80">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 px-4 py-10 text-center">
              <p className="text-xs text-[var(--color-text-muted)]">No notifications yet</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Run scans to start receiving real-time security alerts.
              </p>
            </div>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id} className={cn("border-b border-[var(--color-border-soft)] px-4 py-3", !n.read && "bg-white/[0.02]")}>
                  <div className="flex items-start gap-2.5">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: severityColor[n.severity] }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--color-text)]">{n.title}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{n.description}</p>
                      <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                        {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
