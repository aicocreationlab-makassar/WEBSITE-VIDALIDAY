import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Satu tombol arahan. */
  action?: React.ReactNode;
  className?: string;
};

/** Empty state: ikon 40px subtle dalam lingkaran surface-2, judul 18/700, satu kalimat, satu tombol (DESIGN 4.10). */
export function EmptyState({ icon: IconComponent, title, description, action, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      <span className="flex size-20 items-center justify-center rounded-full bg-surface-2">
        <IconComponent className="size-10 text-subtle" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-ink">{title}</h2>
      {description ? <p className="mt-1 max-w-sm text-base text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
