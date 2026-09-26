"use client";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import {
  CheckIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  CircleDashedIcon,
  ClockIcon,
  LoaderCircleIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";

import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, defaultOpen, ...props }: ToolProps) => (
  <Collapsible
    className={cn(
      "group not-prose w-full min-w-0 rounded-2xl border border-[var(--tier-line)] bg-[var(--tier-surface)]",
      className,
    )}
    defaultOpen={defaultOpen ?? false}
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
  "output-error": "Didn't work",
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

export const getStatusBadge = (status: ToolPart["state"]) => (
  <Badge
    className={cn(
      "shrink-0 gap-1 rounded-full border-0 px-2 font-medium text-xs",
      status === "output-error"
        ? "bg-[oklch(0.95_0.03_20)] text-[oklch(0.45_0.14_20)]"
        : "bg-[var(--tier-tint)] text-[var(--tier-ink)]",
    )}
    variant="secondary"
  >
    {statusIcons[status]}
    {statusLabels[status]}
  </Badge>
);

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  toolName,
  ...props
}: ToolHeaderProps) => {
  const derivedName =
    type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");

  return (
    <CollapsibleTrigger
      className={cn(
        "flex min-h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-2xl px-3.5 py-2 text-left",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium text-[var(--tier-ink)] text-sm">
          {title ?? derivedName}
        </span>
        {getStatusBadge(state)}
      </div>
      <ChevronDownIcon className="size-4 shrink-0 text-[var(--tier-muted)] transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "space-y-3 border-[var(--tier-line)] border-t px-3.5 py-3 text-[var(--tier-muted)] outline-none",
      className,
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-2 overflow-hidden", className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolPart["output"];
  errorText: ToolPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "object" && !isValidElement(output)) {
    Output = (
      <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
    );
  } else if (typeof output === "string") {
    Output = <CodeBlock code={output} language="json" />;
  }

  return (
    <div className={cn("space-y-2", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          errorText
            ? "bg-destructive/10 text-destructive"
            : "bg-muted/50 text-foreground",
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};
