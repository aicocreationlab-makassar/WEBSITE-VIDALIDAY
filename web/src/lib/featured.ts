// Pemilihan "Promo pilihan" di beranda (PRD 6.2): unit unggulan (maks. 8);
// kalau kurang dari 4, lengkapi dengan unit diskon terbesar. Hanya unit tersedia yang punya foto.

import { discountPercent } from "@/lib/pricing";
import type { CatalogUnit } from "@/types/domain";

const MAX_FEATURED = 8;
const MIN_FEATURED = 4;

function discountOf(u: CatalogUnit): number {
  return discountPercent({ normal_price: u.normalPrice, promo_price: u.promoPrice, is_promo_active: u.isPromoActive });
}

export function pickFeatured(catalog: CatalogUnit[]): CatalogUnit[] {
  const eligible = catalog.filter((u) => u.isAvailable && u.photos.length > 0);
  const featured = eligible
    .filter((u) => u.isFeatured)
    .sort((a, b) => a.sortOrder - b.sortOrder || discountOf(b) - discountOf(a) || a.effectivePrice - b.effectivePrice)
    .slice(0, MAX_FEATURED);
  if (featured.length >= MIN_FEATURED) return featured;

  const taken = new Set(featured.map((u) => u.id));
  const fill = eligible
    .filter((u) => !taken.has(u.id) && discountOf(u) > 0)
    .sort((a, b) => discountOf(b) - discountOf(a) || a.effectivePrice - b.effectivePrice);
  return [...featured, ...fill].slice(0, Math.max(MIN_FEATURED, featured.length));
}
