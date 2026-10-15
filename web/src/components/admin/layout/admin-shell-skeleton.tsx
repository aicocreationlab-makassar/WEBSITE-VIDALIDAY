import { Skeleton } from "@/components/ui/skeleton";
import { AdminShellRoot } from "./admin-shell-root";

const NAV_ROWS = 10;

/** Fallback panel admin selama sesi diperiksa: sidebar, topbar, dan blok konten. */
export function AdminShellSkeleton() {
  return (
    <AdminShellRoot>
      <p role="status" className="sr-only">
        Memuat panel admin
      </p>

      <div
        aria-hidden="true"
        className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-white md:flex md:group-data-[sidebar=closed]/shell:hidden"
      >
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-4">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-2.5 w-20 rounded-md" />
          </div>
        </div>
        <div className="flex-1 space-y-1 p-3">
          {Array.from({ length: NAV_ROWS }, (_, index) => (
            <div key={index} className="flex h-11 items-center gap-3 px-3">
              <Skeleton className="size-5 rounded-md" />
              <Skeleton className="h-3.5 flex-1 rounded-md" />
            </div>
          ))}
        </div>
        <div className="space-y-1 border-t border-line p-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>

      <div aria-hidden="true" className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-white px-3 sm:gap-3 sm:px-6">
          <Skeleton className="size-11" />
          <Skeleton className="h-5 w-36 rounded-md" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-11 w-11 sm:w-32" />
            <Skeleton className="h-11 w-11 sm:w-44" />
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-card" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      </div>
    </AdminShellRoot>
  );
}
