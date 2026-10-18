"use server";

import { refresh } from "next/cache";
import { LEAD_STATUSES } from "@/components/admin/kit/status-badge";
import { guardAdmin, invalidate, nowIso, toFieldErrors, type ActionResult } from "@/lib/actions/admin/guard";
import { leadDeleteSchema, leadUpdateSchema } from "@/lib/validation/admin";

// Permintaan sewa (PRD 7.8): ubah status dan catatan admin, hapus permanen. guardAdmin() -> zod
// (skema yang sama dengan form) -> tulis lewat sesi admin (RLS is_admin). Data privat: hanya hitungan
// popularitas unit (urutan "Rekomendasi") yang ikut berubah saat dihapus; refresh() menyegarkan
// tampilan admin (termasuk badge "baru" di sidebar).

type Saved = { id: string; code: string; status: string; adminNotes: string | null };
type Deleted = { ids: string[] };
type LeadPatch = { updated_at: string; status?: string; admin_notes?: string | null };

const MSG_INVALID = "Periksa lagi isian catatan.";
const MSG_EMPTY = "Tidak ada perubahan untuk disimpan.";
const MSG_NOT_FOUND = "Permintaan tidak ditemukan. Mungkin sudah dihapus; muat ulang halaman.";
const MSG_FORBIDDEN = "Akun ini tidak punya izin mengubah data. Masuk lagi sebagai admin.";
const MSG_FAILED = "Gagal menyimpan. Coba lagi sebentar lagi.";
const MSG_DELETE_FAILED = "Gagal menghapus. Coba lagi sebentar lagi.";
const MSG_DELETE_INVALID = "Pilihan tidak valid. Muat ulang halaman lalu pilih lagi.";

/** Ubah status dan/atau catatan admin satu permintaan sewa. */
export async function updateLead(input: unknown): Promise<ActionResult<Saved>> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = leadUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error.issues);
    if (fieldErrors.id) return { ok: false, error: MSG_NOT_FOUND };
    return { ok: false, error: fieldErrors.adminNotes ?? MSG_INVALID, fieldErrors };
  }
  const { id, status, adminNotes } = parsed.data;
  if (status === undefined && adminNotes === undefined) return { ok: false, error: MSG_EMPTY };

  const patch: LeadPatch = { updated_at: nowIso() };
  if (status !== undefined) patch.status = status;
  if (adminNotes !== undefined) patch.admin_notes = adminNotes || null;

  const { data, error } = await auth.session.supabase
    .from("leads")
    .update(patch)
    .eq("id", id)
    .select("id, code, status, admin_notes")
    .maybeSingle();
  if (error) {
    if (error.code === "42501") return { ok: false, error: MSG_FORBIDDEN };
    // Hanya kode galat yang dicatat (tanpa data tamu).
    console.error("[admin/leads] ubah gagal", { code: error.code });
    return { ok: false, error: MSG_FAILED };
  }
  if (!data) return { ok: false, error: MSG_NOT_FOUND };

  refresh();

  const label = LEAD_STATUSES.find((item) => item.value === data.status)?.label ?? data.status;
  const message =
    status !== undefined && adminNotes === undefined
      ? `Status ${data.code} diubah ke ${label}`
      : status === undefined
        ? "Catatan admin disimpan"
        : "Perubahan disimpan";
  return {
    ok: true,
    message,
    data: { id: data.id, code: data.code, status: data.status, adminNotes: data.admin_notes },
  };
}

/**
 * Hapus permanen permintaan sewa (satu atau banyak). Baris hilang dari database (bukan arsip), jadi
 * UI selalu minta konfirmasi dulu. Baris yang sudah tidak ada dilewati tanpa galat.
 */
export async function deleteLeads(input: unknown): Promise<ActionResult<Deleted>> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = leadDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG_DELETE_INVALID };
  const ids = [...new Set(parsed.data.ids)];

  const { data, error } = await auth.session.supabase.from("leads").delete().in("id", ids).select("id, code");
  if (error) {
    if (error.code === "42501") return { ok: false, error: MSG_FORBIDDEN };
    console.error("[admin/leads] hapus gagal", { code: error.code });
    return { ok: false, error: MSG_DELETE_FAILED };
  }
  const deleted = data ?? [];
  if (deleted.length === 0) return { ok: false, error: MSG_NOT_FOUND };

  invalidate({ kind: "lead" });

  const message =
    deleted.length === 1
      ? `Permintaan ${deleted[0].code} dihapus permanen`
      : `${deleted.length} permintaan dihapus permanen`;
  return { ok: true, message, data: { ids: deleted.map((row) => row.id) } };
}
