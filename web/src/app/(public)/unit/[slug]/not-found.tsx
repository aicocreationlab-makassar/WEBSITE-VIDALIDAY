import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/** 404 detail unit (slug tidak ada atau unit draft). Tanpa query DB; header/footer dari layout publik. */
export default function UnitNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-4 py-16 text-center sm:px-6 md:py-24 lg:px-8">
      <span className="flex size-20 items-center justify-center rounded-full bg-surface-2">
        <SearchX className="size-10 text-subtle" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-h1 font-extrabold tracking-tight text-ink md:text-h1-lg">Unit tidak ditemukan</h1>
      <p className="mt-3 max-w-md text-base leading-[26px] text-muted">
        Unit ini tidak ada atau sedang tidak ditampilkan. Coba lihat unit lain yang tersedia.
      </p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/sewa">Cari unit lain</Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
          <Link href="/">Ke beranda</Link>
        </Button>
      </div>
    </div>
  );
}
