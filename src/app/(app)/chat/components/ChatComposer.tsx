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

interface ChatComposerProps {
  onSubmit: (message: PromptInputMessage) => void;
  status: ChatStatus;
  onStop: () => void;
}

export const ChatComposer = memo(function ChatComposer({
  onSubmit,
  status,
  onStop,
}: ChatComposerProps) {
  return (
    <div className="shrink-0 border-t border-[#FFDDE0]/20 bg-white/80 backdrop-blur-sm safe-area-bottom">
      <div className="mx-auto max-w-3xl px-3 py-3 sm:px-4 sm:py-4">
        <PromptInput
          onSubmit={onSubmit}
          accept="image/*"
          multiple
          maxFiles={4}
          className="bg-[#FFF9F9] border border-[#FFDDE0]/30 rounded-2xl shadow-[0_2px_8px_rgba(255,181,192,0.06)] focus-within:ring-2 focus-within:ring-[#FFB5C0]/30 focus-within:border-[#FFB5C0]/50 transition-shadow duration-200"
        >
          <PromptInputHeader>
            <Attachments variant="inline" />
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea
              placeholder="How are you feeling today?"
              className="text-[#6D5A60] font-light placeholder:text-[#8E7D82]/40"
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
          <span className="block text-[11px] leading-relaxed text-[#8E7D82]/50">
            Luna can make mistakes. Verify important info.
          </span>
        </div>
      </div>
    </div>
  );
});
