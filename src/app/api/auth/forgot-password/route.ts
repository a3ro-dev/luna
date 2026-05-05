import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    const userRecord = await db.query.users.findFirst({
      where: eq(users.email, email.trim().toLowerCase()),
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
      "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Send reset email (non-blocking)
    sendPasswordResetEmail({
      to: userRecord.email,
      resetUrl,
      userName: userRecord.name || undefined,
    }).catch((err) => {
      console.error("Failed to send password reset email:", err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
