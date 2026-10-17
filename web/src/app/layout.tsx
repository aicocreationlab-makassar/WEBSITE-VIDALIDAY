import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getSiteUrl } from "@/lib/env";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: DEFAULT_SETTINGS.seoTitle,
    template: "%s | VIDALIDAY",
  },
  description: DEFAULT_SETTINGS.seoDescription,
  applicationName: "VIDALIDAY",
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "VIDALIDAY",
  },
  twitter: { card: "summary_large_image" },
  // Izin cuplikan dan pratinjau gambar penuh untuk hasil kaya dan AI Overview (PRD 6.9).
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  // Verifikasi Search Console lewat tag HTML (opsional; properti Domain via DNS tidak memerlukannya).
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={jakarta.variable} data-scroll-behavior="smooth">
      <body className="min-h-dvh">
        {/* Toast dan tooltip dipasang di layout /admin saja (tidak dipakai situs publik). */}
        {children}
        {/* Analitik tanpa cookie (PRD 6.10). Suspense: keduanya membaca URL di klien. */}
        <Suspense fallback={null}>
          <Analytics />
          <SpeedInsights />
        </Suspense>
      </body>
    </html>
  );
}
