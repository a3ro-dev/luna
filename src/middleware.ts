import { auth } from "@/auth";
import { NextResponse } from "next/server";

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
  ];
  const isPublic = publicRoutes.some(
    (r) => pathname === r || pathname.startsWith("/api/auth/"),
  );

  // Cron routes use their own Bearer token auth
  const isCron = pathname.startsWith("/api/cron/");

  // Subscribe is public
  const isPublicApi = pathname === "/api/subscribe";

  if (!isLoggedIn && !isPublic && !isCron && !isPublicApi) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
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
