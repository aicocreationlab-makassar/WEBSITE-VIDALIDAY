# Rencana eksekusi VIDALIDAY v2 (Fase 0–7)

## Context

Pemilik minta VIDALIDAY (vidaliday.com) dibangun ulang dari Laravel ke Next.js 16 + Supabase + Vercel:
alur seperti aplikasi booking (pola jendela360/Traveloka/Agoda), identitas visual situs lama, hero dengan
kotak pencarian (apartemen → tipe kamar → budget), filter dan rekomendasi unit serupa, detail unit
dengan peta dan ikon fasilitas, form sewa yang dikirim ke WhatsApp, serta admin dengan pencarian dan
filter. Spesifikasi ada di `docs/PRD.md`, `docs/DESIGN.md`, `CLAUDE.md`, `PROMPT.md`. Rencana ini
mengurutkan eksekusi Fase 0–7 dan menambahkan keputusan yang didapat dari audit kode lama, cek versi
npm, dan pengecekan dokumentasi resmi Next 16.3.8.

### Keputusan pemilik (15 Okt 2026)
1. Kode Laravel di root dipindah ke `legacy-laravel/` oleh Claude, termasuk `storage-backupunits/`,
   `data_dummy_vidaliday.txt`, `PANDUAN_*`, dan blueprint. Isinya tidak diubah. Setelah itu `git init`.
2. Supabase siap: data lama dan migrasi 0002 sudah jalan. Kunci diisi pemilik ke `web/.env.local`.
3. Fase 0–7 dikerjakan berurutan dalam sesi ini. Tiap fase ditutup dengan laporan, tanpa berhenti.
   Saya hanya berhenti di checkpoint pemilik CP-A, CP-B, dan CP-C (lihat di bawah).
4. Tipe Delft "2 Bedroom / Corner" tetap satu tipe.
5. Foto:
   - kartu 4:3 (cover);
   - galeri detail mobile 4:5 (maks. 60svh);
   - lightbox utuh, kecuali foto rasio < 0,5 (tangkapan layar video) dibingkai 9:16 supaya bar hitam terpotong.
6. Data tipe/tower/lantai: saya cek dengan query baca saja di Fase 2. Lalu saya siapkan SQL usulan
   lengkap dengan query pratinjau. Pemilik yang meninjau dan menjalankannya.
7. Boleh menulis data uji ke produksi dan wajib dibersihkan:
   - maksimal 5 permintaan sewa "UJI QA" (lalu ditandai Batal);
   - satu set apartemen/tipe/unit/foto uji, dihapus di gate yang sama.
8. Saya tidak mengetik password akun produksi. Pemilik login sendiri di panel browser saat CP-C.

### Temuan audit yang mengubah rencana
- **Data tidak aman di Git.** `.gitignore` belum melindungi data sensitif karena Laravel ada di root:
  - seeder berisi password admin;
  - `PANDUAN_*` berisi login default;
  - foto cadangan.

  Pemindahan ke `legacy-laravel/` menyelesaikan ini, sekaligus menghilangkan tiga risiko build:
  lockfile root, `postcss.config.js` Tailwind v3, dan `.editorconfig` indent 4.
- **Node minimal 22.12.** `@supabase/supabase-js` 2.117 butuh Node ≥ 22 dan vitest 5 butuh ≥ 22.12,
  sedangkan CLAUDE.md menulis 20.9. Vercel diset Node 24.x.
- **Skema:**
  - `facilities` belum punya `sort_order`/`is_active`, dan policy publiknya `using (true)`.
  - Tidak ada trigger `updated_at`.
  - `leads` tidak punya `location_id`, jadi filter apartemen memakai `location_name`.
  - Unit milik apartemen nonaktif tetap terbaca publik, jadi query wajib menyaring `locations.is_active`.
- **Data lama:**
  - `promo_badge` panjang dan persennya basi ("Hemat 27% (Best Seller)").
  - `main_image` berisi foto stok Unsplash, begitu juga `locations.hero_image`.
  - Ikon fasilitas dan `about_reasons` bukan nama lucide (`swimming-pool`, `home`, `chat`).
  - Amenity hasil backfill banyak yang berikon `check`.
  - `landmarks.icon` kosong semua.
  - `gmaps_url` berbentuk `?q=`, sehingga koordinat tidak bisa diambil.
  - `office_hours` berbunyi "Setiap Hari: 08.00 - 23.00 WITA".
  - `company_legal_name` ditulis huruf kapital semua.
  - `submit_lead` juga bisa melempar `TEXT_TOO_LONG`.
