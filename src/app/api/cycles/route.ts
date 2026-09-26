import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { closeStartFor, createCycle, diffInDays } from "@/lib/cycle-tools";
import { logError } from "@/lib/utils";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const cycleCreateSchema = z.object({
  mStart: isoDate,
  mEnd: isoDate.nullable().optional(),
  /** The user already confirmed a start close to another one is a separate period. */
  confirmedSeparatePeriod: z.boolean().optional(),
});

/** Log a period directly (the dashboard's quick-log path; chat uses the same validated writer). */
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = cycleCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid dates." }, { status: 400 });

  try {
    const { mStart, mEnd, confirmedSeparatePeriod } = parsed.data;
    // Same question chat asks: a second start this close is usually the same period (autoresearch R4-1).
    const existingStart = confirmedSeparatePeriod ? null : await closeStartFor(userId, mStart);
    if (existingStart) {
      return NextResponse.json(
        { confirm: { kind: "close-to-existing", existingStart, days: Math.abs(diffInDays(existingStart, mStart)) } },
        { status: 409 },
      );
    }
    const result = await createCycle(userId, { mStart, mEnd: mEnd ?? null });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ cycle: result.cycle, missedLog: result.missedLog }, { status: 201 });
  } catch (err) {
    logError("cycles:create", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
