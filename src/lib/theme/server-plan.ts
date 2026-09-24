import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { normalizeUserPlan } from "./accent";

export async function getUserPlan(userId: string) {
  const record = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { plan: true },
  });

  return normalizeUserPlan(record?.plan);
}
