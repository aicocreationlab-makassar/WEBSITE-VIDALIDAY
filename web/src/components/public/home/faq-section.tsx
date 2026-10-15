import { FaqList } from "@/components/public/shared/faq-list";
import { Section, SectionHeading } from "@/components/public/shared/section-heading";
import type { Faq } from "@/types/domain";

/** Blok 6 beranda (PRD 6.2): 5 FAQ teratas + "Lihat semua pertanyaan". Target tautan /#faq. */
export function FaqSection({ faqs, className }: { faqs: Faq[]; className?: string }) {
  if (!faqs.length) return null;

  return (
    <Section id="faq" aria-labelledby="faq-judul" className={className}>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12">
        <SectionHeading
          id="faq-judul"
          title="Pertanyaan umum"
          description="Jawaban singkat untuk hal yang paling sering ditanyakan."
          className="lg:self-start"
        />
        <FaqList faqs={faqs} initial={5} />
      </div>
    </Section>
  );
}
