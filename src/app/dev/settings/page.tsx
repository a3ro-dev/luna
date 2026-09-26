import React from "react";
import { notFound } from "next/navigation";
import SettingsPageClient from "@/app/(app)/settings/settings-client";
import { normalizeUserPlan } from "@/lib/theme/accent";
import { DevFixtures } from "../fixtures";

export const dynamic = "force-dynamic";

/*
 * Development-only preview of Settings for a fixture user. No account, no
 * database: every /api request is answered by DevFixtures.
 *   /dev/settings?plan=free|premium|premium%2B
 */

export default async function SettingsPreview({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const plan = normalizeUserPlan((await searchParams).plan);

  // Same fields as GET /api/user/profile
  const profile = {
    name: "Maya",
    email: "maya@example.com",
    timezone: "America/New_York",
    dateOfBirth: "1996-04-12",
    conditions: ["thyroid"],
    perimenoStage: null,
    pushNotificationsEnabled: true,
    weekStart: 1,
    plan,
    dobEditCount: 1,
  };

  return (
    <DevFixtures key={plan} get={{ "/api/user/profile": profile }}>
      <SettingsPageClient />
    </DevFixtures>
  );
}
