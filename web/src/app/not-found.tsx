import Link from "next/link";
import { SearchX } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/**
 * 404 untuk seluruh situs. Tanpa query DB dan tanpa header/footer publik
 * (dirender di root layout, di luar layout grup `(public)`).
 */
export default function NotFound() {
  return (
    <main
      id="konten"
      className="flex min-h-dvh flex-col items-center px-4 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center sm:px-6"
    >
      <Logo size="md" />
      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center py-12">
        <span className="flex size-20 items-center justify-center rounded-full bg-surface-2">
          <SearchX className="size-10 text-subtle" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-h1 font-extrabold tracking-tight text-ink md:text-h1-lg">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-base leading-[26px] text-muted">
          Halaman yang kamu cari tidak ada atau sudah dipindah.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/sewa">Cari unit</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
            <Link href="/">Ke beranda</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
