"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/kit/confirm-dialog";
import { FormCard } from "@/components/admin/kit/form-card";
import { Button } from "@/components/ui/button";
import { deleteLocation, setLocationActive } from "@/lib/actions/admin/locations";
import { adminUnitParams } from "@/lib/admin/unit-query";
import { locationDeleteState } from "./location-model";

type Props = {
  locationId: number;
  name: string;
  unitCount: number;
  isActive: boolean;
  /** Dipanggil setelah apartemen dinonaktifkan, supaya switch "Aktif" di form ikut. */
  onDeactivated: () => void;
};

/**
 * Hapus apartemen (PRD 7.5): hanya kalau tidak punya unit (DB juga menolak). Kalau masih punya
 * unit, jelaskan dan tawarkan "Nonaktifkan apartemen" sebagai gantinya.
 */
export function LocationDeleteCard({ locationId, name, unitCount, isActive, onDeactivated }: Props) {
  const router = useRouter();
  const messageId = useId();
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [deactivating, startDeactivate] = useTransition();
  const state = locationDeleteState(unitCount, isActive);
  const unitsHref = `/admin/units?${adminUnitParams({ lokasi: locationId }).toString()}`;

  function confirmDelete() {
    startDelete(async () => {
      const result = await deleteLocation(locationId);
      if (result.ok) {
        toast.success(result.message ?? "Apartemen dihapus");
        setConfirming(false);
        router.replace("/admin/locations");
      } else {
        toast.error(result.error);
        setConfirming(false);
        router.refresh();
      }
    });
  }

  function deactivate() {
    startDeactivate(async () => {
      const result = await setLocationActive({ id: locationId, isActive: false });
      if (result.ok) {
        toast.success(result.message ?? "Apartemen dinonaktifkan");
        onDeactivated();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <FormCard
      id="hapus-data"
      title="Hapus data"
      description="Tipe kamar, fasilitas gedung, dan landmark apartemen ini ikut terhapus."
      className="mt-5"
    >
      {state.message ? (
        <p id={messageId} className="flex items-start gap-2 rounded-control bg-surface px-3.5 py-3 text-sm text-ink-2">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-[#b45309]" aria-hidden="true" />
          <span>{state.message}</span>
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {state.offerDeactivate ? (
          <Button variant="secondary" onClick={deactivate} loading={deactivating}>
            <EyeOff aria-hidden="true" />
            Nonaktifkan apartemen
          </Button>
        ) : null}
        {!state.canDelete ? (
          <Button asChild variant="ghost">
            <Link href={unitsHref}>Lihat {unitCount} unit</Link>
          </Button>
        ) : null}
        <Button
          variant={state.canDelete ? "destructive" : "secondary"}
          disabled={!state.canDelete}
          aria-describedby={state.message ? messageId : undefined}
          onClick={() => setConfirming(true)}
          className="sm:ml-auto"
        >
          <Trash2 aria-hidden="true" />
          Hapus apartemen
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Hapus apartemen ${name}?`}
        description="Tipe kamar, fasilitas gedung, dan landmark apartemen ini ikut terhapus, begitu juga fotonya. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus apartemen"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </FormCard>
  );
}
