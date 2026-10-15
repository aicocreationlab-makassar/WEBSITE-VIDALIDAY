"use client";

import Link from "next/link";
import { RefreshCw, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Galat di halaman admin: tetap di dalam panel dengan tombol coba lagi. */
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="glass-card mx-auto flex max-w-lg flex-col items-center rounded-card p-8 text-center" role="alert">
      <span className="flex size-16 items-center justify-center rounded-full bg-surface-2">
        <ServerCrash className="size-8 text-subtle" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-ink">Halaman admin gagal dimuat</h2>
      <p className="mt-1 text-sm text-muted">Coba lagi sebentar. Kalau terus terjadi, cek koneksi ke Supabase.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>
          <RefreshCw aria-hidden="true" />
          Coba lagi
        </Button>
        <Button asChild variant="secondary">
          <Link href="/admin">Dashboard</Link>
        </Button>
      </div>
      {error.digest ? <p className="mt-4 text-caption text-muted">Kode galat: {error.digest}</p> : null}
    </div>
  );
}
