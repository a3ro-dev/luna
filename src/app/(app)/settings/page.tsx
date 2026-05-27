import React from "react";
import SettingsPageClient from "./settings-client";

// CSP nonces only work on dynamically rendered pages
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <SettingsPageClient />;
}
