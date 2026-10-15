"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { facilityFilterQuery, parseFacilityFilter, type FacilityFilter } from "./facility-model";

/**
 * Filter fasilitas di query URL (bisa di-bookmark dan dibagikan) tanpa memuat ulang data: daftar kecil
 * disaring di klien, URL diperbarui lewat history.replaceState yang terhubung ke router Next
 * (useSearchParams ikut berubah). Harus di dalam <Suspense> (layout panel admin menyediakannya).
 */
export function useFacilityFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const filter = useMemo(() => parseFacilityFilter(searchParams), [searchParams]);

  const setFilter = useCallback(
    (changes: Partial<FacilityFilter>) => {
      // Baca URL terkini (bukan closure) supaya dua perubahan cepat tidak saling menimpa.
      const current = parseFacilityFilter(new URLSearchParams(window.location.search));
      const query = facilityFilterQuery({ ...current, ...changes });
      window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [pathname],
  );

  return { filter, setFilter };
}
