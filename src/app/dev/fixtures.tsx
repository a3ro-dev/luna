"use client";

import React, { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { createUIMessageStreamResponse, type UIMessageChunk } from "ai";

/*
 * Development-only fixture layer for the /dev previews. While a preview is on
 * screen, every request whose path starts with /api/ is answered here and never
 * reaches the server, so nothing can read or write the database:
 *   GET                      -> the fixture JSON for that path, otherwise 404 JSON
 *   GET  /api/chat/:id/stream -> 204 (no reply to resume)
 *   POST /api/chat           -> a fake reply, streamed a word every 40 ms; Stop aborts it
 *   DELETE a chat            -> success after 300 ms (500 with ?failDelete in the URL)
 *   anything else            -> a harmless success
 * Plain links into /api/ (Export your data) are blocked as well.
 */

const SESSION: Session = {
  user: { id: "dev-maya", name: "Maya", email: "maya@example.com" },
  expires: "2099-01-01T00:00:00.000Z",
};

// The root layout's next-auth provider can ask for these before a preview renders.
const AUTH_ROUTES: Record<string, unknown> = {
  "/api/auth/session": SESSION,
  "/api/auth/csrf": { csrfToken: "dev-preview" },
};

const fixtures: { routes: Record<string, unknown>; mounted: number } = { routes: {}, mounted: 0 };
let realFetch: typeof fetch | undefined;

const REPLY_WORDS =
  "This is a preview, so nothing was sent and nothing was saved. In the app, Luna would answer here, a few words at a time, the way a real reply streams in. Try sending another message before this one finishes, switching chats, or tapping Stop.".split(
    /(?= )/,
  );

/** The UI message stream protocol, as the real route speaks it, without a model. */
function fakeReply(signal: AbortSignal | null | undefined): Response {
  const id = "text-1";
  let timer: ReturnType<typeof setInterval> | undefined;
  return createUIMessageStreamResponse({
    stream: new ReadableStream<UIMessageChunk>({
      start(controller) {
        controller.enqueue({ type: "start", messageId: `dev-reply-${Date.now()}` });
        controller.enqueue({ type: "text-start", id });
        let i = 0;
        timer = setInterval(() => {
          if (i < REPLY_WORDS.length) {
            controller.enqueue({ type: "text-delta", id, delta: REPLY_WORDS[i++] });
            return;
          }
          clearInterval(timer);
          controller.enqueue({ type: "text-end", id });
          controller.enqueue({ type: "finish" });
          controller.close();
        }, 40);
        signal?.addEventListener("abort", () => {
          clearInterval(timer);
          controller.error(new DOMException("The reply was stopped.", "AbortError"));
        });
      },
      cancel() {
        clearInterval(timer);
      },
    }),
  });
}

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

const fakeFetch: typeof fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  const { pathname } = new URL(url, location.href);
  // Outside /dev/ (the moment after navigating away) real pages get the real network.
  if (!pathname.startsWith("/api/") || !location.pathname.startsWith("/dev/")) {
    return realFetch!(input, init);
  }
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (method === "GET" && /^\/api\/chat\/[^/]+\/stream$/.test(pathname)) {
    return new Response(null, { status: 204 });
  }
  if (method === "GET") {
    const body = fixtures.routes[pathname] ?? AUTH_ROUTES[pathname];
    return body === undefined
      ? Response.json({ error: `No dev fixture for ${pathname}` }, { status: 404 })
      : Response.json(body);
  }
  if (pathname === "/api/chat") {
    return fakeReply(init?.signal ?? (input instanceof Request ? input.signal : undefined));
  }
  if (method === "DELETE" && pathname.startsWith("/api/chat/sessions/")) {
    await wait(300);
    return new URLSearchParams(location.search).has("failDelete")
      ? Response.json({ error: "Preview: delete failed on purpose" }, { status: 500 })
      : Response.json({ success: true });
  }
  const rename = pathname.match(/^\/api\/chat\/sessions\/([^/]+)\/rename$/);
  if (rename) {
    const now = new Date().toISOString();
    return Response.json({ id: rename[1], title: "A chat in the preview", createdAt: now, updatedAt: now });
  }
  if (pathname === "/api/chat/sessions") {
    const now = new Date().toISOString();
    return Response.json({ id: `dev-${Date.now()}`, title: null, createdAt: now, updatedAt: now });
  }
  return Response.json({ success: true });
};

function install() {
  if (typeof window === "undefined" || window.fetch === fakeFetch) return;
  realFetch = window.fetch;
  window.fetch = fakeFetch;
}

function blockApiLinks(event: MouseEvent) {
  const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (link instanceof HTMLAnchorElement && new URL(link.href).pathname.startsWith("/api/")) {
    event.preventDefault();
  }
}

install();

export function DevFixtures({ get, children }: { get: Record<string, unknown>; children: React.ReactNode }) {
  // During render, so the previewed component's first effects already see the fixtures.
  useState(() => {
    fixtures.routes = get;
    install();
  });

  useEffect(() => {
    fixtures.mounted++;
    document.addEventListener("click", blockApiLinks, true);
    return () => {
      fixtures.mounted--;
      document.removeEventListener("click", blockApiLinks, true);
      // Deferred: Strict Mode re-runs the children's effects before this one re-mounts.
      queueMicrotask(() => {
        if (fixtures.mounted === 0 && window.fetch === fakeFetch && realFetch) window.fetch = realFetch;
      });
    };
  }, []);

  return <SessionProvider session={SESSION}>{children}</SessionProvider>;
}
