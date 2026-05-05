import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user?.id;

  // ── Rate limiting for auth endpoints ──────────────────────
  // Login: 5 requests per 60 seconds per IP
  if (
    pathname.includes("/api/auth") &&
    req.method === "POST" &&
    !pathname.includes("register") &&
    !pathname.includes("forgot-password") &&
    !pathname.includes("reset-password") &&
    !pathname.includes("send-otp") &&
    !pathname.includes("verify-otp")
  ) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const result = rateLimit(`login:${ip}`, 5, 60 * 1000);
    if (!result.success) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 },
      );
    }
  }

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
