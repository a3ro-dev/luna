import type { Metadata, Viewport } from "next";
import { Instrument_Serif, DM_Sans, Figtree } from "next/font/google";
import "./globals.css";
import AppSessionProvider from "@/components/SessionProvider";
import PWAProvider from "@/components/PWAProvider";
import { cn } from "@/lib/utils";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const instrumentSerif = Instrument_Serif({
  weight: "400",
  variable: "--font-instrument-serif",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#FFDDE0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        dmSans.variable,
        "font-sans",
        figtree.variable,
      )}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#FCFBFB]">
        <AppSessionProvider>
          <PWAProvider />
          {children}
        </AppSessionProvider>
      </body>
    </html>
  );
}
