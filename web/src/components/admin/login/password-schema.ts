import { z } from "zod";
import { loginSchema } from "@/lib/validation/auth";

// Skema lupa/atur ulang kata sandi admin (PRD 7.1, P1). Dipakai di form (klien) dan di
// Server Action `requestPasswordReset` / `updatePassword` (server).
// Catatan: idealnya pindah ke lib/validation/auth.ts (di luar wilayah file tugas ini).

export const PASSWORD_MIN = 8;
/** Batas bcrypt Supabase Auth. */
export const PASSWORD_MAX = 72;

/** Email saja, aturan sama dengan form masuk. */
export const resetRequestSchema = loginSchema.pick({ email: true });

export const newPasswordSchema = z
  .object({
    password: z
      .string("Isi kata sandi baru")
      .min(1, "Isi kata sandi baru")
      .min(PASSWORD_MIN, `Kata sandi minimal ${PASSWORD_MIN} karakter.`)
      .max(PASSWORD_MAX, `Kata sandi maksimal ${PASSWORD_MAX} karakter.`),
    confirm: z.string("Ulangi kata sandi").min(1, "Ulangi kata sandi"),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Kata sandi belum sama. Ketik ulang.",
  });

export type NewPasswordField = "password" | "confirm";
export type ResetRequestField = "email";

/** Pesan pertama per field. */
export function firstFieldErrors<F extends string>(error: z.ZodError, fields: readonly F[]): Partial<Record<F, string>> {
  const result: Partial<Record<F, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && (fields as readonly string[]).includes(field) && !result[field as F]) {
      result[field as F] = issue.message;
    }
  }
  return result;
}
