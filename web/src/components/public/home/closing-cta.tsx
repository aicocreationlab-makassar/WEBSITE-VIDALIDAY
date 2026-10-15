import { MessageCircleQuestionMark } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { Section } from "@/components/public/shared/section-heading";
import { Button } from "@/components/ui/button";
import { formatOfficeHours } from "@/lib/format";
import { GENERAL_INQUIRY_MESSAGE, waLink } from "@/lib/whatsapp";

type Props = {
  whatsappNumber: string;
  officeHours: string;
  className?: string;
};

/** Blok 7 beranda (PRD 6.2): kartu tenang "Masih bingung pilih unit?" + tombol WhatsApp ke admin. */
export function ClosingCta({ whatsappNumber, officeHours, className }: Props) {
  const hours = formatOfficeHours(officeHours);

  return (
    <Section aria-labelledby="penutup-judul" className={className}>
      <div className="flex flex-col gap-6 rounded-sheet bg-surface p-6 ring-1 ring-line/80 md:flex-row md:items-center md:justify-between md:gap-10 md:px-10 md:py-9">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-card">
            <MessageCircleQuestionMark className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="penutup-judul" className="text-h2 font-bold text-ink md:text-h2-lg">
              Masih bingung pilih unit?
            </h2>
            <p className="mt-1 text-base text-ink-2">Tanya admin, kami bantu carikan yang pas.</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 md:items-end">
          <Button asChild size="lg" className="w-full md:w-auto">
            <a href={waLink(whatsappNumber, GENERAL_INQUIRY_MESSAGE)} target="_blank" rel="noopener noreferrer">
              <WhatsappIcon className="size-5" />
              Chat admin via WhatsApp
            </a>
          </Button>
          {hours ? <p className="text-center text-caption text-ink-2 md:text-right">Jam layanan {hours}</p> : null}
        </div>
      </div>
    </Section>
  );
}
