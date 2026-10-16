/* eslint-disable @next/next/no-img-element -- Satori (next/og) hanya mengenal <img>, bukan next/image. */
// Gambar Open Graph (PRD 6.9) dengan next/og: kartu merek bawaan dan kartu per unit, PNG 1200×630.
//
// Batasan yang membentuk desain ini:
// - Satori tidak bisa membaca WebP. Foto unit hanya ditanam kalau URL-nya .jpg/.jpeg/.png DAN isi
//   berkasnya memang JPEG/PNG (dicek dari byte awal); selain itu kartu merek tanpa foto.
// - Pratinjau WhatsApp butuh gambar di bawah ±300 KB (UX G15). PNG dari resvg nyaris tidak
//   memampatkan area foto (±2,8 byte per piksel), jadi foto ditaruh di bingkai kecil, dan versi
//   dengan foto yang tetap kebesaran diganti versi tanpa foto (renderUnitOg).
// - Font Plus Jakarta Sans 600/800 diambil dari Google Fonts (TTF, subset Latin) dan di-cache.
//   Kalau gagal, ImageResponse memakai font bawaannya (gambar tetap jadi).

import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactElement } from "react";
import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import { formatRupiah } from "@/lib/format";
import { badgeFor, strikePrice } from "@/lib/pricing";
import { formatUnitPlace } from "@/lib/unit-display";
import type { CatalogUnit } from "@/types/domain";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";
/** Batas ukuran PNG supaya pratinjau WhatsApp tetap muncul (UX G15). */
export const OG_MAX_BYTES = 300_000;
export const DEFAULT_OG_ALT = "VIDALIDAY, sewa apartemen harian di Makassar";
export const UNIT_OG_ALT = "Unit apartemen VIDALIDAY di Makassar dengan harga per malam";

const SITE_LABEL = "vidaliday.com";
const FETCH_TIMEOUT_MS = 8_000;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

// Warna dari token DESIGN 3.1 (Satori tidak membaca CSS variable).
const C = {
  white: "#ffffff",
  ink: "#0f172a",
  ink2: "#334155",
  muted: "#64748b",
  surface2: "#f1f5f9",
  brand50: "#fef2f2",
  brand200: "#fecaca",
  brand600: "#dc2626",
  brand700: "#b91c1c",
} as const;

// ---------------------------------------------------------------------------
// Aset lokal. Dibaca sinkron dan sekali saja (readFileSync termasuk "nilai yang bisa diprediksi",
// jadi tetap ikut prerender), dan baru saat gambar dibuat: modul ini juga dimuat halaman untuk
// membaca alt/size, jadi tidak boleh membaca berkas saat modul dievaluasi.
// Path ditulis literal supaya ikut terbawa output file tracing.
// ---------------------------------------------------------------------------

let logoSrc: string | undefined;
let buildingSrc: string | undefined;

function jpegDataUrl(file: Buffer): string {
  return `data:image/jpeg;base64,${file.toString("base64")}`;
}

function getLogoSrc(): string {
  logoSrc ??= jpegDataUrl(readFileSync(path.join(process.cwd(), "public/images/logo-vidaliday-256.jpg")));
  return logoSrc;
}

function getBuildingSrc(): string {
  buildingSrc ??= jpegDataUrl(readFileSync(path.join(process.cwd(), "public/images/locations/vida-view.jpg")));
  return buildingSrc;
}

// ---------------------------------------------------------------------------
// Font
// ---------------------------------------------------------------------------

type ImageOptions = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>;
export type OgFonts = NonNullable<ImageOptions["fonts"]>;
type FontWeight = 600 | 800;

const FONT_FAMILY = "Plus Jakarta Sans";
const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");
const LATIN_1 = Array.from({ length: 96 }, (_, i) => String.fromCharCode(0xa0 + i)).join("");
/** Subset glyph: ASCII, Latin-1 (é, ², ·), dan tanda baca tipografi. */
const FONT_TEXT = `${ASCII}${LATIN_1}–—‘’“”…•`;
const FONT_CSS_URL = `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;800&text=${encodeURIComponent(FONT_TEXT)}`;

