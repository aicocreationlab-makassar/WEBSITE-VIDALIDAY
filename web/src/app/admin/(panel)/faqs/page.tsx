import type { Metadata } from "next";
import { SectionError } from "@/components/admin/dashboard/dashboard-section";
import type { AdminFaqRow } from "@/components/admin/faqs/faq-model";
import { FaqsManager } from "@/components/admin/faqs/faqs-manager";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminFaqs } from "@/lib/data/admin/content";

export const metadata: Metadata = { title: "FAQ" };

// FAQ (PRD 7.7): global (tanpa apartemen), dibaca segar dengan sesi admin (tanpa cache),
// termasuk yang nonaktif. Cari dan saring terjadi di klien.
export default async function AdminFaqsPage() {
  const admin = await requireAdmin();

  let faqs: AdminFaqRow[];
  try {
    faqs = await getAdminFaqs(admin.supabase);
  } catch (error) {
    console.error("[admin/faqs] baca gagal", { name: (error as Error)?.name });
    return (
      <div className="glass-card rounded-card p-5 sm:p-6">
        <SectionError>Daftar FAQ gagal dimuat. Muat ulang halaman untuk mencoba lagi.</SectionError>
      </div>
    );
  }

  return <FaqsManager faqs={faqs} />;
}
