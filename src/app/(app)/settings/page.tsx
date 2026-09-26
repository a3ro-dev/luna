import React from "react";
import type { Metadata } from "next";
import SettingsPageClient from "./settings-client";

// CSP nonces only work on dynamically rendered pages
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings - Luna",
};

export default function SettingsPage() {
  return <SettingsPageClient />;
}
