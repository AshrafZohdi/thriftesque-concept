import type { Metadata, Viewport } from "next";
import { preconnect } from "react-dom";
import { Anton, Instrument_Sans, Space_Mono } from "next/font/google";
import { ChromeDefs } from "@/components/Chrome";
import { PreviewStrip } from "@/components/PreviewStrip";
import { SITE_DESCRIPTION, SITE_TITLE, isPreview, siteUrl } from "@/lib/site";
import "./globals.css";

// Self-hosted at build time, so no request goes to Google (D-018). Families from option F (D-029).
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400" });
const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"] });
const spaceMono = Space_Mono({ variable: "--font-spacemono", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // Sample pieces shouldn't end up in search results (D-044).
  ...(isPreview ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#d6f84c", // token-ok: matches --color-lime, the strip at the top of every page
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Product photos come from Supabase Storage: open that connection while the page is still loading, not at the first image.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) preconnect(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin);
  return (
    <html lang="en" className={`${anton.variable} ${instrument.variable} ${spaceMono.variable}`}>
      <body>
        <ChromeDefs />
        {isPreview && <PreviewStrip />}
        {children}
      </body>
    </html>
  );
}
