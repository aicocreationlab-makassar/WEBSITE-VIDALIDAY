"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BadgePercent, BedDouble, CalendarCheck, CalendarX, CircleOff, Eye, EyeOff, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Field, NativeSelect } from "@/components/admin/kit/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bulkUpdateUnits } from "@/lib/actions/admin/units-list";
import type { AdminUnitRow } from "@/lib/admin/unit-query";
import type { AdminLocationOption } from "@/lib/data/admin/units";
import { BULK_BUTTONS, isPromoEligible, MIXED_LOCATION_MESSAGE, roomTypeTarget, type BulkAction } from "./unit-list-model";

const ICONS: Record<Exclude<BulkAction, "ubah-tipe">, typeof Eye> = {
  tersedia: CalendarCheck,
  penuh: CalendarX,
  "promo-on": BadgePercent,
  "promo-off": CircleOff,
  tampil: Eye,
  sembunyi: EyeOff,
};

type Props = {
  selected: AdminUnitRow[];
  locations: AdminLocationOption[];
  onClear: () => void;
  onExit: () => void;
};

/** Bar aksi massal yang menempel di bawah (mode "Pilih", PRD 7.4, UX 2.7). */
export function BulkBar({ selected, locations, onClear, onExit }: Props) {
  const [running, setRunning] = useState<BulkAction | null>(null);
  const [pending, startTransition] = useTransition();
  const [typeOpen, setTypeOpen] = useState(false);
  const count = selected.length;
  const disabled = count === 0 || pending;

  function run(action: BulkAction, roomTypeId?: number, onSuccess?: () => void) {
    const ids = selected.map((row) => row.id);
    setRunning(action);
    startTransition(async () => {
      try {
        const result = await bulkUpdateUnits({ ids, action, roomTypeId });
        if (result.ok) {
          toast.success(result.message ?? "Perubahan disimpan");
          onSuccess?.();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.");
      } finally {
        setRunning(null);
      }
    });
  }

  const promoReady = selected.filter(isPromoEligible).length;

  return (
    <section
      aria-label="Aksi massal"
      className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-line bg-white/95 px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-sticky backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div className="flex items-center gap-2">
        <p className="text-sm font-bold text-ink tabular-nums" aria-live="polite">
          {count ? `${count} dipilih` : "Belum ada unit dipilih"}
        </p>
        {count ? (
          <Button type="button" variant="link" onClick={onClear} disabled={pending}>
            Kosongkan
          </Button>
        ) : null}
        <Button
          type="button"
          variant="quiet"
          size="icon"
          className="ml-auto"
          aria-label="Selesai memilih"
          onClick={onExit}
          disabled={pending}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <div className="no-scrollbar -mx-4 mt-1.5 flex gap-2 overflow-x-auto px-4 pb-0.5 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        {BULK_BUTTONS.map(({ action, label }) => {
          const IconComponent = ICONS[action as keyof typeof ICONS];
          const title =
            action === "promo-on" && count && promoReady < count
              ? `${count - promoReady} unit belum punya harga promo yang lebih murah dan akan dilewati.`
              : undefined;
          return (
            <Button
              key={action}
              type="button"
              variant="secondary"
              disabled={disabled}
              loading={running === action}
              title={title}
              onClick={() => run(action)}
            >
              {running === action ? null : <IconComponent aria-hidden="true" />}
              {label}
            </Button>
          );
        })}
        <Button type="button" variant="outline" disabled={disabled} onClick={() => setTypeOpen(true)}>
          <BedDouble aria-hidden="true" />
          Ubah tipe kamar
        </Button>
      </div>

      <Dialog open={typeOpen} onOpenChange={(next) => !pending && setTypeOpen(next)}>
        <DialogContent>
          {typeOpen ? (
            <ChangeTypeForm
              selected={selected}
              locations={locations}
              pending={running === "ubah-tipe"}
              onCancel={() => setTypeOpen(false)}
              onSubmit={(roomTypeId) => run("ubah-tipe", roomTypeId, () => setTypeOpen(false))}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ChangeTypeForm({
  selected,
  locations,
  pending,
  onCancel,
  onSubmit,
}: {
  selected: AdminUnitRow[];
  locations: AdminLocationOption[];
  pending: boolean;
  onCancel: () => void;
  onSubmit: (roomTypeId: number) => void;
}) {
  const target = roomTypeTarget(selected);
  const location = target.ok ? locations.find((l) => l.id === target.locationId) : undefined;
  const types = location?.roomTypes ?? [];
  const [typeId, setTypeId] = useState<number | null>(null);
  const [error, setError] = useState<string | undefined>();
  const locationCount = new Set(selected.map((row) => row.locationId)).size;

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!target.ok) return;
        if (!typeId) {
          setError("Pilih tipe kamar.");
          return;
        }
        onSubmit(typeId);
      }}
    >
      <DialogHeader>
        <DialogTitle>Ubah tipe kamar</DialogTitle>
        <DialogDescription>
          {target.ok
            ? `${selected.length} unit di ${location?.name ?? "apartemen ini"}. Tipe kamar lama diganti.`
            : `${selected.length} unit dipilih dari ${locationCount} apartemen.`}
        </DialogDescription>
      </DialogHeader>

      {!target.ok ? (
        <p className="flex items-start gap-2 rounded-control border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm font-medium text-[#b45309]">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {MIXED_LOCATION_MESSAGE}
        </p>
      ) : null}

      {target.ok && !types.length ? (
        <p className="rounded-control border border-line bg-surface px-3.5 py-3 text-sm text-ink-2">
          Belum ada tipe kamar di {location?.name ?? "apartemen ini"}.{" "}
          <Link href={`/admin/locations/${target.locationId}`} className="font-semibold text-brand-700 underline">
            Tambah tipe kamar
          </Link>
        </p>
      ) : (
        <Field label="Tipe kamar" error={error}>
          <NativeSelect
            value={typeId ?? ""}
            disabled={!target.ok || pending}
            onChange={(event) => {
              setTypeId(Number(event.target.value) || null);
              setError(undefined);
            }}
          >
            <option value="">Pilih tipe kamar</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.isActive ? type.name : `${type.name} (nonaktif)`}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" disabled={!target.ok || !types.length} loading={pending}>
          Simpan tipe kamar
        </Button>
      </DialogFooter>
    </form>
  );
}
