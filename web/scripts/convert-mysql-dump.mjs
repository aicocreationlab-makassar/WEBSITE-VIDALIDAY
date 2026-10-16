// Ubah ekspor phpMyAdmin (SQL atau JSON) database Laravel lama menjadi SQL impor Postgres
// untuk dijalankan pemilik di Supabase SQL Editor. Skrip ini TIDAK menyentuh database.
//
// Jalankan:  node scripts/convert-mysql-dump.mjs ../export/<file>.sql [../export/impor_data_lama.sql]
//
// Yang diambil hanya tabel konten (1:1 dengan migrasi 0001): locations, units, facilities,
// landmarks, faqs, settings. Tabel lain (users, sessions, cache, jobs, dll.) dilewati: users berisi
// hash password admin lama dan tidak boleh ikut pindah.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Kolom yang ada di Postgres (migrasi 0001) per tabel, beserta jenisnya. */
const TABLES = {
  locations: {
    columns: { id: "int", slug: "text", name: "text", tagline: "text", description: "text", address: "text", gmaps_url: "text", hero_image: "text", created_at: "ts", updated_at: "ts" },
    required: { slug: "", name: "" },
  },
  units: {
    columns: {
      id: "int", location_id: "int", name: "text", slug: "text", room_type: "text", max_guests: "int",
      normal_price: "num", promo_price: "num", promo_badge: "text", is_promo_active: "bool", rental_period: "text",
      description: "text", facilities_list: "json", youtube_video_url: "text", main_image: "text",
      gallery_images: "json", is_featured: "bool", is_available: "bool", created_at: "ts", updated_at: "ts",
    },
    required: { name: "", slug: "", max_guests: 2, normal_price: 0, promo_price: 0, rental_period: "Harian", is_promo_active: true, is_featured: false, is_available: true, facilities_list: [], gallery_images: [] },
  },
  facilities: {
    columns: { id: "int", location_id: "int", name: "text", icon: "text", description: "text", image: "text", created_at: "ts", updated_at: "ts" },
    required: { name: "" },
  },
  landmarks: {
    columns: { id: "int", location_id: "int", name: "text", distance_time: "text", notes: "text", sort_order: "int", is_active: "bool", created_at: "ts", updated_at: "ts" },
    required: { name: "", distance_time: "", sort_order: 0, is_active: true },
  },
  faqs: {
    columns: { id: "int", question: "text", answer: "text", badge: "text", sort_order: "int", is_active: "bool", created_at: "ts", updated_at: "ts" },
    required: { question: "", answer: "", sort_order: 0, is_active: true },
  },
  // settings: id TIDAK dibawa (bentrok dengan kunci v2 dari migrasi 0002); unik per key.
  settings: {
    columns: { key: "text", value: "text", created_at: "ts", updated_at: "ts" },
    required: { key: "" },
  },
};
const ORDER = ["locations", "units", "facilities", "landmarks", "faqs", "settings"];

// ---------------------------------------------------------------------------
// Parser dump SQL MySQL (phpMyAdmin): CREATE TABLE (urutan kolom) + INSERT INTO ... VALUES
// ---------------------------------------------------------------------------

