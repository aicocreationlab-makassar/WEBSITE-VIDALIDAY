import type { AdminUnitRow } from "@/lib/admin/unit-query";
import type { Selection } from "./unit-list-model";

/** Aksi per baris yang dijalankan UnitList (satu tempat untuk pending, toast, dan dialog hapus). */
export type RowActions = {
  /** Id unit yang sedang diproses aksinya (baris diredupkan). */
  busyId: number | null;
  onToggleAvailable: (row: AdminUnitRow) => void;
  onToggleFeatured: (row: AdminUnitRow) => void;
  onDuplicate: (row: AdminUnitRow) => void;
  onDelete: (row: AdminUnitRow) => void;
};

export type SelectionProps = {
  selecting: boolean;
  selection: Selection;
  onToggle: (row: AdminUnitRow) => void;
  onTogglePage: (checked: boolean) => void;
};
