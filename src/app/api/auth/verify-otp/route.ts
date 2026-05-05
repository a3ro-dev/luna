import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

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

    // Find user with matching OTP that hasn't expired
    const userRecord = await db.query.users.findFirst({
      where: and(
        eq(users.id, userId),
        eq(users.passwordResetToken, `otp:${otp}`),
        gt(users.passwordResetExpiry, new Date()),
      ),
      columns: { id: true },
    });

    if (!userRecord) {
      return NextResponse.json(
        { error: "Invalid or expired verification code." },
        { status: 400 },
      );
    }

    // Clear the OTP token
    await db
      .update(users)
      .set({
        passwordResetToken: null,
        passwordResetExpiry: null,
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
