"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { WandSparkles } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SettingsInput } from "@/lib/validation/admin";
import { sameImage, type SettingsData } from "./settings-model";

/** Penghitung karakter di kanan label ("42/90"); berwarna peringatan saat mencapai batas. */
export function CharCount({ value, max }: { value: string | null | undefined; max: number }) {
  const length = (value ?? "").length;
  return (
    <span className={cn("tabular-nums", length >= max && "font-semibold text-[#b45309]")}>
      {length}/{max}
    </span>
  );
}

/** Penanda kecil: nilai ini belum pernah diatur, situs memakai nilai bawaan aplikasi. */
export function DefaultTag() {
  return (
    <span
      title="Belum diatur. Situs memakai nilai bawaan."
      className="inline-flex items-center rounded-full border border-line bg-surface-2 px-2 py-px text-[12px] leading-4 font-semibold text-ink-2"
    >
      Bawaan
      <span className="sr-only">: belum diatur, situs memakai nilai bawaan</span>
    </span>
  );
}

/** Isi `aside` Field: penanda bawaan (opsional) + penghitung (opsional). */
export function FieldAside({ isDefault, count }: { isDefault?: boolean; count?: React.ReactNode }) {
  if (!isDefault && !count) return null;
  return (
    <span className="inline-flex items-center gap-2">
      {isDefault ? <DefaultTag /> : null}
      {count}
    </span>
  );
}

/** Petunjuk + tombol saran satu ketuk (mis. "Rapikan jadi 08.00–23.00 WITA"). */
export function HintWithSuggestion({
  hint,
  suggestion,
  onApply,
}: {
  hint: React.ReactNode;
  suggestion: React.ReactNode | null;
  onApply: () => void;
}) {
  if (!suggestion) return <>{hint}</>;
  return (
    <span className="flex flex-col items-start">
      <span>{hint}</span>
      <button
        type="button"
        onClick={onApply}
        className="inline-flex min-h-11 items-center gap-1.5 text-left font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
      >
        <WandSparkles className="size-4 shrink-0" aria-hidden="true" />
        {suggestion}
      </button>
    </span>
  );
}

/** Teks status di bar simpan: jumlah perubahan, atau waktu simpan terakhir. */
export function SaveStatus({ dirtyCount, savedAt }: { dirtyCount: number; savedAt: string | null }) {
  if (dirtyCount > 0) {
    return (
      <span className="inline-flex items-center gap-2 font-medium text-ink-2">
        <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
        {dirtyCount === 1 ? "Ada 1 perubahan yang belum disimpan" : `Ada ${dirtyCount} perubahan yang belum disimpan`}
      </span>
    );
  }
  if (savedAt) return <>Terakhir disimpan {formatDateTime(savedAt)}</>;
  return <>Kolom bertanda * wajib diisi.</>;
}

/** Pindah ke isian pertama yang bermasalah (di tengah layar, tidak tertutup bar menempel). */
export function focusFirstInvalid(formId: string) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const form = document.getElementById(formId);
      const target = form?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]');
      if (!target) return;
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
      target.focus({ preventScroll: true });
    }),
  );
}

/**
 * Foto yang terunggah selama form terbuka. Yang tidak jadi dipakai dibuang dari bucket:
 * saat disimpan (selain nilai akhir), saat perubahan dibatalkan, dan saat halaman ditinggalkan.
 */
export function useUploadSession(discard: (paths: string[]) => Promise<unknown>) {
  const uploads = useRef(new Set<string>());

  const drop = useCallback(
    (paths: string[]) => {
      if (paths.length) void discard(paths).catch(() => undefined);
    },
    [discard],
  );

  useEffect(() => {
    const set = uploads.current;
    return () => drop([...set]);
  }, [drop]);

  return useMemo(
    () => ({
      /** Catat unggahan baru (bukan nilai tersimpan). */
      track(path: string) {
        uploads.current.add(path.trim());
      },
      /** Setelah simpan: buang unggahan selain nilai akhir, lalu kosongkan catatan. */
      settle(keep: (string | null | undefined)[]) {
        const unused = [...uploads.current].filter((path) => !keep.some((value) => sameImage(path, value)));
        uploads.current.clear();
        drop(unused);
      },
    }),
    [drop],
  );
}

/** Konteks react-hook-form form Pengaturan (dipakai setiap kartu). */
export function useSettingsFormContext() {
  return useFormContext<SettingsInput, unknown, SettingsData>();
}
