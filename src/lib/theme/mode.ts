// Hooks for client components. No "use client": the directive would turn a
// server import of THEME_STORAGE_KEY into a reference proxy instead of the
// string. Server code imports it from ./no-flash.
import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "./no-flash";

export { THEME_STORAGE_KEY };
export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

// The choice for this tab when storage is blocked (private mode, disabled).
let memoryMode: ThemeMode = "system";

function readMode(): ThemeMode {
  try {
    const m = localStorage.getItem(THEME_STORAGE_KEY);
    return m === "light" || m === "dark" ? m : "system";
  } catch {
    return memoryMode;
  }
}

function resolve(m: ThemeMode): ResolvedTheme {
  return m === "dark" || (m === "system" && matchMedia(DARK_QUERY).matches) ? "dark" : "light";
}
const readResolved = () => resolve(readMode());

// Other tabs (storage event) and the OS appearance. Same-tab writes dispatch a
// synthetic storage event, so one listener covers every case.
function subscribe(onChange: () => void) {
  const mq = matchMedia(DARK_QUERY);
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY || e.key === null) onChange();
  };
  mq.addEventListener("change", onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function setThemeMode(mode: ThemeMode) {
  memoryMode = mode;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Storage blocked: memoryMode carries the choice for this tab.
  }
  // One frame without transitions, so every surface flips at once instead of
  // fading through a half-light, half-dark state.
  const still = document.createElement("style");
  still.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(still);
  document.documentElement.classList.toggle("dark", resolve(mode) === "dark");
  void getComputedStyle(document.body).color; // apply the new colours while transitions are off
  requestAnimationFrame(() => still.remove());
  // newValue lets the no-flash script keep the choice even when storage is blocked.
  window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: mode }));
}

/** The user's choice. Server snapshot is "system", so hydration never mismatches. */
export function useThemeMode(): [ThemeMode, (m: ThemeMode) => void] {
  const mode = useSyncExternalStore(subscribe, readMode, () => "system" as const);
  return [mode, setThemeMode];
}

/**
 * The requested appearance: html.dark is set from it. App pages paint night
 * through the .tier-app tokens, the landing and legal pages through the
 * --landing-* tokens (see globals.css). Server snapshot is "light".
 */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribe, readResolved, () => "light" as const);
}
