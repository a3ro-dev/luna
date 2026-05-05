import { NextResponse } from "next/server";
import { cleanupExpiredImages } from "@/lib/chat/images";

/**
 * Cleanup endpoint for expired images.
 * Called by Vercel Cron or an external scheduler.
 * Protected by a simple shared secret to prevent abuse.
 */
export async function GET(req: Request) {
  // Verify cron secret if set
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
    console.error("Image cleanup error:", err);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 },
    );
  }
}
