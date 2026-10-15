import type { Metadata } from "next";
import { AboutForm } from "@/components/admin/about/about-form";
import { toAboutFormValues } from "@/components/admin/about/about-model";
import { SectionError } from "@/components/admin/dashboard/dashboard-section";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminSettings, type AdminSettingsData } from "@/lib/data/admin/settings";

export const metadata: Metadata = { title: "Halaman About" };

// Halaman About (PRD 7.9, 6.8): setting about_* dan about_reasons dibaca segar dengan sesi admin.
// Ikon alasan lama (shield, home, chat) di-resolve saat dimuat supaya tetap sama ketika disimpan.
export default async function AdminAboutPage() {
  const admin = await requireAdmin();

  let data: AdminSettingsData;
  try {
    data = await getAdminSettings(admin.supabase);
  } catch (error) {
    console.error("[admin/about] baca gagal", { message: (error as Error)?.message });
    return (
      <div className="glass-card rounded-card p-5 sm:p-6">
        <SectionError>Isi halaman About gagal dimuat. Muat ulang halaman untuk mencoba lagi.</SectionError>
      </div>
    );
  }

  return (
    <AboutForm
      key={data.aboutUpdatedAt ?? "baru"}
      initial={toAboutFormValues(data.settings.about)}
      savedAt={data.aboutUpdatedAt}
    />
  );
}
