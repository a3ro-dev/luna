"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage, type FileUIPart } from "ai";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Renderer } from "@openuidev/react-lang";
import { openuiChatLibrary, ThemeProvider } from "@openuidev/react-ui";
import { looksLikeOpenUiLang } from "@/lib/chat/openui";

// AI Elements
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
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
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
} from "@/components/ai-elements/attachments";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { Shimmer } from "@/components/ai-elements/shimmer";
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

// UI Components
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

type ChatSession = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

// --- Suggestion prompts for empty state ---
const starterSuggestions = [
  "Log my period",
  "When is my next period?",
  "Show my cycle stats",
  "I've been having cramps",
];

// --- OpenUI message renderer ---
function OpenUIMessage({
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
}

// --- Extract sources from searchWeb tool results in message parts ---
function extractSourcesFromParts(
  parts: UIMessage["parts"],
): Array<{ title: string; url: string }> {
  if (!Array.isArray(parts)) return [];
  const sources: Array<{ title: string; url: string }> = [];

  for (const part of parts) {
    if (part.type === "tool-searchWeb" && part.state === "output-available") {
      const output = part.output as { message?: string } | undefined;
      if (typeof output?.message === "string") {
        // Parse markdown links like [Title](url)
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

// --- Check if message has reasoning/thinking parts ---
function hasReasoningParts(parts: UIMessage["parts"]): boolean {
  if (!Array.isArray(parts)) return false;
  return parts.some((p) => p.type === "reasoning");
}

function getReasoningText(parts: UIMessage["parts"]): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p) => p.type === "reasoning")
    .map((p) => (p as { type: "reasoning"; text: string }).text ?? "")
    .join("\n");
}

// --- Main Chat Page ---
export default function ChatPage() {
  const { status: authStatus } = useSession();
  const { messages, sendMessage, status, setMessages, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isBusy = status === "streaming" || status === "submitted";
  const isStreaming = status === "streaming";

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const hasRequestedRename = useRef<Set<string>>(new Set());
  const prevStatusRef = useRef(status);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // --- Auto-rename ---
  useEffect(() => {
    const wasBusy =
      prevStatusRef.current === "streaming" ||
      prevStatusRef.current === "submitted";
    prevStatusRef.current = status;

    if (
      wasBusy &&
      !isBusy &&
      activeSessionId &&
      !hasRequestedRename.current.has(activeSessionId)
    ) {
      const session = sessions.find((s) => s.id === activeSessionId);
      if (session && !session.title) {
        hasRequestedRename.current.add(activeSessionId);
        renameSession(activeSessionId).then((updated) => {
          if (updated) {
            setSessions((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s)),
            );
          }
        });
      }
    }
  }, [status, isBusy, activeSessionId, sessions]);

  // --- Session API helpers ---
  const loadSessions = async () => {
    const res = await fetch("/api/chat/sessions");
    if (!res.ok) return [];
    return (await res.json()) as ChatSession[];
  };

  const loadSessionMessages = async (sessionId: string) => {
    const res = await fetch(`/api/chat/sessions/${sessionId}/messages`);
    if (!res.ok) return [];
    return await res.json();
  };

  const createSession = async () => {
    const res = await fetch("/api/chat/sessions", { method: "POST" });
    if (!res.ok) return null;
    return (await res.json()) as ChatSession;
  };

  const renameSession = async (sessionId: string) => {
    const res = await fetch(`/api/chat/sessions/${sessionId}/rename`, {
      method: "POST",
    });
    if (!res.ok) return null;
    return (await res.json()) as ChatSession;
  };

  const deleteSession = async (sessionId: string) => {
    const res = await fetch(`/api/chat/sessions/${sessionId}`, {
      method: "DELETE",
    });
    return res.ok;
  };

  // --- Bootstrap ---
  useEffect(() => {
    const bootstrap = async () => {
      setIsLoadingSessions(true);
      const loadedSessions = await loadSessions();
      let nextSessions = loadedSessions;
      if (loadedSessions.length === 0) {
        const created = await createSession();
        nextSessions = created ? [created] : [];
      }
      setSessions(nextSessions);
      if (nextSessions.length > 0) {
        setActiveSessionId(nextSessions[0].id);
        const initialMessages = await loadSessionMessages(nextSessions[0].id);
        setMessages(initialMessages);
      }
      setIsLoadingSessions(false);
    };

    bootstrap();
  }, [setMessages]);

  // --- Read file as data URL for FileUIPart ---
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  // --- PromptInput onSubmit handler ---
  const handlePromptSubmit = useCallback(
    async ({ text, files }: PromptInputMessage) => {
      if (isBusy) return;

      if (text.trim().length === 0 && files.length === 0) return;

      try {
        let sessionId = activeSessionId;
        if (!sessionId) {
          const created = await createSession();
          if (!created) return;
          setSessions((prev) => [created, ...prev]);
          setActiveSessionId(created.id);
          setMessages([]);
          sessionId = created.id;
        }

        const parts: UIMessage["parts"] = [
          ...files.map((f) => ({
            type: "file" as const,
            mediaType: f.mediaType,
            url: f.url,
            filename: f.filename,
          })),
          ...(text.trim().length > 0
            ? [{ type: "text" as const, text: text.trim() }]
            : []),
        ];

        sendMessage(
          { role: "user", parts },
          {
            body: {
              sessionId,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          },
        );
      } catch {
        // sendMessage errors are handled by useChat
      }
    },
    [activeSessionId, isBusy, sendMessage, setMessages],
  );

  // --- Session actions ---
  const handleSelectSession = async (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    setActiveSessionId(sessionId);
    setMessages([]);
    const sessionMessages = await loadSessionMessages(sessionId);
    setMessages(sessionMessages);
    setIsSessionsOpen(false);
  };

  const handleNewSession = async () => {
    const created = await createSession();
    if (!created) return;
    setSessions((prev) => [created, ...prev]);
    setActiveSessionId(created.id);
    setMessages([]);
    setIsSessionsOpen(false);
  };

  const handleRenameSession = async (sessionId: string) => {
    const updated = await renameSession(sessionId);
    if (!updated) return;
    setSessions((prev) =>
      prev.map((session) => (session.id === updated.id ? updated : session)),
    );
  };

  const handleDeleteSession = async (sessionId: string) => {
    const ok = await deleteSession(sessionId);
    if (!ok) return;

    let nextActiveId: string | null = null;
    setSessions((prev) => {
      const remaining = prev.filter((session) => session.id !== sessionId);
      if (activeSessionId === sessionId) {
        nextActiveId = remaining[0]?.id ?? null;
      }
      return remaining;
    });

    if (activeSessionId === sessionId) {
      if (nextActiveId) {
        setActiveSessionId(nextActiveId);
        const nextMessages = await loadSessionMessages(nextActiveId);
        setMessages(nextMessages);
      } else {
        setActiveSessionId(null);
        setMessages([]);
      }
    }
    setDeleteTarget(null);
  };

  // --- Render assistant message content ---
  const renderAssistantContent = (m: UIMessage) => {
    const textParts = Array.isArray(m.parts)
      ? m.parts.filter((part) => part.type === "text")
      : [];
    const messageText = textParts.map((part) => part.text).join("");
    const content = messageText || (isStreaming ? "" : "");
    const isOpenUi = looksLikeOpenUiLang(content);

    // Check for reasoning
    const reasoning = getReasoningText(m.parts);
    const hasReasoning = reasoning.length > 0;

    // Check for sources (from searchWeb tool)
    const sources = extractSourcesFromParts(m.parts);

    // Check for tool calls
    const toolParts = Array.isArray(m.parts)
      ? m.parts.filter(
          (p) =>
            p.type.startsWith("tool-") &&
            p.type !== "tool-searchWeb" &&
            !["tool-invocation"].includes(p.type),
        )
      : [];

    return (
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
                    <pre className="text-xs text-[#8E7D82] overflow-x-auto">
                      {JSON.stringify(toolPart.input, null, 2)}
                    </pre>
                  )}
                  {toolPart.output && toolPart.state === "output-available" && (
                    <div className="text-xs text-[#6D5A60]">
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
        {isOpenUi ? (
          <OpenUIMessage content={content} isStreaming={isStreaming} />
        ) : (
          content && (
            <MessageResponse isAnimating={isStreaming}>
              {content}
            </MessageResponse>
          )
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
    );
  };

  // --- Sidebar session list ---
  const renderSessionsList = () => (
    <ScrollArea className="flex-1">
      <div className="space-y-1 pr-2">
        {isLoadingSessions && (
          <div className="px-3 py-2 text-xs text-[#8E7D82]/60">Loading...</div>
        )}
        {!isLoadingSessions && sessions.length === 0 && (
          <div className="px-3 py-2 text-xs text-[#8E7D82]/60">
            No chats yet
          </div>
        )}
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <div
              key={session.id}
              className={`group flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150 active:scale-[0.99] will-change-transform cursor-pointer ${
                isActive
                  ? "bg-[#FFEEF1] text-[#6D5A60]"
                  : "text-[#8E7D82] hover:bg-[#FFF5F7]"
              }`}
            >
              <button
                type="button"
                onClick={() => handleSelectSession(session.id)}
                className="flex-1 text-left truncate font-light cursor-pointer"
              >
                {session.title || "Untitled chat"}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-[#8E7D82] hover:text-[#6D5A60] cursor-pointer"
                  >
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
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="19" cy="12" r="1" />
                      <circle cx="5" cy="12" r="1" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    onClick={() => handleRenameSession(session.id)}
                  >
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteTarget(session.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );

  return (
    <ThemeProvider>
      <TooltipProvider>
        <div className="h-dvh overflow-hidden bg-[#FFF9F9] flex font-sans selection:bg-[#FFDDE0] selection:text-[#6D5A60]">
          {/* --- Desktop Sidebar --- */}
          <aside className="w-[260px] shrink-0 border-r border-[#FFDDE0]/40 bg-white/60 backdrop-blur-xl px-4 py-6 hidden md:flex md:flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-base text-[#6D5A60]">Chats</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleNewSession}
                    className="text-[#8E7D82] hover:text-[#6D5A60] active:scale-[0.95] will-change-transform transition-transform duration-100 cursor-pointer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New chat</TooltipContent>
              </Tooltip>
            </div>
            <Separator className="bg-[#FFDDE0]/40" />
            {renderSessionsList()}
          </aside>

          {/* --- Main Chat Area --- */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* Header */}
            <header className="py-4 px-6 md:px-10 border-b border-[#FFDDE0]/30 bg-white/50 backdrop-blur-xl sticky top-0 z-10">
              <div className="flex items-center justify-between gap-3">
                <motion.div
                  initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ type: "spring", duration: 0.45, bounce: 0 }}
                >
                  <h1 className="flex items-center gap-2 font-serif text-2xl font-light text-[#6D5A60]">
                    <img
                      src="/luna.png"
                      alt=""
                      className="h-7 w-7 rounded-full"
                    />
                    Luna
                  </h1>
                  <p className="text-xs font-light text-[#8E7D82]">
                    Your caring health companion
                  </p>
                </motion.div>
                <div className="flex items-center gap-2">
                  <Link href="/dashboard">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] border-[#FFDDE0]/60 rounded-full hover:bg-[#FFF5F7] hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:shadow-none will-change-transform transition-all duration-150 ease-out cursor-pointer"
                    >
                      Dashboard
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] border-[#FFDDE0]/60 rounded-full hover:bg-[#FFF5F7] hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:shadow-none will-change-transform transition-all duration-150 ease-out cursor-pointer"
                    >
                      Settings
                    </Button>
                  </Link>
                  {authStatus === "authenticated" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] border-[#FFDDE0]/60 rounded-full hover:bg-[#FFF5F7] hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:shadow-none will-change-transform transition-all duration-150 ease-out cursor-pointer"
                    >
                      Sign out
                    </Button>
                  ) : (
                    <Link href="/login">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] font-semibold uppercase tracking-widest text-[#6D5A60] border-[#FFDDE0]/60 rounded-full hover:bg-[#FFF5F7] hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:shadow-none will-change-transform transition-all duration-150 ease-out cursor-pointer"
                      >
                        Log in
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSessionsOpen(true)}
                    className="md:hidden text-xs text-[#8E7D82] hover:text-[#6D5A60] cursor-pointer"
                  >
                    Chats
                  </Button>
                </div>
              </div>
            </header>

            {/* Messages */}
            <Conversation className="flex-1">
              {messages.length === 0 ? (
                <ConversationEmptyState>
                  <motion.div
                    initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                      type: "spring",
                      duration: 0.45,
                      bounce: 0,
                      delay: 0,
                    }}
                  >
                    <motion.div
                      className="w-14 h-14 rounded-full bg-[#FFB5C0] flex items-center justify-center shadow-[0_10px_20px_rgba(255,181,192,0.2)] overflow-hidden"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <img
                        src="/luna.png"
                        alt="Luna"
                        className="h-10 w-10 rounded-full"
                      />
                    </motion.div>
                  </motion.div>
                  <motion.div
                    className="space-y-1"
                    initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                      type: "spring",
                      duration: 0.45,
                      bounce: 0,
                      delay: 0.06,
                    }}
                  >
                    <h3 className="font-serif font-light text-lg text-[#6D5A60]">
                      Hi lovely, I'm Luna
                    </h3>
                  </motion.div>
                  <motion.p
                    className="text-sm font-light text-[#8E7D82]"
                    initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                      type: "spring",
                      duration: 0.45,
                      bounce: 0,
                      delay: 0.12,
                    }}
                  >
                    Log your cycle, ask about symptoms, or just chat about how
                    you're feeling.
                  </motion.p>
                  <motion.div
                    className="mt-2"
                    initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                      type: "spring",
                      duration: 0.45,
                      bounce: 0,
                      delay: 0.18,
                    }}
                  >
                    <Suggestions>
                      {starterSuggestions.map((s) => (
                        <Suggestion
                          key={s}
                          suggestion={s}
                          onClick={(text) => {
                            handlePromptSubmit({ text, files: [] });
                          }}
                          className="active:scale-[0.97] will-change-transform transition-transform duration-100 cursor-pointer"
                        />
                      ))}
                    </Suggestions>
                  </motion.div>
                </ConversationEmptyState>
              ) : (
                <ConversationContent className="px-6 md:px-10 py-6 space-y-4">
                  {messages.map((m) => {
                    if (m.role === "user") {
                      return (
                        <Message key={m.id} from="user">
                          <MessageContent>
                            {Array.isArray(m.parts)
                              ? m.parts
                                  .filter((p) => p.type === "text")
                                  .map((p) => p.text)
                                  .join("")
                              : ""}
                            {/* File attachments */}
                            {Array.isArray(m.parts) &&
                              m.parts.some((p) => p.type === "file") && (
                                <Attachments variant="grid" className="mt-2">
                                  {m.parts
                                    .filter((p) => p.type === "file")
                                    .map((p, i) => (
                                      <Attachment
                                        key={i}
                                        data={{
                                          id: `${m.id}-file-${i}`,
                                          type: "file",
                                          mediaType: (p as FileUIPart)
                                            .mediaType,
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
                    }

                    // Assistant message
                    return (
                      <Message key={m.id} from="assistant">
                        <MessageContent>
                          {renderAssistantContent(m)}
                        </MessageContent>
                        <MessageActions>
                          <MessageAction
                            tooltip="Copy"
                            onClick={() => {
                              const text = Array.isArray(m.parts)
                                ? m.parts
                                    .filter((p) => p.type === "text")
                                    .map((p) => p.text)
                                    .join("")
                                : "";
                              navigator.clipboard.writeText(text);
                            }}
                          >
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
                              <rect
                                width="14"
                                height="14"
                                x="8"
                                y="8"
                                rx="2"
                                ry="2"
                              />
                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                            </svg>
                          </MessageAction>
                        </MessageActions>
                      </Message>
                    );
                  })}

                  {/* Streaming indicator */}
                  <AnimatePresence>
                    {isBusy &&
                      messages[messages.length - 1]?.role !== "assistant" && (
                        <motion.div
                          key="shimmer-indicator"
                          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{
                            type: "spring",
                            duration: 0.35,
                            bounce: 0,
                          }}
                        >
                          <Message from="assistant">
                            <MessageContent>
                              <Shimmer>Thinking...</Shimmer>
                            </MessageContent>
                          </Message>
                        </motion.div>
                      )}
                  </AnimatePresence>
                </ConversationContent>
              )}
              <ConversationScrollButton />
            </Conversation>

            {/* Input area */}
            <div className="p-4 bg-white/60 border-t border-[#FFDDE0]/20 backdrop-blur-xl">
              <div className="max-w-3xl mx-auto">
                <PromptInput
                  onSubmit={handlePromptSubmit}
                  accept="image/*"
                  multiple
                  maxFiles={4}
                  className="bg-[#FFF9F9] border border-[#FFDDE0]/30 rounded-2xl shadow-[0_4px_12px_rgba(255,181,192,0.06)] focus-within:ring-2 focus-within:ring-[#FFB5C0]/30 focus-within:border-[#FFB5C0]/50 transition-all duration-200"
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
                        onStop={stop}
                        className="active:scale-[0.95] will-change-transform transition-transform duration-100 cursor-pointer"
                      />
                    </PromptInputTools>
                  </PromptInputFooter>
                </PromptInput>
                <div className="flex justify-between items-center mt-2 px-4">
                  <span className="text-[10px] text-[#8E7D82]/50">
                    Luna can make mistakes. Verify important info.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* --- Mobile Sidebar Overlay --- */}
          <AnimatePresence>
            {isSessionsOpen && (
              <div className="fixed inset-0 z-40 md:hidden">
                <motion.button
                  type="button"
                  className="absolute inset-0 bg-[#6D5A60]/20"
                  onClick={() => setIsSessionsOpen(false)}
                  aria-label="Close chat list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
                <motion.div
                  className="absolute right-0 top-0 h-full w-[78%] max-w-[320px] bg-white/90 backdrop-blur-xl border-l border-[#FFDDE0]/40 px-4 py-6 flex flex-col gap-4"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ type: "spring", duration: 0.4, bounce: 0 }}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-base text-[#6D5A60]">
                      Chats
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNewSession}
                      className="text-xs text-[#8E7D82] hover:text-[#6D5A60] active:scale-[0.95] will-change-transform transition-transform duration-100 cursor-pointer"
                    >
                      New
                    </Button>
                  </div>
                  <Separator className="bg-[#FFDDE0]/40" />
                  {renderSessionsList()}
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* --- Delete Confirmation Dialog --- */}
          <Dialog
            open={deleteTarget !== null}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete chat?</DialogTitle>
                <DialogDescription>
                  This cannot be undone. All messages in this chat will be
                  permanently deleted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" className="rounded-full">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  className="rounded-full"
                  onClick={() =>
                    deleteTarget && handleDeleteSession(deleteTarget)
                  }
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}
