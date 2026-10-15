import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Crumb } from "@/lib/unit-detail";
import { cn } from "@/lib/utils";

/** Breadcrumb desktop: Beranda / {apartemen} / {unit} (PRD 6.4 no. 2). Item terakhir = halaman ini. */
export function UnitBreadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1 text-sm text-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.href} className={cn("flex min-w-0 items-center gap-1", last ? "min-w-0" : "shrink-0")}>
              {last ? (
                <span aria-current="page" className="truncate font-medium text-ink-2">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center rounded-control px-1 transition-colors hover:text-ink hover:underline"
                  >
                    {item.name}
                  </Link>
                  <ChevronRight className="size-4 shrink-0 text-subtle" aria-hidden="true" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
