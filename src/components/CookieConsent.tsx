"use client";

import React, { useState, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";

const CONSENT_KEY = "luna-cookie-consent";
const CONSENT_EVENT = "luna-cookie-consent";

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function needsConsent() {
  try {
    return !localStorage.getItem(CONSENT_KEY);
  } catch {
    // localStorage unavailable (e.g. private browsing on some browsers)
    return true;
  }
}

/**
 * True while the cookie notice is waiting for a first "Got it". Other bottom
 * overlays (the PWA install card) wait on this so the two never stack.
 * Server snapshot is false so nothing renders during SSR.
 */
export function useCookieConsentPending() {
  return useSyncExternalStore(subscribe, needsConsent, () => false);
}

export default function CookieConsent() {
  const pending = useCookieConsentPending();
  const [dismissed, setDismissed] = useState(false);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(CONSENT_KEY, "1");
    } catch {
      // silently fail — banner will show again on next visit
    }
    setDismissed(true);
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }, []);

  if (!pending || dismissed) return null;

  return (
    // Sits above the mobile tab bar (AppTabBar, nav[aria-label=Primary]) when a page renders one.
    <aside
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-[45] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom))] max-md:[body:has(nav[aria-label=Primary])_&]:bottom-16 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl bg-[color-mix(in_oklch,var(--chrome-surface)_95%,transparent)] p-4 shadow-[var(--chrome-shadow)] backdrop-blur-xl sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <p className="min-w-0 text-[13px] leading-relaxed text-[var(--chrome-ink)] sm:flex-1">
          Luna uses only essential cookies to keep you signed in and remember
          your preferences. No tracking, no ads, no analytics cookies, ever.
        </p>
        <div className="flex shrink-0 items-center justify-between gap-2">
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-[13px] font-medium text-[var(--chrome-accent)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-ink)]"
          >
            Privacy Policy
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="h-11 shrink-0 cursor-pointer rounded-full bg-[var(--chrome-ink)] px-6 text-[15px] font-medium text-[var(--chrome-surface)] transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-ink)]"
          >
            Got it
          </button>
        </div>
      </div>
    </aside>
  );
}
