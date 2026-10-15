import type { ComponentType } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { Section, SectionHeading } from "@/components/public/shared/section-heading";
import { toDisplayLegalName } from "@/lib/format";

type Point = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
};

function pointsFor(legalName: string): Point[] {
  const company = toDisplayLegalName(legalName);
  return [
    {
      icon: ShieldCheck,
      title: "Resmi dan berbadan hukum",
      text: company ? `Dikelola ${company}.` : "Dikelola resmi oleh perusahaan berbadan hukum.",
    },
    {
      icon: Sparkles,
      title: "Unit bersih siap huni",
      text: "Setiap unit dibersihkan dan disiapkan sebelum kamu check-in.",
    },
    {
      icon: WhatsappIcon,
      title: "Pesan cepat via WhatsApp",
      text: "Pilih unit dan tanggal, lalu kirim langsung ke admin tanpa daftar akun.",
    },
  ];
}

/** Blok 5 beranda (PRD 6.2): tiga alasan berikon, satu kalimat per poin. */
export function WhySection({ legalName, className }: { legalName: string; className?: string }) {
  return (
    <Section aria-labelledby="kenapa-judul" className={className}>
      <SectionHeading id="kenapa-judul" title="Kenapa VIDALIDAY" />
      <ul className="grid gap-6 md:grid-cols-3 md:gap-8">
        {pointsFor(legalName).map(({ icon: PointIcon, title, text }) => (
          <li key={title} className="flex items-start gap-4 md:flex-col">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <PointIcon className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-ink md:text-card">{title}</h3>
              <p className="mt-1 max-w-[46ch] text-base text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
