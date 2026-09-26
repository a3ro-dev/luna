"use client";

import React, { memo } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { MoonIcon, SettingsIcon, SquarePenIcon } from "lucide-react";
import { Sheet } from "@/components/apple/Sheet";
import { GroupedRow, GroupedSection, RowIcon } from "@/components/apple/Grouped";
import { SessionList, type ChatSession } from "./ChatSidebar";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onPrefetchSession: (id: string) => void;
  onNewSession: () => void;
  onRenameSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

/**
 * The chat list as an iOS sheet (a centred card from md up). Sheet is Radix
 * Dialog rendered in place, so it keeps the plan colours, the focus trap,
 * Escape and backdrop dismissal. Deliberately not md:hidden: a hidden-but-open
 * modal would keep Radix's pointer-events lock on the page after a rotation.
 */
export const MobileSidebar = memo(function MobileSidebar({
  open,
  onClose,
  onNewSession,
  ...listProps
}: MobileSidebarProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Chats"
      description="Pick up where you left off."
    >
      {/* Sheet has no bar-button slot; Done sits where iOS puts it, level with the title */}
      <DialogPrimitive.Close className="absolute top-[15px] right-2 flex min-h-11 cursor-pointer items-center rounded-full px-3 text-[17px] font-semibold text-[var(--tint)] active:opacity-60 md:top-2.5">
        Done
      </DialogPrimitive.Close>

      {/* Grouped surfaces clip overflow, so focus rings draw inside the rows */}
      <div className="space-y-6 [&_:focus-visible]:outline-offset-[-3px]!">
        <GroupedSection>
          <GroupedRow
            onClick={onNewSession}
            tone="accent"
            icon={<SquarePenIcon aria-hidden className="size-[22px] text-[var(--tint)]" />}
            label="New chat"
          />
        </GroupedSection>

        <SessionList {...listProps} />

        <nav aria-label="Luna">
          <GroupedSection>
            <GroupedRow
              href="/dashboard"
              icon={
                <RowIcon color="var(--tint)">
                  <MoonIcon className="size-4 text-[var(--tier-surface)]" />
                </RowIcon>
              }
              label="Today"
            />
            <GroupedRow
              href="/settings"
              icon={
                <RowIcon color="var(--tint)">
                  <SettingsIcon className="size-4 text-[var(--tier-surface)]" />
                </RowIcon>
              }
              label="Settings"
            />
          </GroupedSection>
        </nav>
      </div>
    </Sheet>
  );
});
