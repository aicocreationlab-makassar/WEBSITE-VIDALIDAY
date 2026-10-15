import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminShell } from "./admin-shell";

/**
 * Lapis cek kedua (setelah proxy.ts): sesi + baris `admins` diverifikasi di server.
 * Membaca cookie, jadi harus di dalam <Suspense> (lihat app/admin/(panel)/layout.tsx).
 */
export async function AdminFrame({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  // TODO(Fase 5): hitung permintaan sewa berstatus 'baru' untuk badge menu.
  const newLeads = 0;
  return (
    <AdminShell email={admin.email} newLeads={newLeads}>
      {children}
    </AdminShell>
  );
}
