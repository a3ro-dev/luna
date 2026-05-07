"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ThemeProvider } from "@openuidev/react-ui";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Extracted components
import { ChatHeader } from "./components/ChatHeader";
import { ChatSidebar, type ChatSession } from "./components/ChatSidebar";
import { MobileSidebar } from "./components/MobileSidebar";
import { MessageList } from "./components/MessageList";
import { ChatComposer } from "./components/ChatComposer";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

/* ------------------------------------------------------------------ */
/*  Session API helpers (module-level — no recreation on render)       */
/* ------------------------------------------------------------------ */

async function loadSessions(): Promise<ChatSession[]> {
  const res = await fetch("/api/chat/sessions");
  if (!res.ok) return [];
  return (await res.json()) as ChatSession[];
}

async function loadSessionMessages(sessionId: string): Promise<UIMessage[]> {
  const res = await fetch(`/api/chat/sessions/${sessionId}/messages`);
  if (!res.ok) return [];
  return await res.json();
}

async function createSession(): Promise<ChatSession | null> {
  const res = await fetch("/api/chat/sessions", { method: "POST" });
  if (!res.ok) return null;
  return (await res.json()) as ChatSession;
}

async function renameSession(sessionId: string): Promise<ChatSession | null> {
  const res = await fetch(`/api/chat/sessions/${sessionId}/rename`, {
    method: "POST",
  });
  if (!res.ok) return null;
  return (await res.json()) as ChatSession;
}

async function deleteSessionApi(sessionId: string): Promise<boolean> {
  const res = await fetch(`/api/chat/sessions/${sessionId}`, {
    method: "DELETE",
  });
  return res.ok;
}

/* ------------------------------------------------------------------ */
/*  Main Chat Page                                                     */
/* ------------------------------------------------------------------ */

