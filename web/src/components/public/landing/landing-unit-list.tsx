import { RESULTS_GRID } from "@/components/public/search/layout";
import { UnitCard } from "@/components/public/unit/unit-card";
import type { CatalogUnit } from "@/types/domain";

/** Daftar unit tipe ini (kartu yang sama dengan /sewa), tersedia dulu lalu termurah. */
export function LandingUnitList({ units, label }: { units: CatalogUnit[]; label: string }) {
  return (
    <ul aria-label={label} className={RESULTS_GRID}>
      {units.map((unit, index) => (
        <li key={unit.id} className="min-w-0">
          <UnitCard unit={unit} headingLevel="h3" eager={index === 0} />
        </li>
      ))}
    </ul>
  );
}
