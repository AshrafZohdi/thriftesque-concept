import type { Metadata, Viewport } from "next";
import { Anton, Instrument_Sans, Space_Mono } from "next/font/google";
import { ChromeDefs } from "@/components/Chrome";
import { siteUrl } from "@/lib/site";
import "./globals.css";

// Self-hosted at build time, so no request goes to Google (D-018). Families from option F (D-029).
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400" });
const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"] });
const spaceMono = Space_Mono({ variable: "--font-spacemono", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Thriftesque | Pre-loved pieces, one of each",
  description:
    "Hand-picked secondhand clothing in Qatar. Every piece is one of one. Browse the drop and order on WhatsApp.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#d6f84c", // token-ok: matches --color-lime, the strip at the top of every page
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anton.variable} ${instrument.variable} ${spaceMono.variable}`}>
      <body>
        <ChromeDefs />
        {children}
      </body>
    </html>
  );
}
