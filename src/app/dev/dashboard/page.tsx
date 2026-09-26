import React from "react";
import { notFound } from "next/navigation";
import DashboardClient from "@/app/(app)/dashboard/DashboardClient";
import { buildDashboardProps, type DashboardRow } from "@/app/(app)/dashboard/build";
import { addDays, diffDays, forecast } from "@/lib/prediction/forecast";
import { getCurrentIsoDate } from "@/lib/cycle-tools";
import type { UserPlan } from "@/lib/theme/accent";

export const dynamic = "force-dynamic";

/*
 * Development-only preview of the signed-in dashboard with fixture cycles run
 * through the real forecast engine. No database, no user data.
 *   /dev/dashboard?plan=free|premium|premium%2B&scenario=regular|late|period|new
 */

const NOTES: Record<number, string[]> = {
  1: ["cramps after coffee"],
  2: ["tender and quiet"],
  11: ["energy returning"],
  19: ["symptoms: headache"],
  24: ["heavy sleep today"],
};

function fixture(scenario: string, today: string): DashboardRow[] {
  const lengths = [29, 28, 30, 27, 29, 28];
  const daysSinceLast = scenario === "late" ? 38 : scenario === "period" ? 1 : 16;
  if (scenario === "new") {
    const start = addDays(today, -9);
    return [{ id: "f0", mStart: start, mEnd: addDays(start, 4), ovulationDate: null, cycleLength: null, periodLength: 5, isAnomaly: false, notes: {} }];
  }
  const starts: string[] = [addDays(today, -daysSinceLast)];
  for (const len of lengths) starts.unshift(addDays(starts[0], -len));
  return starts.map((mStart, i) => {
    const isLast = i === starts.length - 1;
    const bleed = 4 + (i % 2);
    const mEnd = isLast && scenario === "period" ? null : addDays(mStart, bleed - 1);
    const notes: Record<string, string[]> = {};
    for (const [day, texts] of Object.entries(NOTES)) {
      const date = addDays(mStart, Number(day) - 1);
      if (date <= today && (!starts[i + 1] || date < starts[i + 1])) notes[date] = texts;
    }
    return {
      id: `f${i}`,
      mStart,
      mEnd,
      ovulationDate: null,
      cycleLength: i > 0 ? diffDays(starts[i - 1], mStart) : null,
      periodLength: mEnd ? bleed : null,
      isAnomaly: false,
      notes,
    };
  });
}

export default async function DashboardPreview({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; scenario?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  const plan: UserPlan = sp.plan === "premium" || sp.plan === "premium+" ? sp.plan : "free";
  const today = getCurrentIsoDate("UTC");
  const rows = fixture(sp.scenario ?? "regular", today);
  const profile = { conditions: [] as string[], perimenoStage: null, dateOfBirth: "1996-04-12" };
  const f = forecast(rows, { conditions: profile.conditions, perimenoStage: null, today });

  return <DashboardClient {...buildDashboardProps({ plan, userName: "Maya", rows, forecast: f, profile, today })} />;
}
