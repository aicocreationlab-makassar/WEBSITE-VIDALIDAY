import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton({ fields }: { fields: number }) {
  return (
    <div className="glass-card rounded-card p-5 sm:p-6">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="grid gap-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Kerangka form Pengaturan / About selama data dimuat: header, chip bagian, kartu. */
export function SettingsFormSkeleton({
  label,
  chips = 5,
  cards = [4, 4, 6],
  search = true,
}: {
  label: string;
  chips?: number;
  cards?: number[];
  search?: boolean;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-5 w-full max-w-md" />
        {search ? <Skeleton className="h-12 w-full sm:w-72" /> : <Skeleton className="h-11 w-36" />}
      </div>
      <div className="mb-5 flex gap-2 overflow-hidden py-1">
        {Array.from({ length: chips }, (_, index) => (
          <Skeleton key={index} className="h-11 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid gap-5">
        {cards.map((fields, index) => (
          <CardSkeleton key={index} fields={fields} />
        ))}
      </div>
    </div>
  );
}
