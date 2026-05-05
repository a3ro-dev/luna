import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email";
import { registerSchema } from "@/lib/schemas/auth";
import { logError } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parsed = registerSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { email, password, name } = parsed.data;

    // Check if user already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existing) {
      // Return success to prevent email enumeration
      // The user won't be auto-logged in since no account was created
      return NextResponse.json({ success: true }, { status: 201 });
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
        logError("welcome-email", err);
      },
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    logError("registration", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
