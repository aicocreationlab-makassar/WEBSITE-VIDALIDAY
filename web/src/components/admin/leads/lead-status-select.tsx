"use client";

import { NativeSelect } from "@/components/admin/kit/field";
import { LEAD_STATUSES } from "@/components/admin/kit/status-badge";
import type { LeadStatusValue } from "@/lib/admin/lead-query";
import { cn } from "@/lib/utils";
import { toStatus } from "./lead-list-model";

// Warna select mengikuti badge status (DESIGN 5): Baru brand, Dihubungi warning, Deal success, Batal muted.
const TONE: Record<LeadStatusValue, string> = {
  baru: "border-brand-200 bg-brand-50 text-brand-700",
  dihubungi: "border-amber-200 bg-amber-50 text-[#b45309]",
  deal: "border-emerald-200 bg-emerald-50 text-emerald-700",
  batal: "bg-surface-2 text-ink-2",
};

type Props = {
  code: string;
  status: string;
  onChange: (status: LeadStatusValue) => void;
  /** "table": 40px ringkas; "card": 48px lebar penuh (target sentuh besar di HP). */
  size?: "table" | "card";
  /** Sedang disimpan: tetap bisa dipakai, tampil redup. */
  busy?: boolean;
  className?: string;
};

/** Status permintaan yang bisa diubah langsung; tersimpan begitu dipilih. */
export function LeadStatusSelect({ code, status, onChange, size = "table", busy = false, className }: Props) {
  const current = toStatus(status) ?? "baru";
  return (
    <NativeSelect
      aria-label={`Status ${code}`}
      aria-busy={busy || undefined}
      value={current}
      onChange={(event) => {
        const next = toStatus(event.target.value);
        if (next && next !== current) onChange(next);
      }}
      className={cn(
        "font-semibold transition-opacity",
        size === "table" ? "h-10 w-32 pr-9 pl-3 text-sm" : "h-12 w-full",
        TONE[current],
        busy && "opacity-60",
        className,
      )}
    >
      {LEAD_STATUSES.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </NativeSelect>
  );
}
