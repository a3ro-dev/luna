"use client";

import React, { memo } from "react";
import { EllipsisIcon, SquarePenIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GroupedSection } from "@/components/apple/Grouped";
import { SESSION_GROUPS, dayLabel, sessionGroup, timeLabel } from "./dates";

export type ChatSession = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isLoading: boolean;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onRenameSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

/** Time for today and yesterday (the section says the day), otherwise the day. */
function entryDate(iso: string) {
  const date = new Date(iso);
  const group = sessionGroup(iso);
  return group === "Today" || group === "Yesterday" ? timeLabel(date) : dayLabel(date);
}

/**
 * One chat as an inset grouped row, like a note in Notes. Rows after the first
 * get a hairline inset to the label; it hides next to the selected row.
 */
export const SessionItem = memo(function SessionItem({
  session,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const title = session.title || "Untitled chat";
  return (
    <li
      className={`relative flex items-center transition-colors duration-150 not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-4 not-first:before:border-t not-first:before:border-[var(--separator)] not-first:before:content-[''] [.is-active+&]:before:hidden ${
        isActive
          ? "is-active bg-[color-mix(in_oklch,var(--tint)_12%,var(--tier-surface))] before:hidden"
          : "hover:bg-[color-mix(in_oklch,var(--fill-tertiary)_60%,transparent)] active:bg-[var(--fill-tertiary)]"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={isActive ? "true" : undefined}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center py-2.5 pl-4 text-left"
      >
        <span
          className={`truncate text-[17px] leading-snug tracking-[-0.01em] text-[var(--tier-ink)] ${isActive ? "font-semibold" : ""}`}
        >
          {title}
        </span>
        <span className="mt-0.5 text-[13px] leading-snug tabular-nums text-[var(--label-secondary)]">
          {entryDate(session.updatedAt)}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Options for ${title}`}
            className="mr-1 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--label-secondary)] transition-colors duration-150 hover:text-[var(--tier-ink)] aria-expanded:text-[var(--tier-ink)]"
          >
            <EllipsisIcon className="size-[18px]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 rounded-xl">
          <DropdownMenuItem onClick={onRename} className="min-h-11 text-[15px]">
            Suggest a title
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onDelete} className="min-h-11 text-[15px]">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
});

/** Loading, empty and filled states, grouped by day like Notes. */
export function SessionList({
  sessions,
  activeSessionId,
  isLoading,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
}: Omit<ChatSidebarProps, "onNewSession">) {
  if (isLoading && sessions.length === 0) {
    return (
      <p role="status" className="px-4 py-2 text-[15px] text-[var(--label-secondary)]">
        Opening your chats…
      </p>
    );
  }
  if (sessions.length === 0) {
    return (
      <p className="px-4 py-2 text-[15px] leading-snug text-[var(--label-secondary)]">
        No chats yet. Anything you start will be kept here.
      </p>
    );
  }
  return (
    // Grouped surfaces clip overflow, so focus rings draw inside the rows
    <div className="space-y-6 [&_:focus-visible]:outline-offset-[-3px]!">
      {SESSION_GROUPS.map((group) => {
        const inGroup = sessions.filter((s) => sessionGroup(s.updatedAt) === group);
        if (inGroup.length === 0) return null;
        return (
          <GroupedSection key={group} header={group}>
            <ul>
              {inGroup.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === activeSessionId}
                  onSelect={() => onSelectSession(session.id)}
                  onRename={() => onRenameSession(session.id)}
                  onDelete={() => onDeleteSession(session.id)}
                />
              ))}
            </ul>
          </GroupedSection>
        );
      })}
    </div>
  );
}

/** Tablet and desktop source list (Premium layout). */
export const ChatSidebar = memo(function ChatSidebar({
  onNewSession,
  ...listProps
}: ChatSidebarProps) {
  return (
    <aside
      aria-label="Chats"
      className="hidden w-[300px] shrink-0 flex-col border-r border-[var(--separator)] pt-[env(safe-area-inset-top)] md:flex"
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="font-display text-[28px] font-bold leading-tight tracking-[-0.022em] text-[var(--tier-ink)]">
          Chats
        </h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onNewSession}
              aria-label="New chat"
              className="-mr-2.5 flex size-11 cursor-pointer items-center justify-center rounded-full text-[var(--tint)] transition-[background-color,opacity] duration-150 hover:bg-[var(--fill-tertiary)] active:opacity-60"
            >
              <SquarePenIcon className="size-[21px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent>New chat</TooltipContent>
        </Tooltip>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
        <SessionList {...listProps} />
      </div>
    </aside>
  );
});
