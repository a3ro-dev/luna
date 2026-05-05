import { NextResponse } from "next/server";
import { cleanupExpiredImages } from "@/lib/chat/images";
import { logError } from "@/lib/utils";

/**
 * Cleanup endpoint for expired images.
 * Called by Vercel Cron or an external scheduler.
 * Protected by a simple shared secret to prevent abuse.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET is not set. Refusing to run cron job.");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deletedCount = await cleanupExpiredImages();
    return NextResponse.json({
      ok: true,
      deleted: deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logError("image-cleanup", err);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
