import React from "react";
import ResetPasswordPageClient from "./reset-password-client";

// CSP nonces only work on dynamically rendered pages
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return <ResetPasswordPageClient />;
}
