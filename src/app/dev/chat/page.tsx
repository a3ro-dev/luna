import React from "react";
import type { Viewport } from "next";
import type { UIMessage } from "ai";
import { notFound } from "next/navigation";
import ChatPageClient from "@/app/(app)/chat/chat-client";
import { normalizeUserPlan, type UserPlan } from "@/lib/theme/accent";
import { addDays, describeForecast, forecast } from "@/lib/prediction/forecast";
import { DevFixtures } from "../fixtures";

export const dynamic = "force-dynamic";
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

/*
 * Development-only preview of Chat for a fixture user with a few past chats.
 * No account, no database, no model calls: every /api request is answered by
 * DevFixtures, and sending streams a fake reply. Like the real page, the chats
 * and the newest chat's messages arrive with the page.
 *   /dev/chat?plan=free|premium|premium%2B   (&failDelete: deleting fails, to see the rollback)
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** A string literal for OpenUI Lang. */
const q = (s: string) => JSON.stringify(s);

const text = (id: string, role: UIMessage["role"], body: string): UIMessage => ({
  id,
  role,
  parts: [{ type: "text", text: body }],
});

function fixture(plan: UserPlan) {
  // Six regular cycles; the latest started 24 days ago, so the next is a few days out.
  const today = new Date().toISOString().slice(0, 10);
  const starts = [addDays(today, -24)];
  for (const length of [29, 28, 30, 27, 29, 28]) starts.unshift(addDays(starts[0], -length));
  const rows = starts.map((mStart) => ({ mStart, mEnd: addDays(mStart, 4) }));
  const f = forecast(rows, { conditions: [], perimenoStage: null, today });
  const t = describeForecast(f);

  const now = Date.now();
  const iso = (ago: number) => new Date(now - ago).toISOString();
  // Fixed UUIDs, like real session ids
  const ids = {
    today: "00000000-0000-4000-8000-000000000001",
    yesterday: "00000000-0000-4000-8000-000000000002",
    week: "00000000-0000-4000-8000-000000000003",
    week2: "00000000-0000-4000-8000-000000000004",
    month: "00000000-0000-4000-8000-000000000005",
  };
  const sessions = [
    { id: ids.today, title: "Cramps and my next period", createdAt: iso(20 * 60_000), updatedAt: iso(4 * 60_000) },
    { id: ids.yesterday, title: "Sleep before my period", createdAt: iso(DAY + 2 * HOUR), updatedAt: iso(DAY) },
    { id: ids.week, title: "Logging a late start", createdAt: iso(3 * DAY + HOUR), updatedAt: iso(3 * DAY) },
    { id: ids.week2, title: "Thyroid and cycle length", createdAt: iso(5 * DAY + HOUR), updatedAt: iso(5 * DAY) },
    { id: ids.month, title: "Cycle stats", createdAt: iso(34 * DAY), updatedAt: iso(34 * DAY) },
  ];

  const card = [
    "root = Card([header, nextPeriod, window, ovulation, basis, followups])",
    `header = CardHeader("Next period forecast", ${q(t.status)})`,
    `nextPeriod = TextContent(${q(t.headline ?? "No estimate yet")}, "large-heavy")`,
    `window = TextContent(${q(t.window ?? "")}, "default")`,
    `ovulation = TextContent(${q(t.ovulation ?? "Ovulation not estimated.")}, "small")`,
    `basis = TextContent(${q(t.basis)}, "small")`,
    "followups = FollowUpBlock([fu1, fu2])",
    'fu1 = FollowUpItem("Log my period start")',
    'fu2 = FollowUpItem("Show my cycle stats")',
  ].join("\n");

  const active: UIMessage[] = [
    text("m1", "user", "I’ve had cramps since this morning and I’m so tired. Is that normal this close to my period?"),
    text(
      "m2",
      "assistant",
      "That sounds draining, I’m sorry. Cramps and tiredness in the days before a period are really common, as hormone levels drop.\n\nA few things help many people:\n\n- warmth on your lower belly\n- gentle movement, like a short walk\n- water and an earlier night\n\nIf the pain is much worse than usual, or stops you getting through the day, it’s worth checking in with a doctor.",
    ),
    text("m3", "user", "When is my next period?"),
    {
      id: "m4",
      role: "assistant",
      parts: [
        { type: "step-start" },
        {
          type: "tool-computePredictions",
          toolCallId: "dev-call-1",
          state: "output-available",
          input: {},
          output: { responseMode: "openui", kind: "prediction" },
        },
        { type: "text", text: card },
      ],
    },
  ];

  const get: Record<string, unknown> = {
    "/api/chat/sessions": sessions,
    [`/api/chat/sessions/${ids.today}/messages`]: active,
    [`/api/chat/sessions/${ids.yesterday}/messages`]: [
      text("y1", "user", "Why do I sleep so badly the week before my period?"),
      text("y2", "assistant", "You’re not imagining it. Progesterone falls before a period and body temperature runs a little higher, and both can make sleep lighter. A cooler room and a steady bedtime often help."),
    ],
    [`/api/chat/sessions/${ids.week}/messages`]: [
      text("w1", "user", "My period started on Monday, I forgot to log it."),
      text("w2", "assistant", "No problem, I’ve logged your period start for Monday. Your forecast is up to date."),
    ],
    [`/api/chat/sessions/${ids.week2}/messages`]: [
      text("w3", "user", "Can my thyroid make my cycles longer?"),
      text("w4", "assistant", "It can. An underactive or overactive thyroid can both shift cycle length. Since you’ve added it in Settings, Luna gives your estimates a little more room."),
    ],
    [`/api/chat/sessions/${ids.month}/messages`]: [
      text("s1", "user", "Show my cycle stats"),
      text("s2", "assistant", "Your cycles have averaged about 28 days, and your periods about 5 days, across your last six cycles."),
    ],
  };

  const cycleContext =
    plan === "premium+"
      ? { nextPeriod: t.headline ?? "No estimate yet", window: t.window, status: t.status }
      : null;

  return { get, cycleContext, sessions, active };
}

export default async function ChatPreview({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const plan = normalizeUserPlan((await searchParams).plan);
  const { get, cycleContext, sessions, active } = fixture(plan);

  return (
    <DevFixtures key={plan} get={get}>
      <ChatPageClient
        plan={plan}
        cycleContext={cycleContext}
        initialSessions={sessions}
        initialMessages={active}
      />
    </DevFixtures>
  );
}
