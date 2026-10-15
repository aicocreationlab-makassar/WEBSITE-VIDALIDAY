"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, GripVertical, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { mediaUrl } from "@/lib/media";
import { ACCEPT_ATTR, UploadRejected } from "@/lib/upload/compress";
import { uploadImage, type MediaFolder } from "@/lib/upload/upload";
import { cn } from "@/lib/utils";

type Uploading = { key: string; name: string; progress: number; preview: string };

type PhotoListProps = {
  /** Path bucket (mis. "units/abc.webp") atau URL penuh; urutan = urutan tampil, pertama = sampul. */
  value: string[];
  onChange: (next: string[]) => void;
  folder: MediaFolder;
  max?: number;
  /** Dipanggil saat jumlah unggahan berjalan berubah (true = masih mengunggah), mis. untuk mengunci tombol Simpan. */
  onUploadingChange?: (uploading: boolean) => void;
  id?: string;
  "aria-describedby"?: string;
};

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Pengunggah banyak foto (PRD 7.4, DESIGN 5): area drop putus-putus, kompres WebP di browser,
 * unggah langsung ke Storage, progres per file, urutkan (drag di desktop, tombol geser di HP/keyboard),
 * foto pertama = sampul, hapus. File lama di Storage dihapus oleh server saat disimpan.
 */
