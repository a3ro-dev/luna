"use client";

import React from "react";
import { MotionConfig } from "motion/react";
import AppTabBar from "@/components/AppTabBar";
import type { DashboardProps } from "./parts";
import FreeDashboard from "./FreeDashboard";
import PremiumDashboard from "./PremiumDashboard";
import PremiumPlusDashboard from "./PremiumPlusDashboard";

/**
 * Shared chrome for every plan: plan colour tokens, reduced-motion handling and
 * the phone tab bar. Each plan has its own layout; all get the same data.
 */
export default function DashboardClient(props: DashboardProps) {
  const Layout =
    props.plan === "premium+" ? PremiumPlusDashboard : props.plan === "premium" ? PremiumDashboard : FreeDashboard;
  return (
    <div className={`tier-app font-sans pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0`} data-plan={props.plan}>
      <MotionConfig reducedMotion="user">
        <Layout {...props} />
      </MotionConfig>
      <AppTabBar />
    </div>
  );
}
