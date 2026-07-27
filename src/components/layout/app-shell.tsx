"use client";

import { AnimatedBackground } from "@/components/layout/background";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AccessibilityEffects } from "@/components/layout/accessibility-effects";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AccessibilityEffects />
      <AnimatedBackground />
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-8">{children}</main>
      </div>
      <MobileNav />
      <CommandPalette />
    </div>
  );
}
