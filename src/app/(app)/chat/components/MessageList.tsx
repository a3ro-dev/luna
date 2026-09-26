"use client";

import React, { memo, useRef, useEffect, useCallback, useState } from "react";
import type { UIMessage } from "ai";
import { AssistantMessage } from "./AssistantMessage";
import { UserMessage } from "./UserMessage";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ArrowDownIcon, RotateCcwIcon } from "lucide-react";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import Image from "next/image";
import type { UserPlan } from "@/lib/theme/accent";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STICK_THRESHOLD_PX = 80;

const starterSuggestions = [
  "Log my period",
  "When is my next period?",
  "Show my cycle stats",
  "I've been having cramps",
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
      <div className="flex size-14 items-center justify-center rounded-full bg-[var(--tier-tint)]">
        <Image
          src="/luna.png"
          alt=""
          width={36}
          height={36}
          className="size-9 rounded-full"
        />
      </div>
      <p
        suppressHydrationWarning
        className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--tier-muted)]"
      >
        {today}
      </p>
      <h2 className="mt-2 max-w-sm text-balance font-serif text-[2rem] leading-tight text-[var(--tier-ink)] sm:text-4xl">
        {greeting.title}
      </h2>
      <p className="mt-3 max-w-xs text-[0.95rem] leading-relaxed text-[var(--tier-muted)]">
        {greeting.body}
      </p>
      <Suggestions className="mx-auto mt-8 max-w-md px-1">
        {starterSuggestions.map((s) => (
          <Suggestion
            key={s}
            suggestion={s}
            onClick={onSuggestionClick}
            className="h-auto min-h-11 whitespace-normal border-[var(--tier-line)] py-2 bg-[var(--tier-surface)] px-4 text-sm font-normal text-[var(--tier-ink)] hover:bg-[var(--tier-tint)] hover:text-[var(--tier-ink)]"
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
  isStreaming: boolean;
  isBusy: boolean;
  isLoading?: boolean;
  error?: Error;
  onRetry?: () => void;
  onSuggestionClick: (text: string) => void;
}

export const MessageList = memo(function MessageList({
  plan,
  messages,
  isStreaming,
  isBusy,
  isLoading = false,
  error,
  onRetry,
  onSuggestionClick,
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
  const pendingUserId = last?.role === "user" ? last.id : undefined;
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
          className="mx-auto flex min-h-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8"
        >
          {messages.length === 0 ? (
            isLoading ? (
              <div role="status" className="flex flex-1 items-center justify-center">
                <Shimmer className="text-sm">Opening your chats...</Shimmer>
              </div>
            ) : (
              <EmptyState plan={plan} onSuggestionClick={onSuggestionClick} />
            )
          ) : (
            messages.map((m) => (
              <MessageItem key={m.id} message={m} isStreaming={isStreaming} />
            ))
          )}

          {showThinking && <Shimmer className="text-sm">Thinking...</Shimmer>}

          {error && !isBusy && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-2xl border border-[var(--tier-line)] bg-[var(--tier-surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm leading-relaxed text-[var(--tier-ink)]">
                {describeError(error)}
              </p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="tier-primary-action shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  <RotateCcwIcon className="size-4" />
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

      {showScrollButton && (
        <button
          type="button"
          onClick={handleScrollToBottom}
          aria-label="Jump to latest message"
          className="absolute bottom-3 left-1/2 z-20 flex size-11 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-[var(--tier-line)] bg-[var(--tier-surface)] text-[var(--tier-ink)] shadow-[0_8px_24px_-10px_oklch(0.4_0.04_355/0.35)] transition-colors duration-150 hover:bg-[var(--tier-tint)]"
        >
          <ArrowDownIcon className="size-4" />
        </button>
      )}
    </div>
  );
});
