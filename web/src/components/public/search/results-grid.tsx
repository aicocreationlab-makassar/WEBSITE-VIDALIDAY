import { UnitCard } from "@/components/public/unit/unit-card";
import type { CatalogUnit } from "@/types/domain";
import { RESULTS_GRID } from "./layout";

/**
 * Hasil pencarian (dirender di server): kartu unit, unit penuh sudah di urutan bawah oleh searchUnits.
 * Judul kartu h2 karena langsung di bawah H1 halaman.
 */
export function ResultsGrid({ units }: { units: CatalogUnit[] }) {
  return (
    <ul aria-label="Hasil pencarian" className={RESULTS_GRID}>
      {units.map((unit, i) => (
        <li key={unit.id} className="min-w-0">
          {/* Kartu pertama = gambar LCP di mobile. Lebar kartu: penuh di mobile, ~1/2 di sm–lg (dengan sidebar), ~1/3 di xl. */}
          <UnitCard
            unit={unit}
            layout="grid"
            headingLevel="h2"
            eager={i === 0}
            sizes="(max-width: 639px) 92vw, (max-width: 1279px) 40vw, 300px"
          />
        </li>
      ))}
    </ul>
  );
}
