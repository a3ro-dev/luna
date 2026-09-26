import { NextRequest, NextResponse } from "next/server";
import { sendSubscriptionRequestEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  plan: z.enum(["Luna Premium", "Luna Premium+"]),
  name: z.string().trim().max(60).optional(),
});

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
    const parsed = subscribeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "A valid email address and plan are required." },
        { status: 400 },
      );
    }
    const { email, plan, name } = parsed.data;

    const result = await sendSubscriptionRequestEmail({
      subscriberEmail: email,
      planName: plan,
      subscriberName: name || undefined,
    });

    if (!result.adminSent) {
      return NextResponse.json(
        { error: "We could not send your request. Please try again later." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.subscriberSent
        ? "Subscription request sent! Check your email for confirmation."
        : "Subscription request sent! We will email you with next steps.",
    });
  } catch (error) {
    console.error("Subscribe API error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
