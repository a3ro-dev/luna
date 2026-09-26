"use client";

import { useSyncExternalStore } from "react";
import { Segmented } from "@/components/apple/Segmented";
import { useThemeMode, type ThemeMode } from "@/lib/theme/mode";

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const noop = () => () => {};

export default function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useThemeMode();
  // Hydration renders the server snapshot ("system"); showing it would spring the
  // thumb to the stored mode on every load. Select nothing until hydrated.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return (
    <Segmented
      options={OPTIONS}
      value={(hydrated ? mode : null) as ThemeMode}
      onChange={setMode}
      label="Appearance"
      className={className}
    />
  );
}
