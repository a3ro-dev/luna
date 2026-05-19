import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendOtpEmail } from "@/lib/email";
import { logError } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

// Rate limit OTP sends: 3 per 10 minutes per user to prevent email flooding
const OTP_RATE_LIMIT = 3;
const OTP_RATE_WINDOW_MS = 10 * 60 * 1000;

function generateOtp(): string {
  // Cryptographically secure 6-digit OTP
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (100000 + (array[0] % 900000)).toString();
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit OTP sends per user
  const rateResult = await rateLimit(
    `otp:${userId}`,
    OTP_RATE_LIMIT,
    OTP_RATE_WINDOW_MS,
  );
  if (!rateResult.success) {
    return NextResponse.json(
      { error: "Too many verification requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, email: true, name: true },
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in dedicated otpToken column (separate from passwordResetToken)
    await db
      .update(users)
      .set({
        otpToken: otp,
        otpExpiry,
      })
      .where(eq(users.id, userId));

    // Send OTP email
    await sendOtpEmail({
      to: userRecord.email,
      otp,
      userName: userRecord.name || undefined,
    });

    return NextResponse.json({ success: true, email: userRecord.email });
  } catch (err) {
    logError("send-otp", err);
    return NextResponse.json(
      { error: "Failed to send verification code." },
      { status: 500 },
    );
  }
}
