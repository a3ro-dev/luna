"use client";

import React, { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

const SessionItem = memo(function SessionItem({
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
  return (
    <div
      className={`group flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150 cursor-pointer ${
        isActive
          ? "bg-[#FFEEF1] text-[#6D5A60]"
          : "text-[#8E7D82] hover:bg-[#FFF5F7]"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 text-left truncate font-light cursor-pointer"
      >
        {session.title || "Untitled chat"}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-[#8E7D82] hover:text-[#6D5A60] cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

export const ChatSidebar = memo(function ChatSidebar({
  sessions,
  activeSessionId,
  isLoading,
  onSelectSession,
  onNewSession,
  onRenameSession,
  onDeleteSession,
}: ChatSidebarProps) {
  return (
    <aside className="w-[260px] shrink-0 border-r border-[#FFDDE0]/40 bg-white/80 px-4 py-6 hidden md:flex md:flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-base text-[#6D5A60]">Chats</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onNewSession}
              className="text-[#8E7D82] hover:text-[#6D5A60] cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New chat</TooltipContent>
        </Tooltip>
      </div>
      <Separator className="bg-[#FFDDE0]/40" />
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-1 pr-2">
          {isLoading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Loading...
            </div>
          )}
          {!isLoading && sessions.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No chats yet
            </div>
          )}
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
        </div>
      </div>
    </aside>
  );
});
