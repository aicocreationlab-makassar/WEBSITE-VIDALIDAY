import { CircleDot, EyeOff, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Badge status unit (DESIGN 5): Tampil, Draft, Penuh, Promo, Unggulan. */
export function UnitStatusBadges({
  isPublished,
  isAvailable,
  isPromoActive,
  isFeatured,
}: {
  isPublished: boolean;
  isAvailable: boolean;
  isPromoActive: boolean;
  isFeatured: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {isPublished ? (
        <Badge variant="success">
          <CircleDot aria-hidden="true" />
          Tampil
        </Badge>
      ) : (
        <Badge variant="neutral">
          <EyeOff aria-hidden="true" />
          Draft
        </Badge>
      )}
      {!isAvailable ? <Badge variant="outline">Penuh</Badge> : null}
      {isPromoActive ? <Badge variant="promo">Promo</Badge> : null}
      {isFeatured ? (
        <Badge variant="featured">
          <Sparkles aria-hidden="true" className="text-brand-600" />
          Unggulan
        </Badge>
      ) : null}
    </div>
  );
}

export const LEAD_STATUSES = [
  { value: "baru", label: "Baru", variant: "brand" },
  { value: "dihubungi", label: "Dihubungi", variant: "warning" },
  { value: "deal", label: "Deal", variant: "success" },
  { value: "batal", label: "Batal", variant: "neutral" },
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number]["value"];

/** Badge status permintaan sewa: Baru (brand), Dihubungi (warning), Deal (success), Batal (muted). */
export function LeadStatusBadge({ status }: { status: string }) {
  const item = LEAD_STATUSES.find((s) => s.value === status) ?? LEAD_STATUSES[0];
  return <Badge variant={item.variant}>{item.label}</Badge>;
}
