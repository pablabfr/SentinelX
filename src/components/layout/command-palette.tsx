"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, FileBarChart, ScanLine } from "lucide-react";
import { navItems } from "@/lib/nav";
import { useUIStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen, setAiAssistantOpen } = useUIStore();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (mod && e.key === "/") {
        e.preventDefault();
        setAiAssistantOpen(true);
        router.push("/ai-assistant");
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        router.push("/website-scanner");
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        router.push("/reports");
      }
      if (e.key === "Escape") setCommandPaletteOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandPaletteOpen, router, setAiAssistantOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-start justify-center bg-black/70 backdrop-blur-sm pt-[15vh]"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className={cn(
          "w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-raised)]/95 shadow-2xl"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          className="flex flex-col"
          filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
        >
          <div className="flex items-center gap-2.5 border-b border-[var(--color-border-soft)] px-4">
            <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
            <Command.Input
              autoFocus
              placeholder="Search IPs, domains, CVEs, tools, settings…"
              className="h-13 flex-1 bg-transparent py-4 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
            />
            <kbd className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-96 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-xs text-[var(--color-text-muted)]">
              No results found.
            </Command.Empty>

            <Command.Group heading="Quick actions" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-[var(--color-text-muted)]">
              <Command.Item
                onSelect={() => {
                  router.push("/website-scanner");
                  setCommandPaletteOpen(false);
                }}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-[var(--color-text)] data-[selected=true]:bg-white/5"
              >
                <ScanLine className="h-4 w-4 text-[var(--color-accent-blue)]" />
                Run a new scan
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  router.push("/reports");
                  setCommandPaletteOpen(false);
                }}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-[var(--color-text)] data-[selected=true]:bg-white/5"
              >
                <FileBarChart className="h-4 w-4 text-[var(--color-accent-purple)]" />
                Generate report
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Navigate" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-[var(--color-text-muted)]">
              {navItems.map((item) => (
                <Command.Item
                  key={item.href}
                  value={`${item.label} ${item.keywords?.join(" ") ?? ""}`}
                  onSelect={() => {
                    router.push(item.href);
                    setCommandPaletteOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-[var(--color-text)] data-[selected=true]:bg-white/5"
                >
                  <item.icon className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