- **Foto:**
  - 24 dari 52 foto unit adalah tangkapan layar video 9:16 dengan bar hitam.
  - Hero 941×638 sebenarnya foto kolam.
  - Foto gedung asli yang bisa dipakai: `bg_brentsville_tower.jpg` (Vida) dan `hero_delft_cpi_entrance.jpg` (Delft).
  - `logo_vidaliday.png` sebenarnya JPEG.
- **Kontras gagal AA:**
  - `muted` di atas `surface-2` → pakai `ink-2`.
  - `brand-600` di atas `brand-50` → pakai `brand-700`.

---

## Arsitektur (sudah dicek ke dokumentasi Next 16.3.8)

**Versi dipin persis** (rilis ≥ 14 hari; `.npmrc` `save-exact=true`, `engines.node ">=22.12"`):

| Paket | Versi |
|---|---|
| next, eslint-config-next | 16.3.8 |
| react, react-dom | 19.3.0 |
| typescript | 6.0.3 (bukan 7, bentrok dengan typescript-eslint) |
| eslint | 9.39.5 (bukan 10) |
| tailwindcss, @tailwindcss/postcss | 4.3.3 |
| @supabase/supabase-js | 2.117.2 |
| @supabase/ssr | 0.12.7 |
| zod | 4.6.5 |
| react-hook-form | 7.89.0 |
| @hookform/resolvers | 5.9.1 |
| lucide-react | 1.49.0 |
| sonner | 2.0.8 |
| embla-carousel-react | 8.6.0 |
| browser-image-compression | 2.0.2 |
| clsx | 2.1.1 |
| tailwind-merge | 3.7.0 |
| radix-ui | 1.6.7 |
| class-variance-authority | 0.7.1 |
| tw-animate-css | 1.4.0 |
| server-only | 0.0.1 |
| @vercel/analytics | 2.0.1 |
| @vercel/speed-insights | 2.0.0 |
| vitest + vite | 5.0.3 + vite yang kompatibel |
| @types/node | 24.19.1 |

- Tambahan dengan alasan yang dicatat di PROGRESS:
  - `@playwright/test`, untuk uji e2e dan screenshot 390/1280 memakai `channel: 'chrome'`;
  - `cmdk`, dependensi komponen `command` shadcn untuk pemilih ikon.
- Versi kedua paket itu dicek dengan `npm view` saat dipasang.
- Tidak memakai `vaul` (pakai Sheet `side="bottom"`) dan tidak memakai dnd-kit.

**Cache publik: Cache Components**
- `next.config.ts` memakai `cacheComponents: true`.
- `lib/data/*` (server-only) memakai `'use cache'` + `cacheTag()` + `cacheLife('max')`.
  - `getPopularity()` memakai `cacheLife('hours')` dan selalu dipanggil di tingkat halaman, tidak pernah di dalam fungsi `'max'`.
  - Klien Supabase dibuat di dalam fungsi cache.
  - Hasilnya baris polos.
  - Kalau terjadi error, fungsi melempar (error tidak di-cache dan build gagal keras).
  - Fetch diberi timeout 10 detik.
- `lib/cache-tags.ts` menyimpan satu peta invalidasi:

  | Yang berubah | Tag yang diinvalidasi |
  |---|---|
  | Unit | `units`, `unit:<slugLama>`, `unit:<slugBaru>` |
  | Lokasi / tipe kamar | `locations`, `units` |
  | Amenity | `amenities`, `units` |
  | Lainnya | `facilities`, `landmarks`, `faqs`, `settings` |

