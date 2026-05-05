"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { ArrowDownIcon, DownloadIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";

/* ------------------------------------------------------------------ */
/*  Scroll Context — shared between Conversation, Content & Button     */
/* ------------------------------------------------------------------ */

type ConversationContextValue = {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  stickToBottom: boolean;
  setStickToBottom: (v: boolean) => void;
};

const ConversationContext = createContext<ConversationContextValue | null>(
  null,
);

function useConversationContext() {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error(
      "Conversation compound components must be used within a <Conversation>",
    );
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  <Conversation> — outer wrapper that owns the scroll state          */
/* ------------------------------------------------------------------ */

export type ConversationProps = ComponentProps<"div"> & {
  /** Auto-scroll behavior. Defaults to "smooth" */
  initial?: ScrollBehavior;
};

const STICK_THRESHOLD_PX = 60;

export const Conversation = ({
  className,
  initial: _initial,
  children,
  ...props
}: ConversationProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [stickToBottom, setStickToBottom] = useState(true);

  /* Scroll handler — runs on every scroll event */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const threshold = STICK_THRESHOLD_PX;
      const atBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
      setIsAtBottom(atBottom);
      if (atBottom) {
        setStickToBottom(true);
      } else {
        /* User scrolled up → stop sticking */
        setStickToBottom(false);
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /* Auto-scroll when content grows AND we're stuck to bottom */
  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;

    const observer = new ResizeObserver(() => {
      if (stickToBottom) {
        const el = scrollRef.current;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      }
    });

    observer.observe(contentEl);
    return () => observer.disconnect();
  }, [stickToBottom]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior });
      setStickToBottom(true);
    }
  }, []);

  const ctx: ConversationContextValue = {
    scrollRef,
    contentRef,
    isAtBottom,
    scrollToBottom,
    stickToBottom,
    setStickToBottom,
  };

  return (
    <ConversationContext.Provider value={ctx}>
      <div
        className={cn("relative flex-1 min-h-0 overflow-y-auto", className)}
        ref={scrollRef}
        role="log"
        {...props}
      >
        {children}
      </div>
    </ConversationContext.Provider>
  );
};

/* ------------------------------------------------------------------ */
/*  <ConversationContent> — the content wrapper inside the scroller    */
/* ------------------------------------------------------------------ */

export type ConversationContentProps = ComponentProps<"div">;

export const ConversationContent = ({
  className,
  ...props
}: ConversationContentProps) => {
  const { contentRef } = useConversationContext();
  return (
    <div
      ref={contentRef}
      className={cn("flex flex-col gap-8 p-4", className)}
      {...props}
    />
  );
};

/* ------------------------------------------------------------------ */
/*  <ConversationEmptyState>                                           */
/* ------------------------------------------------------------------ */

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn(
      "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
      className,
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="space-y-1">
          <h3 className="font-medium text-sm">{title}</h3>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      </>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/*  <ConversationScrollButton>                                         */
/* ------------------------------------------------------------------ */

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useConversationContext();

  const handleClick = useCallback(() => {
    scrollToBottom("smooth");
  }, [scrollToBottom]);

  if (isAtBottom) return null;

  return (
    <Button
      className={cn(
        "absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full dark:bg-background dark:hover:bg-muted z-10",
        className,
      )}
      onClick={handleClick}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      <ArrowDownIcon className="size-4" />
    </Button>
  );
};

/* ------------------------------------------------------------------ */
/*  <ConversationDownload>                                             */
/* ------------------------------------------------------------------ */

const getMessageText = (message: UIMessage): string =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

export type ConversationDownloadProps = Omit<
  ComponentProps<typeof Button>,
  "onClick"
> & {
  messages: UIMessage[];
  filename?: string;
  formatMessage?: (message: UIMessage, index: number) => string;
};

const defaultFormatMessage = (message: UIMessage): string => {
  const roleLabel =
    message.role.charAt(0).toUpperCase() + message.role.slice(1);
  return `**${roleLabel}:** ${getMessageText(message)}`;
};

export const messagesToMarkdown = (
  messages: UIMessage[],
  formatMessage: (
    message: UIMessage,
    index: number,
  ) => string = defaultFormatMessage,
): string => messages.map((msg, i) => formatMessage(msg, i)).join("\n\n");

export const ConversationDownload = ({
  messages,
  filename = "conversation.md",
  formatMessage = defaultFormatMessage,
  className,
  children,
  ...props
}: ConversationDownloadProps) => {
  const handleDownload = useCallback(() => {
    const markdown = messagesToMarkdown(messages, formatMessage);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [messages, filename, formatMessage]);

  return (
    <Button
      className={cn(
        "absolute top-4 right-4 rounded-full dark:bg-background dark:hover:bg-muted",
        className,
      )}
      onClick={handleDownload}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      {children ?? <DownloadIcon className="size-4" />}
    </Button>
  );
};
