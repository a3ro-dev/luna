import { NextRequest, NextResponse } from "next/server";
import { sendSubscriptionRequestEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, plan, name } = body as {
      email?: string;
      plan?: string;
      name?: string;
    };

    // Validate email
    if (!email || typeof email !== "string" || !email.includes("@")) {
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
