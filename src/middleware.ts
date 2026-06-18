import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

// ─── Nonce + CSP ──────────────────────────────────────────────────────
// CSP must be set per-request (not statically in next.config.ts) so that
// each response carries a unique nonce. Next.js reads the x-nonce request
// header and automatically stamps it onto its own inline <script> tags.
function buildCspResponse(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  // 'strict-dynamic' allows scripts loaded by nonced scripts to run without
  // needing their own nonce (covers Next.js chunk loading).
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://models.dev",
    "font-src 'self' https://fonts.gstatic.com https://frontend-cdn.perplexity.ai",
    "connect-src 'self' https://ai.hackclub.com https://api.supermemory.ai https://search.hackclub.com blob:",
    "media-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  // Forward the nonce to server components via a request header.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

// NOTE: Rate limiting for auth endpoints is handled inside each route handler
// (forgot-password, reset-password) using the async Redis-backed rateLimit().
// Next.js middleware cannot use async rate limiting for the NextAuth callback
// path without blocking the auth flow, so login brute-force protection is
// enforced at the route level via Auth.js's built-in signIn error handling
// and the per-IP limiter in /api/auth/reset-password.

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user?.id;

  // ── Public routes that don't require auth ─────────────────
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/privacy",
    "/terms",
    "/transparency",
  ];
  const isPublic = publicRoutes.some(
    (r) => pathname === r || pathname.startsWith("/api/auth/"),
  );

  // Onboarding is always accessible when logged in (consent happens here)
  const isOnboarding = pathname === "/onboarding";

  // Cron routes use their own Bearer token auth
  const isCron = pathname.startsWith("/api/cron/");

  // Subscribe is public
  const isPublicApi = pathname === "/api/subscribe";

  // ── Auth gate ──────────────────────────────────
  if (!isLoggedIn && !isPublic && !isCron && !isPublicApi) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Consent gate: existing users who haven't consented ──
  // Only enforce on protected pages, not public/onboarding/api
  if (
    isLoggedIn &&
    !isPublic &&
    !isOnboarding &&
    !isCron &&
    !isPublicApi &&
    !pathname.startsWith("/api/")
  ) {
    const consentGiven = (req.auth?.user as Record<string, unknown> | undefined)
      ?.consentGiven;
    if (consentGiven === false || consentGiven === undefined) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  // API routes do not require CSP headers and returning a plain NextResponse.next()
  // prevents Next.js from dropping POST request bodies during header cloning.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return buildCspResponse(req);
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, luna.png, etc.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|luna\\.png|.*\\..*).*)",
  ],
};
