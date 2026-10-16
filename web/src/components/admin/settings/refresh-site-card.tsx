"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refreshPublicData } from "@/lib/actions/admin/settings";

/**
 * Segarkan cache situs publik. Perubahan lewat panel admin sudah langsung tampil; tombol ini untuk data
 * yang diubah langsung di Supabase (paket migrasi data, SQL Editor, Table Editor).
 */
export function RefreshSiteCard() {
  const [pending, startTransition] = useTransition();

  function refreshSite() {
    startTransition(async () => {
      try {
        const result = await refreshPublicData();
        if (result.ok) toast.success(result.message ?? "Data situs disegarkan");
        else toast.error(result.error);
      } catch {
        toast.error("Gagal menyegarkan data situs. Periksa koneksi lalu coba lagi.");
      }
    });
  }

  return (
    <section aria-labelledby="segarkan-judul" className="glass-card mt-5 rounded-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 id="segarkan-judul" className="text-base font-bold text-ink">
            Segarkan data situs
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Pakai setelah data diubah langsung di Supabase (migrasi data, SQL Editor, atau Table Editor). Perubahan
            lewat panel admin sudah langsung tampil tanpa tombol ini.
          </p>
        </div>
        <Button type="button" variant="secondary" loading={pending} onClick={refreshSite} className="shrink-0">
          {pending ? null : <RefreshCw aria-hidden="true" />}
          Segarkan sekarang
        </Button>
      </div>
    </section>
  );
}
