"use client";

import React, { memo } from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { MoonIcon, PlusIcon, SettingsIcon, XIcon } from "lucide-react";
import { SessionList, type ChatSession } from "./ChatSidebar";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  isLoading: boolean;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onRenameSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

const footerLink =
  "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm text-[var(--tier-ink)] transition-colors duration-150 hover:bg-[var(--tier-tint)]";

/**
 * Chat drawer. Radix supplies the focus trap, Escape, backdrop dismissal and
 * focus return. It is not portalled, so it stays inside .tier-app and keeps
 * the plan colours. Deliberately not md:hidden: a hidden-but-open modal would
 * keep Radix's pointer-events lock on the page after a resize or rotation.
 */
export const MobileSidebar = memo(function MobileSidebar({
  open,
  onClose,
  onNewSession,
  ...listProps
}: MobileSidebarProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Overlay
        className="fixed inset-0 z-50 bg-[color-mix(in_oklch,var(--tier-ink)_28%,transparent)] duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
      />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,86vw)] flex-col gap-5 border-r border-[var(--tier-line)] bg-[var(--tier-surface)] pt-[max(1.25rem,env(safe-area-inset-top))] pr-3 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] shadow-[0_30px_60px_oklch(0.4_0.04_355/0.18)] outline-none duration-200 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left"
      >
        <div className="flex items-center justify-between pl-3">
          <DialogPrimitive.Title className="font-serif text-2xl text-[var(--tier-ink)]">
            Your chats
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            aria-label="Close chats"
            className="flex size-11 cursor-pointer items-center justify-center rounded-full text-[var(--tier-muted)] hover:bg-[var(--tier-tint)] hover:text-[var(--tier-ink)]"
          >
            <XIcon className="size-5" />
          </DialogPrimitive.Close>
        </div>

        <button type="button" onClick={onNewSession} className="tier-primary-action mx-1 cursor-pointer">
          <PlusIcon className="size-4" />
          New chat
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <SessionList {...listProps} />
        </div>

        <nav aria-label="Luna" className="border-t border-[var(--tier-line)] pt-3">
          <Link href="/dashboard" className={footerLink}>
            <MoonIcon className="size-4 text-[var(--tier-muted)]" />
            Today
          </Link>
          <Link href="/settings" className={footerLink}>
            <SettingsIcon className="size-4 text-[var(--tier-muted)]" />
            Settings
          </Link>
        </nav>
      </DialogPrimitive.Content>
    </DialogPrimitive.Root>
  );
});
