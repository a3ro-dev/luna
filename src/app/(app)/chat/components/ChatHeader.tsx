"use client";

import React, { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { MessagesSquareIcon, MoonIcon, SettingsIcon } from "lucide-react";

interface ChatHeaderProps {
  onOpenSessions: () => void;
  showDesktopSessions: boolean;
}

/** iOS bar button: tint glyph, no chrome until pressed or hovered. */
const glyphButton =
  "flex size-11 cursor-pointer items-center justify-center rounded-full text-[var(--tint)] transition-[background-color,opacity] duration-150 hover:bg-[var(--fill-tertiary)] active:opacity-60";

const textButton =
  "inline-flex min-h-11 cursor-pointer items-center whitespace-nowrap rounded-full px-3 text-[17px] tracking-[-0.022em] text-[var(--tint)] transition-[background-color,opacity] duration-150 hover:bg-[var(--fill-tertiary)] active:opacity-60";

/**
 * Compact iOS navigation bar: leading chat list, centred title, trailing
 * destinations. Chat has no bottom tab bar (the composer owns that edge on
 * phones), so Today and Settings live here; signing out lives in Settings.
 * Solid, not material: the conversation scrolls beside the bar, never under it.
 */
export const ChatHeader = memo(function ChatHeader({
  onOpenSessions,
  showDesktopSessions,
}: ChatHeaderProps) {
  return (
    <header className="hairline-b relative z-30 shrink-0 bg-[var(--tier-surface)] pt-[env(safe-area-inset-top)]">
      {/* Equal side tracks keep the title centred even when one side is wider */}
      <div className="grid h-12 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-1.5 md:h-[3.25rem] md:px-3">
        <div className="flex min-w-0 items-center justify-start">
          <button
            type="button"
            onClick={onOpenSessions}
            aria-label="Chats"
            className={`${glyphButton} md:hidden`}
          >
            <MessagesSquareIcon className="size-[22px]" strokeWidth={1.8} />
          </button>
          {showDesktopSessions && (
            <button type="button" onClick={onOpenSessions} className={`${textButton} max-md:hidden`}>
              Chats
            </button>
          )}
        </div>

        <h1 className="flex items-center gap-1.5 font-serif text-[21px] leading-none text-[var(--tier-ink)]">
          <Image src="/luna.png" alt="" width={22} height={22} className="size-[22px] rounded-full" />
          Luna
        </h1>

        {/* Phones: glyphs, labelled for assistive tech */}
        <nav aria-label="Luna" className="flex items-center justify-end md:hidden">
          <Link href="/dashboard" aria-label="Today" title="Today" className={glyphButton}>
            <MoonIcon className="size-[22px]" strokeWidth={1.8} />
          </Link>
          <Link href="/settings" aria-label="Settings" title="Settings" className={glyphButton}>
            <SettingsIcon className="size-[22px]" strokeWidth={1.8} />
          </Link>
        </nav>

        {/* Tablet and up: text bar buttons */}
        <nav aria-label="Luna" className="hidden items-center justify-end md:flex">
          <Link href="/dashboard" className={textButton}>
            Today
          </Link>
          <Link href="/settings" className={textButton}>
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
});
