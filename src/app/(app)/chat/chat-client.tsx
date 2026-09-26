"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ThemeProvider, createTheme } from "@openuidev/react-ui";
import { MotionConfig } from "motion/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sheet } from "@/components/apple/Sheet";
import { useResolvedTheme } from "@/lib/theme/mode";

// Extracted components
import { ChatHeader } from "./components/ChatHeader";
import { ChatSidebar, type ChatSession } from "./components/ChatSidebar";
import { MobileSidebar } from "./components/MobileSidebar";
import { MessageList } from "./components/MessageList";
import { ChatComposer } from "./components/ChatComposer";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import type { UserPlan } from "@/lib/theme/accent";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { GroupedRow, GroupedSection } from "@/components/apple/Grouped";

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

/** Roughly the chats Sheet's exit animation (tw-animate's default 150ms). */
const DRAWER_CLOSE_MS = 150;

const ink = (pct: number) => `color-mix(in oklch, var(--tier-ink) ${pct}%, transparent)`;

/**
 * OpenUI cards (forecast, stats, cycle tables) on the plan palette. The
 * variables are declared on .tier-app, so they resolve per plan and per mode.
 */
const OPENUI_THEME = createTheme({
  background: "var(--tier-bg)",
  foreground: "var(--tier-surface)",
  popoverBackground: "var(--tier-surface)",
  sunkLight: ink(2),
  sunk: ink(4),
  sunkDeep: ink(8),
  elevated: ink(8),
  highlightSubtle: ink(2),
  highlight: ink(4),
  textNeutralPrimary: "var(--tier-ink)",
  textNeutralSecondary: "var(--label-secondary)",
  textNeutralTertiary: "var(--label-tertiary)",
  textNeutralLink: "var(--tint)",
  textBrand: "var(--tint)",
  textAccentPrimary: "var(--tier-surface)",
  interactiveAccentDefault: "var(--tint)",
  interactiveAccentHover: "color-mix(in oklch, var(--tint) 85%, var(--tier-surface))",
  interactiveAccentPressed: "var(--tint)",
  borderDefault: "var(--separator)",
  borderInteractive: "var(--separator)",
  borderInteractiveEmphasis: ink(30),
  borderAccent: "color-mix(in oklch, var(--tint) 20%, transparent)",
});

