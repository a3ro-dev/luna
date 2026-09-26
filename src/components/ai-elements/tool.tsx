"use client";

import { cn } from "@/lib/utils";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import {
  CheckIcon,
  CircleAlertIcon,
  CircleDashedIcon,
  ClockIcon,
  LoaderCircleIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export type ToolProps = ComponentProps<"div">;

/** A quiet status row, like a Settings row detail. Luna's reply says what happened. */
export const Tool = ({ className, ...props }: ToolProps) => (
  <div
    className={cn(
      "not-prose w-full min-w-0 rounded-[1.125rem] bg-[var(--fill-tertiary)]",
      className,
    )}
    {...props}
  />
);

export type ToolPart = ToolUIPart | DynamicToolUIPart;

export type ToolHeaderProps = {
  title?: string;
  className?: string;
} & (
  | { type: ToolUIPart["type"]; state: ToolUIPart["state"]; toolName?: never }
  | {
      type: DynamicToolUIPart["type"];
      state: DynamicToolUIPart["state"];
      toolName: string;
    }
);

const statusLabels: Record<ToolPart["state"], string> = {
  "approval-requested": "Needs your OK",
  "approval-responded": "Answered",
  "input-available": "Working",
  "input-streaming": "Preparing",
  "output-available": "Done",
  "output-denied": "Skipped",
  "output-error": "Didn’t work",
};

const spin = "size-3.5 animate-spin motion-reduce:animate-none";

const statusIcons: Record<ToolPart["state"], ReactNode> = {
  "approval-requested": <ClockIcon className="size-3.5" />,
  "approval-responded": <CheckIcon className="size-3.5" />,
  "input-available": <LoaderCircleIcon className={spin} />,
  "input-streaming": <CircleDashedIcon className="size-3.5" />,
  "output-available": <CheckIcon className="size-3.5" />,
  "output-denied": <CircleAlertIcon className="size-3.5" />,
  "output-error": <CircleAlertIcon className="size-3.5" />,
};

/** Quiet status text with a glyph. Errors use the destructive red deepened toward the ink (AA on the fill). */
export const getStatusBadge = (status: ToolPart["state"]) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center gap-1 text-[13px]",
      status === "output-error"
        ? "text-[color-mix(in_oklch,var(--destructive)_80%,var(--tier-ink))]"
        : "text-[var(--label-secondary)]",
    )}
  >
    {statusIcons[status]}
    {statusLabels[status]}
  </span>
);

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  toolName,
}: ToolHeaderProps) => {
  const derivedName =
    type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");

  return (
    <div
      className={cn(
        "flex min-h-11 w-full min-w-0 items-center gap-2.5 px-3.5 py-2",
        className,
      )}
    >
      <span className="truncate font-medium text-[15px] text-[var(--tier-ink)]">
        {title ?? derivedName}
      </span>
      {getStatusBadge(state)}
    </div>
  );
};
