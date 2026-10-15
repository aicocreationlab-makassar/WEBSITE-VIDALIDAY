import { BedDouble, Building2, Eye, TrendingDown, Users, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ReasonKind, Recommendation } from "@/lib/recommend";
import { cn } from "@/lib/utils";

const REASON_ICONS: Record<ReasonKind, LucideIcon> = {
  cheaper: TrendingDown,
  bigger: Users,
  "same-location": Building2,
  "same-type": BedDouble,
  "same-view": Eye,
};

type Props = {
  reason: Recommendation["reason"];
  className?: string;
};

/**
 * Alasan sebuah unit direkomendasikan (UX 2.6): pill 13px + ikon garis.
 * "Lebih hemat" memakai warna sukses (teks emerald-700 supaya kontras AA di atas emerald-50);
 * alasan lain netral. Tidak tampil kalau tidak ada alasan.
 */
export function ReasonChip({ reason, className }: Props) {
  if (!reason) return null;
  const ReasonIcon = REASON_ICONS[reason.kind];
  const cheaper = reason.kind === "cheaper";

  return (
    <Badge
      variant={cheaper ? "success" : "neutral"}
      data-reason={reason.kind}
      className={cn("py-1", cheaper && "text-emerald-700", className)}
    >
      <ReasonIcon aria-hidden="true" className={cheaper ? "text-success" : "text-muted"} />
      {reason.label}
    </Badge>
  );
}
