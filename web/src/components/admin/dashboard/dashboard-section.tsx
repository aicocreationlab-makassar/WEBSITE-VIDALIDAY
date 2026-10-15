import Link from "next/link";
import { ChevronRight, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardSectionProps = {
  title: string;
  description?: string;
  /** Tautan "lihat semua" di kanan judul. */
  link?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
};

/** Kartu bagian dashboard: judul 16/700 + deskripsi + tautan kecil di kanan (DESIGN 5). */
export function DashboardSection({ title, description, link, children, className }: DashboardSectionProps) {
  return (
    <section className={cn("glass-card flex min-w-0 flex-col rounded-card p-4 sm:p-6", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
        {link ? (
          <Link
            href={link.href}
            className="-mr-2 -mt-2.5 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-control px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            {link.label}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Pesan gagal muat di dalam satu bagian (bagian lain tetap tampil). */
export function SectionError({ children = "Data gagal dimuat. Muat ulang halaman untuk mencoba lagi." }: { children?: React.ReactNode }) {
  return (
    <p role="status" className="flex items-start gap-2 rounded-control bg-surface px-3.5 py-3 text-sm text-ink-2">
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
