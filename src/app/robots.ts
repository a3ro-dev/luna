import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://luna-tracker.a3ro.dev").replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/onboarding"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
