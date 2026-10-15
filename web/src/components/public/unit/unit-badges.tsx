import { BadgePercent, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CatalogUnit } from "@/types/domain";
import { unitBadge } from "./price";

type Props = {
  unit: Pick<CatalogUnit, "normalPrice" | "promoPrice" | "isPromoActive" | "effectivePrice" | "promoBadge" | "isFeatured" | "isAvailable">;
  className?: string;
  /** Maks. jumlah badge (kartu: 2). */
  max?: number;
};

/** Badge kartu/detail: "Penuh" menggantikan diskon; lalu promo, lalu "Unggulan" (DESIGN 4.6). */
export function UnitBadges({ unit, className, max = 2 }: Props) {
  const items: React.ReactNode[] = [];
  if (!unit.isAvailable) {
    items.push(
      <Badge key="full" variant="full">
        Penuh
      </Badge>,
    );
  } else {
    const promo = unitBadge(unit);
    if (promo) {
      items.push(
        <Badge key="promo" variant="promo">
          {promo.kind === "discount" ? <BadgePercent aria-hidden="true" /> : null}
          {promo.label}
        </Badge>,
      );
    }
  }
  if (unit.isFeatured) {
    items.push(
      <Badge key="featured" variant="featured">
        <Sparkles aria-hidden="true" className="text-brand-600" />
        Unggulan
      </Badge>,
    );
  }
  if (!items.length) return null;
  return <div className={cn("flex flex-wrap gap-1.5", className)}>{items.slice(0, max)}</div>;
}
