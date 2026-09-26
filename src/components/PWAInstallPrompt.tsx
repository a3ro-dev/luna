"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCookieConsentPending } from "@/components/CookieConsent";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

function InstallHelpDialog({
  open,
  onOpenChange,
  platform,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: InstallPlatform;
}) {
  const steps =
    platform === "ios"
      ? [
          'Tap the Share button in Safari (the square with an arrow).',
          'Scroll and tap "Add to Home Screen".',
          "Confirm to add Luna.",
        ]
      : [
          "Open your browser menu.",
          'Tap "Install app" (or "Add to Home Screen").',
          "Confirm to install Luna.",
        ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>How to install Luna</DialogTitle>
          <DialogDescription>
            {platform === "ios"
              ? "iOS doesn’t show an install prompt, so you’ll install from Safari’s menu."
              : "If you don’t see an install prompt, you can install from your browser menu."}
          </DialogDescription>
        </DialogHeader>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-[#6D5A60] marker:text-[#75636A]">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full px-5"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

const noopSubscribe = () => () => {};

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
  // Server snapshots keep SSR and the hydration render identical; the real
  // values arrive on the next client render (same pattern as CookieConsent).
  const platform = useSyncExternalStore(
    noopSubscribe,
    detectPlatform,
    (): InstallPlatform => "unknown",
  );
  const isInstalled = useSyncExternalStore(
    noopSubscribe,
    isStandalone,
    () => false,
  );

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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [platform] = useState<InstallPlatform>(() => detectPlatform());
  const consentPending = useCookieConsentPending();

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

    // If the browser never fires beforeinstallprompt (some shells/browsers),
    // still show a helpful install card after a short delay.
    const fallbackTimer = setTimeout(() => {
      if (!isStandalone()) setShowPrompt(true);
    }, 3500);

    // iOS Safari: no beforeinstallprompt — show a manual hint
    if (platform === "ios") {
      const timer = setTimeout(() => setShowIosHint(true), 2000);
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
        clearTimeout(timer);
        clearTimeout(fallbackTimer);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      clearTimeout(fallbackTimer);
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

  // One bottom card at a time: the cookie notice goes first.
  if (consentPending) return null;

  // ── Install card (prompt if available; otherwise show instructions) ─────
  if (showPrompt) {
    return (
      <InstallCard
        title="Install Luna on your device"
        body="Quick access from your home screen, and it works offline too."
      >
        <InstallHelpDialog
          open={isHelpOpen}
          onOpenChange={setIsHelpOpen}
          platform={platform}
        />
        <Button variant="ghost" className={quietButton} onClick={handleDismiss}>
          Not now
        </Button>
        {sharedDeferredPrompt ? (
          <Button className={primaryButton} onClick={handleInstallClick}>
            Install
          </Button>
        ) : (
          <Button
            variant="outline"
            className={`${quietButton} border-[#FFDDE0] bg-white hover:bg-[#FFF5F7]`}
            onClick={() => setIsHelpOpen(true)}
          >
            How to install
          </Button>
        )}
      </InstallCard>
    );
  }

  // ── iOS Safari hint ────────────────────────────────────────────
  if (showIosHint && platform === "ios") {
    return (
      <InstallCard
        title="Add Luna to your Home Screen"
        body={
          <>
            Tap <ShareIcon /> in Safari&apos;s toolbar, then{" "}
            <strong className="font-medium text-[#6D5A60]">
              &quot;Add to Home Screen&quot;
            </strong>
            .
          </>
        }
      >
        <Button className={primaryButton} onClick={handleDismiss}>
          Got it
        </Button>
      </InstallCard>
    );
  }

  return null;
}

const quietButton =
  "h-11 rounded-full px-4 text-xs font-medium text-[#6D5A60] hover:bg-[#FFF5F7] hover:text-[#6D5A60] focus-visible:ring-[#6D5A60]/40";
const primaryButton =
  "h-11 rounded-full bg-[#6D5A60] px-5 text-xs font-medium text-white hover:bg-[#5E4C52] focus-visible:ring-[#6D5A60]/40";

/**
 * Bottom card, clear of the safe area. On phones it lifts above the app tab bar
 * (AppTabBar renders nav[aria-label=Primary]) so navigation stays reachable.
 */
function InstallCard({
  title,
  body,
  children,
}: {
  title: string;
  body: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <aside
      aria-label="Install Luna"
      className="fixed left-3 right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 max-md:[body:has(nav[aria-label=Primary])_&]:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:left-auto md:right-6 md:bottom-6 md:w-full md:max-w-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 motion-safe:duration-300"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-[#FFDDE0] bg-white p-4 shadow-[0_20px_40px_rgba(109,90,96,0.12)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#FFDDE0]">
            <Image
              src="/luna.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-full"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#6D5A60]">{title}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-[#75636A]">
              {body}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">{children}</div>
      </div>
    </aside>
  );
}

function ShareIcon() {
  return (
    <svg
      aria-label="Share"
      role="img"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block mx-0.5 -mt-0.5 text-[#6D5A60]"
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
