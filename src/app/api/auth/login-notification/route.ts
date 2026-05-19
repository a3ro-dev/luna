import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  sendLoginNotification,
  geoLocateIp,
  parseUserAgent,
} from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

// Rate limit: 1 notification per 5 minutes per user to prevent self-spam
const NOTIFY_RATE_LIMIT = 1;
const NOTIFY_RATE_WINDOW_MS = 5 * 60 * 1000;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit per user — prevents repeated self-triggered notifications
  const rateResult = await rateLimit(
    `login-notify:${session.user.id}`,
    NOTIFY_RATE_LIMIT,
    NOTIFY_RATE_WINDOW_MS,
  );
  if (!rateResult.success) {
    // Silently succeed — no need to tell the caller we suppressed it
    return NextResponse.json({ sent: false, suppressed: true });
  }

  try {
    const userAgent = req.headers.get("user-agent") || "";
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const rawIp = forwarded?.split(",")[0]?.trim() || realIp || "127.0.0.1";

    const { browser, os, device } = parseUserAgent(userAgent);
    const geo = await geoLocateIp(rawIp);

    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { email: true, name: true },
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Send login notification (non-blocking)
    sendLoginNotification({
      to: userRecord.email,
      userName: userRecord.name || undefined,
      location: {
        ip: rawIp,
        city: geo.city,
        region: geo.region,
        country: geo.country,
        browser,
        os,
        device,
        timestamp: new Date().toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      },
    }).catch((err) => {
      console.error("Failed to send login notification:", err);
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("Login notification error:", err);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 },
    );
  }
}
