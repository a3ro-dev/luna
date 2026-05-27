import React from "react";
import SignupPageClient from "./signup-client";

// CSP nonces only work on dynamically rendered pages
export const dynamic = "force-dynamic";

export default function SignupPage() {
  return <SignupPageClient />;
}
