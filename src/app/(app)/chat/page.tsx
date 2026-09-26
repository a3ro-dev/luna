import React from "react";
import type { Viewport } from "next";
import ChatPageClient from "./chat-client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPlan } from "@/lib/theme/server-plan";
import { getUserForecast } from "@/lib/cycle-tools";
import { listSessions, loadSessionMessages } from "@/lib/chat/store";

// CSP nonces only work on dynamically rendered pages
export const dynamic = "force-dynamic";

// Android Chrome shrinks the layout for the keyboard, so the composer stays above it.
// Merges with the root layout's viewport.
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

export default async function ChatPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  // Chats arrive with the page, so the first paint needs no round trip from
  // the browser. Two independent chains run side by side.
  const [{ plan, cycleContext }, { sessions, messages }] = await Promise.all([
    getUserPlan(userId).then(async (plan) => ({
      plan,
      cycleContext:
        plan === "premium+"
          ? await getUserForecast(userId).then(({ text }) => ({
              nextPeriod: text.headline ?? "No estimate yet",
              window: text.window,
              status: text.status,
            }))
          : null,
    })),
    listSessions(userId).then(async (sessions) => ({
      sessions,
      messages: sessions[0] ? ((await loadSessionMessages(userId, sessions[0].id)) ?? []) : [],
    })),
  ]);

  return (
    <ChatPageClient
      plan={plan}
      cycleContext={cycleContext}
      initialSessions={sessions}
      initialMessages={messages}
    />
  );
}
