"use client";

import React, { memo, useCallback, useState } from "react";
import type { ChatStatus } from "ai";
import { ImagePlusIcon } from "lucide-react";
import {
  PromptInput,
  PromptInputButton,
  PromptInputTextarea,
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
  free: "Log a date or ask Luna…",
  premium: "How are you feeling today?",
  "premium+": "What’s on your mind?",
};

interface ChatComposerProps {
  plan: UserPlan;
  /** False keeps the text and photos in the box. */
  onSubmit: (message: PromptInputMessage) => boolean;
  status: ChatStatus;
  onStop: () => void;
  /** A calm line from the page, e.g. a chat that couldn't be deleted. */
  notice?: string;
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
            className="h-11 cursor-default gap-2 rounded-[12px] border-0 bg-[var(--fill-tertiary)] pl-1.5 pr-0 text-[var(--tier-ink)] hover:bg-[var(--fill-tertiary)] hover:text-[var(--tier-ink)] dark:hover:bg-[var(--fill-tertiary)]"
          >
            <AttachmentPreview className="size-8 rounded-[8px]" />
            <AttachmentInfo className="max-w-[7rem] text-[13px] font-normal" />
            <AttachmentRemove
              label="Remove photo"
              variant={null}
              className="size-11 rounded-full text-[var(--label-secondary)] opacity-100 hover:bg-transparent hover:text-[var(--tier-ink)] [&>svg]:size-3.5"
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
      variant={null}
      onClick={openFileDialog}
      className="size-11 shrink-0 rounded-full text-[var(--label-secondary)] hover:bg-transparent hover:text-[var(--tier-ink)] active:opacity-60"
    >
      <ImagePlusIcon className="size-[21px]" strokeWidth={1.8} />
    </PromptInputButton>
  );
}

/**
 * While Luna replies the button is Stop; once there is something to send it
 * turns back into Send, and what's sent waits for the reply to finish.
 */
function SendButton({ status, hasText, onStop }: { status: ChatStatus; hasText: boolean; onStop: () => void }) {
  const { files } = usePromptInputAttachments();
  const busy = status === "submitted" || status === "streaming";
  const hasDraft = hasText || files.length > 0;
  return (
    <PromptInputSubmit
      status={hasDraft ? "ready" : status}
      onStop={onStop}
      aria-label={busy ? (hasDraft ? "Send when Luna finishes" : "Stop reply") : "Send message"}
      className="relative isolate size-11 shrink-0 cursor-pointer rounded-full bg-transparent text-[var(--tier-surface)] hover:bg-transparent before:absolute before:inset-[6px] before:-z-10 before:rounded-full before:bg-[var(--tint)] before:transition-transform before:duration-150 active:before:scale-90 [&_svg]:stroke-[2.5]"
    />
  );
}

export const ChatComposer = memo(function ChatComposer({
  plan,
  onSubmit,
  status,
  onStop,
  notice: pageNotice,
}: ChatComposerProps) {
  const [notice, setNotice] = useState("");
  const [hasText, setHasText] = useState(false);

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
    // Pinned above the keyboard: page.tsx opts into interactive-widget=resizes-content (Android Chrome; iOS Safari ignores it)
    // Solid, not material: messages scroll above the bar, never under it
    <div className="hairline-t relative z-20 shrink-0 bg-[var(--tier-surface)] px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
      <div className="mx-auto max-w-2xl">
        <PromptInput
          onSubmit={handleSubmit}
          accept="image/*"
          multiple
          maxFiles={4}
          maxFileSize={MAX_IMAGE_BYTES}
          onError={handleFileError}
          onInput={(event) => {
            const { target } = event;
            if (target instanceof HTMLTextAreaElement) setHasText(target.value.trim().length > 0);
          }}
          onReset={() => setHasText(false)}
          className="rounded-[1.375rem] bg-[var(--tier-surface)] shadow-[inset_0_0_0_1px_var(--separator)] transition-shadow duration-200 focus-within:shadow-[inset_0_0_0_1.5px_var(--tint)]"
        >
          <PendingAttachments />
          {/* One row like Messages: photo button, growing field, round send */}
          <div className="flex w-full items-end">
            <AttachButton />
            <PromptInputTextarea
              aria-label="Message Luna"
              enterKeyHint="send"
              placeholder={PLACEHOLDERS[plan]}
              className="max-h-40 min-h-11 px-1 py-[11px] text-[17px] leading-[22px] tracking-[-0.01em] text-[var(--tier-ink)] placeholder:text-[var(--label-tertiary)] focus-visible:outline-none! md:text-[17px]"
            />
            <SendButton status={status} hasText={hasText} onStop={onStop} />
          </div>
        </PromptInput>
        <p role="status" className="px-3 pt-1.5 text-[13px] text-[var(--tier-ink)] empty:pt-0">
          {notice || pageNotice}
        </p>
        <p className="px-3 pt-1 text-center text-[12px] leading-snug text-[var(--label-secondary)]">
          Luna can get things wrong. Check anything important.
        </p>
      </div>
    </div>
  );
});
