import React from "react";
import OnboardingPageClient from "./onboarding-client";

// CSP nonces only work on dynamically rendered pages
export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return <OnboardingPageClient />;
}
