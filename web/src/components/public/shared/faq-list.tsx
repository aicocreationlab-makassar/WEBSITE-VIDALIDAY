"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { stripMarkdown } from "@/lib/format";
import type { Faq } from "@/types/domain";

type Props = {
  faqs: Faq[];
  /** Jumlah yang tampil sebelum "Lihat semua pertanyaan" (expand di tempat). */
  initial?: number;
};

/** FAQ accordion (PRD 6.2: 5 teratas + "Lihat semua pertanyaan"). Badge lama tidak ditampilkan; tanda * dibuang. */
export function FaqList({ faqs, initial = 5 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? faqs : faqs.slice(0, initial);
  const hidden = faqs.length - shown.length;

  return (
    <div className="rounded-card bg-white px-4 shadow-card ring-1 ring-line/80 sm:px-6">
      <Accordion type="single" collapsible>
        {shown.map((faq) => (
          <AccordionItem key={faq.id} value={String(faq.id)}>
            <AccordionTrigger>{stripMarkdown(faq.question)}</AccordionTrigger>
            <AccordionContent>
              {stripMarkdown(faq.answer)
                .split(/\n{2,}/)
                .map((paragraph, i) => (
                  <p key={i} className="whitespace-pre-line not-last:mb-3">
                    {paragraph}
                  </p>
                ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {hidden > 0 ? (
        <div className="border-t border-line py-2">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-1 font-semibold text-brand-700 hover:underline"
          >
            Lihat semua pertanyaan ({faqs.length})
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
