import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans, Figtree } from "next/font/google";
import "./globals.css";
import AppSessionProvider from "@/components/SessionProvider";
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

export const metadata: Metadata = {
  title: "Luna - Cycle Tracker",
  description: "Your caring health companion",
  icons: {
    icon: "/luna.png",
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
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
