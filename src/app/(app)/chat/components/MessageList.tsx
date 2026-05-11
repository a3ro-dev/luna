"use client";

import React, { memo, useRef, useEffect, useCallback, useState } from "react";
import type { UIMessage } from "ai";
import { AssistantMessage } from "./AssistantMessage";
import { UserMessage } from "./UserMessage";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { ArrowDownIcon } from "lucide-react";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import Image from "next/image";

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

function lastAssistantHasContent(messages: UIMessage[]): boolean {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "assistant") return false;
  if (!Array.isArray(last.parts)) return false;
  return last.parts.some(
    (p) => p.type === "text" && typeof p.text === "string" && p.text.length > 0,
  );
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
}

const EmptyState = memo(function EmptyState({
  onSuggestionClick,
}: EmptyStateProps) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-[#FFB5C0] flex items-center justify-center">
        <Image
          src="/luna.png"
          alt="Luna"
          width={32}
          height={32}
          className="h-8 w-8 rounded-full"
        />
      </div>
      <div className="space-y-1">
        <h3 className="font-serif font-light text-lg text-[#6D5A60]">
          Hi lovely, I&apos;m Luna
        </h3>
      </div>
      <p className="text-sm font-light text-[#8E7D82] max-w-xs">
        Log your cycle, ask about symptoms, or just chat about how you&apos;re
        feeling.
      </p>
      <div className="mt-1">
        <Suggestions>
          {starterSuggestions.map((s) => (
            <Suggestion
              key={s}
              suggestion={s}
              onClick={onSuggestionClick}
              className="cursor-pointer"
            />
          ))}
        </Suggestions>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  MessageList — the scroll container with coalesced auto-scroll      */
/* ------------------------------------------------------------------ */

interface MessageListProps {
  messages: UIMessage[];
  isStreaming: boolean;
  isBusy: boolean;
  onSuggestionClick: (text: string) => void;
}

export const MessageList = memo(function MessageList({
  messages,
  isStreaming,
  isBusy,
  onSuggestionClick,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const stickToBottomRef = useRef(true);
  const scrollRafRef = useRef<number>(0);
  const lastScrollEventRef = useRef<number>(0);

  /* ---- Scroll handler (coalesced, no state on every event) ---- */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const now = performance.now();
      lastScrollEventRef.current = now;

      // Coalesce: use rAF so we only update once per frame
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = requestAnimationFrame(() => {
        const threshold = STICK_THRESHOLD_PX;
        const atBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;

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

  /* ---- Auto-scroll on content grow (ResizeObserver) ---- */
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
    return () => observer.disconnect();
  }, []);

  /* ---- Smooth scroll to bottom on initial session load ---- */
  useEffect(() => {
    if (messages.length > 0) {
      const el = scrollRef.current;
      if (el) {
        // Defer to next frame so content is painted
        requestAnimationFrame(() => {
          el.scrollTo({ top: el.scrollHeight, behavior: "instant" });
          stickToBottomRef.current = true;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Scroll-to-bottom button handler ---- */
  const handleScrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      stickToBottomRef.current = true;
    }
  }, []);

  /* ---- Render ---- */
  return (
    <div className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain">
      <div
        ref={scrollRef}
        role="log"
        className="h-full overflow-y-auto overscroll-contain"
      >
        <div
          ref={contentRef}
          className="mx-auto max-w-3xl px-4 md:px-6 py-6 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="min-h-full flex">
              <EmptyState onSuggestionClick={onSuggestionClick} />
            </div>
          ) : (
            messages.map((m) => (
              <MessageItem key={m.id} message={m} isStreaming={isStreaming} />
            ))
          )}

          {/* Streaming indicator */}
          {messages.length > 0 &&
            isBusy &&
            !lastAssistantHasContent(messages) && (
              <div>
                <div className="is-assistant group flex w-full max-w-[95%] flex-col gap-2">
                  <div className="flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm text-foreground">
                    <Shimmer>Thinking...</Shimmer>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollButton && (
        <Button
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full z-20 shadow-md"
          onClick={handleScrollToBottom}
          size="icon"
          type="button"
          variant="outline"
        >
          <ArrowDownIcon className="size-4" />
        </Button>
      )}
    </div>
  );
});
