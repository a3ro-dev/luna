import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { compare, hash } from "bcryptjs";
import { profileUpdateSchema } from "@/lib/schemas/auth";
import { logError } from "@/lib/utils";

const MAX_DOB_EDITS = 2;

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        name: true,
        email: true,
        timezone: true,
        dateOfBirth: true,
        conditions: true,
        pushNotificationsEnabled: true,
        weekStart: true,
        plan: true,
        dobEditCount: true,
      },
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(userRecord);
  } catch (err) {
    logError("profile", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawBody = await req.json();
    const parsed = profileUpdateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const {
      name,
      email,
      timezone,
      conditions,
      dateOfBirth,
      pushNotificationsEnabled,
      weekStart,
      passwordChange,
    } = body;

    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        dateOfBirth: true,
        dobEditCount: true,
      },
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    // ── Name ──────────────────────────────────────────
    if (name !== undefined) {
      updates.name = name;
    }

    // ── Email ─────────────────────────────────────────
    if (email !== undefined) {
      if (email !== userRecord.email) {
        const existingUser = await db.query.users.findFirst({
          where: and(eq(users.email, email), ne(users.id, userId)),
          columns: { id: true },
        });

        if (existingUser) {
          return NextResponse.json(
            { error: "Email is already in use by another account." },
            { status: 409 },
          );
        }
      }
      updates.email = email;
    }

    // ── Timezone ──────────────────────────────────────
    if (timezone !== undefined) {
      updates.timezone = timezone;
    }

    // ── Conditions ────────────────────────────────────
    if (conditions !== undefined) {
      updates.conditions = conditions;
    }

    // ── Push Notifications ────────────────────────────
    if (pushNotificationsEnabled !== undefined) {
      updates.pushNotificationsEnabled = pushNotificationsEnabled;
    }

    // ── Week Start ────────────────────────────────────
    if (weekStart !== undefined) {
      updates.weekStart = weekStart;
    }

    // ── Date of Birth (with edit count restriction) ───
    if (dateOfBirth !== undefined) {
      const currentDob = userRecord.dateOfBirth;
      const dobChanged = currentDob !== dateOfBirth;

      if (dobChanged) {
        const editCount = userRecord.dobEditCount ?? 0;
        const isFirstSet = !currentDob;

        if (!isFirstSet && editCount >= MAX_DOB_EDITS) {
          return NextResponse.json(
            { error: "Date of birth can only be changed twice." },
            { status: 400 },
          );
        }

        updates.dateOfBirth = dateOfBirth;
        if (!isFirstSet) {
          updates.dobEditCount = editCount + 1;
        }
      }
    }

    // ── Password Change ───────────────────────────────
    if (passwordChange) {
      const { currentPassword, newPassword } = passwordChange;

      if (!userRecord.passwordHash) {
        return NextResponse.json(
          { error: "No password is set for this account." },
          { status: 400 },
        );
      }

      const isCurrentValid = await compare(
        currentPassword,
        userRecord.passwordHash,
      );
      if (!isCurrentValid) {
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 401 },
        );
      }

      updates.passwordHash = await hash(newPassword, 10);
    }

    // ── Persist updates ───────────────────────────────
    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, userId));
    }

    // ── Fetch fresh state for response ────────────────
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        name: true,
        email: true,
        timezone: true,
        dateOfBirth: true,
        conditions: true,
        pushNotificationsEnabled: true,
        weekStart: true,
        plan: true,
        dobEditCount: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err) {
    logError("profile", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
