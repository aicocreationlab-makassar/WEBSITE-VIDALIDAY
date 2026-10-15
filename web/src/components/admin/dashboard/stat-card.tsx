import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  /** null = gagal dimuat. */
  value: number | null;
  icon: LucideIcon;
  /** Teks kecil di bawah angka. */
  detail?: React.ReactNode;
  href: string;
  /** Sorot kartu (mis. ada permintaan baru hari ini). */
  highlight?: boolean;
};

const numberFormat = new Intl.NumberFormat("id-ID");

/**
 * Kartu angka dashboard (pola admin lama: 2 per baris di HP, 4 di desktop).
 * Seluruh kartu adalah tautan ke daftar yang sudah terfilter.
 */
export function StatCard({ label, value, icon: IconComponent, detail, href, highlight = false }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group glass-card flex min-h-32 flex-col rounded-card p-4 transition-[border-color,box-shadow] duration-150 hover:border-brand-200 hover:shadow-card-hover focus-visible:ring-3 focus-visible:ring-brand-500/20 focus-visible:outline-none sm:p-5"
    >
      <span className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-control",
            highlight ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600",
          )}
        >
          <IconComponent className="size-5" aria-hidden="true" />
        </span>
        <ChevronRight
          className="mt-2 size-4 shrink-0 text-subtle transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-brand-600"
          aria-hidden="true"
        />
      </span>
      <span className="mt-3 text-sm leading-5 font-semibold text-ink-2">{label}</span>
      <span className="mt-0.5 text-h1 font-extrabold tracking-tight text-ink tabular-nums sm:text-h2-lg">
        {value == null ? "–" : numberFormat.format(value)}
      </span>
      <span className="mt-auto pt-1 text-caption text-muted">
        {value == null ? "Gagal dimuat. Muat ulang halaman." : detail}
      </span>
    </Link>
  );
}
