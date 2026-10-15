"use server";

// Server Action FAQ (PRD 7.7). Setiap aksi: guardAdmin() → validasi zod (skema yang sama dengan
// form) → tulis lewat sesi admin (RLS is_admin, tanpa secret key) → invalidate({ kind: "faq" }).
// Kolom lama `badge` tidak pernah ditulis (insert membiarkannya null, update tidak menyentuhnya).

import { z } from "zod";
import { planReorder } from "@/components/admin/locations/location-model";
import { guardAdmin, invalidate, nowIso, toFieldErrors, type ActionResult } from "@/lib/actions/admin/guard";
import { faqSchema, reorderSchema } from "@/lib/validation/admin";

type PostgrestLikeError = { code?: string; message?: string } | null | undefined;
type Failure = { ok: false; error: string; fieldErrors?: Record<string, string> };
// Alias tipe (bukan objek inline di signature) supaya pengaman guard-coverage membaca badan fungsi.
type Created = { id: number };
type FaqData = z.output<typeof faqSchema>;

const MSG_INVALID = "Periksa lagi isian di form.";
const MSG_NOT_FOUND = "Pertanyaan tidak ditemukan. Mungkin sudah dihapus; muat ulang halaman.";
const MSG_FORBIDDEN = "Akun ini tidak punya izin mengubah data. Masuk lagi sebagai admin.";
const MSG_FAILED = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";

const idSchema = z.number().int().positive();
const activeSchema = z.object({ id: idSchema, isActive: z.boolean() });

function failure(error: PostgrestLikeError, context: string): Failure {
  if (error?.code === "42501") return { ok: false, error: MSG_FORBIDDEN };
  // Hanya kode galat yang dicatat (tanpa data isian).
  console.error(`[admin/faqs] ${context} gagal`, { code: error?.code });
  return { ok: false, error: MSG_FAILED };
}

function thrown(error: unknown, context: string): Failure {
  console.error(`[admin/faqs] ${context} gagal`, { name: (error as Error)?.name });
  return { ok: false, error: MSG_FAILED };
}

type Parsed = { ok: true; data: FaqData } | { ok: false; result: Failure };

function parseFaq(input: unknown): Parsed {
  const parsed = faqSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, result: { ok: false, error: MSG_INVALID, fieldErrors: toFieldErrors(parsed.error.issues) } };
  }
  return { ok: true, data: parsed.data };
}

function toColumns(data: FaqData) {
  return { question: data.question, answer: data.answer, sort_order: data.sortOrder, is_active: data.isActive };
}

/** Tambah pertanyaan. */
export async function createFaq(input: unknown): Promise<ActionResult<Created>> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = parseFaq(input);
  if (!parsed.ok) return parsed.result;

  try {
    const now = nowIso();
    const { data, error } = await auth.session.supabase
      .from("faqs")
      .insert({ ...toColumns(parsed.data), created_at: now, updated_at: now })
      .select("id")
      .single();
    if (error || !data) return failure(error, "tambah");

    invalidate({ kind: "faq" });
    return { ok: true, message: "Pertanyaan ditambahkan", data: { id: data.id } };
  } catch (error) {
    return thrown(error, "tambah");
  }
}

/** Ubah pertanyaan, jawaban, urutan, atau status aktif (badge lama dibiarkan). */
export async function updateFaq(id: unknown, input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: MSG_NOT_FOUND };
  const parsed = parseFaq(input);
  if (!parsed.ok) return parsed.result;

  try {
    const { data, error } = await auth.session.supabase
      .from("faqs")
      .update({ ...toColumns(parsed.data), updated_at: nowIso() })
      .eq("id", parsedId.data)
      .select("id");
    if (error) return failure(error, "ubah");
    if (!data?.length) return { ok: false, error: MSG_NOT_FOUND };

    invalidate({ kind: "faq" });
    return { ok: true, message: "Perubahan disimpan" };
  } catch (error) {
    return thrown(error, "ubah");
  }
}

/** Aktif/nonaktif langsung dari daftar. Nonaktif = tidak tampil di situs. */
export async function toggleFaqActive(input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = activeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG_NOT_FOUND };
  const { id, isActive } = parsed.data;

  try {
    const { data, error } = await auth.session.supabase
      .from("faqs")
      .update({ is_active: isActive, updated_at: nowIso() })
      .eq("id", id)
      .select("id");
    if (error) return failure(error, "ubah status");
    if (!data?.length) return { ok: false, error: MSG_NOT_FOUND };

    invalidate({ kind: "faq" });
    return { ok: true, message: isActive ? "Pertanyaan tampil lagi di situs" : "Pertanyaan disembunyikan dari situs" };
  } catch (error) {
    return thrown(error, "ubah status");
  }
}

/** Naikkan/turunkan urutan (tukar dengan tetangga; dihitung ulang dari DB). */
export async function reorderFaq(input: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG_NOT_FOUND };
  const { id, direction } = parsed.data;
  const supabase = auth.session.supabase;

  try {
    const { data: rows, error: readError } = await supabase.from("faqs").select("id, sort_order");
    if (readError) return failure(readError, "baca urutan");
    const items = (rows ?? []).map((row) => ({ id: row.id, sortOrder: row.sort_order }));
    if (!items.some((item) => item.id === id)) return { ok: false, error: MSG_NOT_FOUND };

    const plan = planReorder(items, id, direction);
    if (!plan?.length) return { ok: true, message: "Urutan tidak berubah" };

    const now = nowIso();
    const results = await Promise.all(
      plan.map((item) => supabase.from("faqs").update({ sort_order: item.sortOrder, updated_at: now }).eq("id", item.id)),
    );
    const failed = results.find((result) => result.error);

    // Tetap kedaluwarsakan cache walau sebagian gagal, supaya tampilan sesuai isi DB.
    invalidate({ kind: "faq" });
    if (failed) return failure(failed.error, "ubah urutan");
    return { ok: true, message: "Urutan disimpan" };
  } catch (error) {
    return thrown(error, "ubah urutan");
  }
}

/** Hapus pertanyaan. */
export async function deleteFaq(id: unknown): Promise<ActionResult> {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.result;

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: MSG_NOT_FOUND };

  try {
    const { data, error } = await auth.session.supabase.from("faqs").delete().eq("id", parsedId.data).select("id");
    if (error) return failure(error, "hapus");
    if (!data?.length) return { ok: false, error: MSG_NOT_FOUND };

    invalidate({ kind: "faq" });
    return { ok: true, message: "Pertanyaan dihapus" };
  } catch (error) {
    return thrown(error, "hapus");
  }
}
