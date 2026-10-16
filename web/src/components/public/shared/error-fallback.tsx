"use client";

import { RefreshCw, ServerCrash } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { DEFAULT_WHATSAPP_NUMBER, GENERAL_INQUIRY_MESSAGE, waLink } from "@/lib/whatsapp";

const PRIMARY = cn(buttonVariants({ size: "lg" }));
const SECONDARY = cn(buttonVariants({ size: "lg", variant: "secondary" }));

/**
 * Tampilan saat halaman gagal dimuat (mis. database sedang bermasalah). Tidak memanggil data layer:
 * tombol WhatsApp memakai nomor bawaan supaya tamu tetap bisa menghubungi admin (PRD 4.9, 9 Keandalan).
 *
 * Dipakai tiga error boundary yang dimuat di setiap halaman, jadi sengaja ringan: elemen biasa
 * dengan kelas tombol yang sama (bukan Button/Slot), `<a>` biasa (bukan next/link; muat ulang penuh
 * juga lebih aman setelah galat), dan nomor bawaan saja (bukan seluruh DEFAULT_SETTINGS).
 */
export function ErrorFallback({ retry, digest }: { retry: () => void; digest?: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center md:py-24">
      <span className="flex size-20 items-center justify-center rounded-full bg-surface-2">
        <ServerCrash className="size-10 text-subtle" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-h1 font-extrabold tracking-tight text-ink">Halaman belum bisa dimuat</h1>
      <p className="mt-2 text-base text-muted">
        Ada gangguan sebentar di sistem kami. Coba muat ulang, atau langsung tanya admin lewat WhatsApp.
      </p>
      <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <button
          type="button"
          data-slot="button"
          data-variant="primary"
          data-size="lg"
          className={PRIMARY}
          onClick={() => retry()}
        >
          <RefreshCw aria-hidden="true" />
          Coba lagi
        </button>
        <a
          href={waLink(DEFAULT_WHATSAPP_NUMBER, GENERAL_INQUIRY_MESSAGE)}
          target="_blank"
          rel="noopener noreferrer"
          data-slot="button"
          data-variant="secondary"
          data-size="lg"
          className={SECONDARY}
        >
          <WhatsappIcon className="size-5 text-brand-600" />
          Chat admin via WhatsApp
        </a>
      </div>
      <p className="mt-6 text-sm text-muted">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- sengaja muat ulang penuh setelah galat (lihat komentar di atas) */}
        <a href="/" className="font-semibold text-brand-700 underline underline-offset-2">
          Ke beranda
        </a>
        {" · "}
        <a href="/sewa" className="font-semibold text-brand-700 underline underline-offset-2">
          Cari unit
        </a>
      </p>
      {digest ? <p className="mt-4 text-caption text-muted">Kode galat: {digest}</p> : null}
    </div>
  );
}