export function PhotoListUploader({ value, onChange, folder, max = 15, onUploadingChange, id, ...aria }: PhotoListProps) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<Uploading[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropActive, setDropActive] = useState(false);
  // Nilai terbaru untuk unggahan paralel yang selesai belakangan (disinkronkan setelah render).
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  const busy = uploading.length > 0;
  useEffect(() => {
    onUploadingChange?.(busy);
  }, [busy, onUploadingChange]);

  const room = max - value.length - uploading.length;

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    if (list.length > room) {
      toast.error(`Maksimal ${max} foto. Hanya ${Math.max(room, 0)} foto lagi yang bisa ditambahkan.`);
    }
    const accepted = list.slice(0, Math.max(room, 0));
    await Promise.all(
      accepted.map(async (file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
        const preview = URL.createObjectURL(file);
        setUploading((items) => [...items, { key, name: file.name, progress: 0, preview }]);
        try {
          const result = await uploadImage(file, folder, (progress) =>
            setUploading((items) => items.map((item) => (item.key === key ? { ...item, progress } : item))),
          );
          onChange([...latest.current, result.path]);
        } catch (error) {
          toast.error(error instanceof UploadRejected || error instanceof Error ? error.message : "Gagal mengunggah foto.");
        } finally {
          URL.revokeObjectURL(preview);
          setUploading((items) => items.filter((item) => item.key !== key));
        }
      }),
    );
  }

  return (
    <div className="grid gap-3">
      <div
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) {
            event.preventDefault();
            setDropActive(true);
          }
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(event) => {
          if (!event.dataTransfer.files.length) return;
          event.preventDefault();
          setDropActive(false);
          void handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-card border-2 border-dashed border-line bg-surface px-4 py-6 text-center transition-colors",
          dropActive && "border-brand-500 bg-brand-50",
        )}
      >
        <ImagePlus className="size-8 text-subtle" aria-hidden="true" />
        <p className="text-sm font-semibold text-ink">Tarik foto ke sini atau</p>
        <button
          id={id}
          type="button"
          {...aria}
          onClick={() => input.current?.click()}
          disabled={room <= 0}
          className="inline-flex h-11 items-center gap-2 rounded-control border-[1.5px] border-brand-600 bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        >
          Pilih foto
        </button>
        <p className="text-caption text-muted">
          JPG, PNG, atau WebP, maks. 10 MB per file, maks. {max} foto. Foto dikompres otomatis. Pakai foto asli kamera
          (bukan screenshot), sebaiknya horizontal.
        </p>
        <input
          ref={input}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {value.length || uploading.length ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6" aria-label="Foto unit, urutan tampil">
          {value.map((path, index) => {
            const url = mediaUrl(path);
            return (
              <li
                key={path}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex !== null && dragIndex !== index) onChange(move(value, dragIndex, index));
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-control bg-surface-2 ring-1 ring-line",
                  dragIndex === index && "opacity-50",
                )}
              >
                {url ? (
                  <Image src={url} alt={`Foto ${index + 1}`} fill sizes="120px" className="object-cover" />
                ) : null}
                <span className="pointer-events-none absolute top-1 left-1 hidden rounded bg-white/90 p-0.5 text-muted sm:block">
                  <GripVertical className="size-4" aria-hidden="true" />
                </span>
                {index === 0 ? (
                  <span className="absolute bottom-1 left-1 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white">
                    Sampul
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  aria-label={`Hapus foto ${index + 1}`}
                  className="absolute top-1 right-1 inline-flex size-8 items-center justify-center rounded-full bg-white/95 text-danger shadow-sm hover:bg-white"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
                <div className="absolute right-1 bottom-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => onChange(move(value, index, index - 1))}
                    disabled={index === 0}
                    aria-label={`Geser foto ${index + 1} ke kiri`}
                    className="inline-flex size-8 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm disabled:hidden"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(move(value, index, index + 1))}
                    disabled={index === value.length - 1}
                    aria-label={`Geser foto ${index + 1} ke kanan`}
                    className="inline-flex size-8 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm disabled:hidden"
                  >
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
          {uploading.map((item) => (
            <li key={item.key} className="relative aspect-square overflow-hidden rounded-control bg-surface-2 ring-1 ring-line">
              <Image src={item.preview} alt="" fill sizes="120px" unoptimized className="object-cover opacity-50" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/40">
                <LoaderCircle className="size-6 animate-spin text-brand-600" aria-hidden="true" />
                <span className="text-caption font-bold text-ink tabular-nums">{item.progress}%</span>
              </div>
              <span className="sr-only">{`Mengunggah ${item.name}, ${item.progress} persen`}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type SingleProps = {
  value: string | null;
  onChange: (next: string | null) => void;
  folder: MediaFolder;
  /** Rasio pratinjau. */
  aspect?: "video" | "square" | "wide" | "photo";
  /** Gambar bawaan yang dipakai situs kalau kosong (ditampilkan sebagai keterangan). */
  fallbackLabel?: string;
  /** Dipanggil saat unggahan mulai/selesai (true = sedang mengunggah), mis. untuk mengunci tombol Simpan. */
  onUploadingChange?: (uploading: boolean) => void;
  id?: string;
  "aria-describedby"?: string;
};

/** Pengunggah satu foto (fasilitas gedung, apartemen, logo, hero). */
export function SingleImageUploader({
  value,
  onChange,
  folder,
  aspect = "video",
  fallbackLabel,
  onUploadingChange,
  id,
  ...aria
}: SingleProps) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const url = mediaUrl(value);
  const busy = progress !== null;
  useEffect(() => {
    onUploadingChange?.(busy);
  }, [busy, onUploadingChange]);

  async function handle(file: File | undefined) {
    if (!file) return;
    setProgress(0);
    try {
      const result = await uploadImage(file, folder, setProgress);
      onChange(result.path);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunggah foto.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="grid gap-3">
      <div
        className={cn(
          "relative overflow-hidden rounded-card bg-surface-2 ring-1 ring-line",
          aspect === "video" && "aspect-video",
          aspect === "square" && "aspect-square max-w-40",
          aspect === "wide" && "aspect-[21/9]",
          aspect === "photo" && "aspect-[4/3]",
        )}
      >
        {url ? (
          <Image src={url} alt="Pratinjau foto" fill sizes="(max-width: 768px) 92vw, 480px" className="object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 p-3 text-center">
            <ImagePlus className="size-7 text-subtle" aria-hidden="true" />
            <span className="text-caption text-ink-2">{fallbackLabel ?? "Belum ada foto"}</span>
          </div>
        )}
        {progress !== null ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/70">
            <LoaderCircle className="size-5 animate-spin text-brand-600" aria-hidden="true" />
            <span className="text-sm font-bold tabular-nums">{progress}%</span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          id={id}
          type="button"
          {...aria}
          onClick={() => input.current?.click()}
          disabled={progress !== null}
          className="inline-flex h-11 items-center gap-2 rounded-control border-[1.5px] border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-surface-2 disabled:opacity-50"
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          {value ? "Ganti foto" : "Pilih foto"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex h-11 items-center gap-2 rounded-control px-4 text-sm font-semibold text-danger hover:bg-brand-50"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Hapus foto
          </button>
        ) : null}
        <input
          ref={input}
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            void handle(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
