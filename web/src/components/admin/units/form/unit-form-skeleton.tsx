import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton({ fields, columns = 2 }: { fields: number; columns?: 1 | 2 }) {
  return (
    <div className="glass-card rounded-card p-5 sm:p-6">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-2 h-4 w-56 max-w-full" />
      <div className={columns === 2 ? "mt-5 grid gap-5 md:grid-cols-2" : "mt-5 grid gap-5"}>
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="grid gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Kerangka form unit selama data dimuat. */
export function UnitFormSkeleton() {
  return (
    <div role="status" aria-label="Memuat form unit">
      <Skeleton className="h-11 w-36" />
      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="grid gap-5">
          <CardSkeleton fields={8} />
          <CardSkeleton fields={4} />
          <CardSkeleton fields={1} columns={1} />
        </div>
        <div className="grid gap-5">
          <Skeleton className="hidden aspect-[4/3] w-full rounded-card lg:block" />
          <CardSkeleton fields={3} columns={1} />
        </div>
      </div>
    </div>
  );
}
