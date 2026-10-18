// /llms.txt dan /llms-full.txt (llmstxt.org): ringkasan situs dalam Markdown polos untuk asisten AI dan
// answer engine. Semua angka dari data; tanpa markdown dari DB, tanpa emoji. Fungsi murni, ada test.

import { formatOfficeHours, formatRupiah, formatWhatsappDisplay, stripMarkdown, toDisplayLegalName } from "@/lib/format";
import { mapExternalUrl } from "@/lib/gmaps";
import { apartmentPath } from "@/lib/seo/apartment-jsonld";
import { absoluteUrl } from "@/lib/seo/home-jsonld";
import { parseHouseRules } from "@/lib/unit-detail";
import { formatUnitSpot, roomTypeHref, unitHref } from "@/lib/unit-display";
import type { CatalogUnit, Facility, Faq, Landmark, LocationWithTypes } from "@/types/domain";
import type { SiteSettings } from "@/types/settings";

export type LlmsInput = {
  siteUrl: string;
  settings: Pick<
    SiteSettings,
    | "seoDescription"
    | "whatsappNumber"
    | "contactEmail"
    | "officeHours"
    | "checkinTime"
    | "checkoutTime"
    | "checkinRequirements"
    | "houseRules"
    | "companyLegalName"
  >;
  locations: LocationWithTypes[];
  catalog: CatalogUnit[];
  facilities: Facility[];
  landmarks: Landmark[];
  faqs: Faq[];
};

function flat(text: string | null | undefined): string {
  return stripMarkdown(text ?? "").replace(/\s+/g, " ").trim();
}