/** CSS Google Fonts → [{ weight, url }] untuk berkas TTF/OTF (format yang dibaca Satori). Fungsi murni. */
export function parseFontFaces(css: string): { weight: number; url: string }[] {
  return css
    .split("@font-face")
    .slice(1)
    .flatMap((block) => {
      const weight = /font-weight:\s*(\d+)/.exec(block);
      const src = /src:\s*url\(([^)]+)\)\s*format\(['"]?(?:truetype|opentype)['"]?\)/.exec(block);
      if (!weight || !src) return [];
      return [{ weight: Number(weight[1]), url: src[1].replace(/^['"]|['"]$/g, "") }];
    });
}

async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response;
}

/** Pola loadGoogleFont dari dokumentasi Vercel OG; hasil di-cache. Gagal → melempar (tidak di-cache). */
async function fetchFontFiles(): Promise<{ weight: FontWeight; base64: string }[]> {
  "use cache";
  cacheLife("max");

  const css = await (await fetchOk(FONT_CSS_URL)).text();
  const faces = parseFontFaces(css).filter(
    (face): face is { weight: FontWeight; url: string } => face.weight === 600 || face.weight === 800,
  );
  if (faces.length < 2) throw new Error("CSS Google Fonts tidak berisi TTF 600 dan 800");
  return Promise.all(
    faces.map(async (face) => ({
      weight: face.weight,
      base64: Buffer.from(await (await fetchOk(face.url)).arrayBuffer()).toString("base64"),
    })),
  );
}

/** Font untuk ImageResponse; undefined = pakai font bawaan next/og. */
export async function loadOgFonts(): Promise<OgFonts | undefined> {
  try {
    const files = await fetchFontFiles();
    return files.map((file) => ({
      name: FONT_FAMILY,
      data: Buffer.from(file.base64, "base64"),
      weight: file.weight,
      style: "normal" as const,
    }));
  } catch (error) {
    console.warn(`[og] Font ${FONT_FAMILY} gagal dimuat, memakai font bawaan: ${String(error)}`);
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Foto unit
// ---------------------------------------------------------------------------

/** URL http(s) yang path-nya berakhiran .jpg/.jpeg/.png. WebP dan lainnya ditolak. Fungsi murni. */
export function isSatoriImageUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const { protocol, pathname } = new URL(url);
    return (protocol === "https:" || protocol === "http:") && /\.(jpe?g|png)$/i.test(pathname);
  } catch {
    return false;
  }
}

/** Jenis gambar dari byte awal; hanya JPEG dan PNG yang diterima. Fungsi murni. */
export function sniffImageType(bytes: Uint8Array): "image/jpeg" | "image/png" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  return null;
}

/**
 * Foto unit sebagai data URL, atau null (bukan JPEG/PNG, terlalu besar, atau gagal diambil).
 * Dipanggil dari dalam fungsi "use cache" milik route OG unit, jadi tidak di-cache sendiri.
 */
/**
 * Foto unit sebagai data URL. `transient` = gagal karena jaringan/timeout (layak dicoba lagi),
 * berbeda dengan foto yang memang ditolak (terlalu besar, bukan JPEG/PNG).
 */
export async function fetchOgPhoto(url: string): Promise<{ photo: string | null; transient: boolean }> {
  if (!isSatoriImageUrl(url)) return { photo: null, transient: false };
  let response: Response;
  try {
    response = await fetchOk(url);
  } catch {
    return { photo: null, transient: true };
  }
  try {
    if (Number(response.headers.get("content-length")) > MAX_PHOTO_BYTES) return { photo: null, transient: false };
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_PHOTO_BYTES) return { photo: null, transient: false };
    const type = sniffImageType(bytes);
    return { photo: type ? `data:${type};base64,${Buffer.from(bytes).toString("base64")}` : null, transient: false };
  } catch {
    return { photo: null, transient: true };
  }
}

/** Foto unit pertama (dari 3 teratas) yang bisa dibaca Satori. */
export function pickOgPhotoUrl(photos: string[]): string | null {
  return photos.slice(0, 3).find((photo) => isSatoriImageUrl(photo)) ?? null;
}

// ---------------------------------------------------------------------------
// Elemen kartu (JSX Satori: flexbox, style inline, tanpa class)
// ---------------------------------------------------------------------------

function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

function brandMark(logoSize: number): ReactElement {
  const wordSize = Math.round(logoSize * 0.5);
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <img src={getLogoSrc()} alt="" width={logoSize} height={logoSize} style={{ borderRadius: 9999 }} />
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 18 }}>
        <div style={{ display: "flex", fontSize: wordSize, fontWeight: 800, color: C.ink, lineHeight: 1 }}>
          <span>VIDALIDAY</span>
          {/* Tanpa kerning antar-span: titik digeser supaya rapat seperti di header situs. */}
          <span style={{ color: C.brand600, marginLeft: -Math.round(wordSize * 0.16) }}>.</span>
        </div>
        <div style={{ display: "flex", fontSize: 14, fontWeight: 600, color: C.muted, letterSpacing: 4, marginTop: 8 }}>
          APARTMENT BY US
        </div>
      </div>
    </div>
  );
}

