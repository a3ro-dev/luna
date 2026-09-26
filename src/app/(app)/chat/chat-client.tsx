"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Chat, useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  type ChatOnFinishCallback,
  type ChatStatus,
  type FileUIPart,
  type UIMessage,
} from "ai";
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

/** Roughly the chats Sheet's exit animation (tw-animate's default 150ms). */
const DRAWER_CLOSE_MS = 150;
/** After a stop or a dropped reply: by then the server has saved its copy. */
const RESYNC_AFTER_MS = 1500;
/** A pointer resting on a chat this long starts loading it. */
const PREFETCH_DELAY_MS = 120;

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

/* ------------------------------------------------------------------ */
/*  Chats                                                              */
/* ------------------------------------------------------------------ */

/** crypto.randomUUID needs a secure context, which a phone on the LAN dev server isn't. */
function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16),
  );
}

// Only the newest message goes up: the server already has the rest (and the
// photos). Reconnects use the default GET /api/chat/{id}/stream.
const transport = new DefaultChatTransport<UIMessage>({
  api: "/api/chat",
  prepareSendMessagesRequest: ({ id, messages, trigger }) => ({
    body: {
      id,
      message: messages.at(-1),
      trigger,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  }),
});

type FinishInfo = Parameters<ChatOnFinishCallback<UIMessage>>[0];
/** What was sent while Luna was still replying. */
type Draft = { text: string; files: FileUIPart[] };

const isBusy = (status: ChatStatus) => status === "submitted" || status === "streaming";
const toParts = ({ text, files }: Draft): UIMessage["parts"] => [
  ...files,
  ...(text ? [{ type: "text" as const, text }] : []),
];

/**
 * One Chat per conversation opened on this page. A reply streams into the
 * Chat it was asked in, whichever chat is on screen, and going back to a chat
 * shows it as it is now, without a round trip.
 */
class ChatCache {
  private chats = new Map<string, Chat<UIMessage>>();
  private resuming = new Set<string>();
  private onFinish: (id: string, info: FinishInfo) => void = () => {};

  /** Where every Chat reports a finished reply, on screen or not. */
  setFinishHandler(onFinish: (id: string, info: FinishInfo) => void) {
    this.onFinish = onFinish;
  }

  get(id: string) {
    return this.chats.get(id);
  }

  open(id: string, messages: UIMessage[] = []) {
    let chat = this.chats.get(id);
    if (!chat) {
      chat = new Chat<UIMessage>({
        id,
        messages,
        transport,
        generateId: uuid,
        onFinish: (info) => this.onFinish(id, info),
      });
      this.chats.set(id, chat);
    }
    return chat;
  }

  delete(id: string) {
    this.chats.delete(id);
  }

  isResuming(id: string) {
    return this.resuming.has(id);
  }

  /** Picks up a reply the server is still writing (after a reload or a dropped connection). */
  async resume(id: string) {
    const chat = this.chats.get(id);
    if (!chat || this.resuming.has(id) || isBusy(chat.status)) return;
    this.resuming.add(id);
    try {
      await chat.resumeStream();
    } finally {
      this.resuming.delete(id);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Main Chat Page Client                                              */
/* ------------------------------------------------------------------ */

interface ChatPageClientProps {
  plan: UserPlan;
  cycleContext: { nextPeriod: string; window: string | null; status: string } | null;
  /** Newest first, loaded with the page. */
  initialSessions: ChatSession[];
  /** The newest chat's messages (none when there are no chats yet). */
  initialMessages: UIMessage[];
}

export default function ChatPageClient({
  plan,
  cycleContext,
  initialSessions,
  initialMessages,
}: ChatPageClientProps) {
  const [cache] = useState(() => new ChatCache());
  // The newest chat, or a fresh one that gets a database row with its first message
  const [active, setActive] = useState(() => {
    const id = initialSessions[0]?.id ?? uuid();
    return { id, chat: cache.open(id, initialSessions[0] ? initialMessages : []) };
  });
  const { messages, status, error } = useChat({ chat: active.chat, experimental_throttle: 50 });
  const busy = isBusy(status);

  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const sessionsRef = useRef(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  const [queued, setQueued] = useState<Record<string, Draft>>({});
  const queueRef = useRef(queued);
  const [notice, setNotice] = useState("");
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const hasRequestedRename = useRef<Set<string>>(new Set());
  const prefetchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const resolvedTheme = useResolvedTheme();

  const setQueue = useCallback((id: string, draft?: Draft) => {
    const next = { ...queueRef.current };
    if (draft) next[id] = draft;
    else delete next[id];
    queueRef.current = next;
    setQueued(next);
  }, []);

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    setTimeout(() => setNotice((current) => (current === text ? "" : current)), 6000);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Server sync                                                     */
  /* ---------------------------------------------------------------- */

  /** Refreshes a chat from the server. False when the server couldn't be reached. */
  const resync = useCallback(
    async (id: string) => {
      let saved: UIMessage[];
      try {
        const res = await fetch(`/api/chat/sessions/${id}/messages`);
        // 404: nothing saved for this chat yet, so what's on screen stands
        if (!res.ok) return res.status === 404;
        saved = (await res.json()) as UIMessage[];
      } catch {
        return false;
      }
      const chat = cache.get(id);
      if (!chat) return true;
      // The server's copy wins; what it hasn't saved yet (a reply still
      // being written, a send that failed) stays after it
      const savedIds = new Set(saved.map((m) => m.id));
      const next = [...saved, ...chat.messages.filter((m) => !savedIds.has(m.id))];
      if (JSON.stringify(next) !== JSON.stringify(chat.messages)) chat.messages = next;
      // The reply was saved after all: the connection dropped, not Luna
      const last = next.at(-1);
      if (chat.status === "error" && last?.role === "assistant" && savedIds.has(last.id)) {
        chat.clearError();
      }
      return true;
    },
    [cache],
  );

  /** First open of a chat this page hasn't seen: its Chat exists at once, the history follows. */
  const load = useCallback(
    (id: string) => {
      if (cache.get(id)) return;
      cache.open(id);
      setLoadingIds((ids) => [...ids, id]);
      void resync(id).then((ok) => {
        setLoadingIds((ids) => ids.filter((x) => x !== id));
        const chat = cache.get(id);
        // Unreachable: forget it so the next open tries again
        if (!ok && chat && chat.messages.length === 0 && !isBusy(chat.status)) {
          cache.delete(id);
          showNotice("Couldn’t open that chat. Check your connection and try again.");
        }
      });
    },
    [cache, resync, showNotice],
  );

  const renameSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/rename`, { method: "POST" });
      if (!res.ok) return;
      const { title } = (await res.json()) as ChatSession;
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title } : s)));
    } catch {
      // The chat keeps its current title
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Sending                                                         */
  /* ---------------------------------------------------------------- */

  const send = useCallback((id: string, chat: Chat<UIMessage>, draft: Draft) => {
    void chat.sendMessage({ role: "user", parts: toParts(draft) });
    // Like Notes: the chat just used moves to the top, under Today. A new
    // chat joins the list here, with its first message.
    const now = new Date().toISOString();
    setSessions((prev) => {
      const used = prev.find((s) => s.id === id) ?? { id, title: null, createdAt: now, updatedAt: now };
      return [{ ...used, updatedAt: now }, ...prev.filter((s) => s.id !== id)];
    });
  }, []);

  const stopReply = useCallback((id: string, chat: Chat<UIMessage>) => {
    void chat.stop();
    // The server keeps writing after the page lets go; this is what stops it
    void fetch(`/api/chat/${id}/stop`, { method: "POST", keepalive: true }).catch(() => {});
  }, []);

  const handleFinish = useCallback(
    async (id: string, { message, isAbort, isError }: FinishInfo) => {
      const chat = cache.get(id);
      if (!chat) return;
      const wasResume = cache.isResuming(id);
      // Called inside the SDK's request; let it wrap up before starting another
      await new Promise((done) => setTimeout(done, 0));

      if (isError && !wasResume) {
        // A dropped connection (phone locked, network blip) doesn't stop Luna
        // on the server: pick the reply back up. It replays from the start,
        // so the partial copy steps aside unless there is nothing to replay.
        const partial = chat.lastMessage?.id === message.id ? chat.lastMessage : undefined;
        if (partial) chat.messages = chat.messages.slice(0, -1);
        await cache.resume(id);
        if (partial && !chat.messages.some((m) => m.id === partial.id)) {
          chat.messages = [...chat.messages, partial];
        }
      }
      if (isBusy(chat.status)) return;

      const draft = queueRef.current[id];
      if (draft) {
        setQueue(id);
        send(id, chat, draft);
      }
      if (isAbort || isError || wasResume) {
        setTimeout(() => void resync(id), RESYNC_AFTER_MS);
      } else if (!hasRequestedRename.current.has(id)) {
        const session = sessionsRef.current.find((s) => s.id === id);
        if (session && !session.title) {
          hasRequestedRename.current.add(id);
          void renameSession(id);
        }
      }
    },
    [cache, resync, renameSession, send, setQueue],
  );
  useEffect(() => {
    cache.setFinishHandler(handleFinish);
  }, [cache, handleFinish]);

  // A reply may still be streaming from before a reload
  const firstId = initialSessions[0]?.id;
  useEffect(() => {
    if (firstId) void cache.resume(firstId);
  }, [cache, firstId]);

  const handlePromptSubmit = useCallback(
    ({ text, files }: PromptInputMessage): boolean => {
      const draft = { text: text.trim(), files };
      if (!draft.text && draft.files.length === 0) return false;
      setNotice("");
      const { id, chat } = active;
      if (isBusy(chat.status)) {
        // Sent while Luna replies: it waits, then goes out as one message
        const waiting = queueRef.current[id];
        setQueue(
          id,
          waiting
            ? {
                text: [waiting.text, draft.text].filter(Boolean).join("\n\n"),
                files: [...waiting.files, ...draft.files],
              }
            : draft,
        );
      } else {
        send(id, chat, draft);
      }
      return true;
    },
    [active, send, setQueue],
  );

  // Resends the last user message after a failed or interrupted reply
  const handleRetry = useCallback(() => {
    void active.chat.regenerate();
  }, [active]);

  const handleStop = useCallback(() => stopReply(active.id, active.chat), [active, stopReply]);

  /* ---------------------------------------------------------------- */
  /*  Switch, new, delete: instant on screen, the server catches up   */
  /* ---------------------------------------------------------------- */

  /** Loads a chat's history, or refreshes it in the background when it's already here. */
  const prepare = useCallback(
    (id: string) => {
      if (!cache.get(id)) load(id);
      else if (!loadingIds.includes(id)) void resync(id);
    },
    [cache, load, loadingIds, resync],
  );

  const show = useCallback(
    (id: string) => {
      prepare(id);
      setActive({ id, chat: cache.open(id) });
    },
    [cache, prepare],
  );

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      setIsSessionsOpen(false);
      if (sessionId === active.id) return;
      if (!isSessionsOpen) return show(sessionId);
      // From the chats sheet: load now, swap once the sheet has closed so
      // rendering a long conversation doesn't land mid-slide
      prepare(sessionId);
      setTimeout(() => setActive({ id: sessionId, chat: cache.open(sessionId) }), DRAWER_CLOSE_MS);
    },
    [active.id, cache, isSessionsOpen, prepare, show],
  );

  const handlePrefetchSession = useCallback(
    (sessionId: string) => {
      clearTimeout(prefetchTimer.current);
      prefetchTimer.current = setTimeout(() => load(sessionId), PREFETCH_DELAY_MS);
    },
    [load],
  );

  const handleNewSession = useCallback(() => {
    setIsSessionsOpen(false);
    // Already on a blank new chat
    if (active.chat.messages.length === 0 && !sessions.some((s) => s.id === active.id)) return;
    const id = uuid();
    setActive({ id, chat: cache.open(id) });
  }, [active, cache, sessions]);

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      setDeleteTarget(null);
      const index = sessions.findIndex((s) => s.id === sessionId);
      const removed = sessions[index];
      if (!removed) return;

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      const chat = cache.get(sessionId);
      if (chat && isBusy(chat.status)) stopReply(sessionId, chat);
      if (active.id === sessionId) {
        // Like Notes: the next chat down opens, or a new one when none is left
        const next = sessions[index + 1] ?? sessions[index - 1];
        if (next) {
          show(next.id);
        } else {
          const id = uuid();
          setActive({ id, chat: cache.open(id) });
        }
      }

      void fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" })
        .then((res) => {
          if (!res.ok && res.status !== 404) throw new Error(`Delete failed: ${res.status}`);
          cache.delete(sessionId);
          setQueue(sessionId);
        })
        .catch(() => {
          setSessions((prev) =>
            prev.some((s) => s.id === sessionId)
              ? prev
              : [...prev, removed].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
          );
          showNotice("Couldn’t delete that chat. It’s back in your list.");
        });
    },
    [active.id, cache, sessions, setQueue, show, showNotice, stopReply],
  );

  const waiting = queued[active.id];
  const queuedMessage = useMemo<UIMessage | undefined>(
    () => (waiting ? { id: "queued", role: "user", parts: toParts(waiting) } : undefined),
    [waiting],
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
              activeSessionId={active.id}
              onSelectSession={handleSelectSession}
              onPrefetchSession={handlePrefetchSession}
              onNewSession={handleNewSession}
              onRenameSession={renameSession}
              onDeleteSession={setDeleteTarget}
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
                startedAt={sessions.find((s) => s.id === active.id)?.createdAt}
                isStreaming={status === "streaming"}
                isBusy={busy}
                isLoading={loadingIds.includes(active.id)}
                error={error}
                onRetry={handleRetry}
                onSuggestionClick={(text) => handlePromptSubmit({ text, files: [] })}
                queued={queuedMessage}
              />

              <ChatComposer
                plan={plan}
                onSubmit={handlePromptSubmit}
                status={status}
                onStop={handleStop}
                notice={notice}
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
              activeSessionId={active.id}
              onSelectSession={handleSelectSession}
              onPrefetchSession={handlePrefetchSession}
              onNewSession={handleNewSession}
              onRenameSession={renameSession}
              onDeleteSession={setDeleteTarget}
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
