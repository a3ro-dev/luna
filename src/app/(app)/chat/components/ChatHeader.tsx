"use client";

import React, { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { MessagesSquareIcon, MoonIcon, SettingsIcon } from "lucide-react";
import type { UserPlan } from "@/lib/theme/accent";

interface ChatHeaderProps {
  onOpenSessions: () => void;
  showDesktopSessions: boolean;
  plan: UserPlan;
}

const PLAN_LABEL: Record<UserPlan, string> = {
  free: "Free",
  premium: "Premium",
  "premium+": "Premium+",
};

const iconButton =
  "flex size-11 cursor-pointer items-center justify-center rounded-full text-[var(--tier-muted)] transition-colors duration-150 hover:bg-[var(--tier-tint)] hover:text-[var(--tier-ink)]";

const pill =
  "inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--tier-line)] px-4 text-xs font-medium text-[var(--tier-ink)] transition-colors duration-150 hover:bg-[var(--tier-tint)]";

/**
 * Chat keeps its own header instead of the shared bottom tab bar: the composer
 * owns the bottom edge on phones, so Today and Settings live up here.
 */
export const ChatHeader = memo(function ChatHeader({
  onOpenSessions,
  showDesktopSessions,
  plan,
}: ChatHeaderProps) {
  const { status: authStatus } = useSession();

  return (
    <header className="shrink-0 border-b border-[var(--tier-line)] bg-[var(--tier-surface)] pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-1 px-2 md:h-16 md:px-6">
        <button
          type="button"
          onClick={onOpenSessions}
          aria-label="Open chats"
          className={`${iconButton} md:hidden`}
        >
          <MessagesSquareIcon className="size-5" />
        </button>

        <h1 className="flex min-w-0 items-center gap-2 font-serif text-2xl leading-none text-[var(--tier-ink)] md:text-[1.75rem]">
          <Image src="/luna.png" alt="" width={28} height={28} className="size-7 rounded-full" />
          Luna
        </h1>
        <span className="ml-1.5 mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--tier-muted)] sm:inline">
          {PLAN_LABEL[plan]}
        </span>

        {/* Phones: icon links, labelled for assistive tech */}
        <nav aria-label="Luna" className="ml-auto flex items-center md:hidden">
          <Link href="/dashboard" aria-label="Today" title="Today" className={iconButton}>
            <MoonIcon className="size-5" />
          </Link>
          <Link href="/settings" aria-label="Settings" title="Settings" className={iconButton}>
            <SettingsIcon className="size-5" />
          </Link>
        </nav>

        {/* Tablet and up: text pills */}
        <nav aria-label="Luna" className="ml-auto hidden items-center gap-2 md:flex">
          {showDesktopSessions && (
            <button type="button" onClick={onOpenSessions} className={pill}>
              Chats
            </button>
          )}
          <Link href="/dashboard" className={pill}>
            Today
          </Link>
          <Link href="/settings" className={pill}>
            Settings
          </Link>
          {authStatus === "authenticated" ? (
            <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className={pill}>
              Sign out
            </button>
          ) : (
            <Link href="/login" className={pill}>
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
});
