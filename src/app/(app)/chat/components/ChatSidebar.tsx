"use client";

import React, { memo } from "react";
import { EllipsisIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function formatEntryDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** One chat in a list, dated like a journal entry. Shared by the rail and the mobile drawer. */
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
      className={`flex items-center gap-1 rounded-2xl transition-colors duration-150 ${
        isActive
          ? "bg-[var(--tier-tint)] text-[var(--tier-ink)]"
          : "text-[var(--tier-muted)] hover:bg-[var(--tier-tint)] hover:text-[var(--tier-ink)]"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={isActive ? "true" : undefined}
        className="flex min-h-12 min-w-0 flex-1 cursor-pointer flex-col justify-center rounded-2xl py-2 pl-3 text-left"
      >
        <span className={`truncate text-sm ${isActive ? "font-medium" : ""}`}>{title}</span>
        <span className="text-xs tabular-nums text-[var(--tier-muted)]">
          {formatEntryDate(session.updatedAt)}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Options for ${title}`}
            className="size-11 shrink-0 cursor-pointer rounded-xl text-[var(--tier-muted)] hover:bg-transparent hover:text-[var(--tier-ink)]"
          >
            <EllipsisIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onRename} className="min-h-10">
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onDelete} className="min-h-10">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
});

/** Loading, empty and filled states for a chat list. */
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
      <p role="status" className="px-3 py-2 text-sm text-[var(--tier-muted)]">
        Gathering your chats...
      </p>
    );
  }
  if (sessions.length === 0) {
    return (
      <p className="px-3 py-2 text-sm leading-relaxed text-[var(--tier-muted)]">
        No chats yet. Anything you start will be kept here.
      </p>
    );
  }
  return (
    <ul className="space-y-1">
      {sessions.map((session) => (
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
  );
}

export const ChatSidebar = memo(function ChatSidebar({
  onNewSession,
  ...listProps
}: ChatSidebarProps) {
  return (
    <aside
      aria-label="Chats"
      className="hidden w-[272px] shrink-0 flex-col gap-5 border-r border-[var(--tier-line)] bg-[var(--tier-surface)] px-4 py-6 md:flex"
    >
      <div className="flex items-center justify-between pl-3">
        <h2 className="font-serif text-2xl text-[var(--tier-ink)]">Chats</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNewSession}
              aria-label="New chat"
              className="size-10 cursor-pointer rounded-full text-[var(--tier-muted)] hover:bg-[var(--tier-tint)] hover:text-[var(--tier-ink)]"
            >
              <PlusIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New chat</TooltipContent>
        </Tooltip>
      </div>
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
        <SessionList {...listProps} />
      </div>
    </aside>
  );
});
