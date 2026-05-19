import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendPasswordResetEmail } from "@/lib/email";
import { forgotPasswordSchema } from "@/lib/schemas/auth";
import { rateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/utils";

const MAX_RESET_ATTEMPTS = 3;
const RESET_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parsed = forgotPasswordSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { email } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Rate limit by email
    const rateResult = await rateLimit(
      `reset:${normalizedEmail}`,
      MAX_RESET_ATTEMPTS,
      RESET_WINDOW_MS,
    );
    if (!rateResult.success) {
      return NextResponse.json(
        { error: "Too many reset requests. Please try again later." },
        { status: 429 },
      );
    }

    const userRecord = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
      columns: { id: true, email: true, name: true },
    });

    // Always return success to prevent email enumeration
    if (!userRecord) {
      return NextResponse.json({ success: true });
    }

    // Generate a crypto-secure token
    const token = crypto.randomUUID();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db
      .update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpiry: expiry,
      })
      .where(eq(users.id, userRecord.id));

    // Build reset URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Send reset email (non-blocking)
    sendPasswordResetEmail({
      to: userRecord.email,
      resetUrl,
      userName: userRecord.name || undefined,
    }).catch((err) => {
      logError("password-reset-email", err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("forgot-password", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
