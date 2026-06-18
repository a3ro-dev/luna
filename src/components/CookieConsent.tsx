"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem("luna-cookie-consent")) return;
    } catch {
      // localStorage unavailable (e.g. private browsing on some browsers)
    }
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem("luna-cookie-consent", "1");
    } catch {
      // silently fail — banner will show again on next visit
    }
    setVisible(false);
  }, []);

  if (!mounted || !visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-white/60 bg-white/90 backdrop-blur-xl p-5 shadow-[0_-8px_32px_rgba(255,181,192,0.08)] flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-light text-[#8E7D82] leading-relaxed">
              Luna uses only essential cookies to keep you signed in and
              remember your preferences. No tracking, no ads, no analytics
              cookies — ever.{" "}
              <Link
                href="/privacy"
                className="text-[#FFB5C0] hover:text-[#6D5A60] transition-colors whitespace-nowrap"
              >
                Privacy Policy
              </Link>
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="h-11 shrink-0 rounded-full bg-[#6D5A60] px-6 text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_8px_16px_rgba(109,90,96,0.15)] transition hover:bg-[#8E7D82] cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
