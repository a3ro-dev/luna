import React from "react";
import ChatPageClient from "./chat-client";

// CSP nonces only work on dynamically rendered pages
export const dynamic = "force-dynamic";

export default function ChatPage() {
  return <ChatPageClient />;
}
