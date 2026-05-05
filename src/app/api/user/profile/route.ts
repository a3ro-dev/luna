import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { compare, hash } from "bcryptjs";

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
    console.error("\x1b[35m%s\x1b[0m", "[profile] GET failed:", err);
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
    const body = await req.json();
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
    if (name !== undefined && typeof name === "string") {
      updates.name = name;
    }

    // ── Email ─────────────────────────────────────────
    if (email !== undefined && typeof email === "string") {
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
    if (timezone !== undefined && typeof timezone === "string") {
      updates.timezone = timezone;
    }

    // ── Conditions ────────────────────────────────────
    if (conditions !== undefined && Array.isArray(conditions)) {
      updates.conditions = conditions;
    }

    // ── Push Notifications ────────────────────────────
    if (
      pushNotificationsEnabled !== undefined &&
      typeof pushNotificationsEnabled === "boolean"
    ) {
      updates.pushNotificationsEnabled = pushNotificationsEnabled;
    }

    // ── Week Start ────────────────────────────────────
    if (weekStart !== undefined && typeof weekStart === "number") {
      updates.weekStart = weekStart;
    }

    // ── Date of Birth (with edit count restriction) ───
    if (dateOfBirth !== undefined && typeof dateOfBirth === "string") {
      // Empty string → null for Postgres date column
      const normalizedDob = dateOfBirth === "" ? null : dateOfBirth;
      const currentDob = userRecord.dateOfBirth;
      const dobChanged = currentDob !== normalizedDob;

      if (dobChanged) {
        const editCount = userRecord.dobEditCount ?? 0;
        const isFirstSet = !currentDob;

        // Clearing the date is not an edit, setting a new value is
        if (normalizedDob && !isFirstSet && editCount >= MAX_DOB_EDITS) {
          return NextResponse.json(
            { error: "Date of birth can only be changed twice." },
            { status: 400 },
          );
        }

        updates.dateOfBirth = normalizedDob;
        if (normalizedDob && !isFirstSet) {
          updates.dobEditCount = editCount + 1;
        }
      }
    }

    // ── Password Change ───────────────────────────────
    if (passwordChange) {
      const { currentPassword, newPassword } = passwordChange;

      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { error: "Both currentPassword and newPassword are required." },
          { status: 400 },
        );
      }

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
    console.error("\x1b[35m%s\x1b[0m", "[profile] PATCH failed:", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
