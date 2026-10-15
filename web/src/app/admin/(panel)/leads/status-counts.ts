import "server-only";
import type { LeadStatusCounts } from "@/components/admin/leads/lead-list-model";
import {
  LEAD_STATUS_VALUES,
  leadSearchOr,
  witaDayEndExclusive,
  witaDayStart,
  type LeadFilter,
} from "@/lib/admin/lead-query";
import type { AdminSession } from "@/lib/auth/require-admin";

/**
 * Jumlah permintaan per status untuk chip cepat, dengan filter lain (pencarian, apartemen, tanggal)
 * yang sama seperti daftar (lib/data/admin/leads.ts buildQuery) tetapi tanpa filter status.
 * Empat hitungan head-only paralel. Gagal -> null (chip tampil tanpa angka, halaman tetap jalan).
 */
export async function getLeadStatusCounts(
  supabase: AdminSession["supabase"],
  filter: LeadFilter,
): Promise<LeadStatusCounts | null> {
  const search = leadSearchOr(filter.q);
  try {
    const entries = await Promise.all(
      LEAD_STATUS_VALUES.map(async (status) => {
        let query = supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", status);
        if (search) query = query.or(search);
        if (filter.apartemen) query = query.eq("location_name", filter.apartemen);
        if (filter.masukDari) query = query.gte("created_at", witaDayStart(filter.masukDari));
        if (filter.masukSampai) query = query.lt("created_at", witaDayEndExclusive(filter.masukSampai));
        if (filter.checkinDari) query = query.gte("check_in", filter.checkinDari);
        if (filter.checkinSampai) query = query.lte("check_in", filter.checkinSampai);
        const { count, error } = await query;
        if (error) throw new Error(error.code ?? "count");
        return [status, count ?? 0] as const;
      }),
    );
    return Object.fromEntries(entries) as LeadStatusCounts;
  } catch (error) {
    console.error("[admin/leads] hitung status gagal", { code: error instanceof Error ? error.message : "?" });
    return null;
  }
}
