"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import { rememberUnit } from "@/lib/recent";
import type { CatalogUnit } from "@/types/domain";
import { toRecentEntry } from "./recommend-model";

/**
 * Mencatat kunjungan detail unit (PRD 6.6, 6.10): riwayat di perangkat (`vdl:recent`, tidak dikirim ke
 * server) untuk "Unit serupa" dan "Terakhir kamu lihat", plus event `unit_view`. Tidak merender apa pun.
 * Sekali per unit per mount; ref menahan efek ganda Strict Mode dan render ulang dengan objek baru.
 */
export function RecordView({ unit }: { unit: CatalogUnit }) {
  const recordedId = useRef<number | null>(null);

  useEffect(() => {
    if (recordedId.current === unit.id) return;
    recordedId.current = unit.id;
    rememberUnit(toRecentEntry(unit));
    track("unit_view", { unit: unit.slug, apartemen: unit.locationSlug });
  }, [unit]);

  return null;
}
