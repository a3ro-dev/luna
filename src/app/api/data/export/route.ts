import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cycles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

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
      mStart: c.mStart,
      mEnd: c.mEnd,
      ovulationDate: c.ovulationDate,
      cycleLength: c.cycleLength,
      periodLength: c.periodLength,
      notes: c.notes,
    })),
  });
}
