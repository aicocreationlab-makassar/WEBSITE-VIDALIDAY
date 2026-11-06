"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { PhotoPlaceholder } from "@/components/public/unit/photo-placeholder";

type Props = Omit<ImageProps, "src" | "onError"> & {
  src: string;
  /** Teks placeholder saat gambar gagal dimuat (file hilang di Storage, jaringan putus). */
  fallbackLabel?: string;
};

/**
 * `next/image` yang mengganti dirinya dengan placeholder netral kalau gambar gagal dimuat, supaya
 * kartu/galeri tidak menampilkan ikon rusak atau hanya teks alt. Induk harus `relative` dengan ukuran
 * (sama seperti pemakaian `fill` biasa).
 */
export function MediaImage({ src, alt, fallbackLabel = "Foto tidak bisa dimuat", ...rest }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === src) return <PhotoPlaceholder label={fallbackLabel} />;
  return <Image src={src} alt={alt} onError={() => setFailedSrc(src)} {...rest} />;
}
