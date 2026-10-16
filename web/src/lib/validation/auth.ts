import { z } from "zod";
import "./locale";

// Skema masuk admin. Dipakai di form (klien) dan di Server Action `signIn` (server).
// Email di-trim dulu supaya spasi dari isian otomatis tidak membuat validasi gagal.
export const loginSchema = z.object({
  email: z
    .string("Isi email")
    .trim()
    .min(1, "Isi email")
    .pipe(z.email("Format email belum benar")),
  password: z.string("Isi kata sandi").min(1, "Isi kata sandi"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type LoginField = keyof LoginInput;

/** Pesan pertama per field, untuk ditampilkan di bawah input. */
export function loginFieldErrors(error: z.ZodError): Partial<Record<LoginField, string>> {
  const result: Partial<Record<LoginField, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if ((field === "email" || field === "password") && !result[field]) {
      result[field] = issue.message;
    }
  }
  return result;
}
