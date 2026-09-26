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

  return (
    <Message from="user" className="max-w-[85%] sm:max-w-[75%]">
      <MessageContent className="group-[.is-user]:rounded-[1.25rem] group-[.is-user]:rounded-br-md group-[.is-user]:bg-[var(--tier-tint)] group-[.is-user]:px-4 group-[.is-user]:py-2.5 group-[.is-user]:text-[var(--tier-ink)] text-[0.95rem] leading-relaxed">
        {text && <p className="whitespace-pre-wrap break-words">{text}</p>}
        {hasFiles && (
          <Attachments variant="grid" className="mt-2">
            {message
              .parts!.filter((p) => p.type === "file")
              .map((p, i) => (
                <Attachment
                  key={i}
                  data={{
                    id: `${message.id}-file-${i}`,
                    type: "file",
                    mediaType: (p as FileUIPart).mediaType,
                    url: (p as FileUIPart).url,
                    filename: (p as FileUIPart).filename,
                  }}
                >
                  <AttachmentPreview />
                </Attachment>
              ))}
          </Attachments>
        )}
      </MessageContent>
    </Message>
  );
});
