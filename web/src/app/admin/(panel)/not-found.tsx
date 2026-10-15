import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Data admin tidak ditemukan (mis. unit sudah dihapus): tetap di dalam panel, bukan halaman 404 publik. */
export default function AdminNotFound() {
  return (
    <div className="glass-card mx-auto flex max-w-lg flex-col items-center rounded-card p-8 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-surface-2">
        <SearchX className="size-8 text-subtle" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-ink">Data tidak ditemukan</h2>
      <p className="mt-1 text-sm text-muted">Mungkin sudah dihapus atau tautannya salah.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild variant="secondary">
          <Link href="/admin/units">Daftar unit</Link>
        </Button>
        <Button asChild>
          <Link href="/admin">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
