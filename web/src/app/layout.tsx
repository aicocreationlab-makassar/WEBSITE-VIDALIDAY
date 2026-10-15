import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