- Mutasi admin selalu memanggil `updateTag()` lalu `refresh()`. Dilarang memakai `revalidateTag(...,'max')` (stale + bug #99339).
- Aturan Cache Components:
  - Bagian yang membaca `searchParams`/`cookies()`/`usePathname`/`useSearchParams`/`new Date()` dibungkus `<Suspense>`.
  - `export const dynamic/revalidate` dilarang.
  - `generateStaticParams` mengembalikan minimal satu entri.
  - Tidak ada `loading.tsx` atau Suspense di atas `/unit/[slug]` dan `/apartemen/[slug]`, supaya `notFound()` tetap 404.
  - `/sewa` memakai `<Suspense fallback={skeleton}>` di dalam halaman.

**Supabase**
- `public.ts`: publishable key, `persistSession:false`, tanpa cookie. Dipakai untuk data publik dan RPC `submit_lead`.
- `server.ts`: `@supabase/ssr` dengan cookie, untuk admin.
- `browser.ts`: untuk mengunggah foto langsung ke Storage.
- Tidak ada secret key.
- `src/proxy.ts`:
  - matcher `['/admin/:path*']`;
  - `getClaims()`, dengan cookie dan header `setAll` disalin ke response/redirect.

**Pencarian dan katalog**
- `getCatalog()` mengambil semua unit published dari apartemen aktif (±45 baris).
- `lib/search.ts` adalah fungsi murni untuk filter/urut/paginasi (urutan "Rekomendasi" = unggulan → popularitas 30 hari → termurah).
- `getSearchIndex()` (±3 KB) dipakai bersama untuk hitungan di hero, budget, dan tombol "Tampilkan n unit".
- `hal=N` merender N×12 kartu.
- Navigasi `/sewa`:
  - filter memakai `router.push` (tombol back jalan);
  - "Muat lebih banyak" memakai `router.replace(..., {scroll:false})`.

**Route group publik**
- `app/(public)/(with-fab)/` berisi beranda, `/sewa`, `/apartemen/*`, `/about`, dengan tombol WA mengambang.
- `unit/[slug]` dan `kebijakan-privasi` ada di luar grup itu.
- Root layout mengekspor `viewport` (`viewportFit:'cover'`, `interactiveWidget:'resizes-content'`).

**Admin**
- `app/admin/(panel)/layout.tsx` membungkus `<AdminFrame>` dalam `<Suspense>`.
- `requireAdmin()` (React `cache()`, `getClaims()` + baris `admins`) dipanggil di layout, setiap halaman, setiap Server Action, dan route handler.
- `guard-coverage.test.ts` memastikan tidak ada action yang terlewat.
- Unggahan berjalan dari browser langsung ke Storage; action hanya menerima path.
- `updated_at` selalu di-set eksplisit.
- Form edit memakai `key={id+updated_at}`.

**next.config.ts**
- `images.remotePatterns`:
  - host Supabase dari env (`/storage/v1/object/public/media/**`);
  - `images.unsplash.com`.
- Kualitas gambar hanya 75.
- Header:
  - `nosniff`, `Referrer-Policy`, `Permissions-Policy`;
  - khusus `/admin`: `X-Frame-Options: DENY` + `frame-ancestors 'none'` + `noindex`.
- Redirect 308:
  - www → apex;
  - `/preview-client` → `/`;
  - `/login` → `/admin/login`.
- `turbopack.root` dan `outputFileTracingRoot` = `web/`.

**Skrip npm**
- `lint`: `eslint .` (flat config `core-web-vitals` + `typescript`; build tidak lagi menjalankan lint).
- `typecheck`: `next typegen && tsc --noEmit`.
- `test`: `vitest run`.
- `e2e`: `playwright test`.
- `verify`: menjalankan semua gate di atas ditambah `check-emoji` dan `check-secrets`.

**Utilitas inti** (`src/lib/`, semua ada unit test)
- `format.ts`: Rupiah, "Rp280rb", tanggal dan jam WITA, normalisasi WA `628…`, `formatOfficeHours`, `toDisplayLegalName`.
- `pricing.ts`: harga efektif, diskon, estimasi (rumus sama persis dengan `submit_lead`), dan `badgeFor()`. Aturan `badgeFor()`:
  - label kustom hanya dipakai kalau tidak berisi `\d+%`, ≤ 24 karakter, dan bukan "Promo Spesial";
  - selain itu tampil "Hemat X%" kalau diskon ≥ 5%.
- `whatsapp.ts`: template, hapus baris kosong, link `wa.me`.
- `media.ts`:
  - URL Storage;
  - `isStockPhoto()` (Unsplash dianggap tanpa foto);
  - fallback foto gedung lokal per slug.
- `icons.tsx`:
  - registry kurasi DESIGN §6;
  - alias data lama: `swimming-pool`→`waves`, `gym`→`dumbbell`, `running`→`footprints`, `home`→`house`, `chat`→`message-circle`, `shield`→`shield-check`, ditambah `sun`, `coffee`, `tag`, `lock`;
  - `resolveAmenityIcon(name, icon)` menebak ikon dari kata kunci nama;
  - `resolveLandmarkIcon` menebak dari kata kunci versi lama;
  - test memastikan semua nama ada di lucide 1.49.
- `youtube.ts`.
- `formatUnitPlace()`: "Vida View · Tower Ashton lt. 26", lalu "Lantai 26", lalu area. Tidak pernah ada potongan kosong.

---

## Cara eksekusi

**Peran orkestrator vs subagen**
- Hanya orkestrator (saya) yang boleh:
  - `npm install`, `shadcn`, dev/build/start, Playwright, Lighthouse, git;
  - menulis migrasi dan `docs/PROGRESS.md`;
  - mengubah file bersama: `globals.css`, `components/ui/**`, `app/layout.tsx`, `next.config.ts`, `types/**`, `proxy.ts`, dan file config.
- Tiap fase:
  1. Fondasi bersama dikerjakan serial: tipe, kontrak/stub, dan komponen dasar. Lalu commit.
  2. Batch paralel (maks. 4 agen pembangun) lewat Workflow. Tiap agen memegang glob file yang terpisah.
  3. Subagen hanya boleh menjalankan `vitest`/`eslint` untuk file miliknya dan `tsc --noEmit --incremental false`.
  4. Setelah batch selesai, saya audit kepemilikan file dari `git status`, lalu menjalankan gate.

**Gate per fase**
1. `cd web; npm run verify`:
   - lint, typecheck, test, build;
   - `check-emoji` atas `src` dan `supabase/`;
   - `check-secrets` atas `.next/static` (`sb_secret_`, `service_role`, JWT role service, `process.env` non-`NEXT_PUBLIC`).
2. `next start` di port 3100, lalu `npm run e2e -- e2e/fase-N.spec.ts`:
   - viewport 390 dan 1280;
   - `scrollWidth <= innerWidth`;
   - screenshot yang saya periksa sendiri.
3. Cek interaksi di panel browser (`resize_window` 390×844 dan 1280×800).
4. Lighthouse (Fase 3, 4, 7): `npx -y lighthouse` dengan Chrome lokal, median dari 3 kali jalan, hasil di scratchpad.
5. Review adversarial multi-lensa lewat Workflow:
   - kepatuhan PRD/DESIGN, keamanan, aksesibilitas, kebenaran API Next 16;
   - Fase 5–6 ditambah lensa integritas data.

   Temuan yang terkonfirmasi diperbaiki, lalu gate diulang (maks. 2 putaran). Sisanya dicatat untuk Fase 7.
6. Commit kecil per unit kerja, akhiri fase dengan `docs(progress): fase N selesai` dan tag `fase-N`.
   - Setiap pesan commit diakhiri trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
   - Tidak ada push.
   - Sebelum commit, `scripts/guard-staged.mjs` menolak `legacy-laravel/`, `storage-backupunits/`, `tools/`, `.env*` (kecuali `.example`), `.next/`, `node_modules/`, dan `dev-preview/`.

**Checkpoint pemilik** (satu-satunya titik saya berhenti menunggu)

| ID | Kapan | Pemilik melakukan | Saya tetap lanjut dengan |
|---|---|---|---|
| CP-A | Tepat setelah scaffold Fase 1 | 1) Buat `web/.env.local` (3 variabel, tanpa secret key).<br>2) Opsional: `npx supabase login` di terminal sendiri.<br>3) Matikan sign-up (SETUP §3.2).<br>4) Buat akun `admin-qa` (+ insert ke `admins`) dan `nonadmin-qa`. | Seluruh Fase 1. Env dibaca secara lazy, proxy menolak akses kalau env tidak ada. |
| CP-B | Setelah audit data Fase 2 | Tinjau pratinjau, jalankan migrasi 0003, jawab ≤ 5 pertanyaan data. | Fase 2–5. Kode tetap aman tanpa 0003. Yang menunggu 0003 hanya admin fasilitas gedung. |
| CP-C | Fase 5, setelah login admin jadi | Login sebagai `admin-qa` di panel browser. Nanti login sekali sebagai `nonadmin-qa` untuk uji penolakan. | Pembangunan admin; yang menunggu hanya gate Fase 5. |

