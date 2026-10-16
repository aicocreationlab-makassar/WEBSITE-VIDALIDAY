"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  /** Satuan, mis. "unit" → "1–20 dari 45 unit". */
  noun?: string;
  className?: string;
};

function pageNumbers(page: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const set = new Set([1, count, page - 1, page, page + 1].filter((n) => n >= 1 && n <= count));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

/** Paginasi admin: "1–20 dari 45" + nomor halaman (desktop) / "1/3" (mobile). */
export function Pagination({ page, pageCount, total, pageSize, onPage, noun = "", className }: Props) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const button =
    "inline-flex size-11 items-center justify-center rounded-control text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav aria-label="Halaman" className={cn("flex items-center justify-between gap-3 pt-4", className)}>
      <p className="text-sm text-muted tabular-nums">
        {from}–{to} dari {total}
        {noun ? ` ${noun}` : ""}
      </p>
      {pageCount > 1 ? (
        <div className="flex items-center gap-1">
          <button type="button" className={cn(button, "hover:bg-surface-2")} onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Halaman sebelumnya">
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <span className="px-2 text-sm font-semibold text-ink tabular-nums sm:hidden">
            {page}/{pageCount}
          </span>
          <div className="hidden items-center gap-1 sm:flex">
            {pageNumbers(page, pageCount).map((n, i) =>
              n === "…" ? (
                <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => onPage(n)}
                  aria-current={n === page ? "page" : undefined}
                  className={cn(button, n === page ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200" : "text-ink-2 hover:bg-surface-2")}
                >
                  {n}
                </button>
              ),
            )}
          </div>
          <button type="button" className={cn(button, "hover:bg-surface-2")} onClick={() => onPage(page + 1)} disabled={page >= pageCount} aria-label="Halaman berikutnya">
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
