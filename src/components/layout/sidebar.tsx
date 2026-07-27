"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronsLeft, ShieldCheck } from "lucide-react";
import { navItems } from "@/lib/nav";
import { useUIStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 248 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-20 hidden h-screen shrink-0 flex-col border-r border-[var(--color-border-soft)] bg-[var(--color-bg-raised)]/80 backdrop-blur-xl md:flex"
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-[var(--color-border-soft)] px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent-blue)] to-[var(--color-accent-purple)] glow-blue">
          <ShieldCheck className="h-4.5 w-4.5 text-black" />
        </div>
        {!sidebarCollapsed && (
          <span className="font-display text-sm font-semibold tracking-wide text-[var(--color-text)]">
            Sentinel<span className="text-gradient">X</span>
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;
            const link = (
              <Link
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-[var(--color-text)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-white/[0.03]"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-white/[0.06] ring-1 ring-[var(--color-accent-blue)]/25"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <Icon
                  className={cn(
                    "relative z-10 h-4.5 w-4.5 shrink-0",
                    active && "text-[var(--color-accent-blue)]"
                  )}
                />
                {!sidebarCollapsed && <span className="relative z-10 truncate">{item.label}</span>}
              </Link>
            );

            return (
              <li key={item.href}>
                {sidebarCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[var(--color-border-soft)] p-2.5">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/[0.03] hover:text-[var(--color-text)] cursor-pointer"
        >
          <ChevronsLeft className={cn("h-4.5 w-4.5 transition-transform", sidebarCollapsed && "rotate-180")} />
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