---

## Fase 0: Orientasi dan rapikan repo (tanpa kode aplikasi)

1. **Pindahkan isi Laravel ke `legacy-laravel/`.** Saya pakai skrip PowerShell yang:
   - membuat manifest SHA-256 sebelum dan sesudah;
   - mengembalikan semua file kalau ada yang gagal;
   - memastikan root hanya berisi `CLAUDE.md`, `PROMPT.md`, `README.md`, `.gitignore`, `docs/`, `supabase/`, `legacy-laravel/`;
   - memastikan semua path referensi di DESIGN §2 ada.

   Entri yang dipindah:
   - `.editorconfig .env.example .gitattributes`
   - `app artisan bootstrap config database public resources routes storage tests`
   - `composer.json composer.lock package.json package-lock.json`
   - `phpunit.xml postcss.config.js tailwind.config.js vite.config.js`
   - `storage-backupunits PANDUAN_PENGGUNAAN_VIDALIDAY.md data_dummy_vidaliday.txt vidaliday_project_blueprint.md`
2. **Siapkan Git.**
   - Tambah ke `.gitignore`: `tools/`, `*.tsbuildinfo`, `test-results/`, `playwright-report/`, `.claude/settings.local.json`, `supabase/.temp/`.
   - `.gitattributes` baru di root: `* text=auto eol=lf` + aturan biner.
   - Jalankan `git init -b main`.
   - Kalau identitas git global belum ada, set di tingkat repo memakai email akun.
   - Pastikan `git ls-files` hanya berisi dokumen dan `supabase/`.
