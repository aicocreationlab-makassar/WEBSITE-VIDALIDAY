"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Broom, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/kit/confirm-dialog";
import { Button } from "@/components/ui/button";
import { scanUnusedMedia, sweepUnusedMedia, type UnusedMediaScan } from "@/lib/actions/admin/media";
import { formatFileSize } from "@/lib/format";
import type { MediaFolder } from "@/lib/storage-cleanup";

const FOLDER_LABEL: Record<MediaFolder, string> = {
  units: "Foto unit",
  locations: "Foto apartemen",
  facilities: "Foto fasilitas gedung",
  settings: "Foto hero dan logo",
};

const NETWORK_ERROR = "Gagal terhubung. Periksa koneksi lalu coba lagi.";

/**
 * Sapuan bucket media: cari file yang tidak dipakai unit, apartemen, fasilitas, maupun pengaturan,
 * lalu hapus setelah dikonfirmasi. Foto yang diganti lewat panel admin sudah dihapus otomatis; kartu ini
 * untuk sisa unggahan lama, file yang diunggah langsung ke Supabase, atau gagal hapus saat itu.
 */
export function MediaCleanupCard() {
  const [scan, setScan] = useState<UnusedMediaScan | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scanning, startScan] = useTransition();
  const [sweeping, startSweep] = useTransition();
  const scanButtonRef = useRef<HTMLButtonElement>(null);

  // Tombol dinonaktifkan selama memeriksa sehingga fokus keyboard lepas ke <body>; dikembalikan setelah
  // tombol aktif lagi (bukan di akhir action: saat itu React belum merender ulang, tombol masih disabled).
  const refocusScanRef = useRef(false);
  useEffect(() => {
    if (scanning || !refocusScanRef.current) return;
    refocusScanRef.current = false;
    scanButtonRef.current?.focus({ preventScroll: true });
  }, [scanning]);

  function runScan() {
    refocusScanRef.current = document.activeElement === scanButtonRef.current;
    startScan(async () => {
      try {
        const result = await scanUnusedMedia();
        if (result.ok && result.data) setScan(result.data);
        else if (!result.ok) toast.error(result.error);
      } catch {
        toast.error(NETWORK_ERROR);
      }
    });
  }

  function runSweep() {
    if (!scan) return;
    const paths = scan.folders.flatMap((folder) => folder.paths);
    startSweep(async () => {
      try {
        const result = await sweepUnusedMedia(paths);
        if (result.ok) toast.success(result.message ?? "File tak terpakai dihapus");
        else toast.error(result.error);
        setConfirmOpen(false);
        setScan(null);
        // Tombol "Hapus N file" hilang bersama hasil periksa: fokus kembali ke tombol Periksa.
        window.setTimeout(() => scanButtonRef.current?.focus({ preventScroll: true }), 0);
      } catch {
        toast.error(NETWORK_ERROR);
      }
    });
  }

  return (
    <section aria-labelledby="bersihkan-judul" className="glass-card mt-5 rounded-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="bersihkan-judul" className="text-base font-bold text-ink">
            Bersihkan file tak terpakai
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Foto yang diganti lewat panel admin sudah dihapus otomatis dari Storage. Pakai ini untuk sisa unggahan lama
            atau file yang diunggah langsung ke Supabase, supaya yang tersimpan sama dengan yang dipakai situs.
          </p>
        </div>
        <Button ref={scanButtonRef} type="button" variant="secondary" loading={scanning} onClick={runScan} className="shrink-0">
          {scanning ? null : <ScanSearch aria-hidden="true" />}
          {scan ? "Periksa lagi" : "Periksa file"}
        </Button>
      </div>

      {/* Live region selalu ada supaya hasil periksa pertama ikut dibacakan pembaca layar. */}
      <div aria-live="polite">
      {scan ? (
        <div className="mt-4 rounded-control border border-line bg-surface p-4">
          {scan.total === 0 ? (
            <p className="text-sm font-medium text-ink-2">
              {scan.recent
                ? `Tidak ada file lama yang perlu dihapus. ${scan.recent} file baru diunggah (kurang dari 24 jam) dilewati.`
                : `Semua ${scan.files} file di Storage masih dipakai. Tidak ada yang perlu dihapus.`}
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-ink">
                {scan.total} file tidak terpakai ({formatFileSize(scan.bytes)}) dari {scan.files} file.
              </p>
              <ul className="mt-2 grid gap-1 text-sm text-ink-2 sm:grid-cols-2">
                {scan.folders.map((folder) => (
                  <li key={folder.folder} className="flex justify-between gap-3 tabular-nums">
                    <span>{FOLDER_LABEL[folder.folder]}</span>
                    <span className={folder.count ? "font-semibold text-ink" : "text-muted"}>
                      {folder.count} file · {formatFileSize(folder.bytes)}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="destructive"
                className="mt-4"
                onClick={() => setConfirmOpen(true)}
                disabled={sweeping}
              >
                <Broom aria-hidden="true" />
                Hapus {scan.total} file
              </Button>
              {scan.recent ? (
                <p className="mt-2 text-caption text-muted">
                  {scan.recent} file baru diunggah (kurang dari 24 jam) dilewati; bisa jadi foto di form yang belum disimpan.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(next) => !sweeping && setConfirmOpen(next)}
        title={`Hapus ${scan?.total ?? 0} file tak terpakai?`}
        description="File dihapus permanen dari bucket media. Salinan di cache CDN bisa masih terbuka beberapa jam. File yang ternyata dipakai lagi sejak pemeriksaan, atau baru diunggah, dilewati."
        confirmLabel="Hapus permanen"
        destructive
        loading={sweeping}
        onConfirm={runSweep}
      />
    </section>
  );
}
