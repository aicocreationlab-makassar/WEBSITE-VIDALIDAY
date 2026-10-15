import "server-only";
import {
  LEADS_EXPORT_LIMIT,
  LEADS_PAGE_SIZE,
  leadSearchOr,
  witaDayEndExclusive,
  witaDayStart,
  type LeadFilter,
  type LeadRow,
} from "@/lib/admin/lead-query";
import type { AdminSession } from "@/lib/auth/require-admin";

type Supabase = AdminSession["supabase"];

const LEAD_FIELDS =
  "id, code, created_at, full_name, whatsapp, unit_id, unit_name, location_name, nightly_price, check_in, check_out, nights, guests, purpose, notes, estimated_total, status, admin_notes";

function buildQuery(supabase: Supabase, filter: LeadFilter) {
  let query = supabase.from("leads").select(LEAD_FIELDS, { count: "exact" });
  const search = leadSearchOr(filter.q);
  if (search) query = query.or(search);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.apartemen) query = query.eq("location_name", filter.apartemen);
  if (filter.masukDari) query = query.gte("created_at", witaDayStart(filter.masukDari));
  if (filter.masukSampai) query = query.lt("created_at", witaDayEndExclusive(filter.masukSampai));
  if (filter.checkinDari) query = query.gte("check_in", filter.checkinDari);
  if (filter.checkinSampai) query = query.lte("check_in", filter.checkinSampai);
  return query.order("created_at", { ascending: false });
}

/** Satu halaman permintaan sewa (25 per halaman) + total sesuai filter. Data admin, tanpa cache. */
export async function getAdminLeads(
  supabase: Supabase,
  filter: LeadFilter,
): Promise<{ rows: LeadRow[]; total: number; page: number; pageCount: number }> {
  const from = (filter.hal - 1) * LEADS_PAGE_SIZE;
  const { data, error, count } = await buildQuery(supabase, filter).range(from, from + LEADS_PAGE_SIZE - 1);
  if (error) throw new Error(`getAdminLeads: ${error.message}`);
  const total = count ?? 0;
  return {
    rows: (data ?? []) as LeadRow[],
    total,
    page: filter.hal,
    pageCount: Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE)),
  };
}

/** Semua baris sesuai filter untuk ekspor CSV (maks. 5000). */
export async function getAdminLeadsForExport(supabase: Supabase, filter: LeadFilter): Promise<LeadRow[]> {
  const { data, error } = await buildQuery(supabase, filter).range(0, LEADS_EXPORT_LIMIT - 1);
  if (error) throw new Error(`getAdminLeadsForExport: ${error.message}`);
  return (data ?? []) as LeadRow[];
}

/** Nama apartemen yang pernah muncul di permintaan sewa (untuk filter). */
export async function getLeadApartmentNames(supabase: Supabase): Promise<string[]> {
  const { data, error } = await supabase.from("locations").select("short_name, name").order("sort_order");
  if (error) return [];
  return [...new Set((data ?? []).map((l) => l.short_name ?? l.name))];
}
