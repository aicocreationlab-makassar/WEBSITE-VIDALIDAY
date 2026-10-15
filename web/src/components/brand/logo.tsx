import Image from "next/image";
import Link from "next/link";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export const DEFAULT_LOGO = "/images/logo-vidaliday-256.jpg";

type LogoProps = {
  /** Setting `site_logo` (path bucket atau URL); kosong = logo bawaan. */
  logo?: string | null;
  /** Tujuan tautan. `null` = logo tanpa tautan (mis. di footer, supaya tautan beranda tidak dobel). */
  href?: string | null;
  /** `nav` = ukuran header publik (membesar di `lg`, bukan `md`, supaya header tablet muat). */
  size?: "sm" | "md" | "lg" | "nav";
  /** Warna tagline: abu (situs publik) atau merah (admin). Diabaikan pada varian `inverse`. */
  tone?: "public" | "admin";
  /** `inverse` untuk latar gelap: wordmark putih, tagline putih 70%. */
  variant?: "default" | "inverse";
  /** Muat gambar segera (logo di atas lipatan). `false` untuk logo di footer. */
  eager?: boolean;
  className?: string;
};

const SIZES = {
  sm: { box: "size-10", px: 40, word: "text-base", dot: "text-lg", tag: "text-[10px]" },
  md: { box: "size-11 md:size-12", px: 48, word: "text-lg md:text-xl", dot: "text-xl md:text-2xl", tag: "text-[10px]" },
  nav: { box: "size-11 lg:size-12", px: 48, word: "text-lg lg:text-xl", dot: "text-xl lg:text-2xl", tag: "text-[10px]" },
  lg: { box: "size-16", px: 64, word: "text-2xl", dot: "text-3xl", tag: "text-[11px]" },
} as const;

/** Logo bulat + wordmark "VIDALIDAY." + tagline "Apartment By Us" (markup situs lama). */
export function Logo({
  logo,
  href = "/",
  size = "md",
  tone = "public",
  variant = "default",
  eager = true,
  className,
}: LogoProps) {
  const s = SIZES[size];
  const src = mediaUrl(logo) ?? DEFAULT_LOGO;
  const inverse = variant === "inverse";

  const content = (
    <>
      <span
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full border bg-white shadow-sm",
          inverse ? "border-white/20" : "border-line",
          s.box,
        )}
      >
        <Image
          src={src}
          alt=""
          width={s.px}
          height={s.px}
          className="size-full object-cover"
          loading={eager ? "eager" : "lazy"}
        />
      </span>
      <span className="min-w-0 leading-none">
        <span
          className={cn(
            "flex items-baseline font-extrabold tracking-tight",
            inverse ? "text-white" : "text-ink",
            s.word,
          )}
        >
          VIDALIDAY
          <span className={cn("leading-none", inverse ? "text-brand-500" : "text-brand-600", s.dot)}>.</span>
        </span>
        <span
          className={cn(
            "mt-0.5 block font-bold uppercase tracking-[0.14em]",
            s.tag,
            inverse ? "text-white/70" : tone === "admin" ? "text-brand-700" : "text-muted",
          )}
        >
          Apartment By Us
        </span>
      </span>
    </>
  );

  const base = "group flex min-w-0 items-center gap-2.5 rounded-control";

  if (href === null) {
    return <span className={cn(base, className)}>{content}</span>;
  }

  return (
    <Link href={href} className={cn(base, className)} aria-label="VIDALIDAY, ke beranda">
      {content}
    </Link>
  );
}
