"use client";

import { ErrorFallback } from "@/components/public/shared/error-fallback";

/** Menangkap galat di layout publik/admin (mis. data header gagal dimuat). */
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main id="konten">
      <ErrorFallback retry={retry} digest={error.digest} />
    </main>
  );
}
