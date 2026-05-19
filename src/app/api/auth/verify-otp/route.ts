import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { logError } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { otp } = await req.json();

    if (!otp || typeof otp !== "string") {
      return NextResponse.json(
        { error: "Verification code is required." },
        { status: 400 },
      );
    }

    // Validate OTP format — must be exactly 6 digits
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "Invalid verification code format." },
        { status: 400 },
      );
    }

    // Find user with matching OTP in the dedicated otpToken column
    const userRecord = await db.query.users.findFirst({
      where: and(
        eq(users.id, userId),
        eq(users.otpToken, otp),
        gt(users.otpExpiry, new Date()),
      ),
      columns: { id: true },
    });

    if (!userRecord) {
      return NextResponse.json(
        { error: "Invalid or expired verification code." },
        { status: 400 },
      );
    }

    // Clear the OTP token after successful verification
    await db
      .update(users)
      .set({
        otpToken: null,
        otpExpiry: null,
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("verify-otp", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
