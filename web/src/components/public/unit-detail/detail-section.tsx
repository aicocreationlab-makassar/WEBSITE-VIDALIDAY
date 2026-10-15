import { SectionHeading } from "@/components/public/shared/section-heading";
import { cn } from "@/lib/utils";

type Props = {
  /** id elemen judul (untuk aria-labelledby). */
  headingId: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** id section (mis. "lokasi" untuk tautan "Lihat peta"). */
  id?: string;
  className?: string;
  children: React.ReactNode;
};

/** Blok konten detail unit: dipisah garis 1px, judul H2 (22/28 mobile, 28/36 desktop). */
export function DetailSection({ headingId, title, description, action, id, className, children }: Props) {
  return (
    <section id={id} aria-labelledby={headingId} className={cn("border-t border-line py-8 md:py-10", className)}>
      <SectionHeading id={headingId} title={title} description={description} action={action} className="mb-4 md:mb-5" />
      {children}
    </section>
  );
}
