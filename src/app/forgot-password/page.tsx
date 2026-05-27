import React from "react";
import ForgotPasswordPageClient from "./forgot-password-client";

// CSP nonces only work on dynamically rendered pages
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />;
}
