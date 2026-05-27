import React from "react";
import LoginPageClient from "./login-client";

// CSP nonces only work on dynamically rendered pages
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginPageClient />;
}
