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
    <Message from="user">
      <MessageContent>
        {text}
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
