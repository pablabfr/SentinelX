import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  timestamp: string;
  read: boolean;
  href?: string;
}

interface NotificationState {
  items: AppNotification[];
  push: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      items: [],
      push: (n) =>
        set((s) => ({
          items: [
            { ...n, id: crypto.randomUUID(), timestamp: new Date().toISOString(), read: false },
            ...s.items,
          ].slice(0, 100),
        })),
      markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
      markRead: (id) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)) })),
      clear: () => set({ items: [] }),
    }),
    { name: "sentinelx-notifications" }
  )
);
