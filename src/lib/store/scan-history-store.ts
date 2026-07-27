import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RiskLevel, ScanType } from "@/lib/types";

export interface ScanHistoryEntry {
  id: string;
  type: ScanType;
  target: string;
  score: number;
  level: RiskLevel;
  summary: string;
  timestamp: string;
  countryCode?: string;
  data?: unknown;
}

interface ScanHistoryState {
  entries: ScanHistoryEntry[];
  addEntry: (entry: ScanHistoryEntry) => void;
  clear: () => void;
  remove: (id: string) => void;
}

export const useScanHistoryStore = create<ScanHistoryState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((s) => ({ entries: [entry, ...s.entries].slice(0, 200) })),
      clear: () => set({ entries: [] }),
      remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    { name: "sentinelx-scan-history" }
  )
);
