"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useResolvedTheme } from "./mode";

/**
 * Browser and PWA chrome take the colour of the page actually showing: the
 * in-app mode (not only the OS), the plan's palette, and light on pages that
 * are not built on the plan tokens. Until hydration the viewport's
 * media-keyed theme-color metas apply.
 */
export default function ThemeColorSync() {
  const theme = useResolvedTheme();
  const pathname = usePathname();
  useEffect(() => {
    const page = document.querySelector(".tier-app") ?? document.body;
    const color = getComputedStyle(page).backgroundColor;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
  }, [theme, pathname]);
  return null;
}
