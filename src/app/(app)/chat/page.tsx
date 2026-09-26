import React from "react";
import type { Viewport } from "next";
import ChatPageClient from "./chat-client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPlan } from "@/lib/theme/server-plan";
import { getUserForecast } from "@/lib/cycle-tools";

// CSP nonces only work on dynamically rendered pages
export const dynamic = "force-dynamic";

// Android Chrome shrinks the layout for the keyboard, so the composer stays above it.
// Merges with the root layout's viewport.
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const plan = await getUserPlan(session.user.id);
  const cycleContext = plan === "premium+"
    ? await getUserForecast(session.user.id).then(({ text }) => ({
        nextPeriod: text.headline ?? "No estimate yet",
        window: text.window,
        status: text.status,
      }))
    : null;

  return <ChatPageClient plan={plan} cycleContext={cycleContext} />;
}
