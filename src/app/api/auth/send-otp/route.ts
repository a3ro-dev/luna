import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendOtpEmail } from "@/lib/email";

function generateOtp(): string {
  // 6-digit numeric OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Store OTP in user record (reuse passwordResetToken field temporarily)
    await db
      .update(users)
      .set({
        passwordResetToken: `otp:${otp}`,
        passwordResetExpiry: otpExpiry,
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
    console.error("Send OTP error:", err);
    return NextResponse.json(
      { error: "Failed to send verification code." },
      { status: 500 },
    );
  }
}
