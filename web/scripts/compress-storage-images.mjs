// Kompres ulang foto besar yang sudah ada di bucket Storage `media` (unggahan lama dari Safari
// berformat PNG 2-3 MB berlabel .webp). Bawaan: DRY-RUN, tidak menulis apa pun ke Storage.
//
// Jalankan dari folder web/:
//   node scripts/compress-storage-images.mjs                 # dry-run: daftar file > 1 MB + perkiraan hasil
//   node scripts/compress-storage-images.mjs --min-mb 0.5    # ambang lain
//   node scripts/compress-storage-images.mjs --apply         # menimpa file di Storage (butuh SUPABASE_SECRET_KEY)
//
// Env yang dibaca: NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (dari web/.env.local,
// untuk membaca daftar path di tabel konten), dan hanya untuk --apply: SUPABASE_SECRET_KEY, diberikan lewat
// env saat menjalankan (jangan ditaruh di .env.local aplikasi, lihat SETUP §3.4).
//
// Yang dilakukan: baca path foto dari units (sampul + galeri), locations, facilities, settings → HEAD ukuran
// tiap file → file di atas ambang diunduh dan dikompres dengan sharp (sisi terpanjang 1920 px, WebP q80)
// → dry-run mencetak ukuran sebelum/sesudah; --apply menimpa objek dengan PATH YANG SAMA (nama .webp tetap,
// isinya jadi WebP sungguhan; contentType image/webp, cacheControl 31536000). Path di database tidak berubah.
// Catatan: CDN Supabase masih bisa melayani versi lama untuk sementara setelah ditimpa (cache 1 tahun);
// "Smart CDN" di plan berbayar memurnikan cache saat objek ditimpa.

import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const minMbIndex = args.indexOf("--min-mb");
const minBytes = (minMbIndex >= 0 ? Number(args[minMbIndex + 1]) : 1) * 1024 * 1024;
const MAX_SIDE = 1920;
const QUALITY = 80;
const BUCKET = "media";

function loadEnvLocal() {
  try {
    const text = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
    }
  } catch {
    // .env.local tidak ada: andalkan env proses.
  }
}

loadEnvLocal();
const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";
if (!base || !anonKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY harus ada (web/.env.local).");
  process.exit(1);
}
if (apply && !secretKey) {
  console.error("--apply butuh SUPABASE_SECRET_KEY di env proses (bukan di .env.local).");
  process.exit(1);
}

const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

async function rest(query) {
  const res = await fetch(`${base}/rest/v1/${query}`, { headers });
  if (!res.ok) throw new Error(`REST ${query}: ${res.status}`);
  return res.json();
}

/** Path bucket (tanpa URL luar), dinormalkan seperti lib/media.ts. */
function toPath(value) {
  if (!value || typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  const own = new RegExp(`/storage/v1/object/(?:public/)?${BUCKET}/([^?#]+)`).exec(text);
  if (own) return decodeURIComponent(own[1]);
  if (/^https?:\/\//i.test(text)) return null;
  return text.replace(/^\/+/, "").replace(/^(storage|public)\/+/, "");
}

async function referencedPaths() {
  const paths = new Map(); // path → keterangan
  const add = (who, value) => {
    const p = toPath(value);
    if (p && !paths.has(p)) paths.set(p, who);
  };
  for (const u of await rest("units?select=slug,main_image,gallery_images&order=id")) {
    add(`unit ${u.slug}`, u.main_image);
    const gallery = Array.isArray(u.gallery_images) ? u.gallery_images : [];
    for (const g of gallery) add(`unit ${u.slug}`, g);
  }
  for (const l of await rest("locations?select=slug,hero_image")) add(`apartemen ${l.slug}`, l.hero_image);
  for (const f of await rest("facilities?select=name,image")) add(`fasilitas ${f.name}`, f.image);
  for (const s of await rest("settings?select=key,value&key=in.(hero_image,site_logo)")) add(`setting ${s.key}`, s.value);
  return paths;
}

const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");
const mb = (bytes) => `${(bytes / 1048576).toFixed(2)} MB`;

async function main() {
  const paths = await referencedPaths();
  console.log(`${paths.size} file dirujuk database. Ambang: ${mb(minBytes)}. Mode: ${apply ? "APPLY (menimpa Storage)" : "dry-run"}.\n`);

  const big = [];
  for (const [p, who] of paths) {
    const res = await fetch(`${base}/storage/v1/object/public/${BUCKET}/${encodePath(p)}`, { method: "HEAD" });
    if (!res.ok) {
      console.log(`HILANG  ${p} (${who}) → ${res.status}`);
      continue;
    }
    const size = Number(res.headers.get("content-length") ?? 0);
    if (size >= minBytes) big.push({ p, who, size });
  }
  big.sort((a, b) => b.size - a.size);
  if (!big.length) {
    console.log("Tidak ada file di atas ambang.");
    return;
  }

  let before = 0;
  let after = 0;
  for (const item of big) {
    const res = await fetch(`${base}/storage/v1/object/public/${BUCKET}/${encodePath(item.p)}`);
    const input = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(input).metadata();
    const output = await sharp(input)
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();
    before += input.length;
    after += output.length;
    console.log(
      `${item.p}\n  ${item.who}: ${meta.format} ${meta.width}x${meta.height} ${mb(input.length)} → webp ${mb(output.length)}`,
    );

    if (apply) {
      const up = await fetch(`${base}/storage/v1/object/${BUCKET}/${encodePath(item.p)}`, {
        method: "PUT",
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "image/webp",
          "Cache-Control": "max-age=31536000",
          "x-upsert": "true",
        },
        body: output,
      });
      console.log(up.ok ? "  ditimpa." : `  GAGAL menimpa: ${up.status} ${await up.text()}`);
    }
  }
  console.log(`\n${big.length} file: ${mb(before)} → ${mb(after)}${apply ? "" : " (perkiraan, belum ditulis)"}.`);
  if (!apply) console.log("Jalankan lagi dengan --apply (dan SUPABASE_SECRET_KEY) untuk menimpa file di Storage.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
