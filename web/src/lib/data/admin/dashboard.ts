import "server-only";
import type { AdminUnitRow } from "@/lib/admin/unit-query";
import type { AdminSession } from "@/lib/auth/require-admin";
import { getAdminUnitRows } from "@/lib/data/admin/units";
import { addDays, diffDays, formatDateCompact, formatTime, todayInMakassar } from "@/lib/format";

// Data dashboard admin (PRD 7.3): TIDAK di-cache, dibaca dengan sesi admin (RLS is_admin).
// Setiap fungsi baca mengembalikan null kalau gagal (tidak melempar), supaya satu bagian
// yang gagal tidak menjatuhkan seluruh dashboard. Log hanya berisi kode galat, tanpa data pribadi.

type Supabase = AdminSession["supabase"];

// ---------------------------------------------------------------------------
// Fungsi murni (ada unit test)
// ---------------------------------------------------------------------------

/** Awal hari kalender di zona WITA: "2026-10-16" → "2026-10-16T00:00:00+08:00". */
export function makassarDayStart(date: string): string {
  return `${date}T00:00:00+08:00`;
}

export type DashboardRanges = {
  /** Tanggal hari ini (WITA), "YYYY-MM-DD". */
  today: string;
  /** Awal hari ini WITA (ISO dengan offset +08:00). */
  todayStart: string;
  /** Awal 7 hari kalender terakhir termasuk hari ini (WITA). */
  weekStart: string;
};

/** Rentang waktu dashboard dari tanggal hari ini (WITA). */
export function dashboardRanges(today: string): DashboardRanges {
  return {
    today,
    todayStart: makassarDayStart(today),
    weekStart: makassarDayStart(addDays(today, -6)),
  };
}

export type UnitStats = {
  /** Semua unit, termasuk draft. */
  total: number;
  /** Tampil di website. */
  published: number;
  /** Tampil dan ditandai penuh. */
  full: number;
  /** Tampil dengan promo aktif. */
  promo: number;
  /** Unit dengan penanda data "Perlu dicek". */
  needsCheck: number;
};

type StatsRow = Pick<AdminUnitRow, "isPublished" | "isAvailable" | "isPromoActive" | "flags">;

export function summarizeUnits(rows: StatsRow[]): UnitStats {
  const stats: UnitStats = { total: rows.length, published: 0, full: 0, promo: 0, needsCheck: 0 };
  for (const row of rows) {
    if (row.flags.length > 0) stats.needsCheck++;
    if (!row.isPublished) continue;
    stats.published++;
    if (!row.isAvailable) stats.full++;
    if (row.isPromoActive) stats.promo++;
  }
  return stats;
}

export type PopularUnit = {
  id: number;
  name: string;
  locationShortName: string;
  isPublished: boolean;
  leadCount: number;
};

type PopularityRow = { unit_id: number | string; lead_count: number | string };
type PopularUnitInfo = Pick<AdminUnitRow, "id" | "name" | "locationShortName" | "isPublished">;

/**
 * Peringkat unit paling diminati: jumlah permintaan terbanyak dulu, seri diurutkan nama.
 * Unit yang sudah dihapus (tidak ada di daftar unit) dilewati.
 */
export function rankPopularUnits(
  rows: PopularityRow[] | null | undefined,
  units: PopularUnitInfo[],
  limit = 5,
): PopularUnit[] {
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const result: PopularUnit[] = [];
  for (const row of rows ?? []) {
    const id = Number(row.unit_id);
    const leadCount = Number(row.lead_count);
    const unit = byId.get(id);
    if (!unit || !Number.isFinite(leadCount) || leadCount <= 0) continue;
    result.push({
      id,
      name: unit.name,
      locationShortName: unit.locationShortName,
      isPublished: unit.isPublished,
      leadCount,
    });
  }
  return result
    .sort((a, b) => b.leadCount - a.leadCount || a.name.localeCompare(b.name, "id", { numeric: true }))
    .slice(0, limit);
}