/** Pecah teks dump menjadi pernyataan, memperhatikan string dan komentar. */
function splitStatements(sql) {
  const out = [];
  let buf = "";
  let i = 0;
  let quote = null;
  while (i < sql.length) {
    const ch = sql[i];
    if (quote) {
      buf += ch;
      if (ch === "\\") {
        buf += sql[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (ch === quote) {
        if (sql[i + 1] === quote) {
          buf += quote;
          i += 2;
          continue;
        }
        quote = null;
      }
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      buf += ch;
      i += 1;
      continue;
    }
    if (ch === "-" && sql[i + 1] === "-" && (sql[i + 2] === " " || sql[i + 2] === "\n" || sql[i + 2] === "\r")) {
      while (i < sql.length && sql[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "#") {
      while (i < sql.length && sql[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      continue;
    }
    if (ch === ";") {
      if (buf.trim()) out.push(buf.trim());
      buf = "";
      i += 1;
      continue;
    }
    buf += ch;
    i += 1;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const UNESCAPE = { 0: "\0", "'": "'", '"': '"', b: "\b", n: "\n", r: "\r", t: "\t", Z: "\x1a", "\\": "\\", "%": "\\%", _: "\\_" };

/** Baca daftar nilai "(a, 'b', NULL), (...)" menjadi array baris. */
function parseTuples(text) {
  const rows = [];
  let i = 0;
  const skipWs = () => {
    while (i < text.length && /[\s,]/.test(text[i])) i += 1;
  };
  while (i < text.length) {
    skipWs();
    if (i >= text.length) break;
    if (text[i] !== "(") throw new Error(`Format VALUES tidak dikenal di posisi ${i}: ${text.slice(i, i + 40)}`);
    i += 1;
    const row = [];
    for (;;) {
      while (/\s/.test(text[i])) i += 1;
      if (text[i] === "'") {
        i += 1;
        let value = "";
        for (;;) {
          const ch = text[i];
          if (ch === undefined) throw new Error("String tidak tertutup di dump");
          if (ch === "\\") {
            const next = text[i + 1];
            value += UNESCAPE[next] ?? next;
            i += 2;
            continue;
          }
          if (ch === "'") {
            if (text[i + 1] === "'") {
              value += "'";
              i += 2;
              continue;
            }
            i += 1;
            break;
          }
          value += ch;
          i += 1;
        }
        row.push(value);
      } else {
        let token = "";
        while (i < text.length && text[i] !== "," && text[i] !== ")") {
          token += text[i];
          i += 1;
        }
        token = token.trim();
        if (/^null$/i.test(token)) row.push(null);
        else if (/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(token)) row.push(Number(token));
        else if (/^0x[0-9a-f]+$/i.test(token)) row.push(Buffer.from(token.slice(2), "hex").toString("utf8"));
        else if (/^(true|false)$/i.test(token)) row.push(token.toLowerCase() === "true");
        else throw new Error(`Nilai tidak dikenal di dump: ${token.slice(0, 40)}`);
      }
      while (/\s/.test(text[i])) i += 1;
      if (text[i] === ",") {
        i += 1;
        continue;
      }
      if (text[i] === ")") {
        i += 1;
        break;
      }
      throw new Error(`Tuple rusak di posisi ${i}`);
    }
    rows.push(row);
  }
  return rows;
}

function parseSqlDump(sql) {
  const columnsOf = {};
  const data = {};
  for (const statement of splitStatements(sql)) {
    const create = /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s*\(([\s\S]*)\)/i.exec(statement);
    if (create) {
      const cols = [];
      for (const line of create[2].split("\n")) {
        const m = /^\s*`(\w+)`\s+/.exec(line);
        if (m) cols.push(m[1]);
      }
      columnsOf[create[1]] = cols;
      continue;
    }
    const insert = /^(?:INSERT|REPLACE)\s+(?:IGNORE\s+)?INTO\s+`?(\w+)`?\s*(\(([^)]*)\))?\s*VALUES\s*([\s\S]*)$/i.exec(statement);
    if (!insert) continue;
    const table = insert[1];
    const cols = insert[3]
      ? insert[3].split(",").map((c) => c.trim().replace(/`/g, ""))
      : columnsOf[table];
    if (!cols) throw new Error(`INSERT ke ${table} tanpa daftar kolom dan tanpa CREATE TABLE sebelumnya`);
    const rows = parseTuples(insert[4]).map((values) => Object.fromEntries(cols.map((c, idx) => [c, values[idx]])));
    (data[table] ??= []).push(...rows);
  }
  return data;
}

/** Ekspor JSON phpMyAdmin: array berisi {type:"table", name, data:[...]}. */
function parseJsonDump(text) {
  const parsed = JSON.parse(text);
  const data = {};
  for (const item of Array.isArray(parsed) ? parsed : []) {
    if (item && item.type === "table" && Array.isArray(item.data)) (data[item.name] ??= []).push(...item.data);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Penulisan SQL Postgres
// ---------------------------------------------------------------------------

function pgText(value) {
  return `'${String(value).replace(/\u0000/g, "").replace(/'/g, "''")}'`;
}

function toPg(kind, value, warn) {
  // created_at/updated_at wajib terisi di Postgres (not null default now()).
  if ((value === null || value === undefined) && kind === "ts") return "now()";
  if (value === null || value === undefined) return "null";
  switch (kind) {
    case "int": {
      const n = Number(value);
      if (!Number.isFinite(n)) return "null";
      return String(Math.trunc(n));
    }
    case "num": {
      const n = Number(value);
      return Number.isFinite(n) ? String(n) : "0";
    }
    case "bool":
      return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true" ? "true" : "false";
    case "json": {
      let v = value;
      if (typeof v === "string") {
        const trimmed = v.trim();
        if (!trimmed) return "'[]'::jsonb";
        try {
          v = JSON.parse(trimmed);
          // Laravel kadang menyimpan JSON dua kali di-encode.
          if (typeof v === "string") v = JSON.parse(v);
        } catch {
          warn(`JSON tidak valid (${trimmed.slice(0, 40)}...), diganti []`);
          return "'[]'::jsonb";
        }
      }
      if (!Array.isArray(v)) {
        warn("JSON bukan array, diganti []");
        return "'[]'::jsonb";
      }
      return `${pgText(JSON.stringify(v))}::jsonb`;
    }
    case "ts": {
      const s = String(value).trim();
      if (!s || s.startsWith("0000-00-00")) return "now()";
      // Laravel menyimpan waktu dalam zona aplikasi (APP_TIMEZONE=UTC).
      return /[zZ]|[+-]\d{2}(:?\d{2})?$/.test(s) ? `${pgText(s)}::timestamptz` : `${pgText(`${s}+00`)}::timestamptz`;
    }
    default:
      return pgText(value);
  }
}

function buildInsert(table, rows, warnings) {
  const spec = TABLES[table];
  const dropped = new Set();
  const lines = [];
  for (const raw of rows) {
    const row = { ...raw };
    for (const key of Object.keys(row)) if (!(key in spec.columns)) dropped.add(key);
    for (const [key, fallback] of Object.entries(spec.required)) {
      if (row[key] === null || row[key] === undefined) row[key] = fallback;
    }
    const cols = Object.keys(spec.columns).filter((c) => c in row);
    const warn = (message) => warnings.push(`${table}${row.id ? ` #${row.id}` : row.key ? ` "${row.key}"` : ""}: ${message}`);
    const values = cols.map((c) => toPg(spec.columns[c], Array.isArray(row[c]) ? JSON.stringify(row[c]) : row[c], warn));
    lines.push({ cols, values });
  }
  if (dropped.size) warnings.push(`${table}: kolom lama dilewati (tidak ada di Supabase): ${[...dropped].join(", ")}`);
  if (!lines.length) return "";
  const conflict =
    table === "settings"
      ? "on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at"
      : "on conflict (id) do nothing";
  return lines
    .map(({ cols, values }) => `insert into public.${table} (${cols.join(", ")}) values (${values.join(", ")}) ${conflict};`)
    .join("\n");
}

// ---------------------------------------------------------------------------

const [input, outputArg] = process.argv.slice(2);
if (!input) {
  console.error("Pakai: node scripts/convert-mysql-dump.mjs <ekspor.sql|ekspor.json> [keluaran.sql]");
  process.exit(1);
}
const output = outputArg ?? join(dirname(input), "impor_data_lama.sql");
const text = readFileSync(input, "utf8").replace(/^﻿/, "");
const data = input.toLowerCase().endsWith(".json") ? parseJsonDump(text) : parseSqlDump(text);

const warnings = [];
const skipped = Object.keys(data).filter((t) => !(t in TABLES));
const parts = [];
const summary = [];
for (const table of ORDER) {
  const rows = data[table] ?? [];
  summary.push(`${table}: ${rows.length} baris`);
  const sql = buildInsert(table, rows, warnings);
  if (sql) parts.push(`-- ${table} (${rows.length} baris)\n${sql}`);
}

// Unit yang menunjuk apartemen yang tidak ikut diekspor akan gagal FK; laporkan lebih dulu.
const locationIds = new Set((data.locations ?? []).map((l) => Number(l.id)));
for (const table of ["units", "facilities", "landmarks"]) {
  for (const row of data[table] ?? []) {
    if (!locationIds.has(Number(row.location_id))) warnings.push(`${table} #${row.id}: location_id ${row.location_id} tidak ada di ekspor`);
  }
}

const header = `-- =====================================================================
--  VIDALIDAY v2: impor data lama (dibuat otomatis dari ekspor phpMyAdmin)
--  Sumber : ${input.replace(/\\/g, "/").split("/").pop()}
--  Isi    : ${summary.join(", ")}
--
--  Cara pakai: Supabase Dashboard -> SQL Editor -> paste semua -> Run.
--  Aman dijalankan ulang: baris dengan id yang sudah ada dilewati; settings
--  memakai nilai lama untuk kunci yang sama.
--  Setelah selesai: jalankan bagian "Sesudah impor" di bawah (sudah termasuk).
-- =====================================================================

begin;
`;
const footer = `
-- Sesudah impor: sinkron sequence id, lalu hubungkan unit ke tipe kamar & fasilitas (migrasi 0002).
select public.sync_id_sequences();
select public.backfill_v2();

commit;

-- Cek hasil (hanya baca):
select 'locations' as tabel, count(*) from public.locations
union all select 'units', count(*) from public.units
union all select 'units published', count(*) from public.units where is_published
union all select 'room_types', count(*) from public.room_types
union all select 'facilities', count(*) from public.facilities
union all select 'landmarks', count(*) from public.landmarks
union all select 'faqs', count(*) from public.faqs
union all select 'settings', count(*) from public.settings;
`;
writeFileSync(output, `${header}\n${parts.join("\n\n")}\n${footer}`, "utf8");

console.log(`Ditulis: ${output}`);
console.log(`Isi: ${summary.join(", ")}`);
if (skipped.length) console.log(`Tabel dilewati: ${skipped.join(", ")}`);
if (warnings.length) {
  console.log(`Peringatan (${warnings.length}):`);
  for (const w of warnings.slice(0, 50)) console.log(`  - ${w}`);
  if (warnings.length > 50) console.log(`  ... dan ${warnings.length - 50} lainnya`);
}
