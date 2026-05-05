import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);
    const id = crypto.randomUUID();

    await db.insert(users).values({
      id,
      email,
      passwordHash,
      name: name || null,
    });

    // Send welcome email (non-blocking — don't block the response)
    sendWelcomeEmail({ to: email, userName: name || undefined }).catch(
      (err) => {
        console.error("Failed to send welcome email:", err);
      },
    );

    return NextResponse.json({ success: true, userId: id }, { status: 201 });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
