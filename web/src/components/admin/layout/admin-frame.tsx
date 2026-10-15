import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminShell } from "./admin-shell";

/**
 * Lapis cek kedua (setelah proxy.ts): sesi + baris `admins` diverifikasi di server.
 * Membaca cookie, jadi harus di dalam <Suspense> (lihat app/admin/(panel)/layout.tsx).
 */
export async function AdminFrame({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  // Badge menu "Permintaan sewa": jumlah permintaan berstatus baru. Gagal hitung tidak memblokir panel.
  const { count } = await admin.supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("status", "baru");
  return (
    <AdminShell email={admin.email} newLeads={count ?? 0}>
      {children}
    </AdminShell>
  );
}
