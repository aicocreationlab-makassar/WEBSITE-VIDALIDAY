import { Icon } from "@/lib/icons";
import type { UnitFact } from "@/lib/unit-detail";

/**
 * Fakta kunci (PRD 6.4 no. 5, DESIGN 4.8): tile 2 kolom (3 di desktop), ikon 24px brand-600,
 * label 13px muted, nilai 16/700. Fakta kosong sudah dibuang oleh unitFacts().
 */
export function KeyFacts({ facts, className }: { facts: UnitFact[]; className?: string }) {
  if (!facts.length) return null;
  return (
    <section aria-labelledby="fakta-judul" className={className}>
      <h2 id="fakta-judul" className="sr-only">
        Ringkasan unit
      </h2>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.key} className="flex min-w-0 flex-col gap-1 rounded-card border border-line bg-white p-3.5 md:p-4">
            <dt className="flex flex-col gap-2 text-caption font-medium text-muted">
              <Icon name={fact.icon} className="size-6 text-brand-600" />
              {fact.label}
            </dt>
            <dd className="text-base leading-6 font-bold break-words text-ink">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
