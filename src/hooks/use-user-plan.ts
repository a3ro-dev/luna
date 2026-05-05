"use client";

import { useState, useEffect } from "react";
import type { UserPlan } from "@/lib/theme/accent";

interface UserPlanResult {
  plan: UserPlan;
  loading: boolean;
}

// Simple module-level cache
let cachedPlan: UserPlan | null = null;
let fetchPromise: Promise<UserPlan> | null = null;

async function fetchUserPlan(): Promise<UserPlan> {
  if (cachedPlan) return cachedPlan;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) return "free";
      const data = await res.json();
      const plan = (data.plan as UserPlan) || "free";
      cachedPlan = plan;
      return plan;
    } catch {
      return "free";
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function useUserPlan(): UserPlanResult {
  const [plan, setPlan] = useState<UserPlan>(cachedPlan || "free");
  const [loading, setLoading] = useState(!cachedPlan);

  useEffect(() => {
    if (cachedPlan) {
      setPlan(cachedPlan);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchUserPlan().then((p) => {
      setPlan(p);
      setLoading(false);
    });
  }, []);

  return { plan, loading };
}
