import type { Metadata, Viewport } from "next";
import { Instrument_Serif } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import AppSessionProvider from "@/components/SessionProvider";
import PWAProvider from "@/components/PWAProvider";
import CookieConsent from "@/components/CookieConsent";
import { cn } from "@/lib/utils";
import { themeScript } from "@/lib/theme/no-flash";
import ThemeColorSync from "@/lib/theme/theme-color";

// UI type is the platform's own (SF Pro on Apple devices), so nothing to download.
// The serif is Apple's New York where available; Instrument Serif is the fallback.
const instrumentSerif = Instrument_Serif({
  weight: "400",
  variable: "--font-instrument-serif",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  // First paint follows the OS (dark is the Free night --tier-bg); after
  // hydration ThemeColorSync matches the page, its plan and the in-app mode.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF6F7" },
    { media: "(prefers-color-scheme: dark)", color: "#1F111A" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Luna - Cycle Tracker",
  description:
    "Your caring health companion — log, predict, and chat about your cycle",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/luna.png", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png" }, { url: "/icons/icon-512.png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Luna",
  },
  formatDetection: {
    telephone: false,
  },
};

// Next.js automatically reads the x-nonce request header (set by src/proxy.ts)
// and stamps it onto its own inline hydration <script> tags. Our own inline
// theme script needs the same nonce passed explicitly.
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        instrumentSerif.variable,
        "font-sans",
      )}
      // The theme script adds `dark` before hydration.
      suppressHydrationWarning
    >
      <head>
        {/* Browsers hide the nonce attribute after parsing, hence suppressHydrationWarning. */}
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[var(--luna-page)]">
        <AppSessionProvider>
          <PWAProvider />
          <ThemeColorSync />
          <CookieConsent />
          {children}
        </AppSessionProvider>
      </body>
    </html>
  );
}
