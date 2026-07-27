"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Globe, ShieldAlert, Bot, Menu } from "lucide-react";
import { useUIStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Scan", href: "/website-scanner", icon: Globe },
  { label: "Threats", href: "/threat-centre", icon: ShieldAlert },
  { label: "AI", href: "/ai-assistant", icon: Bot },
];

export function MobileNav() {
  const pathname = usePathname();
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-center justify-around border-t border-[var(--color-border-soft)] bg-[var(--color-bg-raised)]/90 backdrop-blur-xl md:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1.5 text-[10px]",
              active ? "text-[var(--color-accent-blue)]" : "text-[var(--color-text-muted)]"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex flex-col items-center gap-1 px-3 py-1.5 text-[10px] text-[var(--color-text-muted)] cursor-pointer"
      >
        <Menu className="h-5 w-5" />
        More
      </button>
    </nav>
  );
}
