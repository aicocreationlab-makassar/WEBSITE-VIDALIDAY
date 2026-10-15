import { Skeleton } from "@/components/ui/skeleton";
import { MOBILE_BAR, RESULTS_GRID, SEWA_COLUMNS } from "./layout";

/**
 * Skeleton /sewa (UX 5): judul, chip, bar filter (mobile) atau sidebar (desktop), dan 3 kartu
 * (blok 4:3 + 4 baris) dengan tata letak yang sama dengan hasil asli. Shimmer mati saat reduced motion.
 */
export function SewaSkeleton() {
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        Memuat unit
      </p>
      <Skeleton className="h-8 w-60 max-w-full md:h-11 md:w-96" />
      <div className="mt-3 flex gap-2 py-1">
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-36 rounded-full" />
      </div>
      <div className={MOBILE_BAR}>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      </div>
      <div className={`mt-4 md:mt-6 ${SEWA_COLUMNS}`}>
        <div className="hidden md:block">
          <Skeleton className="h-[520px] rounded-card" />
        </div>
        <ul className={RESULTS_GRID}>
          {[0, 1, 2].map((key) => (
            <li key={key} className="overflow-hidden rounded-card bg-white ring-1 ring-line/80">
              <Skeleton className="aspect-[4/3] rounded-none" />
              <div className="flex flex-col gap-2.5 p-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-4/5" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-7 w-2/5" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
