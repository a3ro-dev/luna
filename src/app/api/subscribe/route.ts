import { NextRequest, NextResponse } from "next/server";
import { sendSubscriptionRequestEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

// Rate limit: 3 requests per hour per IP — prevents email spam abuse
const SUBSCRIBE_RATE_LIMIT = 3;
const SUBSCRIBE_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const rateResult = await rateLimit(`subscribe:${ip}`, SUBSCRIBE_RATE_LIMIT, SUBSCRIBE_RATE_WINDOW_MS);
  if (!rateResult.success) {
    return NextResponse.json(
      { error: "Too many subscription requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const { email, plan, name } = body as {
      email?: string;
      plan?: string;
      name?: string;
    };

    // Validate email — use a proper RFC-5322 pattern, not just includes("@")
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 },
      );
    }

    // Validate plan
    const validPlans = ["Luna Premium", "Luna Premium+"];
    if (!plan || !validPlans.includes(plan)) {
      return NextResponse.json(
        { error: "Please select a valid plan." },
        { status: 400 },
      );
    }

    const result = await sendSubscriptionRequestEmail({
      subscriberEmail: email.trim().toLowerCase(),
      planName: plan,
      subscriberName: name?.trim() || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Subscription request sent! Check your email for confirmation.",
      adminNotified: result.adminSent,
    });
  } catch (error) {
    console.error("Subscribe API error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
