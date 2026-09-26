"use client";

import React, { memo } from "react";
import type { UIMessage, FileUIPart } from "ai";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
} from "@/components/ai-elements/attachments";

interface UserMessageProps {
  message: UIMessage;
}

export const UserMessage = memo(function UserMessage({
  message,
}: UserMessageProps) {
  const text = Array.isArray(message.parts)
    ? message.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("")
    : "";

  const hasFiles =
    Array.isArray(message.parts) &&
    message.parts.some((p) => p.type === "file");

  // Like Messages: photos sit above the bubble, the bubble holds only text
  return (
    <Message from="user" className="max-w-[80%] items-end gap-1 sm:max-w-[70%]">
      {hasFiles && (
        <Attachments variant="grid" aria-label="Photos">
          {message
            .parts!.filter((p) => p.type === "file")
            .map((p, i) => (
              <Attachment
                key={i}
                className="size-28 rounded-[18px]"
                data={{
                  id: `${message.id}-file-${i}`,
                  type: "file",
                  mediaType: (p as FileUIPart).mediaType,
                  url: (p as FileUIPart).url,
                  filename: (p as FileUIPart).filename,
                }}
              >
                <AttachmentPreview className="bg-[var(--fill-tertiary)]" />
              </Attachment>
            ))}
        </Attachments>
      )}
      {text && (
        // Surface-coloured text on --tint keeps >= 5:1 in every plan, light or dark
        <MessageContent className="text-[17px] leading-[22px] tracking-[-0.01em] group-[.is-user]:rounded-[1.25rem] group-[.is-user]:rounded-br-[0.375rem] group-[.is-user]:bg-[var(--tint)] group-[.is-user]:px-3.5 group-[.is-user]:py-2 group-[.is-user]:text-[var(--tier-surface)]">
          <p className="whitespace-pre-wrap break-words">{text}</p>
        </MessageContent>
      )}
    </Message>
  );
});
