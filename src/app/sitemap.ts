import type { MetadataRoute } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://luna-tracker.a3ro.dev").replace(/\/+$/, "");

// Only the public routes from src/proxy.ts; everything else sits behind sign-in.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, priority: 1 },
    { url: `${SITE_URL}/transparency`, priority: 0.7 },
    { url: `${SITE_URL}/privacy`, priority: 0.5 },
    { url: `${SITE_URL}/terms`, priority: 0.5 },
    { url: `${SITE_URL}/signup`, priority: 0.5 },
  ];
}
