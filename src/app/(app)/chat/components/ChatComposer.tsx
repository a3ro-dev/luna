"use client";

import React, { memo, useCallback, useState } from "react";
import type { ChatStatus } from "ai";
import { ImagePlusIcon } from "lucide-react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputHeader,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  Attachments,
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
} from "@/components/ai-elements/attachments";
import type { UserPlan } from "@/lib/theme/accent";

// Matches the server cap in src/lib/chat/images.ts; larger photos are dropped there silently
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const PLACEHOLDERS: Record<UserPlan, string> = {
  free: "Log a date or ask Luna...",
  premium: "How are you feeling today?",
  "premium+": "What’s on your mind?",
};

interface ChatComposerProps {
  plan: UserPlan;
  onSubmit: (message: PromptInputMessage) => void;
  status: ChatStatus;
  onStop: () => void;
}

/** Selected photos, shown above the text so they can be removed before sending. */
function PendingAttachments() {
  const { files, remove } = usePromptInputAttachments();
  if (files.length === 0) return null;

  return (
    <PromptInputHeader className="px-2 pt-2 pb-0">
      <Attachments variant="inline" aria-label="Photos to send">
        {files.map((file) => (
          <Attachment
            key={file.id}
            data={file}
            onRemove={() => remove(file.id)}
            className="h-11 cursor-default gap-2 rounded-xl border-[var(--tier-line)] bg-[var(--tier-bg)] pl-1.5 pr-0 text-[var(--tier-ink)] hover:bg-[var(--tier-bg)] hover:text-[var(--tier-ink)]"
          >
            <AttachmentPreview className="size-8 rounded-lg" />
            <AttachmentInfo className="max-w-[7rem] text-xs" />
            <AttachmentRemove
              label="Remove photo"
              className="size-11 rounded-xl opacity-100 [&>svg]:size-3.5"
            />
          </Attachment>
        ))}
      </Attachments>
    </PromptInputHeader>
  );
}

function AttachButton() {
  const { openFileDialog } = usePromptInputAttachments();
  return (
    <PromptInputButton
      aria-label="Add a photo"
      onClick={openFileDialog}
      className="size-11 rounded-full text-[var(--tier-muted)] hover:bg-[var(--tier-tint)] hover:text-[var(--tier-ink)] md:size-9"
    >
      <ImagePlusIcon className="size-[1.125rem]" />
    </PromptInputButton>
  );
}

export const ChatComposer = memo(function ChatComposer({
  plan,
  onSubmit,
  status,
  onStop,
}: ChatComposerProps) {
  const [notice, setNotice] = useState("");

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      setNotice("");
      return onSubmit(message);
    },
    [onSubmit],
  );

  const handleFileError = useCallback(
    ({ code }: { code: "max_files" | "max_file_size" | "accept" }) => {
      setNotice(
        code === "max_files"
          ? "You can add up to 4 photos at a time."
          : code === "max_file_size"
            ? "That photo is over 10 MB. Try a smaller one."
            : "Luna can only read photos.",
      );
    },
    [],
  );

  return (
    <div className="shrink-0 border-t border-[var(--tier-line)] bg-[var(--tier-bg)] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
      <div className="mx-auto max-w-2xl">
        <PromptInput
          onSubmit={handleSubmit}
          accept="image/*"
          multiple
          maxFiles={4}
          maxFileSize={MAX_IMAGE_BYTES}
          onError={handleFileError}
          className="rounded-[1.5rem] border border-[var(--tier-line)] bg-[var(--tier-surface)] shadow-[0_10px_30px_-18px_oklch(0.4_0.04_355/0.35)] transition-shadow duration-200 focus-within:border-[var(--tier-accent)] focus-within:ring-2 focus-within:ring-[var(--tier-accent)]"
        >
          <PendingAttachments />
          <PromptInputBody>
            <PromptInputTextarea
              aria-label="Message Luna"
              enterKeyHint="send"
              placeholder={PLACEHOLDERS[plan]}
              className="max-h-40 min-h-12 px-4 pt-3.5 pb-1 text-base leading-relaxed text-[var(--tier-ink)] placeholder:text-[var(--tier-muted)] focus-visible:outline-none! md:text-[0.95rem]"
            />
          </PromptInputBody>
          <PromptInputFooter className="px-2 pb-2">
            <PromptInputTools>
              <AttachButton />
            </PromptInputTools>
            <PromptInputSubmit
              status={status}
              onStop={onStop}
              className="size-11 cursor-pointer rounded-full bg-[var(--tier-ink)] text-[var(--tier-surface)] hover:bg-[var(--tier-muted)] md:size-9"
            />
          </PromptInputFooter>
        </PromptInput>
        <p role="status" className="px-2 pt-1.5 text-xs text-[var(--tier-ink)] empty:pt-0">
          {notice}
        </p>
        <p className="px-2 pt-1.5 text-center text-xs leading-relaxed text-[var(--tier-muted)]">
          Luna can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
});
