"use client";

import { ErrorFallback } from "@/components/public/shared/error-fallback";

/** Galat di halaman publik: header dan footer tetap tampil, plus tombol coba lagi dan WhatsApp. */
export default function PublicError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorFallback retry={retry} digest={error.digest} />;
}
