"use client";

import React, { memo } from "react";
import type { ChatStatus } from "ai";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputHeader,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Attachments } from "@/components/ai-elements/attachments";
import type { UserPlan } from "@/lib/theme/accent";

interface ChatComposerProps {
  plan: UserPlan;
  onSubmit: (message: PromptInputMessage) => void;
  status: ChatStatus;
  onStop: () => void;
}

export const ChatComposer = memo(function ChatComposer({
  plan,
  onSubmit,
  status,
  onStop,
}: ChatComposerProps) {
  return (
    <div className="shrink-0 border-t border-[var(--tier-line)] bg-[var(--tier-surface)] safe-area-bottom">
      <div className="mx-auto max-w-3xl px-3 py-3 sm:px-4 sm:py-4">
        <PromptInput
          onSubmit={onSubmit}
          accept="image/*"
          multiple
          maxFiles={4}
          className="bg-[var(--tier-bg)] border border-[var(--tier-line)] rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-[var(--tier-accent)] transition-shadow duration-200"
        >
          <PromptInputHeader>
            <Attachments variant="inline" />
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea
              placeholder={plan === "free" ? "Log a date or ask Luna..." : plan === "premium" ? "How are you feeling today?" : "What’s on your mind?"}
              className="text-[var(--tier-ink)] placeholder:text-[var(--tier-muted)]"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputSubmit
                status={status}
                onStop={onStop}
                className="cursor-pointer"
              />
            </PromptInputTools>
          </PromptInputFooter>
        </PromptInput>
        <div className="mt-1.5 px-1">
          <span className="block text-xs leading-relaxed text-[var(--tier-muted)]">
            Luna can make mistakes. Verify important info.
          </span>
        </div>
      </div>
    </div>
  );
});
