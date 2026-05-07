"use client";

import React, { memo, useState, useCallback } from "react";
import type { UIMessage } from "ai";
import {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Tool, ToolHeader, ToolContent } from "@/components/ai-elements/tool";
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Renderer } from "@openuidev/react-lang";
import { openuiChatLibrary } from "@openuidev/react-ui";
import { looksLikeOpenUiLang } from "@/lib/chat/openui";

/* ------------------------------------------------------------------ */
/*  Stable helpers (module-level — never recreated)                    */
/* ------------------------------------------------------------------ */

const TOOL_PAYLOAD_KEYS = new Set([
  "responseMode",
  "kind",
  "message",
  "summary",
  "recentCycles",
  "predictions",
  "averages",
  "exportUrl",
]);

function isLikelyToolPayloadText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return false;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown> | unknown[];
    if (Array.isArray(parsed)) return parsed.length > 0;
    if (!parsed || typeof parsed !== "object") return false;
    return Object.keys(parsed).some((key) => TOOL_PAYLOAD_KEYS.has(key));
  } catch {
    return false;
  }
}

function extractSourcesFromParts(
  parts: UIMessage["parts"],
): Array<{ title: string; url: string }> {
  if (!Array.isArray(parts)) return [];
  const sources: Array<{ title: string; url: string }> = [];
  for (const part of parts) {
    if (part.type === "tool-searchWeb" && part.state === "output-available") {
      const output = part.output as { message?: string } | undefined;
      if (typeof output?.message === "string") {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        while ((match = linkRegex.exec(output.message)) !== null) {
          sources.push({ title: match[1], url: match[2] });
        }
      }
    }
  }
  return sources;
}

// hasReasoningParts is not needed — getReasoningText length check replaces it

function getReasoningText(parts: UIMessage["parts"]): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p) => p.type === "reasoning")
    .map((p) => (p as { type: "reasoning"; text: string }).text ?? "")
    .join("\n");
}

function getMessageText(parts: UIMessage["parts"]): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
}

/* ------------------------------------------------------------------ */
/*  OpenUI sub-component (isolated fallback state)                    */
/* ------------------------------------------------------------------ */

const OpenUIMessage = memo(function OpenUIMessage({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming: boolean;
}) {
  const [fallbackToText, setFallbackToText] = useState(false);
  const trimmed = content.trim();

  if (!looksLikeOpenUiLang(trimmed) || fallbackToText) {
    return (
      <MessageResponse isAnimating={isStreaming}>{content}</MessageResponse>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl">
      <Renderer
        library={openuiChatLibrary}
        response={content}
        isStreaming={isStreaming}
        onError={(errors) => {
          if (!isStreaming && errors.length > 0) {
            setFallbackToText(true);
          }
        }}
      />
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  AssistantMessage (memoized)                                       */
/* ------------------------------------------------------------------ */

interface AssistantMessageProps {
  message: UIMessage;
  isStreaming: boolean;
}

export const AssistantMessage = memo(function AssistantMessage({
  message,
  isStreaming,
}: AssistantMessageProps) {
  const content = getMessageText(message.parts);
  const hasToolPayload = isLikelyToolPayloadText(content);
  const isOpenUi = looksLikeOpenUiLang(content);

  const reasoning = getReasoningText(message.parts);
  const hasReasoning = reasoning.length > 0;
  const sources = extractSourcesFromParts(message.parts);

  const toolParts = Array.isArray(message.parts)
    ? message.parts.filter(
        (p) =>
          p.type.startsWith("tool-") &&
          p.type !== "tool-searchWeb" &&
          !["tool-invocation"].includes(p.type),
      )
    : [];

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
  }, [content]);

  return (
    <Message from="assistant">
      <MessageContent>
        <div className="space-y-3">
          {/* Reasoning */}
          {hasReasoning && (
            <Reasoning isStreaming={isStreaming} defaultOpen={isStreaming}>
              <ReasoningTrigger />
              <ReasoningContent>{reasoning}</ReasoningContent>
            </Reasoning>
          )}

          {/* Tool calls */}
          {toolParts.length > 0 &&
            toolParts.map((part, i) => {
              const toolPart = part as {
                type: string;
                state: string;
                toolName?: string;
                input?: unknown;
                output?: unknown;
              };
              return (
                <Tool key={`tool-${i}`} defaultOpen={false}>
                  <ToolHeader
                    type="dynamic-tool"
                    state={
                      toolPart.state as
                        | "input-streaming"
                        | "input-available"
                        | "output-available"
                    }
                    toolName={
                      toolPart.toolName ?? toolPart.type.replace("tool-", "")
                    }
                  />
                  <ToolContent>
                    {toolPart.input && (
                      <pre className="text-xs text-muted-foreground overflow-x-auto">
                        {JSON.stringify(toolPart.input, null, 2)}
                      </pre>
                    )}
                    {toolPart.output &&
                      toolPart.state === "output-available" && (
                        <div className="text-xs text-muted-foreground">
                          {typeof toolPart.output === "string"
                            ? toolPart.output
                            : JSON.stringify(toolPart.output, null, 2)}
                        </div>
                      )}
                  </ToolContent>
                </Tool>
              );
            })}

          {/* Main content */}
          {!hasToolPayload && isOpenUi ? (
            <OpenUIMessage content={content} isStreaming={isStreaming} />
          ) : !hasToolPayload ? (
            content ? (
              <MessageResponse isAnimating={isStreaming}>
                {content}
              </MessageResponse>
            ) : null
          ) : (
            <Tool defaultOpen={false}>
              <ToolHeader
                type="dynamic-tool"
                state="output-available"
                toolName="assistant-data"
                title="Tool data (collapsed)"
              />
              <ToolContent>
                <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                  {content}
                </pre>
              </ToolContent>
            </Tool>
          )}

          {/* Sources from web search */}
          {sources.length > 0 && (
            <Sources>
              <SourcesTrigger count={sources.length} />
              <SourcesContent>
                {sources.map((s, i) => (
                  <Source key={i} href={s.url} title={s.title} />
                ))}
              </SourcesContent>
            </Sources>
          )}
        </div>
      </MessageContent>
      {content.length > 0 && (
        <MessageActions>
          <MessageAction tooltip="Copy" onClick={handleCopy}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          </MessageAction>
        </MessageActions>
      )}
    </Message>
  );
});
