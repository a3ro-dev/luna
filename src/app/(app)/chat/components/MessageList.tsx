"use client";

import React, { memo, useRef, useEffect, useCallback, useState, useSyncExternalStore } from "react";
import type { UIMessage } from "ai";
import { AssistantMessage } from "./AssistantMessage";
import { UserMessage } from "./UserMessage";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ArrowDownIcon, RotateCcwIcon } from "lucide-react";
import { motion } from "motion/react";
import { spring } from "@/lib/motion";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import Image from "next/image";
import type { UserPlan } from "@/lib/theme/accent";
import { dayLabel, timeLabel } from "./dates";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STICK_THRESHOLD_PX = 80;

const noop = () => () => {};

const starterSuggestions = [
  "Log my period",
  "When is my next period?",
  "Show my cycle stats",
  "I’ve been having cramps",
];

const GREETING: Record<UserPlan, { title: string; body: string }> = {
  free: {
    title: "Hi, I’m Luna",
    body: "Log a date, ask about your cycle, or start a conversation.",
  },
  premium: {
    title: "I’m here with you",
    body: "Log what changed, ask about a pattern, or tell me how you’re feeling.",
  },
  "premium+": {
    title: "Take your time. I’m here.",
    body: "Start with what’s on your mind. We can look at your cycle together.",
  },
};

function lastAssistantHasContent(messages: UIMessage[]): boolean {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "assistant") return false;
  if (!Array.isArray(last.parts)) return false;
  return last.parts.some(
    (p) => p.type === "text" && typeof p.text === "string" && p.text.length > 0,
  );
}

/** The chat API answers failures with `{ error }` JSON; anything else gets a gentle default. */
function describeError(error: Error): string {
  try {
    const parsed = JSON.parse(error.message) as { error?: unknown };
    if (typeof parsed?.error === "string") return parsed.error;
  } catch {
    // not JSON
  }
  return "Luna couldn’t finish that reply. Check your connection and try again.";
}

/* ------------------------------------------------------------------ */
/*  Memoized message items                                             */
/* ------------------------------------------------------------------ */

const MessageItem = memo(function MessageItem({
  message,
  isStreaming,
}: {
  message: UIMessage;
  isStreaming: boolean;
}) {
  if (message.role === "user") {
    return <UserMessage message={message} />;
  }
  return <AssistantMessage message={message} isStreaming={isStreaming} />;
});

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

interface EmptyStateProps {
  onSuggestionClick: (text: string) => void;
  plan: UserPlan;
}

