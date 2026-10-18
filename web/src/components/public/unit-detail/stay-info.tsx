import { Clock, IdCard } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Icon } from "@/lib/icons";
import type { HouseRule } from "@/lib/unit-detail";

type Props = {
  checkinTime: string;
  checkoutTime: string;
  requirements: string;
  rules: HouseRule[];
};

function TimeTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-card border border-line bg-white p-3.5 md:p-4">
      <Clock className="mt-0.5 size-6 shrink-0 text-brand-600" strokeWidth={1.75} aria-hidden="true" />
      {/* Label bisa dua baris di HP; nilai jam di kedua kotak tetap sejajar di baris bawah. */}
      <div className="flex min-w-0 flex-col justify-between self-stretch">
        <p className="text-caption font-medium text-muted">{label}</p>
        <p className="text-base leading-6 font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}

/**
 * Info menginap (PRD 6.4 no. 8): jam check-in/out, syarat, dan accordion "Peraturan menginap"
 * (setting house_rules, satu poin per baris; ikon cigarette-off untuk aturan rokok, ban untuk lainnya).
 */
export function StayInfo({ checkinTime, checkoutTime, requirements, rules }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {checkinTime ? <TimeTile label="Check-in mulai" value={checkinTime} /> : null}
        {checkoutTime ? <TimeTile label="Check-out paling lambat" value={checkoutTime} /> : null}
      </div>
      {requirements ? (
        <p className="flex items-start gap-3 text-[15px] leading-6 text-ink-2">
          <IdCard className="mt-0.5 size-5 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
          <span>{requirements}</span>
        </p>
      ) : null}
      {rules.length ? (
        <Accordion type="single" collapsible className="rounded-card border border-line bg-white px-4">
          <AccordionItem value="peraturan">
            <AccordionTrigger>Peraturan menginap</AccordionTrigger>
            <AccordionContent>
              <ul className="flex flex-col gap-3">
                {rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px] leading-6">
                    <Icon name={rule.icon} className="mt-0.5 size-5 shrink-0 text-ink-2" />
                    <span>{rule.text}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
    </div>
  );
}
