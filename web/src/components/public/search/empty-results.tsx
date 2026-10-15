import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/public/shared/empty-state";
import { UnitCard } from "@/components/public/unit/unit-card";
import { Button } from "@/components/ui/button";
import type { CatalogUnit } from "@/types/domain";
import { RESULTS_GRID } from "./layout";

/**
 * Hasil kosong (PRD 6.3, DESIGN 4.10): satu kalimat arahan, satu tombol "Hapus semua filter",
 * lalu maksimal 3 unit terdekat (harga dilonggarkan dulu, lalu tipe; dari nearestUnits).
 */
export function EmptyResults({ suggestions }: { suggestions: CatalogUnit[] }) {
  return (
    <div>
      <EmptyState
        icon={SearchX}
        title="Belum ada unit yang cocok"
        description="Coba ubah tipe kamar atau naikkan budget."
        action={
          <Button asChild>
            <Link href="/sewa">Hapus semua filter</Link>
          </Button>
        }
        className="rounded-card bg-surface"
      />

      {suggestions.length ? (
        <section aria-labelledby="unit-terdekat-judul" className="mt-10">
          <h2 id="unit-terdekat-judul" className="text-h2 font-bold text-ink md:text-h2-lg">
            Unit terdekat
          </h2>
          <p className="mt-1 text-sm text-muted md:text-base">Paling mendekati pencarianmu.</p>
          <ul className={`mt-5 ${RESULTS_GRID}`}>
            {suggestions.map((unit) => (
              <li key={unit.id} className="min-w-0">
                <UnitCard unit={unit} layout="grid" headingLevel="h3" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