3. Salin laporan audit dan desain dari Temp ke `docs/audit/*.md` sebagai acuan tahan lama untuk subagen dan setelah konteks dipadatkan.
4. Isi `docs/PROGRESS.md`: catatan audit, tabel keputusan (semua keputusan di atas + penyimpangan dari docs), rencana per fase, pertanyaan terbuka, dan "Yang perlu dilakukan pemilik".
5. Commit, lalu tag `fase-0`.

**Selesai kalau:** belum ada `web/`, PROGRESS lengkap, dan seeder/PANDUAN tidak ter-track.

## Fase 1: Fondasi

1. **Scaffold.**
   - `npx create-next-app@16.3.8 web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git --skip-install`.
   - Pin ulang semua versi, lalu pasang semua dependensi sekaligus. Cek dengan `npm ls`.
   - Tambah `web/.editorconfig` (indent 2) dan `web/.env.example`.
   - Kalau `web/AGENTS.md` ikut dibuat, baca isinya dan simpan.
   - **Lalu kirim CP-A.**
2. **Tooling.**
   - `eslint.config.mjs`, `vitest.config.mts` (alias `@`), `playwright.config.ts` (proyek m390/d1280, Chrome lokal).
   - `scripts/{check-emoji,check-secrets,guard-staged}.mjs`.
   - `.claude/launch.json` (`web-dev` :3000, `web-start` :3100).
   - Skrip npm sesuai bagian Arsitektur.
3. **`next.config.ts`** sesuai bagian Arsitektur.
4. **shadcn.**
   - `npx shadcn@4.21.1 init`, lalu tambahkan komponen daftar PROMPT. Pin ulang `radix-ui`, `cmdk`, dan `lucide`.
   - Token DESIGN §3 masuk ke `globals.css` `@theme`.
   - Variabel shadcn dipetakan ke token: `--primary` #dc2626, `--ring` #ef4444, `--border`/`--input` #e2e8f0, `--radius` 12px.
   - Bentrok nama `muted` diselesaikan: `bg-muted` di komponen diganti `bg-surface-2`, sementara `text-muted` tetap warna teks DESIGN.
   - Scrollbar, `::selection`, dan `.glass-*` versi lama di-port.
5. **Font dan logo.**
   - Plus Jakarta Sans via `next/font` (400–800), `lang="id"`.
   - Logo dikonversi dari JPEG ke `public/images/logo-vidaliday.jpg`. `app/icon.png` + `apple-icon.png` dibuat dari logo.
   - Foto gedung fallback disalin ke `public/images/locations/{vida-view,delft-cpi}.jpg`.
6. **Supabase.** Klien `public`/`server`/`browser`, `lib/env.ts` (getter lazy), `proxy.ts`, dan `lib/auth/require-admin.ts`.
7. **Utilitas + test** (batch paralel):
   - format/pricing/whatsapp;
   - media/icons/youtube;
   - `components/icons/whatsapp.tsx`.
8. **Tipe database.**
   - Kalau `supabase login` sudah ada: generate di Git Bash. Jangan lewat PowerShell 5.1, karena hasilnya UTF-16.
   - Kalau belum: tulis tangan dari 0001 + 0002 sebagai fallback, beri tanda sementara.
9. **Kerangka layout** (batch paralel):
   - **Publik:** header mobile/desktop, sheet menu, banner pengumuman yang bisa ditutup (sessionStorage), footer, dan FAB WA via route group.
   - **Admin:** sidebar 256px/drawer 288px, item aktif `brand-50`, collapse diingat di localStorage `admin_sidebar_closed`, topbar.
   - Halaman placeholder untuk semua rute PRD §5.
   - `dev-preview/admin-shell` (khusus dev) untuk screenshot.
10. **Gate:**
    - `/admin` → 307 ke `/admin/login`;
    - screenshot header/footer/sidebar di 390 dan 1280.

## Fase 2: Lapisan data

1. **Audit data** (butuh env). `scripts/data-audit.mjs` memakai publishable key dan hanya mencetak agregat, tanpa data pribadi. Isinya:
   - distribusi `rental_period`;
   - `room_type`/`room_type_id` dan unit tersedia per tipe;
   - `promo_badge`;
   - keberadaan key settings dan nilai null;
   - `hero_image`, `gmaps_url`, dan koordinat lokasi;
   - prefix path foto;
   - ikon facility/amenity/landmark/`about_reasons`;
   - teks berisi emoji atau `*markdown*`;
   - promo aktif dengan harga 0;
   - apakah anon bisa membaca `leads` (harus ditolak).
