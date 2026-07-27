import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WatchlistItem {
  id: string;
  value: string;
  type: "email" | "username" | "phone";
  addedAt: string;
  lastChecked?: string;
  breachCount?: number;
}

interface WatchlistState {
  items: WatchlistItem[];
  add: (value: string, type: WatchlistItem["type"]) => void;
  remove: (id: string) => void;
  updateResult: (id: string, breachCount: number) => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      items: [],
      add: (value, type) =>
        set((s) => {
          if (s.items.some((i) => i.value.toLowerCase() === value.toLowerCase())) return s;
          return { items: [{ id: crypto.randomUUID(), value, type, addedAt: new Date().toISOString() }, ...s.items] };
        }),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      updateResult: (id, breachCount) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, breachCount, lastChecked: new Date().toISOString() } : i)),
        })),
    }),
    { name: "sentinelx-watchlist" }
  )
);
