import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and new password are required." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

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
        { error: "This reset link is invalid or has expired. Please request a new one." },
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
    console.error("Reset password error:", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
