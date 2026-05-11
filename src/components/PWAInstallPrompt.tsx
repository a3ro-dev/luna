"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallPlatform =
  | "android"
  | "ios"
  | "desktop-chrome"
  | "desktop-edge"
  | "unknown";

function detectPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "unknown";

  const ua = navigator.userAgent;

  // iOS Safari (not in standalone mode)
  if (/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window)) {
    return "ios";
  }

  // Android (Chrome)
  if (/Android/.test(ua) && /Chrome/.test(ua)) {
    return "android";
  }

  // Desktop Chrome
  if (/Chrome/.test(ua) && !/Edge/.test(ua) && !/Edg/.test(ua)) {
    return "desktop-chrome";
  }

  // Desktop Edge
  if (/Edg/.test(ua)) {
    return "desktop-edge";
  }

  return "unknown";
}

function isIosStandalone(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    "standalone" in navigator &&
    (navigator as unknown as { standalone: boolean }).standalone === true
  );
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    isIosStandalone() ||
    document.referrer.includes("android-app://")
  );
}

// ─── Shared deferred-prompt singleton ────────────────────────────
// Multiple components (auto-prompt + manual button) share the same
// captured event, so we store it at module scope.

let sharedDeferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners: Array<() => void> = [];

function setSharedPrompt(e: BeforeInstallPromptEvent | null) {
  sharedDeferredPrompt = e;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/**
 * Hook that exposes a `triggerInstall` function + installability state.
 * Use this in any component that wants to offer a manual install button.
 */
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(
    () => sharedDeferredPrompt !== null,
  );
  const [platform] = useState<InstallPlatform>(() => detectPlatform());
  const [isInstalled] = useState(() => isStandalone());

  useEffect(() => {
    const unsub = subscribe(() => {
      setCanInstall(sharedDeferredPrompt !== null);
    });

    return unsub;
  }, []);

  const triggerInstall = useCallback(async () => {
    // iOS: can't trigger programmatically, just return false and rely on the hint UI
    if (!sharedDeferredPrompt) return false;

    sharedDeferredPrompt.prompt();
    const { outcome } = await sharedDeferredPrompt.userChoice;
    setSharedPrompt(null);
    return outcome === "accepted";
  }, []);

  return { canInstall, isInstalled, platform, triggerInstall };
}

// ─── Auto-prompt banner component ────────────────────────────────

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [platform] = useState<InstallPlatform>(() => detectPlatform());

  useEffect(() => {
    // Don't show if already installed
    if (isStandalone()) return;

    // Dismiss state persisted in localStorage
    const dismissed = localStorage.getItem("luna-pwa-dismissed");
    if (dismissed) return;

    // Chrome / Edge / Android: listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setSharedPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // iOS Safari: no beforeinstallprompt — show a manual hint
    if (platform === "ios") {
      // Small delay so it doesn't fight with page load
      const timer = setTimeout(() => setShowIosHint(true), 2000);
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
        clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [platform]);

  const handleInstallClick = useCallback(async () => {
    if (!sharedDeferredPrompt) return;

    sharedDeferredPrompt.prompt();
    const { outcome } = await sharedDeferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
    }

    setSharedPrompt(null);
  }, []);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setShowIosHint(false);
    localStorage.setItem("luna-pwa-dismissed", "1");
  }, []);

  // ── Chrome / Edge / Android prompt ─────────────────────────────
  if (showPrompt && sharedDeferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white rounded-2xl shadow-lg border border-[#FFDDE0] p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFDDE0] flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🌙</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[#2D1F2F]">
                Install Luna on your device
              </p>
              <p className="text-xs text-[#8B7B82] mt-0.5">
                Quick access from your home screen — works offline too
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-[#8B7B82] rounded-full"
              onClick={handleDismiss}
            >
              Not now
            </Button>
            <Button
              size="sm"
              className="text-xs bg-[#2D1F2F] hover:bg-[#3D2F3F] text-white rounded-full"
              onClick={handleInstallClick}
            >
              Install
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── iOS Safari hint ────────────────────────────────────────────
  if (showIosHint && platform === "ios") {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white rounded-2xl shadow-lg border border-[#FFDDE0] p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFDDE0] flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🌙</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[#2D1F2F]">
                Add Luna to your Home Screen
              </p>
              <p className="text-xs text-[#8B7B82] mt-1 leading-relaxed">
                Tap <ShareIcon /> in Safari&apos;s bottom bar, then{" "}
                <strong>&quot;Add to Home Screen&quot;</strong>
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-[#8B7B82] rounded-full"
              onClick={handleDismiss}
            >
              Got it
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ShareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block mx-0.5 -mt-0.5 text-[#4A3A42]"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

/**
 * Service worker registration — call from a client component
 * that's mounted in the root layout.
 */
export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[Luna] Service worker registered, scope:", reg.scope);
      })
      .catch((err) => {
        console.warn("[Luna] Service worker registration failed:", err);
      });
  }, []);
}
