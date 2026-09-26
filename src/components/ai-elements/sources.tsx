"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronRightIcon, GlobeIcon } from "lucide-react";
import type { ComponentProps } from "react";

export type SourcesProps = ComponentProps<"div">;

export const Sources = ({ className, ...props }: SourcesProps) => (
  <Collapsible
    className={cn("group not-prose", className)}
    {...props}
  />
);

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number;
};

export const SourcesTrigger = ({
  className,
  count,
  children,
  ...props
}: SourcesTriggerProps) => (
  <CollapsibleTrigger
    className={cn(
      "flex min-h-11 cursor-pointer items-center gap-1.5 text-[15px] font-medium text-[var(--tint)] active:opacity-60",
      className
    )}
    {...props}
  >
    {children ?? (
      <>
        <p>
          Used {count} {count === 1 ? "source" : "sources"}
        </p>
        <ChevronRightIcon className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
      </>
    )}
  </CollapsibleTrigger>
);

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent>;

export const SourcesContent = ({
  className,
  ...props
}: SourcesContentProps) => (
  <CollapsibleContent
    className={cn(
      "flex w-full flex-col overflow-hidden rounded-[1.125rem] bg-[var(--fill-tertiary)] [&_:focus-visible]:outline-offset-[-3px]!",
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

export type SourceProps = ComponentProps<"a">;

/** Ink label with a tint glyph (tint text on the fill misses AA); hairline inset to the label. */
export const Source = ({ href, title, children, ...props }: SourceProps) => (
  <a
    className="relative flex min-h-11 items-center gap-3 px-3.5 py-2 text-[15px] text-[var(--tier-ink)] transition-colors duration-150 not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-[2.625rem] not-first:before:border-t not-first:before:border-[var(--separator)] not-first:before:content-[''] hover:bg-[var(--fill-tertiary)]"
    href={href}
    rel="noreferrer"
    target="_blank"
    {...props}
  >
    {children ?? (
      <>
        <GlobeIcon aria-hidden className="size-4 shrink-0 text-[var(--tint)]" />
        <span className="block min-w-0 truncate">{title}</span>
        <span className="sr-only">(opens in a new tab)</span>
      </>
    )}
  </a>
);
