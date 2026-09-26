import type { Metadata, Viewport } from "next";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";
import AppSessionProvider from "@/components/SessionProvider";
import PWAProvider from "@/components/PWAProvider";
import CookieConsent from "@/components/CookieConsent";
import { cn } from "@/lib/utils";

// UI type is the platform's own (SF Pro on Apple devices), so nothing to download.
// The serif is Apple's New York where available; Instrument Serif is the fallback.
const instrumentSerif = Instrument_Serif({
  weight: "400",
  variable: "--font-instrument-serif",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#FBF6F7",
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
// and stamps it onto its own inline hydration <script> tags. No action needed
// in the layout — the proxy does the work.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        instrumentSerif.variable,
        "font-sans",
      )}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#FCFBFB]">
        <AppSessionProvider>
          <PWAProvider />
          <CookieConsent />
          {children}
        </AppSessionProvider>
      </body>
    </html>
  );
}