function requestBody(sessionId: string | null) {
  return {
    sessionId,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

async function deleteSessionApi(sessionId: string): Promise<boolean> {
  const res = await fetch(`/api/chat/sessions/${sessionId}`, {
    method: "DELETE",
  });
  return res.ok;
}

/* ------------------------------------------------------------------ */
/*  Main Chat Page Client                                              */
/* ------------------------------------------------------------------ */

interface ChatPageClientProps {
  plan: UserPlan;
  cycleContext: { nextPeriod: string; window: string | null; status: string } | null;
}

export default function ChatPageClient({ plan, cycleContext }: ChatPageClientProps) {
  const { messages, sendMessage, status, setMessages, stop, error, regenerate, clearError } = useChat({
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
  const resolvedTheme = useResolvedTheme();

  // Track which session's messages are currently loaded
  // to prevent the "empty flash" on session switch
  const loadedSessionRef = useRef<string | null>(null);
  // The session whose messages are on screen (set with them, so the date stamp never runs ahead)
  const [shownSessionId, setShownSessionId] = useState<string | null>(null);
  const showSession = useCallback(
    (sessionId: string | null, sessionMessages: UIMessage[]) => {
      loadedSessionRef.current = sessionId;
      setShownSessionId(sessionId);
      setMessages(sessionMessages);
    },
    [setMessages],
  );

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
          showSession(firstId, initialMessages);
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
  }, [showSession]);

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
          showSession(created.id, []);
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

        sendMessage({ role: "user", parts }, { body: requestBody(sessionId) });

        // Like Notes: the chat just used moves to the top, under Today
        const usedId = sessionId;
        const now = new Date().toISOString();
        setSessions((prev) => {
          const used = prev.find((s) => s.id === usedId);
          return used
            ? [{ ...used, updatedAt: now }, ...prev.filter((s) => s.id !== usedId)]
            : prev;
        });
      } catch {
        // sendMessage errors are handled by useChat
      }
    },
    [activeSessionId, isBusy, sendMessage, showSession],
  );

  // Resends the last user message after a failed or interrupted reply
  const handleRetry = useCallback(() => {
    regenerate({ body: requestBody(activeSessionId) });
  }, [activeSessionId, regenerate]);

  /* ---------------------------------------------------------------- */
  /*  Session switching — NO empty flash                              */
  /* ---------------------------------------------------------------- */
  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      if (sessionId === activeSessionId || sessionId === loadedSessionRef.current) {
        setIsSessionsOpen(false);
        return;
      }

      setActiveSessionId(sessionId);
      setIsSessionsOpen(false);
      clearError();

      // Load new messages, then swap atomically. When the chats sheet is
      // open, hold the swap until it has closed so rendering a long
      // conversation doesn't land mid-slide.
      const [sessionMessages] = await Promise.all([
        loadSessionMessages(sessionId),
        isSessionsOpen ? new Promise((done) => setTimeout(done, DRAWER_CLOSE_MS)) : null,
      ]);
      showSession(sessionId, sessionMessages);
    },
    [activeSessionId, isSessionsOpen, showSession, clearError],
  );

  const handleNewSession = useCallback(async () => {
    const created = await createSession();
    if (!created) return;
    setSessions((prev) => [created, ...prev]);
    setActiveSessionId(created.id);
    showSession(created.id, []);
    clearError();
    setIsSessionsOpen(false);
  }, [showSession, clearError]);

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

      // Close the dialog first; loading the next chat can take a moment.
      setDeleteTarget(null);
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));

      if (activeSessionId === sessionId) {
        // Read from the rendered list: a setState updater may not have run yet here
        const nextActiveId =
          sessions.find((session) => session.id !== sessionId)?.id ?? null;
        clearError();
        if (nextActiveId) {
          setActiveSessionId(nextActiveId);
          const nextMessages = await loadSessionMessages(nextActiveId);
          showSession(nextActiveId, nextMessages);
        } else {
          setActiveSessionId(null);
          showSession(null, []);
        }
      }
    },
    [activeSessionId, sessions, showSession, clearError],
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */
  return (
    <ThemeProvider mode={resolvedTheme} lightTheme={OPENUI_THEME} cssSelector=".tier-app">
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          <div className="tier-app flex h-dvh overflow-hidden pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] font-sans selection:bg-[var(--tier-tint)] selection:text-[var(--tier-ink)]" data-plan={plan}>
            {/* Desktop sidebar */}
            {plan === "premium" && <ChatSidebar
              sessions={sessions}
              activeSessionId={activeSessionId}
              isLoading={isLoadingSessions}
              onSelectSession={handleSelectSession}
              onNewSession={handleNewSession}
              onRenameSession={handleRenameSession}
              onDeleteSession={(id) => setDeleteTarget(id)}
            />}

            {/* Main chat area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <ChatHeader onOpenSessions={() => setIsSessionsOpen(true)} showDesktopSessions={plan !== "premium"} />

              {plan === "premium+" && cycleContext && (
                <div className="shrink-0 px-3 pt-3 sm:px-4 xl:hidden">
                  <details className="group grouped mx-auto max-w-2xl text-[15px]">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
                      <span className="shrink-0 text-[var(--label-secondary)]">Next period</span>
                      <span className="min-w-0 flex-1 truncate text-right font-medium tabular-nums text-[var(--tier-ink)]">{cycleContext.nextPeriod}</span>
                      <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-[var(--label-tertiary)] transition-transform duration-200 group-open:rotate-90" />
                    </summary>
                    <div className="px-4 pb-1">
                      <p className="leading-snug text-[var(--label-secondary)]">{cycleContext.window ?? cycleContext.status}</p>
                      <Link href="/dashboard" className="inline-flex min-h-11 items-center font-medium text-[var(--tint)] active:opacity-60">See calendar</Link>
                    </div>
                  </details>
                </div>
              )}

              <MessageList
                plan={plan}
                messages={messages}
                startedAt={sessions.find((s) => s.id === shownSessionId)?.createdAt}
                isStreaming={isStreaming}
                isBusy={isBusy}
                isLoading={isLoadingSessions}
                error={error}
                onRetry={handleRetry}
                onSuggestionClick={(text) =>
                  handlePromptSubmit({ text, files: [] })
                }
              />

              <ChatComposer
                plan={plan}
                onSubmit={handlePromptSubmit}
                status={status}
                onStop={stop}
              />
            </div>

            {plan === "premium+" && cycleContext && (
              <aside className="hidden w-[300px] shrink-0 flex-col gap-3 border-l border-[var(--separator)] px-4 pt-6 xl:flex" aria-label="Cycle context">
                <h2 className="px-4 font-display text-[22px] font-bold tracking-[-0.022em] text-[var(--tier-ink)]">Your rhythm</h2>
                <GroupedSection
                  header="Next period"
                  footer="Luna’s calendar estimates are uncertain. Your logged dates stay in your dashboard."
                >
                  <GroupedRow label={cycleContext.nextPeriod} detail={cycleContext.window ?? cycleContext.status} />
                  <GroupedRow href="/dashboard" label="See calendar" tone="accent" />
                </GroupedSection>
              </aside>
            )}

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

            {/* Delete confirmation: an in-place sheet, so it keeps the plan colours */}
            <Sheet
              open={deleteTarget !== null}
              onOpenChange={(open) => !open && setDeleteTarget(null)}
              title="Delete this chat?"
              description="This chat will be deleted. You can’t undo this."
            >
              {/* Cancel comes first in the DOM so it takes focus; the column still shows Delete on top */}
              <div className="flex flex-col-reverse gap-3 [&_:focus-visible]:outline-offset-[-3px]!">
                <GroupedSection>
                  <GroupedRow
                    onClick={() => setDeleteTarget(null)}
                    label={<span className="block text-center font-semibold text-[var(--tint)]">Cancel</span>}
                  />
                </GroupedSection>
                <GroupedSection>
                  <GroupedRow
                    onClick={() => deleteTarget && handleDeleteSession(deleteTarget)}
                    label={
                      <span className="block text-center text-[color-mix(in_oklch,var(--destructive)_80%,var(--tier-ink))]">
                        Delete chat
                      </span>
                    }
                  />
                </GroupedSection>
              </div>
            </Sheet>
          </div>
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