export default function ChatPage() {
  const { messages, sendMessage, status, setMessages, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isBusy = status === "streaming" || status === "submitted";
  const isStreaming = status === "streaming";

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const hasRequestedRename = useRef<Set<string>>(new Set());
  const prevStatusRef = useRef(status);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Track which session's messages are currently loaded
  // to prevent the "empty flash" on session switch
  const loadedSessionRef = useRef<string | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Auto-rename (only depends on status + activeSessionId)          */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const wasBusy =
      prevStatusRef.current === "streaming" ||
      prevStatusRef.current === "submitted";
    prevStatusRef.current = status;

    if (wasBusy && !isBusy && activeSessionId) {
      if (hasRequestedRename.current.has(activeSessionId)) return;
      // Find the session without depending on sessions array
      setSessions((current) => {
        const session = current.find((s) => s.id === activeSessionId);
        if (session && !session.title) {
          hasRequestedRename.current.add(activeSessionId);
          renameSession(activeSessionId).then((updated) => {
            if (updated) {
              setSessions((prev) =>
                prev.map((s) => (s.id === updated.id ? updated : s)),
              );
            }
          });
        }
        return current;
      });
    }
  }, [status, isBusy, activeSessionId]);

  /* ---------------------------------------------------------------- */
  /*  Bootstrap (with cleanup)                                        */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const bootstrap = async () => {
      setIsLoadingSessions(true);
      try {
        const loadedSessions = await loadSessions();
        if (cancelled) return;

        let nextSessions = loadedSessions;
        if (loadedSessions.length === 0) {
          const created = await createSession();
          if (cancelled) return;
          nextSessions = created ? [created] : [];
        }

        setSessions(nextSessions);
        if (nextSessions.length > 0) {
          const firstId = nextSessions[0].id;
          setActiveSessionId(firstId);
          loadedSessionRef.current = firstId;

          const initialMessages = await loadSessionMessages(firstId);
          if (cancelled) return;
          setMessages(initialMessages);
        }
      } finally {
        if (!cancelled) setIsLoadingSessions(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [setMessages]);

  /* ---------------------------------------------------------------- */
  /*  Prompt submit (stable callback)                                 */
  /* ---------------------------------------------------------------- */
  const handlePromptSubmit = useCallback(
    async ({ text, files }: PromptInputMessage) => {
      if (isBusy) return;
      if (text.trim().length === 0 && files.length === 0) return;

      try {
        let sessionId = activeSessionId;
        if (!sessionId) {
          const created = await createSession();
          if (!created) return;
          setSessions((prev) => [created, ...prev]);
          setActiveSessionId(created.id);
          loadedSessionRef.current = created.id;
          setMessages([]);
          sessionId = created.id;
        }

        const parts: UIMessage["parts"] = [
          ...files.map((f) => ({
            type: "file" as const,
            mediaType: f.mediaType,
            url: f.url,
            filename: f.filename,
          })),
          ...(text.trim().length > 0
            ? [{ type: "text" as const, text: text.trim() }]
            : []),
        ];

        sendMessage(
          { role: "user", parts },
          {
            body: {
              sessionId,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          },
        );
      } catch {
        // sendMessage errors are handled by useChat
      }
    },
    [activeSessionId, isBusy, sendMessage, setMessages],
  );

  /* ---------------------------------------------------------------- */
  /*  Session switching — NO empty flash                              */
  /* ---------------------------------------------------------------- */
  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      if (sessionId === activeSessionId) return;
      if (sessionId === loadedSessionRef.current) return;

      setActiveSessionId(sessionId);
      setIsSessionsOpen(false);

      // Load new messages, then swap atomically
      const sessionMessages = await loadSessionMessages(sessionId);
      loadedSessionRef.current = sessionId;
      setMessages(sessionMessages);
    },
    [activeSessionId, setMessages],
  );

  const handleNewSession = useCallback(async () => {
    const created = await createSession();
    if (!created) return;
    setSessions((prev) => [created, ...prev]);
    setActiveSessionId(created.id);
    loadedSessionRef.current = created.id;
    setMessages([]);
    setIsSessionsOpen(false);
  }, [setMessages]);

  const handleRenameSession = useCallback(async (sessionId: string) => {
    const updated = await renameSession(sessionId);
    if (!updated) return;
    setSessions((prev) =>
      prev.map((session) => (session.id === updated.id ? updated : session)),
    );
  }, []);

  const deletingRef = useRef<Set<string>>(new Set());

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      // Prevent double-delete race
      if (deletingRef.current.has(sessionId)) return;
      deletingRef.current.add(sessionId);

      const ok = await deleteSessionApi(sessionId);
      deletingRef.current.delete(sessionId);
      if (!ok) return;

      let nextActiveId: string | null = null;
      setSessions((prev) => {
        const remaining = prev.filter((session) => session.id !== sessionId);
        if (activeSessionId === sessionId) {
          nextActiveId = remaining[0]?.id ?? null;
        }
        return remaining;
      });

      if (activeSessionId === sessionId) {
        if (nextActiveId) {
          setActiveSessionId(nextActiveId);
          const nextMessages = await loadSessionMessages(nextActiveId);
          loadedSessionRef.current = nextActiveId;
          setMessages(nextMessages);
        } else {
          setActiveSessionId(null);
          loadedSessionRef.current = null;
          setMessages([]);
        }
      }
      setDeleteTarget(null);
    },
    [activeSessionId, setMessages],
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */
  return (
    <ThemeProvider>
      <TooltipProvider>
        <div className="h-dvh overflow-hidden bg-[#FFF9F9] flex font-sans selection:bg-[#FFDDE0] selection:text-[#6D5A60]">
          {/* Desktop sidebar */}
          <ChatSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            isLoading={isLoadingSessions}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onRenameSession={handleRenameSession}
            onDeleteSession={(id) => setDeleteTarget(id)}
          />

          {/* Main chat area */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <ChatHeader onOpenSessions={() => setIsSessionsOpen(true)} />

            <MessageList
              messages={messages}
              isStreaming={isStreaming}
              isBusy={isBusy}
              onSuggestionClick={(text) =>
                handlePromptSubmit({ text, files: [] })
              }
            />

            <ChatComposer
              onSubmit={handlePromptSubmit}
              status={status}
              onStop={stop}
            />
          </div>

          {/* Mobile sidebar overlay */}
          <MobileSidebar
            open={isSessionsOpen}
            onClose={() => setIsSessionsOpen(false)}
            sessions={sessions}
            activeSessionId={activeSessionId}
            isLoading={isLoadingSessions}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onRenameSession={handleRenameSession}
            onDeleteSession={(id) => setDeleteTarget(id)}
          />

          {/* Delete confirmation dialog */}
          <Dialog
            open={deleteTarget !== null}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete chat?</DialogTitle>
                <DialogDescription>
                  This cannot be undone. All messages in this chat will be
                  permanently deleted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" className="rounded-full">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  className="rounded-full"
                  onClick={() =>
                    deleteTarget && handleDeleteSession(deleteTarget)
                  }
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}
