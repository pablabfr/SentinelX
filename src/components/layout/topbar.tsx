"use client";

import Link from "next/link";
import { Search, User, Settings, LogOut, ShieldCheck } from "lucide-react";
import { useUIStore } from "@/lib/store/ui-store";
import { LiveClock } from "@/components/layout/clock";
import { NetworkStatus } from "@/components/layout/network-status";
import { ThreatLevelIndicator } from "@/components/layout/threat-level";
import { NotificationCenter } from "@/components/layout/notification-center";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopBar() {
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b border-[var(--color-border-soft)] bg-[var(--color-bg)]/70 px-4 backdrop-blur-xl md:px-6">
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2.5 rounded-lg border border-[var(--color-border-soft)] bg-white/[0.02] px-3 text-sm text-[var(--color-text-muted)] transition-colors hover:border-[#333] hover:bg-white/[0.04] cursor-pointer"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search or ask AI…</span>
        <kbd className="rounded border border-[var(--color-border)] bg-white/[0.03] px-1.5 py-0.5 text-[10px]">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2.5">
        <div className="hidden items-center gap-2.5 lg:flex">
          <ThreatLevelIndicator />
          <NetworkStatus />
        </div>
        <LiveClock />
        <NotificationCenter />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-blue)] to-[var(--color-accent-purple)] text-black cursor-pointer">
              <User className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2 normal-case">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-accent-blue)]" />
              Security Analyst
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings#api-keys">
                <ShieldCheck className="h-4 w-4" /> API keys
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[var(--color-danger)]">
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