function sitePill(): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        fontSize: 24,
        fontWeight: 800,
        color: C.brand700,
        background: C.brand50,
        border: `2px solid ${C.brand200}`,
        borderRadius: 9999,
        padding: "10px 24px",
      }}
    >
      {SITE_LABEL}
    </div>
  );
}

/** Panel kanan abu dengan foto berbingkai putih (kecil, demi batas ukuran) atau logo besar. */
function sidePanel(photo: string | null, photoSize: { width: number; height: number }): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        width: 430,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: C.surface2,
      }}
    >
      {photo ? (
        <img
          src={photo}
          alt=""
          width={photoSize.width}
          height={photoSize.height}
          style={{ objectFit: "cover", borderRadius: 28, border: `8px solid ${C.white}` }}
        />
      ) : (
        <img
          src={getLogoSrc()}
          alt=""
          width={232}
          height={232}
          style={{ borderRadius: 9999, border: `8px solid ${C.white}` }}
        />
      )}
    </div>
  );
}

type FrameSlots = {
  /** Logo + wordmark di kiri atas. */
  top: ReactElement;
  /** Judul utama di tengah kiri. */
  middle: ReactElement;
  /** Baris penutup di kiri bawah. */
  bottom: ReactElement;
  /** Panel kanan (foto atau logo). */
  side: ReactElement;
};

function frame({ top, middle, bottom, side }: FrameSlots): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: C.white,
        fontFamily: FONT_FAMILY,
        color: C.ink,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 770,
          height: "100%",
          padding: "60px 48px 60px 72px",
        }}
      >
        {top}
        {middle}
        {bottom}
      </div>
      {side}
    </div>
  );
}

/** Kartu bawaan: logo, wordmark, tagline, dan foto gedung Vida View di kanan. */
export function defaultOgCard(): ReactElement {
  return frame({
    top: brandMark(84),
    middle: (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 66, fontWeight: 800, letterSpacing: -2, lineHeight: 1.08 }}>
          Sewa apartemen harian di Makassar
        </div>
        <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: C.ink2, marginTop: 22, lineHeight: 1.35 }}>
          Harian, mingguan, dan bulanan. Pesan cepat via WhatsApp.
        </div>
      </div>
    ),
    bottom: <div style={{ display: "flex" }}>{sitePill()}</div>,
    side: sidePanel(getBuildingSrc(), { width: 250, height: 330 }),
  });
}

type OgUnit = Pick<
  CatalogUnit,
  | "name"
  | "locationShortName"
  | "locationArea"
  | "tower"
  | "floorNumber"
  | "effectivePrice"
  | "normalPrice"
  | "promoPrice"
  | "isPromoActive"
  | "promoBadge"
  | "isAvailable"
>;

