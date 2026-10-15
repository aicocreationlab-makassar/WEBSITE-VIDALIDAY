import Image from "next/image";
import Link from "next/link";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export const DEFAULT_LOGO = "/images/logo-vidaliday-256.jpg";

type LogoProps = {
  /** Setting `site_logo` (path bucket atau URL); kosong = logo bawaan. */
  logo?: string | null;
  href?: string;
  size?: "sm" | "md" | "lg";
  /** Warna tagline: abu (situs publik) atau merah (admin). */
  tone?: "public" | "admin";
  className?: string;
};

const SIZES = {
  sm: { box: "size-10", px: 40, word: "text-base", dot: "text-lg", tag: "text-[10px]" },
  md: { box: "size-11 md:size-12", px: 48, word: "text-lg md:text-xl", dot: "text-xl md:text-2xl", tag: "text-[10px]" },
  lg: { box: "size-16", px: 64, word: "text-2xl", dot: "text-3xl", tag: "text-[11px]" },
} as const;

/** Logo bulat + wordmark "VIDALIDAY." + tagline "Apartment By Us" (markup situs lama). */
export function Logo({ logo, href = "/", size = "md", tone = "public", className }: LogoProps) {
  const s = SIZES[size];
  const src = mediaUrl(logo) ?? DEFAULT_LOGO;
  return (
    <Link
      href={href}
      className={cn("group flex min-w-0 items-center gap-2.5 rounded-control", className)}
      aria-label="VIDALIDAY, ke beranda"
    >
      <span
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full border border-line bg-white shadow-sm",
          s.box,
        )}
      >
        <Image src={src} alt="" width={s.px} height={s.px} className="size-full object-cover" priority />
      </span>
      <span className="min-w-0 leading-none">
        <span className={cn("flex items-baseline font-extrabold tracking-tight text-ink", s.word)}>
          VIDALIDAY<span className={cn("leading-none text-brand-600", s.dot)}>.</span>
        </span>
        <span
          className={cn(
            "mt-0.5 block font-bold uppercase tracking-[0.14em]",
            s.tag,
            tone === "admin" ? "text-brand-700" : "text-muted",
          )}
        >
          Apartment By Us
        </span>
      </span>
    </Link>
  );
}
