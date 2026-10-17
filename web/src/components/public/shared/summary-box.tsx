import { cn } from "@/lib/utils";

export type SummaryItem = { label: string; value: string; href?: string };

type Props = {
  items: SummaryItem[];
  title?: string;
  className?: string;
  id?: string;
};

/**
 * Kotak "Ringkasan" (SEO/AI Overview): fakta utama halaman sebagai teks polos dalam <dl> dua kolom,
 * dekat bagian atas supaya terbaca mesin tanpa menggulir. Server component, tanpa JS.
 */
export function SummaryBox({ items, title = "Ringkasan", className, id = "ringkasan" }: Props) {
  if (!items.length) return null;
  const headingId = `${id}-judul`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("rounded-card bg-surface p-4 ring-1 ring-line/80 md:p-5", className)}
      data-testid="summary-box"
    >
      <h2 id={headingId} className="text-base font-bold text-ink">
        {title}
      </h2>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="shrink-0 text-sm font-semibold text-ink-2 sm:w-40">{item.label}</dt>
            <dd className="min-w-0 text-sm break-words text-ink">
              {item.href ? (
                <a href={item.href} className="font-semibold text-brand-700 underline-offset-4 hover:underline">
                  {item.value}
                </a>
              ) : (
                item.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