const EmptyState = memo(function EmptyState({
  onSuggestionClick,
  plan,
}: EmptyStateProps) {
  const greeting = GREETING[plan];
  // Journal-style dateline; server and browser may format it differently
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-2 py-8 text-center">
      <Image
        src="/luna.png"
        alt=""
        width={64}
        height={64}
        className="size-16 rounded-full shadow-[var(--shadow-card)]"
      />
      <p
        suppressHydrationWarning
        className="mt-5 text-[13px] font-medium text-[var(--label-secondary)]"
      >
        {today}
      </p>
      <h2 className="mt-1 max-w-sm text-balance font-serif text-[28px] leading-tight text-[var(--tier-ink)] sm:text-[34px]">
        {greeting.title}
      </h2>
      <p className="mt-2 max-w-xs text-[17px] leading-snug text-[var(--label-secondary)]">
        {greeting.body}
      </p>
      <Suggestions className="mx-auto mt-8 max-w-md px-1">
        {starterSuggestions.map((s) => (
          <Suggestion
            key={s}
            suggestion={s}
            onClick={onSuggestionClick}
            className="h-auto min-h-11 whitespace-normal border-0 bg-[var(--tier-surface)] px-4 py-2 text-[15px] font-normal text-[var(--tier-ink)] shadow-[var(--shadow-card)] transition-[background-color,scale] duration-150 hover:bg-[color-mix(in_oklch,var(--tint)_8%,var(--tier-surface))] hover:text-[var(--tier-ink)] active:scale-[0.97]"
          />
        ))}
      </Suggestions>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  MessageList — the scroll container with coalesced auto-scroll      */
/* ------------------------------------------------------------------ */

interface MessageListProps {
  plan: UserPlan;
  messages: UIMessage[];
  /** When the open chat began, for the Messages-style stamp above the thread. */
  startedAt?: string;
  isStreaming: boolean;
  isBusy: boolean;
  isLoading?: boolean;
  error?: Error;
  onRetry?: () => void;
  onSuggestionClick: (text: string) => void;
  /** Sent while Luna was replying; goes out when the reply ends. */
  queued?: UIMessage;
}

export const MessageList = memo(function MessageList({
  plan,
  messages,
  startedAt,
  isStreaming,
  isBusy,
  isLoading = false,
  error,
  onRetry,
  onSuggestionClick,
  queued,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const stickToBottomRef = useRef(true);
  const scrollRafRef = useRef<number>(0);

  /* ---- Scroll handler (coalesced, no state on every event) ---- */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      // Coalesce: use rAF so we only update once per frame
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = requestAnimationFrame(() => {
        const atBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_THRESHOLD_PX;

        stickToBottomRef.current = atBottom;
        setShowScrollButton(!atBottom);
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  /* ---- Auto-scroll when content grows or the viewport shrinks (keyboard) ---- */
  useEffect(() => {
    const contentEl = contentRef.current;
    const scrollEl = scrollRef.current;
    if (!contentEl || !scrollEl) return;

    const observer = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        scrollEl.scrollTop = scrollEl.scrollHeight;
      }
    });

    observer.observe(contentEl);
    observer.observe(scrollEl);
    return () => observer.disconnect();
  }, []);

  /* ---- Re-anchor to the bottom when a session loads or the user sends ---- */
  const firstId = messages[0]?.id;
  const last = messages[messages.length - 1];
  const pendingUserId = last?.role === "user" ? last.id : queued?.id;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || (!firstId && !pendingUserId)) return;
    stickToBottomRef.current = true;
    // Defer to next frame so content is painted
    const raf = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "instant" });
    });
    return () => cancelAnimationFrame(raf);
  }, [firstId, pendingUserId]);

  /* ---- Scroll-to-bottom button handler ---- */
  const handleScrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      stickToBottomRef.current = true;
    }
  }, []);

  const showThinking =
    messages.length > 0 && isBusy && !lastAssistantHasContent(messages);

  // The stamp follows this device's clock, so it draws once hydrated
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const started = startedAt && hydrated ? new Date(startedAt) : null;
  const stampDay = started ? dayLabel(started) : "";

  /* ---- Render ---- */
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        role="log"
        aria-label="Conversation"
        aria-busy={isBusy}
        className="h-full overflow-y-auto overscroll-contain"
      >
        <div
          ref={contentRef}
          className="mx-auto flex min-h-full max-w-2xl flex-col gap-5 px-4 py-5 md:px-6 md:py-8"
        >
          {messages.length === 0 ? (
            isLoading ? (
              <div role="status" className="flex flex-1 items-center justify-center">
                <Shimmer className="text-[15px]">Opening your chats…</Shimmer>
              </div>
            ) : (
              <EmptyState plan={plan} onSuggestionClick={onSuggestionClick} />
            )
          ) : (
            <>
              {stampDay && started && (
                <p className="-mb-1 text-center text-[12px] text-[var(--label-secondary)]">
                  <span className="font-semibold">{stampDay}</span> {timeLabel(started)}
                </p>
              )}
              {/* Only the reply being written is live; older ones stay settled */}
              {messages.map((m, i) => (
                <MessageItem
                  key={m.id}
                  message={m}
                  isStreaming={isStreaming && i === messages.length - 1}
                />
              ))}
            </>
          )}

          {showThinking && <Shimmer className="text-[15px]">Thinking…</Shimmer>}

          {queued && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex w-full justify-end opacity-70">
                <UserMessage message={queued} />
              </div>
              <p className="text-[13px] text-[var(--label-secondary)]">Sends when Luna finishes</p>
            </div>
          )}

          {error && !isBusy && (
            <div
              role="alert"
              className="grouped flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-[15px] leading-snug text-[var(--tier-ink)]">
                {describeError(error)}
              </p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-full bg-[var(--tint)] px-4 text-[15px] font-semibold text-[var(--tier-surface)] transition-transform duration-150 active:scale-[0.97] sm:self-auto"
                >
                  <RotateCcwIcon className="size-4" strokeWidth={2.25} />
                  Try again
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Screen readers hear the reply once it settles (aria-busy) plus this cue */}
      <p role="status" className="sr-only">
        {isBusy ? "Luna is replying" : ""}
      </p>

      {/* Always mounted so it fades instead of popping as the reader scrolls;
          inert keeps the hidden state out of the tab order and the a11y tree. */}
      <motion.button
        type="button"
        onClick={handleScrollToBottom}
        aria-label="Jump to latest message"
        inert={!showScrollButton}
        initial={false}
        animate={showScrollButton ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.9 }}
        whileTap={{ scale: 0.95 }}
        transition={spring.snappy}
        className={`material absolute bottom-3 left-1/2 z-20 flex size-11 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full text-[var(--tint)] shadow-[var(--shadow-card)] ${
          showScrollButton ? "" : "pointer-events-none"
        }`}
      >
        <ArrowDownIcon className="size-[18px]" strokeWidth={2.25} />
      </motion.button>
    </div>
  );
});
