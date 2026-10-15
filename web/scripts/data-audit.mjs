// Audit data produksi (HANYA BACA) dengan publishable key — Fase 2.0.
// Jalankan: node --env-file=.env.local scripts/data-audit.mjs
// Mencetak agregat dan data bisnis (nama unit, setting publik). Tidak membaca data pribadi tamu.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Env belum diisi (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  process.exit(1);
}
if (key.startsWith("sb_secret_")) {
  console.error("PERINGATAN: key di .env.local adalah SECRET key. Ganti dengan publishable key.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

function section(title) {
  console.log(`\n=== ${title} ===`);
}
function tally(values) {
  const map = new Map();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
function kindOfImage(value) {
  if (!value) return "kosong";
  if (/images\.unsplash\.com/.test(value)) return "unsplash";
  if (/^https?:\/\//.test(value)) return "url-lain";
  if (/^(\/|storage\/|public\/)/.test(value)) return "path-berawalan";
  return `path:${value.split("/")[0]}/`;
}
async function must(promise, label) {
  const { data, error } = await promise;
  if (error) {
    console.log(`  ! ${label}: ${error.code ?? ""} ${error.message}`);
    return null;
  }
  return data;
}

section("Apartemen");
const locations = await must(
  db.from("locations").select("id, slug, name, short_name, area, sort_order, is_active, hero_image, gmaps_url, latitude, longitude, address"),
  "locations",
);
for (const l of locations ?? []) {
  console.log(
    `  [${l.id}] ${l.slug} | short=${l.short_name} | area=${l.area} | urut=${l.sort_order} | aktif=${l.is_active} | hero=${kindOfImage(l.hero_image)} | gmaps=${l.gmaps_url ?? "-"} | latlng=${l.latitude ?? "-"},${l.longitude ?? "-"} | alamat=${l.address ? "ada" : "-"}`,
  );
}

section("Tipe kamar");
const types = await must(db.from("room_types").select("id, location_id, name, slug, category, default_max_guests, sort_order, is_active"), "room_types");

section("Unit");
const units = await must(
  db
    .from("units")
    .select(
      "id, name, slug, location_id, room_type, room_type_id, rental_period, max_guests, normal_price, promo_price, is_promo_active, promo_badge, effective_price, weekly_price, monthly_price, is_published, is_available, is_featured, tower, floor_number, view_type, main_image, gallery_images, description, youtube_video_url",
    )
    .order("location_id")
    .order("name"),
  "units",
);
if (units) {
  console.log(`  total=${units.length} published=${units.filter((u) => u.is_published).length} tersedia=${units.filter((u) => u.is_available).length} unggulan=${units.filter((u) => u.is_featured).length}`);
  console.log(`  rental_period: ${JSON.stringify(tally(units.map((u) => u.rental_period)))}`);
  console.log(`  room_type (teks lama) x lokasi: ${JSON.stringify(tally(units.map((u) => `${u.location_id}:${u.room_type}`)))}`);
  console.log(`  tanpa room_type_id: ${units.filter((u) => !u.room_type_id).length}`);
  console.log(`  tower kosong=${units.filter((u) => !u.tower).length} lantai kosong=${units.filter((u) => u.floor_number == null).length} view kosong=${units.filter((u) => !u.view_type).length}`);
  console.log(`  promo_badge: ${JSON.stringify(tally(units.map((u) => u.promo_badge ?? "(null)")))}`);
  console.log(`  promo aktif tapi promo_price<=0: ${units.filter((u) => u.is_promo_active && !(Number(u.promo_price) > 0)).length}`);
  console.log(`  promo >= normal (promo aktif): ${units.filter((u) => u.is_promo_active && Number(u.promo_price) >= Number(u.normal_price)).length}`);
  console.log(`  harga mingguan terisi=${units.filter((u) => u.weekly_price != null).length} bulanan=${units.filter((u) => u.monthly_price != null).length}`);
  console.log(`  main_image: ${JSON.stringify(tally(units.map((u) => kindOfImage(u.main_image))))}`);
  const galleryCounts = units.map((u) => (Array.isArray(u.gallery_images) ? u.gallery_images.length : -1));
  console.log(`  jumlah foto galeri: ${JSON.stringify(tally(galleryCounts))}`);
  console.log(`  youtube terisi=${units.filter((u) => u.youtube_video_url).length}`);
  console.log(`  deskripsi berisi emoji=${units.filter((u) => EMOJI.test(u.description ?? "")).length} berisi *=${units.filter((u) => /\*/.test(u.description ?? "")).length}`);
  const typeName = new Map((types ?? []).map((t) => [t.id, `${t.name}`]));
  console.log("  daftar unit (lokasi | nama | tipe lama -> tipe v2 | tamu | harga efektif | tersedia | tower/lantai/view):");
  for (const u of units) {
    console.log(
      `    ${u.location_id} | ${u.name} | ${u.room_type} -> ${typeName.get(u.room_type_id) ?? "-"} | ${u.max_guests} | ${u.effective_price} | ${u.is_available ? "ya" : "PENUH"}${u.is_published ? "" : " DRAFT"} | ${u.tower ?? "-"}/${u.floor_number ?? "-"}/${u.view_type ?? "-"}`,
    );
  }
}
if (types) {
  console.log("\n  tipe kamar per apartemen (unit published / tersedia):");
  for (const t of types) {
    const list = (units ?? []).filter((u) => u.room_type_id === t.id && u.is_published);
    console.log(`    [${t.location_id}] ${t.name} (${t.slug}, ${t.category}, tamu ${t.default_max_guests ?? "-"}, urut ${t.sort_order}, aktif=${t.is_active}) -> ${list.length} / ${list.filter((u) => u.is_available).length}`);
  }
}

section("Fasilitas kamar (amenities)");
const amenities = await must(db.from("amenities").select("id, name, icon, sort_order, is_active"), "amenities");
const links = await must(db.from("unit_amenities").select("unit_id, amenity_id"), "unit_amenities");
for (const a of amenities ?? []) {
  const used = (links ?? []).filter((l) => l.amenity_id === a.id).length;
  console.log(`  [${a.id}] ${a.name} | ikon=${a.icon} | urut=${a.sort_order} | aktif=${a.is_active} | dipakai=${used}`);
}

section("Fasilitas gedung");
const facilities = await must(db.from("facilities").select("*"), "facilities");
if (facilities) {
  const first = facilities[0] ?? {};
  console.log(`  kolom sort_order=${"sort_order" in first} is_active=${"is_active" in first} (false = migrasi 0003 belum jalan)`);
  for (const f of facilities) console.log(`  [${f.id}] lokasi ${f.location_id} | ${f.name} | ikon=${f.icon ?? "-"} | foto=${kindOfImage(f.image)}`);
}

section("Landmark");
const landmarks = await must(db.from("landmarks").select("id, location_id, name, distance_time, notes, icon, sort_order, is_active"), "landmarks");
for (const l of landmarks ?? []) console.log(`  [${l.id}] lokasi ${l.location_id} | ${l.name} | ${l.distance_time} | ikon=${l.icon ?? "-"} | aktif=${l.is_active}`);

section("FAQ");
const faqs = await must(db.from("faqs").select("id, question, answer, badge, sort_order, is_active"), "faqs");
for (const f of faqs ?? []) console.log(`  [${f.id}] ${f.question} | badge=${f.badge ?? "-"} | aktif=${f.is_active} | jawaban berisi *=${/\*/.test(f.answer)} emoji=${EMOJI.test(f.answer + f.question)}`);

section("Settings");
const settings = await must(db.from("settings").select("key, value"), "settings");
for (const s of (settings ?? []).sort((a, b) => a.key.localeCompare(b.key))) {
  const v = s.value ?? "";
  const preview = s.key.startsWith("about_") || s.key.includes("template") || s.key === "house_rules" ? `${v.length} karakter` : JSON.stringify(v.slice(0, 120));
  console.log(`  ${s.key}: ${v ? preview : "(kosong)"}${EMOJI.test(v) ? " [EMOJI]" : ""}`);
}

section("Keamanan dasar (harus ditolak / kosong)");
const leads = await db.from("leads").select("id").limit(1);
console.log(`  anon select leads -> ${leads.error ? `ditolak (${leads.error.code})` : `data=${leads.data?.length ?? 0} baris`}`);
const backfill = await db.rpc("backfill_v2");
console.log(`  anon rpc backfill_v2 -> ${backfill.error ? `ditolak (${backfill.error.code})` : "TIDAK DITOLAK"}`);
const pop = await db.rpc("unit_popularity", { p_days: 30 });
console.log(`  anon rpc unit_popularity -> ${pop.error ? `error ${pop.error.message}` : `${pop.data.length} unit punya permintaan`}`);
