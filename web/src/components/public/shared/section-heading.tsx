import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  /** Aksi di kanan judul (mis. tautan "Lihat semua"). */
  action?: React.ReactNode;
  id?: string;
  as?: "h2" | "h3";
  className?: string;
};

/** Judul section H2 (22/28 mobile, 28/36 desktop) + satu kalimat pendukung. */
export function SectionHeading({ title, description, action, id, as: Tag = "h2", className }: Props) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4 md:mb-6", className)}>
      <div className="min-w-0">
        <Tag id={id} className="text-h2 font-bold text-ink md:text-h2-lg">
          {title}
        </Tag>
        {description ? <p className="mt-1 max-w-[70ch] text-sm text-pretty text-muted md:text-base">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Pembungkus section: jarak 40px mobile, 72px desktop; container maks. 1200px. */
export function Section({
  children,
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"section"> & { containerClassName?: string }) {
  return (
    <section className={cn("py-10 md:py-[72px]", className)} {...props}>
      <div className={cn("mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8", containerClassName)}>{children}</div>
    </section>
  );
}
