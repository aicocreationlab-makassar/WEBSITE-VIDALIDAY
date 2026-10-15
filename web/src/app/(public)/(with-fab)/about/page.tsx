import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/public/layout/page-placeholder";

export const metadata: Metadata = {
  title: "Tentang kami",
};

export default function AboutPage() {
  return <PagePlaceholder title="Tentang VIDALIDAY" />;
}
