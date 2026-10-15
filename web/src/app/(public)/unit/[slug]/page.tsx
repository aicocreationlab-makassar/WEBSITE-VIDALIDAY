import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/public/layout/page-placeholder";

export const metadata: Metadata = {
  title: "Detail unit",
};

// Sementara: params belum dibaca. Fase 4 menambah generateStaticParams dan isi dari Supabase.
export default function UnitPage() {
  return <PagePlaceholder title="Detail unit" />;
}
