"use client";

import { ErrorFallback } from "@/components/public/shared/error-fallback";
import "./globals.css";

/** Menggantikan root layout kalau root layout sendiri gagal. Harus punya <html> dan <body>. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="id">
      <body className="min-h-dvh bg-white font-sans text-ink antialiased">
        <title>Halaman belum bisa dimuat | VIDALIDAY</title>
        <main id="konten">
          <ErrorFallback retry={retry} digest={error.digest} />
        </main>
      </body>
    </html>
  );
}
