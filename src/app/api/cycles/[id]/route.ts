import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { deleteCycle, updateCycle } from "@/lib/cycle-tools";
import { logError } from "@/lib/utils";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const patchSchema = z
  .object({ mStart: isoDate.optional(), mEnd: isoDate.nullable().optional() })
  .refine((v) => v.mStart !== undefined || v.mEnd !== undefined, "Nothing to change.");

type Ctx = { params: Promise<{ id: string }> };

async function authorize(ctx: Ctx) {
  const session = await auth();
  const { id } = await ctx.params;
  return { userId: session?.user?.id, id: z.uuid().safeParse(id).success ? id : null };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { userId, id } = await authorize(ctx);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid dates." }, { status: 400 });

  try {
    const result = await updateCycle(userId, id, parsed.data);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ cycle: result.cycle });
  } catch (err) {
    logError("cycles:update", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { userId, id } = await authorize(ctx);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const result = await deleteCycle(userId, id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("cycles:delete", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
