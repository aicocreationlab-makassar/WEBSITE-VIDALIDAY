"use client";

import Link from "next/link";
import { RefreshCw, ServerCrash } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { Button } from "@/components/ui/button";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { GENERAL_INQUIRY_MESSAGE, waLink } from "@/lib/whatsapp";

/**
 * Tampilan saat halaman gagal dimuat (mis. database sedang bermasalah). Tidak memanggil data layer:
 * tombol WhatsApp memakai nomor bawaan supaya tamu tetap bisa menghubungi admin (PRD 4.9, 9 Keandalan).
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
        <Button size="lg" onClick={() => retry()}>
          <RefreshCw aria-hidden="true" />
          Coba lagi
        </Button>
        <Button asChild size="lg" variant="secondary">
          <a href={waLink(DEFAULT_SETTINGS.whatsappNumber, GENERAL_INQUIRY_MESSAGE)} target="_blank" rel="noopener noreferrer">
            <WhatsappIcon className="size-5 text-brand-600" />
            Chat admin via WhatsApp
          </a>
        </Button>
      </div>
      <p className="mt-6 text-sm text-muted">
        <Link href="/" className="font-semibold text-brand-700 underline underline-offset-2">
          Ke beranda
        </Link>
        {" · "}
        <Link href="/sewa" className="font-semibold text-brand-700 underline underline-offset-2">
          Cari unit
        </Link>
      </p>
      {digest ? <p className="mt-4 text-caption text-muted">Kode galat: {digest}</p> : null}
    </div>
  );
}
