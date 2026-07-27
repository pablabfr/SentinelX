import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApiKeys } from "@/lib/types";

export type AIModel = "gpt-4o-mini" | "gpt-4o" | "gpt-4.1" | "o4-mini";

interface NotificationPrefs {
  threatDetected: boolean;
  newBreach: boolean;
  weakPassword: boolean;
  expiredSsl: boolean;
  suspiciousLogin: boolean;
  criticalCve: boolean;
}

interface SettingsState {
  apiKeys: ApiKeys;
  aiModel: AIModel;
  companyName: string;
  companyLogo: string | null;
  notifications: NotificationPrefs;
  developerMode: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  setApiKey: (key: keyof ApiKeys, value: string) => void;
  clearApiKey: (key: keyof ApiKeys) => void;
  setAiModel: (model: AIModel) => void;
  setCompanyName: (name: string) => void;
  setCompanyLogo: (dataUrl: string | null) => void;
  toggleNotification: (key: keyof NotificationPrefs) => void;
  setDeveloperMode: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  setHighContrast: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKeys: {},
      aiModel: "gpt-4o-mini",
      companyName: "SentinelX",
      companyLogo: null,
      notifications: {
        threatDetected: true,
        newBreach: true,
        weakPassword: true,
        expiredSsl: true,
        suspiciousLogin: true,
        criticalCve: true,
      },
      developerMode: false,
      reduceMotion: false,
      highContrast: false,
      setApiKey: (key, value) => set((s) => ({ apiKeys: { ...s.apiKeys, [key]: value } })),
      clearApiKey: (key) =>
        set((s) => {
          const next = { ...s.apiKeys };
          delete next[key];
          return { apiKeys: next };
        }),
      setAiModel: (aiModel) => set({ aiModel }),
      setCompanyName: (companyName) => set({ companyName }),
      setCompanyLogo: (companyLogo) => set({ companyLogo }),
      toggleNotification: (key) =>
        set((s) => ({ notifications: { ...s.notifications, [key]: !s.notifications[key] } })),
      setDeveloperMode: (developerMode) => set({ developerMode }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setHighContrast: (highContrast) => set({ highContrast }),
    }),
    { name: "sentinelx-settings" }
  )
);
