"use client";

import React, { memo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatSession } from "./ChatSidebar";

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

const MobileSessionItem = memo(function MobileSessionItem({
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

export const MobileSidebar = memo(function MobileSidebar({
  open,
  onClose,
  sessions,
  activeSessionId,
  isLoading,
  onSelectSession,
  onNewSession,
  onRenameSession,
  onDeleteSession,
}: MobileSidebarProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        aria-label="Close chat list"
      />

      {/* Panel — CSS transition instead of Framer Motion for performance */}
      <div
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-[78%] max-w-[320px] bg-white/95 border-l border-[#FFDDE0]/40 px-4 py-6 flex flex-col gap-4 animate-slide-in-right"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-base text-[#6D5A60]">Chats</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewSession}
            className="text-xs text-[#8E7D82] hover:text-[#6D5A60] cursor-pointer"
          >
            New
          </Button>
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
              <MobileSessionItem
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
      </div>
    </div>
  );
});
