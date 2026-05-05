import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cycles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

/**
 * Serialise a Neon Date object or string to YYYY-MM-DD.
 * The Neon driver returns `date` columns as Date objects interpreted
 * in the server's local timezone; we read local parts to get the
 * original Postgres date.
 */
function dateStr(v: Date | string | null): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return v;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userCycles = await db.query.cycles.findMany({
    where: eq(cycles.userId, session.user.id),
    orderBy: (c, { asc }) => [asc(c.mStart)],
  });

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    format: "luna",
    version: 1,
    cycles: userCycles.map((c) => ({
      mStart: dateStr(c.mStart as unknown as Date | string),
      mEnd: dateStr(c.mEnd as unknown as Date | string | null),
      ovulationDate: dateStr(
        c.ovulationDate as unknown as Date | string | null,
      ),
      cycleLength: c.cycleLength,
      periodLength: c.periodLength,
      notes: c.notes,
    })),
  });
}