function sections(input: LlmsInput): string[] {
  const base = input.siteUrl.replace(/\/+$/, "");
  const s = input.settings;
  const out: string[] = [];

  out.push("# VIDALIDAY");
  out.push("");
  out.push(`> ${flat(s.seoDescription) || "Sewa apartemen harian, mingguan, dan bulanan di Makassar, dikelola resmi."}`);
  out.push("");
  out.push(
    `VIDALIDAY${s.companyLegalName ? ` (${toDisplayLegalName(s.companyLegalName)})` : ""} menyewakan unit apartemen di Makassar, Sulawesi Selatan. Harga di situs adalah harga per malam dalam Rupiah; pemesanan lewat WhatsApp admin.`,
  );

  out.push("");
  out.push("## Apartemen");
  out.push("");
  for (const location of input.locations) {
    const facilities = input.facilities.filter((facility) => facility.locationId === location.id).map((facility) => facility.name);
    const nearby = input.landmarks
      .filter((landmark) => landmark.locationId === location.id)
      .slice(0, 5)
      .map((landmark) => `${landmark.name} (${landmark.distanceTime})`);
    const parts = [`[${location.name}](${absoluteUrl(base, apartmentPath(location.slug))})`];
    if (location.area) parts.push(location.area);
    if (location.address) parts.push(location.address);
    out.push(`- ${parts.join(", ")}: ${location.availableCount} dari ${location.unitCount} unit tersedia${location.minPrice ? `, mulai ${formatRupiah(location.minPrice)}/malam` : ""}.`);
    if (facilities.length) out.push(`  - Fasilitas gedung: ${facilities.join(", ")}.`);
    if (nearby.length) out.push(`  - Dekat: ${nearby.join(", ")}.`);
    // Pin lokasi gedung (koordinat + link Google Maps) untuk pertanyaan jarak/arah ke asisten AI.
    if (location.latitude != null && location.longitude != null) {
      out.push(`  - Titik peta: ${location.latitude}, ${location.longitude} ([Google Maps](${mapExternalUrl(location)})).`);
    }
  }

  out.push("");
  out.push("## Tipe kamar dan harga");
  out.push("");
  for (const location of input.locations) {
    for (const type of location.roomTypes) {
      if (type.unitCount <= 0) continue;
      const units = input.catalog.filter((unit) => unit.locationId === location.id && unit.roomTypeId === type.id);
      const capacity = units.reduce((max, unit) => Math.max(max, unit.maxGuests), 0);
      const status = type.availableCount > 0 ? `${type.availableCount} unit tersedia` : "semua unit sedang penuh";
      out.push(
        `- [${type.name} di ${location.shortName}](${absoluteUrl(base, roomTypeHref(location.slug, type.slug))}): ${status}${type.minPrice ? `, mulai ${formatRupiah(type.minPrice)}/malam` : ""}${capacity ? `, maks. ${capacity} tamu` : ""}.`,
      );
    }
  }

  out.push("");
  out.push("## Kebijakan menginap");
  out.push("");
  if (s.checkinTime || s.checkoutTime) out.push(`- Check-in mulai ${s.checkinTime || "-"}, check-out sampai ${s.checkoutTime || "-"}.`);
  if (s.checkinRequirements) out.push(`- Syarat: ${flat(s.checkinRequirements)}`);
  for (const rule of parseHouseRules(s.houseRules)) out.push(`- ${rule.text}`);
  out.push("- Sewa mingguan (7 malam atau lebih) dan bulanan (30 malam atau lebih) memakai tarif khusus bila tercantum di unit.");

  if (input.faqs.length) {
    out.push("");
    out.push("## Pertanyaan umum");
    out.push("");
    for (const faq of input.faqs) {
      out.push(`- ${flat(faq.question)} ${flat(faq.answer)}`);
    }
  }

  out.push("");
  out.push("## Kontak");
  out.push("");
  if (s.whatsappNumber) out.push(`- WhatsApp admin: ${formatWhatsappDisplay(s.whatsappNumber)}`);
  if (s.contactEmail) out.push(`- Email: ${s.contactEmail}`);
  if (s.officeHours) out.push(`- Jam layanan: ${formatOfficeHours(s.officeHours) || s.officeHours}`);

  out.push("");
  out.push("## Halaman penting");
  out.push("");
  out.push(`- [Cari unit](${base}/sewa): semua unit dengan filter apartemen, tipe, budget, tamu, fasilitas.`);
  out.push(`- [Tentang VIDALIDAY](${base}/about)`);
  out.push(`- [Daftar lengkap unit untuk AI](${base}/llms-full.txt)`);
  return out;
}

export function buildLlmsTxt(input: LlmsInput): string {
  return `${sections(input).join("\n")}\n`;
}

function unitLine(base: string, unit: CatalogUnit): string {
  const spot = formatUnitSpot(unit);
  const rates = [`${formatRupiah(unit.effectivePrice)}/malam`];
  if (unit.weeklyPrice) rates.push(`${formatRupiah(unit.weeklyPrice)}/minggu`);
  if (unit.monthlyPrice) rates.push(`${formatRupiah(unit.monthlyPrice)}/bulan`);
  const amenities = unit.amenities.map((amenity) => amenity.name).join(", ");
  return `- [${unit.name}](${absoluteUrl(base, unitHref(unit.slug))}): ${unit.roomTypeName ?? "Unit"} di ${unit.locationShortName}${spot ? `, ${spot}` : ""}, maks. ${unit.maxGuests} tamu, ${rates.join(", ")}, ${unit.isAvailable ? "tersedia" : "penuh"}${amenities ? `. Fasilitas: ${amenities}` : ""}.`;
}

export function buildLlmsFullTxt(input: LlmsInput): string {
  const base = input.siteUrl.replace(/\/+$/, "");
  const lines = sections(input);
  lines.push("");
  lines.push("## Semua unit");
  lines.push("");
  for (const location of input.locations) {
    const units = input.catalog.filter((unit) => unit.locationId === location.id);
    if (!units.length) continue;
    lines.push(`### ${location.name}`);
    lines.push("");
    for (const unit of units) lines.push(unitLine(base, unit));
    lines.push("");
  }
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}