/**
 * Waktu masuk permintaan, ringkas: "Hari ini, 14.00 WITA", "Kemarin, 09.30 WITA",
 * selain itu "12 Okt 2026, 14.00 WITA".
 */
export function formatLeadTime(createdAt: string, today: string): string {
  const day = todayInMakassar(new Date(createdAt));
  const time = formatTime(createdAt);
  const age = diffDays(day, today);
  if (age === 0) return `Hari ini, ${time}`;
  if (age === 1) return `Kemarin, ${time}`;
  return `${formatDateCompact(createdAt)}, ${time}`;
}

// ---------------------------------------------------------------------------
// Query (sesi admin)
// ---------------------------------------------------------------------------

export type NewLeadCounts = { today: number; week: number };

/** Permintaan berstatus "baru" yang masuk hari ini dan 7 hari terakhir (WITA). */
export async function getNewLeadCounts(supabase: Supabase, ranges: DashboardRanges): Promise<NewLeadCounts | null> {
  const count = (since: string) =>
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "baru").gte("created_at", since);
  try {
    const [today, week] = await Promise.all([count(ranges.todayStart), count(ranges.weekStart)]);
    if (today.error || week.error) {
      console.error("[admin/dashboard] hitung permintaan gagal", { code: today.error?.code ?? week.error?.code });
      return null;
    }
    return { today: today.count ?? 0, week: week.count ?? 0 };
  } catch (error) {
    console.error("[admin/dashboard] hitung permintaan gagal", { name: error instanceof Error ? error.name : "unknown" });
    return null;
  }
}

/** Semua unit (untuk angka ringkasan dan nama unit paling diminati). */
export async function getDashboardUnits(supabase: Supabase): Promise<AdminUnitRow[] | null> {
  try {
    return await getAdminUnitRows(supabase);
  } catch (error) {
    console.error("[admin/dashboard] baca unit gagal", { name: error instanceof Error ? error.name : "unknown" });
    return null;
  }
}

export type RecentLead = {
  id: string;
  code: string;
  fullName: string;
  unitId: number | null;
  unitName: string | null;
  locationName: string | null;
  checkIn: string;
  checkOut: string;
  nights: number | null;
  guests: number;
  status: string;
  createdAt: string;
};

/** Permintaan sewa terbaru (semua status). */
export async function getRecentLeads(supabase: Supabase, limit = 5): Promise<RecentLead[] | null> {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select("id, code, full_name, unit_id, unit_name, location_name, check_in, check_out, nights, guests, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("[admin/dashboard] baca permintaan terbaru gagal", { code: error.code });
      return null;
    }
    return (data ?? []).map((lead) => ({
      id: lead.id,
      code: lead.code,
      fullName: lead.full_name,
      unitId: lead.unit_id,
      unitName: lead.unit_name,
      locationName: lead.location_name,
      checkIn: lead.check_in,
      checkOut: lead.check_out,
      nights: lead.nights,
      guests: lead.guests,
      status: lead.status,
      createdAt: lead.created_at,
    }));
  } catch (error) {
    console.error("[admin/dashboard] baca permintaan terbaru gagal", { name: error instanceof Error ? error.name : "unknown" });
    return null;
  }
}

/**
 * Lima unit paling diminati dalam `days` hari (RPC unit_popularity, tanpa data pribadi).
 * `units` boleh berupa promise supaya RPC berjalan paralel dengan query unit.
 */
export async function getPopularUnits(
  supabase: Supabase,
  units: PopularUnitInfo[] | null | Promise<PopularUnitInfo[] | null>,
  days = 30,
  limit = 5,
): Promise<PopularUnit[] | null> {
  try {
    const [{ data, error }, unitRows] = await Promise.all([
      supabase.rpc("unit_popularity", { p_days: days }),
      units,
    ]);
    if (error) {
      console.error("[admin/dashboard] unit_popularity gagal", { code: error.code });
      return null;
    }
    if (!unitRows) return null;
    return rankPopularUnits(data, unitRows, limit);
  } catch (error) {
    console.error("[admin/dashboard] unit_popularity gagal", { name: error instanceof Error ? error.name : "unknown" });
    return null;
  }
}
