"use client";

import type { ReactNode } from "react";
import { Dialog } from "radix-ui";

/**
 * iOS sheet: slides up from the bottom on phones with a grabber, and becomes a
 * centred card on larger screens. Rendered in place (not portalled) so it keeps
 * the plan's colour tokens. Focus trap, Escape and backdrop dismiss come from
 * Radix Dialog.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--scrim)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
      <Dialog.Content className="material fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-[1.375rem] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2 shadow-[var(--shadow-card)] outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300 motion-reduce:animate-none md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[26rem] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.375rem] md:pb-6 md:pt-5">
        <div aria-hidden className="mx-auto mb-3 h-[5px] w-9 rounded-full bg-[var(--separator)] md:hidden" />
        <Dialog.Title className="text-center text-[17px] font-semibold tracking-[-0.022em] text-[var(--tier-ink)]">
          {title}
        </Dialog.Title>
        {description ? (
          <Dialog.Description className="mt-1 text-center text-[13px] text-[var(--label-secondary)]">
            {description}
          </Dialog.Description>
        ) : null}
        <div className="mt-4">{children}</div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
