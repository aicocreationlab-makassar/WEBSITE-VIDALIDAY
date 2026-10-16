// Susun SQL perapian data hasil migrasi (backfill_v3) dari data asli. HANYA MEMBACA database
// (publishable key); hasilnya dijalankan pemilik di Supabase SQL Editor.
//
// Jalankan: node --env-file=.env.local --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/make-backfill-v3.mjs
// Keluaran: ../supabase/data-fixes/backfill_v3.sql dan ../supabase/data-fixes/pratinjau_backfill_v3.sql
//
// Setiap UPDATE dijaga nilai lamanya (WHERE ... = nilai lama), jadi aman diulang dan tidak menimpa
// perubahan admin. Jalankan ulang skrip ini setelah migrasi data final saat go-live.

import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { guessAmenityIcon, guessFacilityIcon, guessLandmarkIcon } from "../src/lib/icon-rules.ts";

// Keputusan pemilik (CP-B, 16 Okt 2026) — lihat docs/PROGRESS.md bagian Keputusan.
const TOWER_SPELLING = { Brensville: "Brentsville" };
/** Kode tower di nama unit; kalau berbeda dengan kolom tower, kode yang dipakai. */
const TOWER_CODES = { AT: "Ashton", BV: "Brentsville" };
/** Kapasitas yang salah ketik: disamakan dengan unit sejenis. */
const CAPACITY_FIXES = [
  { name: "2BR CORNER BV 19V", from: 1, to: 7 },
  { name: "2BR BV 29Q", from: 2, to: 5 },
];
/** Label promo bawaan data lama; situs memakai "Hemat X%" otomatis kalau kosong. */
const GENERIC_PROMO_BADGES = ["Promo Spesial"];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Env belum diisi (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function read(table, columns) {
  const { data, error } = await db.from(table).select(columns).order("id");
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

const q = (value) => (value === null || value === undefined ? "null" : `'${String(value).replace(/'/g, "''")}'`);
const isBlank = (value) => value === null || value === undefined || String(value).trim() === "";
const whereOld = (column, value) => (isBlank(value) ? `(${column} is null or btrim(${column}) = '')` : `${column} = ${q(value)}`);

const [units, facilities, landmarks, amenities] = await Promise.all([
  read("units", "id, name, tower, view_type, max_guests, promo_badge, description"),
  read("facilities", "id, name, icon"),
  read("landmarks", "id, name, icon"),
  read("amenities", "id, name, icon"),
]);

const sections = [];
const preview = [];
const add = (title, statements, previewSql) => {
  if (!statements.length) return;
  sections.push(`-- ${title}\n${statements.join("\n")}`);
  if (previewSql) preview.push(`-- ${title}\n${previewSql}`);
};
const ids = (rows) => rows.map((r) => r.id).join(", ");

// 1. Ikon fasilitas gedung yang kosong (aturan sama dengan lib/icon-rules.ts)
{
  const rows = facilities.filter((f) => isBlank(f.icon)).map((f) => ({ ...f, next: guessFacilityIcon(f.name) })).filter((f) => f.next);
  add(
    "1. Ikon fasilitas gedung (hanya yang kosong)",
    rows.map((f) => `update public.facilities set icon = ${q(f.next)} where id = ${f.id} and ${whereOld("icon", f.icon)}; -- ${f.name}`),
    rows.length ? `select id, name, icon as sekarang from public.facilities where id in (${ids(rows)}) order by id;` : "",
  );
}

// 2. Ikon landmark yang kosong
{
  const rows = landmarks.filter((l) => isBlank(l.icon)).map((l) => ({ ...l, next: guessLandmarkIcon(l.name) })).filter((l) => l.next);
  const left = landmarks.filter((l) => isBlank(l.icon) && !guessLandmarkIcon(l.name));
  add(
    `2. Ikon landmark (hanya yang kosong)${left.length ? `; tanpa tebakan (tetap map-pin): ${left.map((l) => l.name).join(", ")}` : ""}`,
    rows.map((l) => `update public.landmarks set icon = ${q(l.next)} where id = ${l.id} and ${whereOld("icon", l.icon)}; -- ${l.name}`),
    rows.length ? `select id, name, icon as sekarang from public.landmarks where id in (${ids(rows)}) order by id;` : "",
  );
}

// 3. Ikon fasilitas kamar yang masih "check" atau kosong
{
  const rows = amenities
    .filter((a) => isBlank(a.icon) || a.icon === "check")
    .map((a) => ({ ...a, next: guessAmenityIcon(a.name) }))
    .filter((a) => a.next && a.next !== "check");
  add(
    "3. Ikon fasilitas kamar yang masih check/kosong",
    rows.map((a) => `update public.amenities set icon = ${q(a.next)} where id = ${a.id} and ${whereOld("icon", a.icon === "check" ? "check" : null)}; -- ${a.name}`),
    rows.length ? `select id, name, icon as sekarang from public.amenities where id in (${ids(rows)}) order by id;` : "",
  );
}

// 4. Ejaan tower: kolom tower, teks deskripsi unit, dan nama fasilitas gedung (mis. "Lobby Brensville")
{
  const statements = Object.entries(TOWER_SPELLING).flatMap(([from, to]) => {
    const towers = units.filter((u) => u.tower === from).length;
    const texts = units.filter((u) => (u.description ?? "").toLowerCase().includes(from.toLowerCase())).length;
    const names = facilities.filter((f) => f.name.toLowerCase().includes(from.toLowerCase()));
    const replaced = (column) => `replace(replace(${column}, ${q(from)}, ${q(to)}), ${q(from.toUpperCase())}, ${q(to.toUpperCase())})`;
    return [
      towers ? `update public.units set tower = ${q(to)} where tower = ${q(from)}; -- ${towers} unit` : null,
      texts ? `update public.units set description = ${replaced("description")} where description ilike ${q(`%${from}%`)}; -- deskripsi ${texts} unit` : null,
      ...names.map((f) => `update public.facilities set name = ${replaced("name")} where id = ${f.id} and name = ${q(f.name)}; -- ${f.name}`),
    ].filter(Boolean);
  });
  add(
    "4. Ejaan tower (keputusan pemilik)",
    statements,
    statements.length ? `select tower, count(*) from public.units group by tower order by tower;` : "",
  );
}

// 5. Tower dari kode nama unit (AT/BV); kode menang kalau berbeda
{
  const spelled = (tower) => TOWER_SPELLING[tower] ?? tower;
  const rows = units
    .map((u) => {
      const code = /\b(AT|BV)\b/i.exec(u.name)?.[1]?.toUpperCase();
      return code ? { ...u, next: TOWER_CODES[code] } : null;
    })
    .filter((u) => u && spelled(u.tower) !== u.next);
  add(
    "5. Tower mengikuti kode di nama unit (AT = Ashton, BV = Brentsville)",
    rows.map((u) => `update public.units set tower = ${q(u.next)} where id = ${u.id} and (tower is null or tower in (${q(u.tower ?? "")}, ${q(spelled(u.tower ?? ""))})); -- ${u.name}: ${u.tower ?? "(kosong)"}`),
    rows.length ? `select id, name, tower as sekarang from public.units where id in (${ids(rows)}) order by id;` : "",
  );
}

// 6. View yang terpotong (sisa kata sambung di akhir hasil backfill_v2)
{
  const rows = units
    .map((u) => {
      if (isBlank(u.view_type)) return null;
      let next = u.view_type;
      for (;;) {
        const trimmed = next.replace(/[\s,]+(di|dan|yang|dengan|serta)$/i, "").replace(/[\s,]+$/, "");
        if (trimmed === next) break;
        next = trimmed;
      }
      return next !== u.view_type && next ? { ...u, next } : null;
    })
    .filter(Boolean);
  add(
    "6. View yang terpotong",
    rows.map((u) => `update public.units set view_type = ${q(u.next)} where id = ${u.id} and view_type = ${q(u.view_type)}; -- ${u.name}`),
    rows.length ? `select id, name, view_type as sekarang from public.units where id in (${ids(rows)}) order by id;` : "",
  );
}

// 7. Kapasitas salah ketik
{
  const rows = CAPACITY_FIXES.flatMap((fix) =>
    units.filter((u) => u.name.trim().toUpperCase() === fix.name && u.max_guests === fix.from).map((u) => ({ ...u, next: fix.to })),
  );
  add(
    "7. Kapasitas disamakan dengan unit sejenis (keputusan pemilik)",
    rows.map((u) => `update public.units set max_guests = ${u.next} where id = ${u.id} and max_guests = ${u.max_guests}; -- ${u.name}: ${u.max_guests} -> ${u.next}`),
    rows.length ? `select id, name, max_guests as sekarang from public.units where id in (${ids(rows)}) order by id;` : "",
  );
}

// 8. Label promo generik
{
  const count = units.filter((u) => GENERIC_PROMO_BADGES.includes(u.promo_badge)).length;
  add(
    `8. Label promo generik dikosongkan (${count} unit); situs menampilkan "Hemat X%" otomatis`,
    count ? [`update public.units set promo_badge = null where promo_badge in (${GENERIC_PROMO_BADGES.map(q).join(", ")});`] : [],
    count ? `select promo_badge, count(*) from public.units group by promo_badge;` : "",
  );
}

// 9. Urutan fasilitas gedung (semua masih 0 setelah migrasi 0003): ikuti urutan id per apartemen
add(
  "9. Urutan fasilitas gedung mengikuti id (hanya apartemen yang semua urutannya 0)",
  [
    `update public.facilities f set sort_order = s.rn
  from (select id, row_number() over (partition by location_id order by id) as rn from public.facilities) s
 where f.id = s.id
   and not exists (select 1 from public.facilities x where x.location_id = f.location_id and x.sort_order <> 0);`,
  ],
  `select location_id, id, name, sort_order as sekarang from public.facilities order by location_id, id;`,
);

const stamp = new Date().toISOString().slice(0, 10);
const header = (title) => `-- =====================================================================
--  VIDALIDAY v2: ${title}
--  Dibuat ${stamp} oleh web/scripts/make-backfill-v3.mjs dari data asli.
--  Jangan diedit tangan: ubah skripnya lalu jalankan ulang.
-- =====================================================================
`;

mkdirSync("../supabase/data-fixes", { recursive: true });
writeFileSync(
  "../supabase/data-fixes/backfill_v3.sql",
  `${header("backfill_v3 (perapian data hasil migrasi)")}--  Cara pakai: tinjau pratinjau_backfill_v3.sql dulu, lalu SQL Editor -> paste -> Run.
--  Aman diulang: setiap UPDATE dijaga nilai lamanya.
--  Setelah selesai: Admin -> Pengaturan -> Segarkan data situs (atau redeploy).

begin;

${sections.join("\n\n")}

commit;
`,
  "utf8",
);
writeFileSync(
  "../supabase/data-fixes/pratinjau_backfill_v3.sql",
  `${header("pratinjau backfill_v3 (HANYA SELECT)")}--  Menampilkan nilai sekarang untuk baris yang akan diubah backfill_v3.sql.

${preview.join("\n\n")}
`,
  "utf8",
);

console.log("Ditulis: supabase/data-fixes/backfill_v3.sql dan pratinjau_backfill_v3.sql");
for (const s of sections) console.log(`  ${s.split("\n")[0]} (${s.split("\n").length - 1} pernyataan)`);
