import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { onboardingSchema } from "@/lib/schemas/auth";
import { logError } from "@/lib/utils";

const MAX_DOB_EDITS = 2;

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawBody = await req.json();
    const parsed = onboardingSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { dateOfBirth, timezone, conditions, pushNotificationsEnabled } =
      parsed.data;

    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, dobEditCount: true, dateOfBirth: true },
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      onboardingCompleted: true,
      onboardingVersion: 1,
    };

    // Handle DOB with edit count restriction
    if (dateOfBirth) {
      const currentDob = userRecord.dateOfBirth;
      const dobChanged = currentDob !== dateOfBirth;

      if (dobChanged) {
        const editCount = userRecord.dobEditCount ?? 0;
        // First set during onboarding doesn't count as an edit
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

    if (timezone !== undefined) {
      updates.timezone = timezone;
    }

    if (conditions !== undefined) {
      updates.conditions = conditions;
    }

    if (pushNotificationsEnabled !== undefined) {
      updates.pushNotificationsEnabled = pushNotificationsEnabled;
    }

    await db.update(users).set(updates).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("onboarding", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      dateOfBirth: true,
      timezone: true,
      conditions: true,
      pushNotificationsEnabled: true,
      onboardingCompleted: true,
      onboardingVersion: true,
      dobEditCount: true,
      plan: true,
    },
  });

  if (!userRecord) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(userRecord);
}
