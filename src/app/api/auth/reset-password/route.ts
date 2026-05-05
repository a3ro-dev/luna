import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { hash } from "bcryptjs";
import { resetPasswordSchema } from "@/lib/schemas/auth";
import { logError } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

// Rate limit password reset attempts by IP
const MAX_RESET_ATTEMPTS = 5;
const RESET_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: Request) {
  try {
    // Rate limit by IP to prevent brute-force token attacks
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateResult = rateLimit(
      `reset-pw:${ip}`,
      MAX_RESET_ATTEMPTS,
      RESET_WINDOW_MS,
    );
    if (!rateResult.success) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }

    const rawBody = await req.json();
    const parsed = resetPasswordSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { token, password } = parsed.data;

    // Find user with this token that hasn't expired
    const userRecord = await db.query.users.findFirst({
      where: and(
        eq(users.passwordResetToken, token),
        gt(users.passwordResetExpiry, new Date()),
      ),
      columns: { id: true },
    });

    if (!userRecord) {
      return NextResponse.json(
        {
          error:
            "This reset link is invalid or has expired. Please request a new one.",
        },
        { status: 400 },
      );
    }

    // Hash new password
    const passwordHash = await hash(password, 12);

    // Update password and clear reset token
    await db
      .update(users)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      })
      .where(eq(users.id, userRecord.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("reset-password", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
