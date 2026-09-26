"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// SF Symbols-style pairs: outline when idle, filled when selected (as iOS does).
const TABS = [
  {
    href: "/dashboard",
    label: "Today",
    icon: (filled: boolean) => (
      <path
        d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"
        fill={filled ? "currentColor" : "none"}
      />
    ),
  },
  {
    href: "/chat",
    label: "Chat",
    icon: (filled: boolean) => (
      <path
        d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L4 20l1-4.3A8.5 8.5 0 1 1 21 11.5Z"
        fill={filled ? "currentColor" : "none"}
      />
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (filled: boolean) => (
      <>
        <path
          d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
          fill={filled ? "currentColor" : "none"}
        />
        <circle cx="12" cy="12" r="3" fill={filled ? "var(--tier-surface)" : "none"} />
      </>
    ),
  },
] as const;

/**
 * iOS-style tab bar for phones (hidden from md up, where each page shows its
 * own top or side navigation). Translucent material, solid when the user asks
 * for reduced transparency. Pages that render it need bottom padding of about
 * `pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0` so content is not hidden.
 */
export default function AppTabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="material hairline-t fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[3.1rem] flex-col items-center justify-center gap-0.5 pt-1.5 text-[10px] font-medium tracking-[0.01em] transition-colors duration-150 active:opacity-60 ${
                  active
                    ? "text-[var(--tint)]"
                    : "text-[var(--label-tertiary)]"
                }`}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="size-[26px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {tab.icon(active)}
                </svg>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