2. **Migrasi `supabase/migrations/20261015000300_v2_perbaikan.sql`** (idempotent):
   - `facilities.sort_order` + `is_active` + index, policy publik `is_active or is_admin()`;
   - trigger `set_updated_at()`;
   - fungsi `backfill_v3()`:
     - tipe kamar dari nama unit (corner, 3BR, studio plus);
     - tower dari kode AT/BV dan lantai dari nama, hanya mengisi yang masih kosong;
     - ikon landmark dari kata kunci;
     - kosongkan `promo_badge` yang berisi persen;
   - `supabase/data-fixes/pratinjau_backfill_v3.sql` hanya berisi SELECT.

   Isinya difinalkan dari hasil audit. Lalu **kirim CP-B** (termasuk pertanyaan arti kode nama unit, jam layanan, nama badan hukum, dan pin peta).
3. **Kontrak.** `types/domain.ts` (UnitCard, UnitDetail, LocationWithTypes, Settings, dll.), `lib/cache-tags.ts`, dan stub `lib/data`.
4. **Batch paralel:**
   - `data/{settings,content,popularity}`: settings bertipe dengan default dari `AboutController` lama dan v2. Fallback nomor WA `6285711696970`.
   - `data/{locations,units}` + `search.ts`: hero hanya menampilkan apartemen aktif yang punya ≥ 1 unit published.
   - `validation/*` + `recommend.ts`: skor PRD §6.6 ditambah `reason` per kandidat ("Lebih hemat Rp20rb", "Muat 5 tamu", "Gedung sama").
   - `actions/booking.ts`: timeout 4 detik, tidak pernah melempar, semua kode error dipetakan termasuk `TEXT_TOO_LONG` dan kode tak dikenal, diuji dengan mock dan fake timer.
5. Halaman `dev-preview/data` (khusus dev) menampilkan data asli, di-screenshot, lalu dihapus sebelum commit fase.

## Fase 3: Beranda dan `/sewa`

1. **Fondasi.**
   - Kartu unit (DESIGN §4.6):
     - `<article>` dengan tautan judul yang direntangkan menutupi kartu;
     - 4:3 cover di `50% 55%`;
     - geser foto dengan scroll-snap hanya di grid `/sewa`;
     - unit penuh tampil grayscale;
     - placeholder "Foto segera hadir".
   - Komponen harga, badge, section heading, empty state, dan skeleton.
   - `lib/recent.ts` (`vdl:recent`).
   - `lib/analytics.ts`: `track()` bertipe yang menolak data pribadi.
2. **Hero** (spesifikasi PRD §6.2 + DESIGN §4.2):
   - radio asli sebagai segmented apartemen;
   - baris "N unit tersedia · mulai RpX/malam" yang ikut berganti per apartemen;
   - tombol pemicu yang membuka bottom sheet (mobile) atau popover (desktop):
     - tipe kamar dengan jumlah unit / "belum tersedia";
     - budget: pilihan cepat dengan jumlah unit + "Atur sendiri" (slider dua titik, langkah Rp50.000);
   - hidden input `tipe`/`min`/`max` yang `disabled` saat kosong;
   - `<form method="get" action="/sewa">`;
   - kartu harus muat di layar 390×664.
3. **Beranda**: promo pilihan tanpa foto stok dan tanpa unit penuh, pilih apartemen, terakhir kamu lihat, kenapa VIDALIDAY, FAQ (tanda `*` dibuang, badge disembunyikan), penutup, dan JSON-LD `LodgingBusiness` + `FAQPage`.
4. **`/sewa`**:
   - ringkasan + chip aktif;
   - bar Filter/Urutkan yang menempel;
   - sheet filter layar penuh dengan "Tampilkan n unit" langsung;
   - chip fasilitas hanya untuk amenity yang dipakai ≥ 2 unit;
   - sidebar desktop dengan slider di-debounce 300ms;
   - "Muat lebih banyak";
   - empty state + 3 unit terdekat;
   - riwayat ditaruh di bawah hasil.
5. Event `search_submit` dan `filter_apply`.
6. **Gate:**
   - kriteria terima PRD §6.2–6.3 lewat e2e: pilih Delft hanya memunculkan tipe Delft; submit kosong → `/sewa?lokasi=<default>`; form jalan tanpa JS; keyboard; back mengembalikan filter;
   - Lighthouse mobile beranda Performance ≥ 90.

## Fase 4: Detail unit, form sewa, halaman lain, SEO

