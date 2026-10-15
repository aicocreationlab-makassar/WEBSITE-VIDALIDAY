import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pesan galat umum di atas form: ikon + teks merah gelap, dibacakan pembaca layar (role="alert"). */
export function FormAlert({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-control border border-brand-200 bg-brand-50 px-3.5 py-3 text-sm leading-5 font-medium text-brand-700",
        className,
      )}
    >
      <CircleAlert className="mt-px size-[18px] shrink-0" aria-hidden="true" />
      <p className="min-w-0">{children}</p>
    </div>
  );
}

/** Pesan galat per field (DESIGN 4.5): ikon circle-alert + teks danger 13px. */
export function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-caption font-medium text-danger">
      <CircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
