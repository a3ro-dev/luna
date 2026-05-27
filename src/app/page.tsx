import React from "react";
import HomeClient from "./home-client";

// CSP nonces only work on dynamically rendered pages
export const dynamic = "force-dynamic";

export default function Home() {
  return <HomeClient />;
}
