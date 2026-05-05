import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!, {
  // Vercel caches fetch() responses by default. This tells every
  // Neon HTTP call to skip the cache so the dashboard and API
  // routes always see fresh DB data.
  fetchOptions: { cache: "no-store" },
});
export const db = drizzle(sql, { schema });