1. **`/unit/[slug]`**:
   - Urutan blok PRD §6.4.
   - Galeri:
     - mobile 4:5;
     - desktop disusun menurut jumlah foto (1 foto: contain di atas blur; 2 foto: belahan; 3–4; 5+ dengan grid 2×2 + "Lihat semua foto");
     - lightbox dengan potongan 9:16;
     - "Video tur" (iframe dibersihkan saat ditutup).
   - Fakta kunci yang kosong disembunyikan.
   - Fasilitas berikon (8 + "Lihat semua").
   - Deskripsi 4 baris.
   - Info menginap + accordion peraturan.
   - Peta: iframe lazy memakai `lat,lng` atau "nama + alamat", tombol Google Maps, 5 landmark.
   - Fasilitas gedung.
   - Unit serupa.
   - FAQ.
   - CTA menempel di mobile, **selalu tampil sejak awal** (penyimpangan dari PRD, sesuai brief "CTA jelas"; dicatat).
   - Kartu sewa menempel di desktop.
   - Kondisi unit penuh.
   - `generateStaticParams` + 404 asli.
2. **Form sewa** (PRD §6.5, DESIGN §4.9):
   - bottom sheet tinggi penuh di mobile, modal di desktop;
   - ringkasan data tersimpan ("Atas nama … [Ubah]");
   - tanggal native dengan ringkasan WITA;
   - tamu melebihi kapasitas → peringatan + tautan unit yang lebih besar;
   - estimasi langsung (label "tarif mingguan/bulanan" kalau berlaku);
   - honeypot;
   - `submitLead`, lalu pesan dari template;
   - redirect WA: mobile di tab yang sama; desktop memakai `window.open('', '_blank')` → `opener=null` → isi URL, dengan fallback ke tab yang sama;
   - `pageshow` + sessionStorage menampilkan panel sukses beserta kode.
3. Rekomendasi tahap 2 di klien (profil `vdl:recent`, maks. 3 unit dengan tipe persis sama, chip alasan) + event `recommendation_click`.
4. Halaman lain:
   - `/apartemen/[slug]`;
   - `/about` (ikon `about_reasons` lewat alias);
   - `/kebijakan-privasi` (draf UU PDP, ditandai "perlu disetujui klien").
5. SEO:
   - `generateMetadata` di semua halaman;
   - OG default + OG per unit berupa PNG (`next/og`): foto unit hanya kalau JPG/PNG, selain itu kartu brand; font diambil lewat pola `loadGoogleFont` di docs;
   - `sitemap.ts` dan `robots.ts` (blok `/admin`);
   - JSON-LD `Apartment` + `Offer` + `BreadcrumbList`;
   - `not-found.tsx` tanpa query DB.
6. Event: `unit_view`, `gallery_open`, `booking_open`, `booking_submit`, `whatsapp_redirect`. Pasang `<Analytics/>` + `<SpeedInsights/>` (dalam Suspense).
7. **Gate:**
   - alur penuh dengan data asli: pesan WA berisi `Kode permintaan: VDL-`, baris lead uji tersimpan lalu ditandai Batal;
   - simulasi Supabase mati: request action dibatalkan, WA tetap terbuka;
   - `curl` unit yang tidak ada mengembalikan 404;
   - Lighthouse detail unit: Performance ≥ 90, Accessibility ≥ 95.

## Fase 5: Admin bagian 1

1. **Fondasi.**
   - Login, termasuk penolakan "Akun ini tidak punya akses admin.".
   - Lupa password (P1): `resetPasswordForEmail` + halaman atur ulang.
   - `withAdmin`.
   - Layout final dengan badge permintaan baru.
   - Kit form admin:
     - field, rupiah-input, form-card, sticky-action-bar, unsaved-guard, confirm-dialog;
     - data-table, list-toolbar, `use-url-filters`, pagination, status-badge;
     - icon-picker (Popover + Command), empty-state.
   - Unggah foto:
     - tolak HEIC dengan pesan cara mengubahnya;
     - `trimLetterbox`;
     - WebP 2000px q0,8;
     - `media/<folder>/<uuid>.webp`;
     - progres per file.
   - `storage-cleanup`: file hanya dihapus kalau tidak dipakai unit lain.
   - `guard-coverage.test.ts`.
   - **Lalu kirim CP-C.**
2. **Batch paralel:**
   - Dashboard + Fasilitas kamar: CRUD, ikon, jumlah unit pemakai.
   - Daftar unit:
     - `lib/admin/unit-query.ts`: pencarian per token tanpa peka tanda baca, filter, urutan, 20 per halaman, semua state di URL;
     - tabel di desktop, kartu di mobile;
     - chip cepat termasuk "Perlu dicek" (`lib/admin/data-health.ts`);
     - ubah harga cepat;
     - aksi per baris lewat action sheet;
     - aksi massal + "Ubah tipe kamar";
     - duplikat sebagai draft;
     - hapus dengan dialog.
   - Form unit:
     - kartu PRD §7.4;
     - tipe kamar bergantung apartemen, kapasitas default ikut terisi;
     - slug unik;
     - pratinjau harga;
     - label promo lama > 24 karakter diberi catatan;
     - fasilitas berikon;
     - urutan foto: drag di desktop + tombol geser, foto pertama jadi sampul;
     - YouTube;
     - status;
     - bar menempel;
     - peringatan perubahan belum disimpan;
     - kolom lama `room_type`/`facilities_list` tetap diisi.
   - Apartemen & tipe kamar:
     - koordinat diambil dari link (`@lat,lng`, `q=lat,lng`, `!3d!4d`);
     - tidak bisa dihapus selama masih dipakai, tawarkan "Nonaktifkan".