/** Kartu unit: apartemen + posisi, nama unit, harga per malam (+ harga coret dan label promo). */
export function unitOgCard(unit: OgUnit, photo: string | null): ReactElement {
  const fields = { normal_price: unit.normalPrice, promo_price: unit.promoPrice, is_promo_active: unit.isPromoActive };
  const strike = strikePrice(fields);
  // Unit penuh: label "Penuh" menggantikan label promo, sama seperti di halaman (DESIGN 4.6).
  const full = !unit.isAvailable;
  const badge = full ? { label: "Penuh" } : badgeFor({ ...fields, promo_badge: unit.promoBadge });
  const name = truncate(unit.name, 64);
  const nameSize = name.length <= 24 ? 64 : name.length <= 40 ? 54 : 46;

  return frame({
    top: brandMark(72),
    middle: (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: C.ink2 }}>
          {truncate(formatUnitPlace(unit), 46)}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: nameSize,
            fontWeight: 800,
            letterSpacing: -1.5,
            lineHeight: 1.1,
            marginTop: 10,
          }}
        >
          {name}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap", marginTop: 26 }}>
          <span style={{ fontSize: 56, fontWeight: 800, lineHeight: 1 }}>{formatRupiah(unit.effectivePrice)}</span>
          <span style={{ fontSize: 28, fontWeight: 600, color: C.muted, lineHeight: 1, marginLeft: 6, marginBottom: 5 }}>
            /malam
          </span>
          {strike ? (
            <span
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: C.muted,
                lineHeight: 1,
                marginLeft: 22,
                marginBottom: 6,
                textDecoration: "line-through",
              }}
            >
              {formatRupiah(strike)}
            </span>
          ) : null}
        </div>
        {badge ? (
          <div style={{ display: "flex", marginTop: 18 }}>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 800,
                color: full ? C.ink2 : C.brand700,
                background: full ? C.surface2 : C.brand50,
                border: `2px solid ${full ? C.muted : C.brand200}`,
                borderRadius: 9999,
                padding: "6px 18px",
                whiteSpace: "nowrap",
              }}
            >
              {truncate(badge.label, 24)}
            </div>
          </div>
        ) : null}
      </div>
    ),
    bottom: (
      <div style={{ display: "flex", alignItems: "center", fontSize: 24, fontWeight: 600, color: C.ink2 }}>
        <span>{unit.isAvailable ? "Pesan cepat via WhatsApp" : "Tanya ketersediaan via WhatsApp"}</span>
        <span style={{ color: C.muted, margin: "0 12px" }}>·</span>
        <span style={{ color: C.brand700, fontWeight: 800 }}>{SITE_LABEL}</span>
      </div>
    ),
    side: sidePanel(photo, { width: 236, height: 312 }),
  });
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export function renderOg(element: ReactElement, fonts: OgFonts | undefined): ImageResponse {
  return new ImageResponse(element, { ...OG_SIZE, ...(fonts ? { fonts } : {}) });
}

/** Kartu bawaan sebagai Response PNG (dipakai app/opengraph-image dan cadangan OG unit). */
export function defaultOgImage(fonts: OgFonts | undefined): ImageResponse {
  return renderOg(defaultOgCard(), fonts);
}

/**
 * PNG kartu unit. Versi dengan foto dipakai kalau ukurannya ≤ OG_MAX_BYTES; kalau lebih,
 * dirender ulang tanpa foto (UX G15). Panggil dari dalam fungsi "use cache".
 */
export async function renderUnitOg(unit: OgUnit, photo: string | null, fonts: OgFonts | undefined): Promise<Uint8Array> {
  if (photo) {
    const withPhoto = new Uint8Array(await renderOg(unitOgCard(unit, photo), fonts).arrayBuffer());
    if (withPhoto.byteLength <= OG_MAX_BYTES) return withPhoto;
  }
  return new Uint8Array(await renderOg(unitOgCard(unit, null), fonts).arrayBuffer());
}

/** Response PNG dari byte yang sudah jadi (mis. hasil fungsi "use cache"). */
export function pngResponse(bytes: Uint8Array): Response {
  return new Response(new Uint8Array(bytes), {
    headers: { "content-type": OG_CONTENT_TYPE, "cache-control": "public, max-age=0, must-revalidate" },
  });
}
