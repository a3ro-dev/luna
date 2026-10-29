import React from "react";
import HomeClient from "./home-client";

// CSP nonces only work on dynamically rendered pages
export const dynamic = "force-dynamic";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Luna",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web, installable PWA",
  description:
    "A private period tracker. Log period starts, ends, ovulation and symptoms in chat, and see cautious next-period estimates from your recorded dates. Not a medical device.",
  url: "https://luna-tracker.a3ro.dev/",
  author: { "@type": "Person", name: "Akshat Kushwaha", url: "https://a3ro.dev" },
  sameAs: ["https://github.com/a3ro-dev/luna"],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <HomeClient />
    </>
  );
}
