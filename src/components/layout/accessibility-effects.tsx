"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/lib/store/settings-store";

export function AccessibilityEffects() {
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const highContrast = useSettingsStore((s) => s.highContrast);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", highContrast);
  }, [highContrast]);

  return null;
}
