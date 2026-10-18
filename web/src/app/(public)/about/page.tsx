import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { DEFAULT_LOGO } from "@/components/brand/logo";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { Section, SectionHeading } from "@/components/public/shared/section-heading";
import { Button } from "@/components/ui/button";
import { getListedLocations } from "@/lib/data/locations";
import { getSettings } from "@/lib/data/settings";
import { stripMarkdown, toDisplayLegalName } from "@/lib/format";
import { Icon } from "@/lib/icons";
import { mediaUrl } from "@/lib/media";
import { sewaHref } from "@/lib/validation/filters";
import { waLink } from "@/lib/whatsapp";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Tentang Kami, Pengelola Sewa Apartemen Makassar",
    description: stripMarkdown(settings.about.introP1).slice(0, 160),
    alternates: { canonical: "/about" },
  };
}

/** Halaman Tentang kami (PRD 6.8): isi dari setting about_* dan about_reasons, layout ringkas tanpa emoji. */
export default async function AboutPage() {
  const [settings, locations] = await Promise.all([getSettings(), getListedLocations()]);
  const about = settings.about;
  const paragraphs = [about.introP1, about.introP2, about.introP3].map((p) => stripMarkdown(p)).filter(Boolean);
  const logo = mediaUrl(settings.siteLogo) ?? DEFAULT_LOGO;

  return (
    <>
      <Section className="pb-6 md:pb-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-brand-700">Tentang VIDALIDAY</p>
          <h1 className="mt-2 text-h1 font-extrabold tracking-tight text-balance text-ink md:text-h1-lg">
            {about.heroTitle}
          </h1>
          <p className="mt-3 text-lg font-semibold text-ink-2">{about.tagline}</p>
        </div>
      </Section>

      <Section className="pt-0 md:pt-0">
        <div className="grid grid-cols-1 gap-8 rounded-card bg-white p-5 shadow-card ring-1 ring-line/80 sm:p-8 md:grid-cols-[minmax(0,1fr)_320px] md:gap-12">
          <div className="min-w-0 space-y-4 text-base leading-[26px] text-ink-2">
            <div className="flex items-center gap-3">
              <span className="relative size-14 overflow-hidden rounded-full border border-line bg-white">
                <Image src={logo} alt="" fill sizes="56px" className="object-cover" />
              </span>
              <p className="text-sm text-muted">
                Dikelola oleh <span className="font-semibold text-ink">{toDisplayLegalName(settings.companyLegalName)}</span>
              </p>
            </div>
            {paragraphs.map((text, i) => (
              <p key={i} className={i === 0 ? "font-medium text-ink" : undefined}>
                {text}
              </p>
            ))}
          </div>
          {locations.length ? (
            <ul className="grid min-w-0 grid-cols-1 content-start gap-3" aria-label="Apartemen kami">
              {locations.map((location) => (
                <li key={location.slug}>
                  <Link
                    href={`/apartemen/${location.slug}`}
                    className="flex items-center gap-3 rounded-card bg-surface p-4 ring-1 ring-line transition-colors hover:ring-brand-200"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <MapPin className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-ink">{location.shortName}</span>
                      <span className="line-clamp-2 text-sm text-ink-2">{location.tagline ?? location.area}</span>
                    </span>
                    <ArrowRight className="ml-auto size-4 shrink-0 text-muted" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Section>

      {about.reasons.length ? (
        <Section className="bg-surface" aria-labelledby="alasan-judul">
          <SectionHeading id="alasan-judul" title="Kenapa memilih VIDALIDAY" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {about.reasons.map((reason) => (
              <li key={reason.title} className="rounded-card bg-white p-5 shadow-card ring-1 ring-line/80">
                <span className="flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon name={reason.icon} fallback="shield-check" className="size-5" />
                </span>
                <h3 className="mt-3 text-card font-bold text-ink">{reason.title}</h3>
                {reason.desc ? <p className="mt-1 text-base text-muted">{stripMarkdown(reason.desc)}</p> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section>
        <div className="mx-auto max-w-3xl rounded-card bg-white p-6 text-center shadow-card ring-1 ring-line/80 sm:p-10">
          <h2 className="text-h2 font-bold text-ink md:text-h2-lg">{about.commitTitle}</h2>
          <p className="mt-3 text-base leading-[26px] text-ink-2">{stripMarkdown(about.commitText)}</p>
          {about.closingQuote ? (
            <p className="mt-6 border-y border-brand-200 py-4 text-lg font-bold text-ink">{about.closingQuote}</p>
          ) : null}
          {about.closingCta ? <p className="mt-4 text-base text-muted">{about.closingCta}</p> : null}
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={sewaHref({})}>Lihat unit</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a
                href={waLink(settings.whatsappNumber, "Halo Admin VIDALIDAY, saya mau konsultasi sewa apartemen di Makassar.")}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsappIcon className="size-5 text-brand-600" />
                Tanya admin
              </a>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
