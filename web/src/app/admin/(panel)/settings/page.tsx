import type { Metadata } from "next";
import { SectionError } from "@/components/admin/dashboard/dashboard-section";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import { fieldsUsingDefault, toSettingsFormValues } from "@/components/admin/settings/settings-model";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminSettings, type AdminSettingsData } from "@/lib/data/admin/settings";

export const metadata: Metadata = { title: "Pengaturan" };

// Pengaturan situs (PRD 7.9): dibaca segar dengan sesi admin (tanpa cache). Form dipasang ulang
// setelah simpan (key = updated_at terbaru) supaya isian menampilkan nilai yang benar-benar tersimpan.
export default async function AdminSettingsPage() {
  const admin = await requireAdmin();

  let data: AdminSettingsData;
  try {
    data = await getAdminSettings(admin.supabase);
  } catch (error) {
    console.error("[admin/settings] baca gagal", { message: (error as Error)?.message });
    return (
      <div className="glass-card rounded-card p-5 sm:p-6">
        <SectionError>Pengaturan gagal dimuat. Muat ulang halaman untuk mencoba lagi.</SectionError>
      </div>
    );
  }

  return (
    <SettingsForm
      key={data.settingsUpdatedAt ?? "baru"}
      initial={toSettingsFormValues(data.settings)}
      usingDefault={fieldsUsingDefault(data.filledKeys)}
      savedAt={data.settingsUpdatedAt}
    />
  );
}
