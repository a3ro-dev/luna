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
import { Tool, ToolHeader } from "@/components/ai-elements/tool";
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
import { CheckIcon, CopyIcon } from "lucide-react";

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

/** Tool JSON the model echoed as its reply text, or null for a normal reply. */
function parseToolPayload(text: string): Record<string, unknown> | unknown[] | null {
  const trimmed = text.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.length > 0 ? parsed : null;
    if (!parsed || typeof parsed !== "object") return null;
    return Object.keys(parsed).some((key) => TOOL_PAYLOAD_KEYS.has(key))
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** The one sentence a tool payload carries for people, if any. Never raw JSON. */
function payloadSentence(payload: ReturnType<typeof parseToolPayload>): string {
  if (!payload || Array.isArray(payload)) return "";
  const text = payload.message ?? payload.question;
  return typeof text === "string" && text ? text[0].toUpperCase() + text.slice(1) : "";
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

// Plain-language names for tool cards; unknown tools fall back to their id
const TOOL_LABELS: Record<string, string> = {
  logPeriodStart: "Period start",
  logPeriodEnd: "Period end",
  logOvulation: "Ovulation",
  addNoteSymptom: "Note",
  fetchRecentCycles: "Recent cycles",
  computePredictions: "Forecast",
  fetchStats: "Cycle stats",
  exportData: "Export",
  rememberFact: "Memory",
  searchWeb: "Web search",
};

type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

// hasReasoningParts is not needed — getReasoningText length check replaces it

/** Streamdown defaults use shadcn tokens; pull links, headings and code onto the iOS scale. */
const RESPONSE_CLASS =
  "[&_a]:text-[var(--tint)] [&_a]:underline-offset-2 [&_h1]:text-[22px] [&_h1]:font-semibold [&_h1]:tracking-[-0.02em] [&_h2]:text-[20px] [&_h2]:font-semibold [&_h3]:text-[17px] [&_h3]:font-semibold [&_code]:text-[15px] [&_li]:my-1 [&_hr]:border-[var(--separator)]";

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
      <MessageResponse className={RESPONSE_CLASS} isAnimating={isStreaming}>
        {content}
      </MessageResponse>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[1.125rem]">
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
  const toolPayload = parseToolPayload(content);
  const hasToolPayload = toolPayload !== null;
  const echoed = payloadSentence(toolPayload);
  const isOpenUi = looksLikeOpenUiLang(content);

  const reasoning = getReasoningText(message.parts);
  const hasReasoning = reasoning.length > 0;
  const sources = extractSourcesFromParts(message.parts);

  // Web search shows as a card only while it runs; once done it becomes Sources
  const toolParts = Array.isArray(message.parts)
    ? message.parts.filter(
        (p) =>
          p.type.startsWith("tool-") &&
          p.type !== "tool-invocation" &&
          !(p.type === "tool-searchWeb" && p.state === "output-available"),
      )
    : [];

  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  }, [content]);

  return (
    <Message from="assistant" className="max-w-full">
      {/* Replies are calm full-width text, not bubbles */}
      <MessageContent className="w-full text-[17px] leading-[1.5] tracking-[-0.01em] group-[.is-assistant]:text-[var(--tier-ink)]">
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
              // Status only: Luna's reply explains the result in words
              const toolPart = part as { type: string; state: string; toolName?: string };
              const toolId =
                toolPart.toolName ?? toolPart.type.replace("tool-", "");
              return (
                <Tool key={`tool-${i}`}>
                  <ToolHeader
                    type="dynamic-tool"
                    state={toolPart.state as ToolState}
                    toolName={toolId}
                    title={TOOL_LABELS[toolId]}
                  />
                </Tool>
              );
            })}

          {/* Main content */}
          {/* Echoed tool JSON shows only its sentence, never the data */}
          {hasToolPayload ? (
            echoed ? <MessageResponse className={RESPONSE_CLASS}>{echoed}</MessageResponse> : null
          ) : isOpenUi ? (
            <OpenUIMessage content={content} isStreaming={isStreaming} />
          ) : content ? (
            <MessageResponse className={RESPONSE_CLASS} isAnimating={isStreaming}>
              {content}
            </MessageResponse>
          ) : null}

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
      {/* Cards and tool data would copy as code, so only prose replies offer Copy */}
      {content.length > 0 && !isOpenUi && !hasToolPayload && (
        <MessageActions className="-mt-1 -ml-3 md:-ml-2">
          <MessageAction
            tooltip={copied ? "Copied" : "Copy"}
            onClick={handleCopy}
            variant={null}
            className="size-11 rounded-full text-[var(--label-secondary)] hover:bg-[var(--fill-tertiary)] hover:text-[var(--tier-ink)] active:opacity-60"
          >
            {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
          </MessageAction>
        </MessageActions>
      )}
    </Message>
  );
});