3. **Gate:**
   - `nonadmin-qa` ditolak di UI dan di Server Action;
   - ubah harga langsung terlihat di `:3100/unit/<slug>`;
   - apartemen + tipe uji muncul di hero dan filter, lalu dihapus;
   - foto uji terunggah sebagai `image/webp`;
   - screenshot admin di 390 dan 1280.

## Fase 6: Admin bagian 2

1. Cek apakah 0003 sudah jalan, lalu regenerate tipe.
2. **Batch paralel:**
   - Fasilitas gedung (butuh 0003): filter apartemen, cari, urutan, aktif, foto, ikon.
   - Landmark + FAQ: ikon kategori landmark, urutan naik/turun.
   - Permintaan sewa:
     - cari, filter (status, apartemen via `location_name`, tanggal masuk, check-in);
     - ubah status langsung;
     - catatan admin;
     - "Chat di WhatsApp";
     - ekspor CSV: UTF-8 BOM, penjaga injeksi formula, route handler dengan `requireAdmin`.
   - About + Pengaturan:
     - grup PRD §7.9;
     - editor template WA dengan daftar placeholder dan pratinjau langsung;
     - unggah logo/hero ke Storage;
     - `contact_email` tidak lagi terhapus.
3. **Gate:**
   - satu perubahan per jenis entitas tampil di situs publik, lalu dikembalikan;
   - CSV diawali EF BB BF dan bisa di-parse.

## Fase 7: QA dan siap rilis

1. **Review paralel:** matriks responsif (360, 390, 768, 1280), Lighthouse (beranda, `/sewa`, detail: ≥ 90 / ≥ 95 / ≥ 95), aksesibilitas DESIGN §8, keamanan, serta copy/emoji (istilah terlarang PRD §10, placeholder `6281234567890`).
2. **Keamanan:**
   - tidak ada secret di `.next/static`;
   - semua action admin memanggil `requireAdmin`;
   - anon tidak bisa membaca `leads` maupun memanggil `backfill_v2`.
3. Perbaikan dikelompokkan per kepemilikan file.
4. Tulis `web/README.md`.
5. Update DESIGN.md §4.8/§7 untuk penyimpangan yang disetujui (rasio foto, CTA selalu tampil).
6. Lengkapi checklist go-live di PROGRESS. Tag `v2.0.0-rc1`.

---

## Verifikasi end-to-end (ringkas)

- **Tiap fase:**
  - `cd web; npm run verify` lulus;
  - `npm run e2e -- e2e/fase-N.spec.ts` lulus terhadap `next start` di :3100;
  - screenshot 390/1280 diperiksa;
  - review adversarial bersih;
  - PROGRESS diperbarui.
- **Akhir:** alur cari → hasil → detail → form → `wa.me` berhasil dengan data asli; harga yang diubah di admin langsung tampil; apartemen baru muncul di hero; tidak ada emoji; tidak ada secret di klien.

## Yang perlu dilakukan pemilik

- **Sesi ini:** CP-A, CP-B, CP-C (lihat tabel). Hapus baris lead "UJI QA" di Table Editor kalau mau dibersihkan permanen.
- **Menjelang go-live** (dicatat di PROGRESS):
  - Vercel: Root Directory `web`, Node 24.x, region `sin1`, 3 env var.
  - **Uji kesegaran cache di Vercel Preview:** ubah harga, lalu reload `/`, `/sewa`, `/unit/x` dari browser lain.
    Kalau masih basi, saya ganti ke `'use cache: remote'`.
  - Supabase Pro disarankan (plan Free bisa pause dan membuat build gagal).
  - Kirim foto:
    - hero gedung ≥ 1920px;
    - foto unit landscape ≥ 1600px (bukan tangkapan layar video).
  - Kirim pin Google Maps kedua gedung.
  - Setujui teks kebijakan privasi dan peraturan menginap.
  - Rapikan amenity duplikat.
  - Setelah migrasi data final, jalankan `select backfill_v2(); select backfill_v3();`.
  - Ikuti SETUP §6–8.
