import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserForecast } from "@/lib/cycle-tools";
import { getUserPlan } from "@/lib/theme/server-plan";
import DashboardClient from "./DashboardClient";
import { buildDashboardProps } from "./build";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { forecast, profile, rows, today } = await getUserForecast(session.user.id);
  const plan = await getUserPlan(session.user.id);

  return (
    <DashboardClient
      {...buildDashboardProps({
        plan,
        userName: session.user.name || session.user.email?.split("@")[0] || "lovely",
        rows,
        forecast,
        profile,
        today,
      })}
    />
  );
}
