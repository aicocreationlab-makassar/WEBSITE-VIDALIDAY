import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tanpa foto: latar netral + ikon gedung (DESIGN 7), bukan foto stok. */
export function PhotoPlaceholder({ className, label = "Foto segera hadir" }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex size-full flex-col items-center justify-center gap-2 bg-surface-2 text-center", className)}>
      <Building2 className="size-10 text-subtle" strokeWidth={1.5} aria-hidden="true" />
      <span className="text-caption font-medium text-ink-2">{label}</span>
    </div>
  );
}
