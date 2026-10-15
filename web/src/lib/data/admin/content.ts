import "server-only";
import { sortFaqs, toFaqRow, type AdminFaqRow } from "@/components/admin/faqs/faq-model";
import { sortLandmarks, toLandmarkRow, type AdminLandmarkRow } from "@/components/admin/landmarks/landmark-model";
import type { AdminSession } from "@/lib/auth/require-admin";

// Data admin landmark & FAQ (PRD 7.7): TIDAK di-cache (selalu terbaru), dibaca dengan sesi admin
// (RLS is_admin: termasuk baris nonaktif). Tabelnya kecil, jadi semua baris dimuat sekali lalu
// dicari/disaring di klien (urutan per apartemen butuh semua landmark apartemen itu).

type Supabase = AdminSession["supabase"];

/** Semua landmark semua apartemen, urut sort_order lalu id. */
export async function getAdminLandmarks(supabase: Supabase): Promise<AdminLandmarkRow[]> {
  const { data, error } = await supabase
    .from("landmarks")
    .select("id, location_id, name, distance_time, notes, icon, sort_order, is_active")
    .order("sort_order")
    .order("id");
  if (error) throw new Error(`getAdminLandmarks: ${error.code ?? error.message}`);
  return sortLandmarks((data ?? []).map(toLandmarkRow));
}

/** Semua FAQ (tanpa kolom lama badge), urut sort_order lalu id. */
export async function getAdminFaqs(supabase: Supabase): Promise<AdminFaqRow[]> {
  const { data, error } = await supabase
    .from("faqs")
    .select("id, question, answer, sort_order, is_active")
    .order("sort_order")
    .order("id");
  if (error) throw new Error(`getAdminFaqs: ${error.code ?? error.message}`);
  return sortFaqs((data ?? []).map(toFaqRow));
}
