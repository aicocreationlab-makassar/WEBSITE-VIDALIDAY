# PROGRESS — VIDALIDAY v2

Diperbarui oleh Claude Code di akhir setiap fase. Posisi terakhir dibaca dari sini di awal sesi.

**Status (17 Okt 2026):** Fase 0–7 selesai dan diverifikasi dengan data asli, tag `v2.0.0-rc1`. Sisa sebelum go-live ada di "Yang perlu dilakukan pemilik" dan "Checklist go-live".
**Batch 2 (18 Okt 2026):** permintaan pemilik 16–18 Okt dikerjakan: pemilih ikon utuh + ikon kursi/lemari/gantungan baju; chevron select status; header satu tombol WhatsApp; menu Apartemen terbuka saat disorot; kota asal (wajib) di form sewa, pesan WA, admin, CSV; hapus permintaan sewa (per baris + pilih banyak, terhapus dari database); cek referensi Storage bersama + "Bersihkan file tak terpakai" di Pengaturan; Delft CPI tanpa tower (`locations.has_towers`) dan titik peta baru; bot chat "Asisten VIDALIDAY" berbasis aturan (tanpa API) menggantikan tombol WA mengambang; paket SEO + AI (landing per apartemen × tipe, sitemap bergambar, robots untuk perayap AI, `llms.txt`, JSON-LD Organization/WebSite/AggregateOffer/ItemList/FAQPage, canonical `/sewa`, IndexNow opsional, tautan sosial untuk `sameAs`). **Migrasi `20261018000400_v2_batch2.sql` harus dijalankan pemilik sebelum deploy (CP-D).** Verifikasi: lihat bagian "Verifikasi batch 2" di bawah tabel fase.
**Performa (17 Okt 2026):** JS awal situs publik dipangkas (beranda 284 → 198 KB gzip, `/sewa` 275 → 204 KB, detail unit 405 → 214 KB) dengan memuat overlay dan form sewa saat dibuka. Lighthouse lokal naik di beranda dan `/sewa`; angka resmi tetap dari PageSpeed Insights di Vercel Preview (lihat Keterbatasan). Diverifikasi: `npm run verify` lulus; e2e fase 1/3/4 terhadap build baru 78 lulus, 8 dilewati sesuai kondisi, 0 gagal; screenshot e2e 390/1280 identik per piksel dengan sebelumnya (kecuali gambar lazy yang belum/sudah termuat di belakang form sewa); lightbox, form sewa, popover hero, dan dropdown Apartemen dicek manual (fokus kembali ke tombol pembuka).
lint, typecheck, 546 unit test, cek emoji, dan cek secret bundle lulus. Data lama sudah diimpor: 2 apartemen, 55 unit (semua terhubung ke tipe kamar v2), 11 fasilitas gedung, 21 landmark, 5 FAQ, 19 pengaturan lama, dan 68 foto di bucket `media`. Migrasi 0003 dan `backfill_v3.sql` sudah dijalankan pemilik.

Status verifikasi per fase:

| Fase | Kode | Unit test | Verifikasi dengan data asli |
|---|---|---|---|
| 1 | selesai | lulus | build + e2e lulus |
| 2 | selesai | lulus | audit data, impor, `backfill_v3`; anon tidak bisa membaca `leads`; `submit_lead` menolak input salah |
| 3 | selesai | lulus | e2e fase-3 lulus 390/1280; screenshot diperiksa |
| 4 | selesai | lulus | e2e fase-4 lulus termasuk simulasi Supabase mati; 1 lead UJI QA asli tersimpan (`VDL-C523CB`, sudah Batal) |
| 5 | selesai | lulus | CP-C: harga cepat langsung tampil di publik; apartemen + tipe + unit uji muncul di hero/filter/sitemap setelah aktif lalu dihapus; foto terunggah sebagai `image/webp`. Uji penolakan akun non-admin dilewati (tidak ada akun non-admin). |
| 6 | selesai | lulus | satu perubahan per entitas (pengaturan, FAQ, landmark, fasilitas gedung, fasilitas kamar, About) tampil di publik lalu dikembalikan; CSV diawali BOM dan 15/15 kolom; "Segarkan data situs" bekerja |
| 7 | selesai | lulus | e2e akhir fase 1/3/4: 78 lulus, 8 dilewati sesuai kondisi (lightbox butuh ≥ 2 foto, lead asli butuh `E2E_REAL_LEAD=1`, tes khusus ukuran layar), 0 gagal; QA kode 4 lensa (25 temuan diperbaiki); sapuan DOM elemen terpotong semua halaman publik (360/390/768) dan admin (390/1280); Lighthouse a11y/SEO 100 (performa: lihat Keterbatasan) |

**Verifikasi batch 2 (18 Okt 2026):** lint, typecheck, 695 unit test (chat engine 14 contoh pertanyaan + normalisasi/fuzzy/entitas/sesi, storage-cleanup dengan klien tiruan, hapus lead, kota asal, has_towers, SEO: landing/sitemap/robots/llms/sewa-seo/hours/indexnow/JSON-LD), cek emoji, dan `npm run build` lulus. E2E terhadap `next start` (data produksi, sebelum migrasi 0004) fase 1/3/4 + `fase-8-chat` + `seo`, 390 dan 1280, 1 worker: **97 lulus, 9 dilewati sesuai kondisi, 0 gagal**. Head untuk Googlebot dicek dengan `curl -A Googlebot` (canonical/robots `/sewa` ada di `<head>`). Review adversarial kode (3 lensa) dan review visual screenshot (5 kelompok halaman) selesai; temuan terkonfirmasi diperbaiki (lihat Keputusan). **Pascamigrasi (CP-D, CP-D2):** lead asli `VDL-9DF915` tersimpan dengan kota asal (pesan WA berisi kode, lalu bug `\n` di template ditemukan dan diperbaiki; lihat CP-D3); gate admin di panel browser dengan sesi pemilik lulus (kota asal di kartu/tabel/CSV + pencarian, chevron status, hapus per baris dan pilih banyak termasuk fokus, pemilih ikon 39 ikon + gulir roda di dialog, form Delft tanpa tower, peringatan pin Google Maps, Periksa file); 4 temuan admin dan 13 temuan review kedua diperbaiki. Lighthouse lokal mobile (median 3 run, build lokal, mesin 2 core): a11y 100 di beranda, `/sewa`, landing, unit, apartemen; SEO 100 kecuali `/sewa` 92 (lihat Keterbatasan); best practices 96 (skrip Vercel Analytics 404 di lokal); performa 62–70. E2E publik pada build akhir (setelah semua perbaikan): 97 lulus, 9 dilewati sesuai kondisi, 0 gagal. JS situs sendiri: beranda 237 KB, `/sewa` 271 KB, unit 279 KB (+ ±434 KB skrip Google Maps di iframe), tidak naik dibanding sebelum batch 2.

Rencana eksekusi lengkap yang disetujui pemilik: `docs/audit/rencana-eksekusi.md`.
Laporan audit dan desain (acuan untuk semua fase): `docs/audit/*.md`.

---

## Checklist fase

- [x] **Fase 0** — Orientasi: dokumen dibaca, audit gaya situs lama, rencana kerja
- [x] **Fase 1** — Fondasi: Next.js 16 di `web/`, token desain, klien Supabase, proxy, utilitas + test, layout publik & admin
  - lint, typecheck, 150 unit test, build, cek emoji, cek secret: lulus
  - e2e `e2e/fase-1.spec.ts` terhadap `next start`: 33 lulus (390px & 1280px), screenshot diperiksa
  - `/admin` tanpa sesi → 307 ke `/admin/login`; header keamanan dan redirect URL lama berjalan
- [x] **Fase 2** — Lapisan data v2: query + cache tag, rekomendasi tahap 1, validasi zod, action `submitLead`
- [x] **Fase 3** — Beranda (hero + kotak pencarian) dan `/sewa` (filter, urutan, paginasi)
- [x] **Fase 4** — Detail unit, form sewa → WhatsApp, rekomendasi tahap 2, apartemen, about, privasi, SEO, analitik
- [x] **Fase 5** — Admin 1: login, layout, dashboard, unit (daftar + form + foto), apartemen & tipe kamar, fasilitas kamar
- [x] **Fase 6** — Admin 2: fasilitas gedung, landmark, FAQ, permintaan sewa, about, pengaturan
- [x] **Fase 7** — QA, performa, aksesibilitas, keamanan, README, checklist go-live (performa mobile lokal di bawah target; lihat Keterbatasan)

## Yang perlu dilakukan pemilik

Checkpoint di sesi ini (Claude berhenti dan menunggu hanya di sini):

- [x] **CP-A** (setelah scaffold Fase 1); butir 3–4 sisa, lihat di bawah:
  1. Buat `web/.env.local` berisi 3 variabel dari SETUP.md §4 (tanpa secret key).
  2. Opsional: jalankan `npx supabase login` di terminal sendiri, supaya tipe database bisa di-generate.
  3. Matikan sign-up publik di Supabase Auth (SETUP.md §3.2).
  4. Buat dua akun uji di Supabase Auth: `admin-qa` (lalu `insert into public.admins`) dan `nonadmin-qa`. Password tidak dikirim ke chat.
- [x] **Migrasi data lama ke Supabase** (16 Okt 2026): ekspor phpMyAdmin → `web/scripts/convert-mysql-dump.mjs` → `export/impor_data_lama.sql` (dijalankan pemilik); foto `export/{units,facilities,settings}` diunggah ke bucket `media`. 3 foto unit yang tidak ada di cadangan diunduh dari situs lama (izin pemilik).
- [x] **Hapus `SUPABASE_SECRET_KEY` dari `web/.env.local`** (pindahkan ke env paket migrasi). Aplikasi tidak membacanya; jangan disalin ke Vercel (SETUP §3.4).
- [x] **CP-B** (16 Okt 2026): migrasi `20261015000300_v2_perbaikan.sql` dan `supabase/data-fixes/backfill_v3.sql` sudah dijalankan; pertanyaan data dijawab (lihat Keputusan).
  Migrasi ini juga menyembunyikan unit milik apartemen nonaktif dari publik dan menolak permintaan sewa untuk unit itu (policy `units` + `submit_lead`).
- [x] **CP-C** (17 Okt 2026): pemilik login admin sendiri di panel browser; gate admin selesai.
- [x] **CP-D (batch 2, wajib sebelum deploy dan sebelum membuka admin versi baru):** halaman publik versi baru tetap jalan tanpa migrasi ini (kolom baru dibaca dengan aman), tetapi admin Permintaan sewa, Unit, dan Apartemen membaca kolom `origin_city`/`has_towers` dan akan galat sampai migrasi dijalankan. Jalankan `supabase/migrations/20261018000400_v2_batch2.sql` di SQL Editor (idempoten). Isinya: kolom `leads.origin_city` + `submit_lead` 10 argumen (tanpa ini form sewa versi baru gagal menyimpan permintaan, walau WhatsApp tetap terbuka), `locations.has_towers` (Delft = false, tower unit Delft dikosongkan), baris `Kota asal: {kota}` di template WA, titik peta Delft `-5.144628657051978, 119.39411188027171`, ejaan tower "Brensville" → "Brentsville". Setelah itu Admin → Pengaturan → **Segarkan data situs**. Query ringkasan di akhir migrasi harus menunjukkan `leads_origin_city = 1`, `delft_has_towers = false`, `delft_units_with_tower = 0`, `template_has_kota = true`, `brensville_left = 0`. **Selesai 18 Okt 2026 14.50 WITA** (Delft `has_towers = false`, titik dan template berubah; diperiksa dengan klien publik).
- [x] **CP-D2 (titik peta, 18 Okt 2026):** jalankan `supabase/migrations/20261018000500_titik_peta_pin.sql` di SQL Editor (idempoten), lalu Admin → Pengaturan → **Segarkan data situs**. Titik Delft dari migrasi 0004 (dan sebelumnya) jatuh di laut karena diambil dari titik tengah tampilan peta, bukan pin tempat; migrasi ini memakai pin Google "APARTEMEN DELFT BY VIDALIDAY" `-5.1499287, 119.3944552` dan pin Vida View `-5.1547578, 119.4416827` (sebelumnya ±140 m di Jl. Topaz Raya), serta mengganti link Maps Delft dengan link dari pemilik. Query ringkasan di akhir harus menunjukkan `cocok = true` untuk kedua apartemen. **Selesai 18 Okt 2026** (pemilik: `cocok = true` untuk kedua apartemen; peta di build lokal menunjuk gedung).
- [ ] **CP-D3 (template WhatsApp, 18 Okt 2026):** jalankan `supabase/migrations/20261018000600_template_wa_baris.sql` di SQL Editor (idempoten). Migrasi 0004 menyisipkan baris kota dengan `\n` harfiah (template tersimpan `Nama: {nama}\nKota asal: {kota}`), sehingga pesan tamu menampilkan "\n". Aplikasi versi ini sudah menganggapnya ganti baris, tetapi data perlu dibetulkan; query ringkasan harus `true, true`. Lead uji batch 2: `VDL-9DF915` ("UJI QA", 0812-0000-0102) dan kemungkinan satu lagi dari run e2e 07.56 WITA dengan nomor 0812-0000-0101; hapus lewat tombol hapus baru di admin. Kedua lead uji sudah dihapus pemilik lewat tombol hapus banyak (18 Okt, terverifikasi: hanya `VDL-3D6E2F` yang tersisa).
- [ ] **SEO dan AI (setelah deploy):** ikuti `docs/SETUP.md` §9 (Search Console properti Domain + sitemap + minta pengindeksan, Pengaturan SEO/sosial, Google Business Profile, ulasan, Bing Webmaster, sitasi, pantau). Opsional di Vercel: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `INDEXNOW_KEY` (SETUP §4).
- [ ] **Uji penolakan akun non-admin** (opsional, dilewati 17 Okt): buat akun di Supabase Auth tanpa baris `admins`, login di `/admin/login`, pastikan muncul "Akun ini tidak punya akses admin."
- [ ] **Matikan sign-up publik** di Supabase Auth (SETUP §3.2), kalau belum.
- [ ] **File yatim di Storage:** "Periksa file" (18 Okt) menemukan 2 file tidak terpakai (231 KB dari 77 file: 1 foto apartemen, 1 foto hero/logo). Admin → Pengaturan → Bersihkan file tak terpakai → **Hapus 2 file** (penghapusan permanen, dilakukan pemilik).
- [ ] **Rapikan data di admin** (tidak memblokir go-live):
  - ~~slug unit asal-asalan~~ (sudah diperbaiki: build 18 Okt memuat `/unit/studio-at-8x-vida-view` dan `/unit/studio-1026-delft-cpi`);
  - deskripsi "Studio AT 17S" masih menyebut Tower Brentsville, padahal tower-nya Ashton;
  - dua unit "2BR BV 18Y" (id 479 dan 480): beri nama pembeda kalau perlu;
  - pastikan lantai semua unit Delft terisi (tower tidak lagi diminta untuk Delft setelah migrasi 0004);
  - **nama apartemen** (Admin → Apartemen): saat ini huruf kapital semua dan Delft salah ketik ("APARTEMEN VIDA VIEW", "APATERMEN DELFT CPI", nama singkat "VIDA VIEW"/"DELFT CPI"). Nama ini dipakai di judul Google, H1 landing, JSON-LD, `llms.txt`, dan jawaban chat; sarannya "Apartemen Vida View" / nama singkat "Vida View" dan "Apartemen Delft CPI" / "Delft CPI";
  - **judul SEO beranda** di Pengaturan masih "VIDALIDAY | Sewa Apartemen Vida View & Delft CPI"; ganti ke "Sewa Apartemen Harian di Makassar | VIDALIDAY" (kata kunci utama di depan, SETUP §9).
  - **FAQ** (Admin → FAQ): beberapa pertanyaan memakai huruf kapital di tengah kalimat dan kata Inggris, mis. "Apa saja Syarat check-in…", "Berapakah kapasitas maksimal penghuni setiap type Unit?"; sarannya "Apa saja syarat check-in unit di apartemen?", "Berapa kapasitas maksimal penghuni setiap tipe unit?";
  - **badge promo unit** "Promo Weekdays" (Admin → Unit → kartu Harga → Label promo): sarannya "Promo hari kerja";
  - **halaman About** (Admin → About): teks lama masih memakai "Anda" dan judul "KOMITMEN KAMI" huruf kapital semua; situs memakai sapaan "kamu" dan huruf kalimat (contoh teks ada di `web/src/lib/settings-defaults.ts`). Enam kartu "Kenapa memilih VIDALIDAY" semuanya berikon perisai; pilih ikon yang sesuai per kartu (mis. kebersihan, fasilitas, harga, privasi, pemesanan);
  - **tagline apartemen** (Admin → Apartemen) masih berbahasa Inggris dan tampil sebagai subjudul profil apartemen dan kartu di About.
  - **unit STUDIO BV 35** (id 489, dibuat 18 Okt) bertower "Brensville": buka Ubah unit → tombol **Pakai Brentsville** → Simpan perubahan. Deskripsi fasilitas gedung "Lobby Brentsville" juga masih menulis "Tower Brensville" (Admin → Fasilitas gedung).
- [ ] **Drive C: hampir penuh** di komputer pengembangan (sempat 0 GB, `ENOSPC`): file sementara build/Lighthouse dipindah ke `D:\vdl-tmp`. Bebaskan ruang di C: (mis. `npm cache clean --force` untuk cache npm 5,8 GB) supaya aplikasi Claude dan browser tidak bermasalah.
  Komputer ini juga hanya 2 core dan RAM 3,4 GB (saat e2e berjalan sisa ±0,3 GB, CPU 100%): e2e dengan 2 worker menghasilkan timeout palsu, jadi jalankan `npx playwright test --workers=1` dan tutup aplikasi lain selama e2e/Lighthouse.

- [ ] **Supabase Auth untuk lupa kata sandi admin** (Fase 5):
  1. Authentication → URL Configuration: Site URL `https://vidaliday.com`; Redirect URLs tambah `https://vidaliday.com/admin/auth/confirm` dan `http://localhost:3000/admin/auth/confirm`.
  2. Authentication → Email Templates → Reset Password: ganti tautan menjadi
     `{{ .SiteURL }}/admin/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/admin/atur-password`
     (supaya link bisa dibuka dari perangkat mana pun).

Menjelang go-live: lihat bagian "Checklist go-live" di bawah.

## Checklist go-live

Ikuti `docs/SETUP.md` §5–8 (Vercel, domain, checklist A–E, rollback). Tambahan khusus v2:

**Sebelum deploy**

- [ ] `web/.env.local` terisi, lalu Claude menjalankan verifikasi yang masih tertunda: audit data, build, e2e fase 1/3/4 (+ admin setelah CP-C), screenshot 390/1280, Lighthouse.
- [ ] Migrasi `20261015000300_v2_perbaikan.sql` dijalankan (setelah `backfill_v3()` difinalkan dari hasil audit data).
- [ ] Vercel: Root Directory `web`, **Node.js 24.x**, region `sin1`, tiga variabel `NEXT_PUBLIC_*` (tanpa secret key).
- [ ] Supabase Auth: sign-up publik dimatikan; Site URL + Redirect URLs + template Reset Password (lihat "Yang perlu dilakukan pemilik").
- [ ] Supabase plan Pro disarankan: project Free bisa di-pause dan membuat build gagal (halaman data sengaja gagal keras tanpa database).

**Di Vercel Preview**

- [ ] PageSpeed Insights (mobile) untuk `/`, `/sewa?lokasi=vida-view`, dan satu `/unit/<slug>`: target Performance ≥ 90, Accessibility ≥ 95. JS bersama sudah dikurangi (17 Okt); lokal 66–72 di mesin lambat yang CPU-nya penuh. Kalau di Vercel masih < 90, lihat "Langkah berikutnya" di Keterbatasan (gambar AVIF, CSS inline).

- [ ] Uji kesegaran cache: ubah harga satu unit di admin, lalu buka `/`, `/sewa`, `/unit/<slug>` dari browser lain. Harga baru harus langsung tampil (kalau masih basi, beri tahu Claude: cache diganti ke `'use cache: remote'`).
- [ ] Tambah apartemen + tipe kamar uji, pastikan muncul di hero dan filter setelah diaktifkan, lalu hapus.
- [ ] Kirim satu permintaan sewa uji; pesan WhatsApp berisi `Kode permintaan: VDL-…`; tandai Batal di admin.
- [ ] Ekspor CSV permintaan sewa terbuka rapi di Excel (UTF-8, kolom tidak bergeser).

**Data dan konten (klien)**

- [ ] Setelah migrasi data final: jalankan `export/impor_data_lama.sql` versi baru (konverter), lalu `node --env-file=.env.local scripts/make-backfill-v3.mjs` dan jalankan `supabase/data-fixes/backfill_v3.sql`, lalu Admin → Pengaturan → Segarkan data situs.
- [ ] Foto: hero gedung ≥ 1920px; foto unit landscape ≥ 1600px (bukan tangkapan layar video).
- [ ] Link Google Maps (pin) kedua gedung diisi di Admin → Apartemen.
- [ ] Teks kebijakan privasi (draf UU PDP) dan peraturan menginap disetujui klien.
- [ ] Fasilitas kamar duplikat dirapikan di Admin → Fasilitas kamar; ikon yang masih "check" diganti.
- [ ] Label promo lama yang berisi persen dikosongkan (atau biarkan "Hemat X%" otomatis).

## Catatan audit (Fase 0)

Detail lengkap ada di `docs/audit/audit-*.md`. Ringkasan yang memengaruhi pekerjaan:

**Struktur repo**
- Kode Laravel semula berada langsung di root, bukan di `legacy-laravel/`. `.gitignore` saat itu tidak melindungi seeder berisi password admin, `PANDUAN_*` (login default), dan `storage-backupunits/`. Semua sudah dipindah ke `legacy-laravel/` (188 file, hash SHA-256 identik) dan ter-ignore.
- Pemindahan itu juga menghapus tiga risiko build Next.js: lockfile + `"type":"module"` di root, `postcss.config.js` Tailwind v3 di root, `.editorconfig` indent 4 di root.
- Folder `tools/vidaliday-migrasi-supabase` belum ada (dipakai lagi saat go-live, SETUP §7B).

**Gaya situs lama yang belum ada di DESIGN.md (diputuskan ikut / tidak)**
- Ikut: `.glass-card`, `.glass-input`, `.glass-nav`, `.glass-badge`, `::selection` `#fecaca`/`#0f172a`, scrollbar 7px (`#f1f5f9`/`#cbd5e1`/`#94a3b8`).
- Ikut sebagian: kartu lama memakai radius 24px dan harga merah; DESIGN memakai radius 16px dan harga `ink`. Ikut DESIGN.
- Tidak ikut: skala rose, emerald/amber/purple/teal, gradien emas, orb blur, label huruf kapital semua, font Cinzel/Playfair/Great Vibes, ukuran 9–11px.
- Topbar admin lama 64px (mobile) / 80px (desktop); DESIGN 64px. Ikut DESIGN.
- Sidebar admin lama bisa ditutup penuh di desktop (bukan rail ikon), diingat di localStorage `admin_sidebar_closed`. Perilaku ini dipertahankan.

**Perilaku lama yang dipertahankan**
- Format harga `normal_price` = harga coret, `promo_price` = harga aktif saat `is_promo_active` (sama dengan kolom `effective_price`).
- Diskon = `round((normal - promo) / normal * 100)`.
- Parser YouTube: `youtu.be/ID`, `?v=ID`, `/embed/ID`, `/shorts/ID`.
- Hapus file lama di Storage saat foto diganti/dihapus; URL eksternal (http) diabaikan.
- Pemetaan ikon landmark dari kata kunci nama (bandara, mall, kuliner, pantai/masjid, rumah sakit, tol).
- Default teks About dari `AboutController` lama dipakai sebagai fallback.

**Bug lama yang tidak dibawa**
- `is_available` tidak pernah bisa false; `is_featured` tidak bisa dimatikan dari form edit.
- Simpan Pengaturan menghapus `contact_email`; simpan About mereset semua ikon alasan ke `shield`.
- Hapus galeri lewat path tanpa validasi kepemilikan.
- SVG logo ditolak padahal diiklankan; HEIC diterima padahal tidak bisa ditampilkan.
- Tidak ada cek `promo_price < normal_price`; slug tidak diperbarui dan bisa bentrok.
- Tautan "Portal Admin" tampil di situs publik.

**Data dan skema (perlu ditangani)**
- `facilities` belum punya `sort_order`/`is_active` (PRD §7.7), dan policy publiknya `using (true)`.
- Tidak ada trigger `updated_at` di tabel mana pun.
- `leads` tidak punya `location_id`; filter apartemen memakai `location_name`.
- Unit/tipe/fasilitas/landmark milik apartemen nonaktif tetap terbaca publik; query aplikasi wajib menyaring `locations.is_active`.
- `submit_lead` juga bisa melempar `TEXT_TOO_LONG` (tidak ada di tabel PRD §6.5).
- `promo_badge` lama panjang dengan persen basi ("Hemat 27% (Best Seller)").
- Foto stok Unsplash dipakai sebagai `main_image` fallback dan `locations.hero_image`.
- Ikon fasilitas/alasan About bukan nama lucide (`swimming-pool`, `running`, `gym`, `home`, `chat`, `shield`); amenity hasil backfill banyak yang berikon `check`; `landmarks.icon` kosong.
- `gmaps_url` berbentuk `?q=`, sehingga koordinat tidak bisa diambil otomatis.
- `office_hours` "Setiap Hari: 08.00 - 23.00 WITA"; `company_legal_name` huruf kapital semua.
- Backfill 0002 kemungkinan memetakan unit Vida View hanya ke Studio / 2 Bedroom; tower dan lantai banyak kosong (kode tower ada di nama unit: AT, BV).

**Foto**
- 42 dari 52 foto unit berorientasi potret; 24 di antaranya tangkapan layar video 9:16 dengan bar hitam atas/bawah dan bar indikator iOS.
- `hero_image` saat ini (941×638) adalah foto kolam, bukan gedung.
- Foto gedung asli yang layak: `bg_brentsville_tower.jpg` (Vida View) dan `hero_delft_cpi_entrance.jpg` (Delft CPI).
- `logo_vidaliday.png` sebenarnya JPEG 1024×1024.

**Kontras**
- `muted` (#64748b) di atas `surface-2` (#f1f5f9) = 4,34:1 → pakai `ink-2`.
- `brand-600` di atas `brand-50` = 4,42:1 → pakai `brand-700`.

**Env**
- `web/.env.local` belum ada (folder `web/` dibuat di Fase 1). Variabel yang perlu diisi pemilik: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Rencana kerja per fase (ringkas)

Detail: `docs/audit/rencana-eksekusi.md`.

- **Fase 1:** scaffold Next 16.3.8, pin versi, tooling (eslint flat, vitest, playwright, cek emoji/secret, guard commit), `next.config.ts` (cacheComponents, images, header, redirect), shadcn + token, font + logo, klien Supabase + proxy + `requireAdmin`, utilitas + test, kerangka layout publik & admin. → CP-A.
- **Fase 2:** audit data (query baca), migrasi 0003 + `backfill_v3()` + pratinjau, kontrak tipe, `lib/data` dengan `'use cache'`, `search.ts`, validasi zod, `recommend.ts`, `submitLead`. → CP-B.
- **Fase 3:** kartu unit, hero search (segmented, sheet tipe & budget, slider), beranda, `/sewa` (filter sheet/sidebar, urutan, paginasi), riwayat, analitik.
- **Fase 4:** detail unit (galeri, peta, fasilitas berikon, CTA menempel), form sewa → WhatsApp, rekomendasi tahap 2, apartemen, about, privasi, SEO, OG, analitik.
- **Fase 5:** login + `requireAdmin` di semua action, layout final, dashboard, unit (daftar + form + foto), apartemen & tipe kamar, fasilitas kamar. → CP-C.
- **Fase 6:** fasilitas gedung, landmark, FAQ, permintaan sewa (+CSV), About, Pengaturan.
- **Fase 7:** QA responsif, Lighthouse, aksesibilitas, keamanan, README, checklist go-live.

## Keputusan

| Tanggal | Keputusan | Alasan |
|---|---|---|
| 15 Okt 2026 | Laravel di root dipindah ke `legacy-laravel/` (termasuk `storage-backupunits/`, `data_dummy`, `PANDUAN`, blueprint), lalu `git init -b main`. | Disetujui pemilik. Menjaga seeder berisi password tidak ter-commit; sesuai SETUP §1. |
| 15 Okt 2026 | Semua fase 0–7 dikerjakan dalam satu sesi, berhenti hanya di CP-A/B/C. | Permintaan pemilik ("eksekusi"), menggantikan "satu fase per sesi" di PROMPT.md. |
| 15 Okt 2026 | Tipe Delft "2 Bedroom / Corner" tetap satu tipe. | Jawaban pemilik atas PRD §14 no. 1; sesuai brief. |
| 15 Okt 2026 | Foto: kartu 4:3 cover (`object-position 50% 55%`), galeri detail mobile 4:5 (maks. 60svh), lightbox utuh kecuali rasio < 0,5 dibingkai 9:16. | Disetujui pemilik. Foto lama mayoritas potret; menyimpang dari DESIGN §4.8/§7 (4:3), DESIGN diperbarui di Fase 7. |
| 15 Okt 2026 | Data tipe/tower/lantai dirapikan lewat `backfill_v3()` di migrasi 0003 + query pratinjau; dijalankan pemilik. | Disetujui pemilik. Aplikasi tidak menjalankan SQL tulis ke produksi. |
| 15 Okt 2026 | Boleh menulis data uji ke produksi (≤ 5 lead "UJI QA" yang ditandai Batal; satu set apartemen/tipe/unit/foto uji yang dihapus di gate yang sama). | Disetujui pemilik; dibutuhkan kriteria selesai Fase 4–6. |
| 15 Okt 2026 | Claude tidak mengetik password akun produksi; pemilik login sendiri di panel browser (CP-C). | Disetujui pemilik. |
| 15 Okt 2026 | Node minimal 22.12 (`engines`), Vercel Node 24.x. | `@supabase/supabase-js` 2.117 butuh Node ≥ 22, vitest 5 butuh ≥ 22.12. CLAUDE.md menulis 20.9. |
| 15 Okt 2026 | Versi dipin: next 16.3.8, react 19.3.0, typescript 6.0.3, eslint 9.39.5 (lihat tabel di rencana). | Rilis ≥ 14 hari. TypeScript 7 dan ESLint 10 belum didukung `eslint-config-next` 16.3.8. |
| 15 Okt 2026 | Cache publik memakai Cache Components (`cacheComponents: true`, `'use cache'` + `cacheTag` + `cacheLife`); mutasi admin memakai `updateTag()` + `refresh()`, tidak pernah `revalidateTag(...,'max')`. | `unstable_cache` sudah digantikan di Next 16; `updateTag` memberi read-your-writes sehingga harga baru langsung tampil. |
| 15 Okt 2026 | `proxy.ts` hanya untuk `/admin/:path*`. | Halaman publik tetap statis tanpa tulis cookie. |
| 15 Okt 2026 | Tambahan dependensi: `@playwright/test` (uji e2e + screenshot 390/1280 dengan Chrome lokal) dan `cmdk` (dipakai komponen `command` shadcn untuk pemilih ikon). Tidak memakai `vaul` dan dnd-kit. | CLAUDE.md meminta screenshot Playwright bila tersedia; pemilih ikon wajib ada pencarian (PRD §7.6). Bottom sheet cukup dengan Sheet Radix; urutan foto cukup drag native + tombol geser. |
| 15 Okt 2026 | CTA "Sewa sekarang" di detail unit mobile selalu tampil sejak awal (PRD §6.4: muncul setelah galeri lewat). | Brief pemilik meminta CTA sewa yang jelas. |
| 15 Okt 2026 | Hero menampilkan baris "N unit tersedia · mulai RpX/malam" per apartemen. | PRD §4.1 meminta hero menjawab "mulai berapa". |
| 15 Okt 2026 | Hero, menu, dan filter hanya menampilkan apartemen aktif yang punya ≥ 1 unit published. | PRD §7.5; mencegah apartemen kosong muncul. |
| 15 Okt 2026 | Label promo kustom hanya tampil kalau tanpa angka persen, ≤ 24 karakter, dan bukan "Promo Spesial"; selain itu "Hemat X%" otomatis (≥ 5%). | Label lama berisi persen basi. |
| 15 Okt 2026 | URL `images.unsplash.com` dianggap "tanpa foto" (placeholder netral), tidak dipakai di promo pilihan maupun OG. | DESIGN §7 melarang foto stok. |
| 15 Okt 2026 | Filter apartemen di admin permintaan sewa memakai kolom `leads.location_name`. | `leads` tidak punya `location_id`. |
| 15 Okt 2026 | Redirect URL lama: `/preview-client` → `/`, `/login` → `/admin/login` (308). | Menjaga tautan lama. |
| 16 Okt 2026 | `turbopack.root` tidak dipakai di `next.config.ts` (hanya `outputFileTracingRoot`). | Dengan `turbopack.root`, `next dev` gagal me-resolve font `next/font/google` (Turbopack 16.3.8); setelah Laravel dipindah, root workspace sudah terdeteksi benar tanpa opsi itu. |
| 16 Okt 2026 | shadcn/ui ditambahkan tanpa dependensi `shadcn` dan `cn` yang dipasang CLI-nya; isi `shadcn/tailwind.css` yang dipakai disalin ke `globals.css`, dan `cn()` tetap `clsx` + `tailwind-merge` (diperluas dengan token kustom). | CLI memasang `shadcn@4.21.5` (belum 14 hari) sebagai dependensi runtime dan paket `cn` yang tidak ada di daftar stack. |
| 16 Okt 2026 | Komponen shadcn disesuaikan ke token DESIGN: `bg-muted` → `bg-surface-2`, tombol 44/52px, input 48px gaya `.glass-input`, sheet bawah radius 24 + pegangan, label "Tutup". | DESIGN 4.4–4.5; `muted` di DESIGN adalah warna teks. |
| 16 Okt 2026 | Toaster memakai `sonner` langsung (komponen `sonner` shadcn tidak dipasang). | Versi shadcn membutuhkan `next-themes`. |
| 16 Okt 2026 | Footer publik: logo tanpa tautan, latar gelap night → night-rose; header desktop menampilkan "Tanya admin" dan tombol ikon WhatsApp. | Menghindari dua tautan "ke beranda"; kontrak tombol WA header di semua ukuran. |
| 16 Okt 2026 | Contoh tanggal di PRD 6.5 ("Sab, 18 Okt 2026") keliru: 18 Okt 2026 hari Minggu. Format tanggal mengikuti kalender sebenarnya. | Fakta kalender. |
| 16 Okt 2026 | Halaman `dev-preview/*` hanya dipakai saat pengembangan dan dihapus sebelum commit fase. | Aturan rencana (tidak ada halaman uji di repo). |
| 16 Okt 2026 | Hero: tinggi foto mobile `clamp(232px, 100svh - 348px, 340px)` supaya kartu pencarian muat di 390×664 bersama header + pengumuman; nama opsi tipe/budget hanya labelnya (jumlah unit dibaca sebagai deskripsi); tombol panah di daftar opsi memindah fokus, Enter/klik memilih. | PRD 6.2 kriteria terima, aksesibilitas. |
| 16 Okt 2026 | `/sewa`: grid 1 kolom → 2 (sm) → 3 (xl), sidebar 240/280px; hasil dirender di server, klien hanya bingkai filter; "Hapus semua" mempertahankan urutan; `tamu=1` dianggap tanpa filter. | Kartu tidak terlalu sempit di 1024px; JS klien lebih kecil. |
| 16 Okt 2026 | Detail unit: satu set gambar untuk mobile (4:5) dan grid desktop (gambar LCP tidak diunduh dua kali); "Lihat semua foto" mulai 2 foto; kolom kanan 300px (md) / 360px (lg); Offer JSON-LD node terpisah yang ditautkan ke Apartment. | Performa dan validitas schema.org. |
| 16 Okt 2026 | Form sewa: validasi sinkron dulu, baru tab WhatsApp disiapkan (tidak ada tab kosong saat isian salah); klien menunggu `submitLead` maks. 5 detik lalu tetap ke WhatsApp tanpa kode; panel sukses muncul di dalam form setelah kirim, atau menempel di bawah setelah halaman dimuat ulang; di luar jam layanan pesan menyebut jam mulai layanan. | PRD 6.5 langkah 4–6 (WhatsApp tidak boleh terhalang). |
| 16 Okt 2026 | Unit serupa: urutan server = tahap 1 tanpa riwayat; klien memakai fungsi yang sama dengan riwayat perangkat, jumlah kartu tidak berubah setelah hidrasi; teks chip "Apartemen sama" (istilah PRD 10). | Tanpa pergeseran tata letak; satu sumber aturan. |
| 16 Okt 2026 | OG image: PNG 1200×630 via `next/og`, foto unit hanya kalau JPG/PNG dan ≤ 300 KB total (kalau lebih, kartu tanpa foto); font Plus Jakarta Sans diambil dari Google Fonts saat build dengan cadangan font bawaan. | Satori tidak bisa membaca WebP; pratinjau WhatsApp butuh gambar kecil. |
| 16 Okt 2026 | Admin unit: tabel mulai 1024px (kartu di bawahnya, sidebar memakan lebar); aksi baris mengirim nilai target (bukan toggle) supaya klik ganda tidak membatalkan; duplikat berbagi foto, hapus hanya menghapus foto yang tidak dipakai unit lain. | Admin sering bekerja dari HP; integritas Storage. |
| 16 Okt 2026 | Form unit: slug tidak ikut berubah saat nama diubah pada unit yang sudah ada (tombol "Samakan dengan nama"); `rental_period` selalu disimpan "Malam"; Simpan dikunci selama foto diunggah. | Tautan publik stabil; semua harga per malam. |
| 16 Okt 2026 | Apartemen baru dibuat nonaktif; halaman ubah apartemen menampilkan daftar langkah supaya tampil di situs (tipe kamar, unit tampil, aktifkan). Hapus apartemen ikut menghapus tipe kamar, fasilitas gedung, dan landmark-nya (hanya kalau tidak punya unit). | PRD 7.5. |
| 16 Okt 2026 | Lupa kata sandi admin: teks hasil selalu netral (tidak membocorkan email terdaftar); tautan email diverifikasi di `/admin/auth/confirm`, lalu non-admin dikeluarkan. | Keamanan (PRD 7.1). |
| 16 Okt 2026 | Hasil review adversarial (setelah Fase 6): ditambah error boundary (`app/error.tsx`, `(public)/error.tsx`, `global-error.tsx`, admin `error.tsx` + `not-found.tsx`) dengan tombol "Coba lagi" dan "Chat admin via WhatsApp". | Galat Supabase tidak boleh berakhir di layar kosong; jalur ke WhatsApp tetap ada. |
| 16 Okt 2026 | Urutan "Rekomendasi" = unggulan → popularitas 30 hari → termurah → `sort_order` → id (tanpa langkah "punya foto"). | Sama persis dengan PRD 6.3; unit tanpa foto sudah tampil dengan placeholder. |
| 16 Okt 2026 | `outline-none` dibuang dari tombol dan kontrol; outline global `:focus-visible` selalu terlihat. Dialog dan sheet mengembalikan fokus ke elemen pembuka walau dibuka dari state (bukan `Trigger`). | DESIGN 8 (fokus terlihat, fokus kembali setelah modal ditutup). |
| 16 Okt 2026 | Ekspor CSV permintaan sewa diambil per 1000 baris (maju sebanyak baris yang diterima) sampai 5000, diurutkan `created_at` lalu `id`. | Batas `max-rows` PostgREST (1000) memotong ekspor sebelumnya. |
| 16 Okt 2026 | Hapus foto unit hanya untuk path `units/`; hapus apartemen hanya menghapus foto gedung/fasilitas yang tidak dipakai baris lain. | Integritas Storage (foto bisa dipakai bersama). |
| 16 Okt 2026 | Tahun hak cipta di footer memakai cache terpisah `cacheLife('days')`, tidak ikut cache `max` bingkai situs. | Supaya tahun tidak membeku sampai admin mengubah data. |
| 16 Okt 2026 | Perbaikan aksesibilitas kecil: teks badge sukses emerald-700, scroll terprogram menghormati `prefers-reduced-motion`, posisi foto kartu dibacakan ("Foto n dari m"), fokus pindah ke pertanyaan baru setelah "Lihat semua pertanyaan", area sentuh tombol foto admin 44px, nama aksesibel harga cepat diawali harga yang terlihat, tautan "unit yang lebih besar" di kartu sewa memakai jumlah tamu yang dipilih. | DESIGN 8, WCAG 2.5.3/2.5.8. |

| 16 Okt 2026 | QA kode Fase 7 (workflow 4 lensa: copy, keamanan, Next 16/cache/data kosong, aksesibilitas; tiap temuan diverifikasi skeptis): 25 dari 32 temuan terkonfirmasi dan diperbaiki. Ditolak: perlindungan ganti kata sandi tanpa link pemulihan (pemegang sesi sudah memegang token), URL foto eksternal dari aksi admin (butuh sesi admin), nomor WA bawaan di halaman galat (disengaja), kalimat promo, dua label tautan unit besar, istilah Supabase di galat admin, empty state /sewa tanpa filter, tautan FAQ saat 0 FAQ. | Rencana Fase 7. |
| 16 Okt 2026 | Admin → Pengaturan punya tombol "Segarkan data situs" (mengedarkan semua tag cache publik). | Data yang diubah langsung di database (migrasi, SQL Editor) tidak menyegarkan cache halaman statis. |
| 16 Okt 2026 | Profil `/apartemen/[slug]` hanya untuk apartemen terdaftar (aktif + punya unit published); selain itu 404. Tombol "Lihat di situs" di admin hanya tampil untuk apartemen itu. | PRD 7.5; sama dengan sitemap dan generateStaticParams. |
| 16 Okt 2026 | Harga singkat tidak pernah dibulatkan: Rp1,05jt; kalau tidak bisa disingkat persis, ditulis penuh (Rp1.234.567). | Label budget dan "mulai" harus sama dengan harga sebenarnya. |
| 16 Okt 2026 | Draf kebijakan privasi diubah: lama penyimpanan menjadi "selama diperlukan, dihapus atas permintaan" (sebelumnya 12 bulan, tanpa mekanisme hapus otomatis); cara menghapus data tersimpan dijelaskan sesuai perilaku. | Teks hukum tidak boleh menjanjikan hal yang tidak terjadi. Masih perlu disetujui klien. |
| 16 Okt 2026 | Telepon kontak (`contact_phone`) tampil di footer sebagai tautan `tel:`. | Petunjuk admin menyebut "Tampil di footer". |
| 16 Okt 2026 | Data lama diimpor lewat ekspor phpMyAdmin + konverter (`web/scripts/convert-mysql-dump.mjs`), bukan paket migrasi (tidak ada di repo). Hanya 6 tabel konten; `users` tidak ikut. Ekspor dan SQL impor di `export/` (di-ignore Git). | Paket `tools/` tidak tersedia; pemilik memilih jalur ekspor. |
| 16 Okt 2026 | CP-B: ejaan tower **Brentsville** (tower, deskripsi, nama fasilitas); tower mengikuti kode nama unit (AT = Ashton, BV = Brentsville), termasuk "Studio AT 17S"; kapasitas "2BR CORNER BV 19V" 1 → 7 dan "2BR BV 29Q" 2 → 5; dua unit "2BR BV 18Y" dibiarkan. | Jawaban pemilik. |
| 16 Okt 2026 | `backfill_v3` bukan fungsi DB, tapi SQL per baris yang dibuat `web/scripts/make-backfill-v3.mjs` dari data asli (aturan ikon sama dengan aplikasi lewat `lib/icon-rules.ts`). Jalankan ulang skrip setelah migrasi data final saat go-live. | Hasil tepat per baris, bisa ditinjau, aman diulang. |
| 17 Okt 2026 | Skema zod admin dibuat idempoten (`nullish` untuk teks opsional, link YouTube, link Maps); ada tes `parse(parse(x))` per skema. Pesan bawaan zod memakai locale Indonesia (`lib/validation/locale.ts`). | Bug ditemukan di gate CP-C: form mengirim hasil parse (kosong → null) ke Server Action yang mem-parse ulang, jadi simpan apartemen dengan kolom kosong selalu gagal dengan pesan bahasa Inggris. |
| 17 Okt 2026 | Form apartemen dan unit membuang foto yang diunggah tapi tidak jadi disimpan (`discardLocationUploads`, `discardUnitUploads`), sama seperti form fasilitas dan pengaturan. | Mencegah file yatim di Storage. |
| 17 Okt 2026 | Grid daftar/kartu yang berisi teks `truncate` wajib `grid-cols-1` / `minmax(0,1fr)` (About, kartu unit/lead admin, pratinjau Google). Helper e2e `expectNoHorizontalOverflow` kini juga menangkap isi yang terpotong `overflow-x: clip`. | Kolom grid implisit `auto` ikut melebar mengikuti teks nowrap; body memakai `overflow-x: clip` sehingga cek `scrollWidth` saja tidak melihatnya. |
| 17 Okt 2026 | Tes e2e: batas `expect` 15 detik; URL `/sewa` dicek dengan regex (`toHaveURL(fungsi)` ikut menunggu event load); tab WhatsApp desktop dicegat di tingkat context. | Mesin pengembangan lambat; tes tidak bergantung pada internet. |
| 17 Okt 2026 | Lighthouse lokal: versi 13.5.0 (rilis ≥ 14 hari), median 3 run, `cpuSlowdownMultiplier=1` karena benchmarkIndex mesin 357. Angka resmi diambil dari PageSpeed Insights di Vercel Preview. | Pedoman Lighthouse untuk mesin lambat; hasil lokal tidak mewakili produksi. |
| 17 Okt 2026 | File sementara (cache npm, TEMP build/Lighthouse/Playwright) di `D:\vdl-tmp` karena drive C: penuh. | Arahan pemilik ("pakai ruang D"). |
| 17 Okt 2026 | Toaster (sonner) dan TooltipProvider pindah dari root layout ke `app/admin/layout.tsx`. | Situs publik tidak memakai toast/tooltip, tapi keduanya terunduh di setiap halaman (±19 KB gzip). |
| 17 Okt 2026 | Overlay publik dimuat dengan `next/dynamic` (`ssr: false`) saat pertama dibuka, dan unduhan dimulai lebih awal saat tombol disorot, difokus, atau disentuh: menu mobile, field hero (popover desktop dan sheet mobile modul terpisah), slider budget hero, sheet Filter/Urutkan `/sewa`, form sewa, lightbox, video tur, panel "Lihat semua". | Kode Radix Dialog/Popover, react-hook-form, dan zod tidak dibutuhkan sebelum interaksi. Tombol pemicu tetap elemen yang sama sejak SSR (bukan Radix Trigger), jadi tidak dipasang ulang. Fokus kembali ke tombol lewat `onCloseAutoFocus`/`useReturnFocus`. Form GET hero tetap jalan tanpa JS. |
| 17 Okt 2026 | Popover hero meniru perilaku `PopoverTrigger` secara manual (`PopoverAnchor virtualRef`): klik tombol saat terbuka menutup, klik di luar tidak memindah fokus. Ketukan kedua selagi modul overlay masih diunduh tidak menutup field. | Tanpa Trigger, Radix tidak tahu tombolnya; tanpa penjagaan, ketukan ganda di jaringan lambat menutup sheet sebelum tampil. |
| 17 Okt 2026 | Dropdown "Apartemen" di header: Radix DropdownMenu dimuat dengan `React.lazy` hanya di layar ≥ 768px, dengan tombol pengganti yang identik sebagai fallback. Klik sebelum termuat tetap membuka menu. | Nav header tersembunyi di mobile; DropdownMenu + floating-ui ±26 KB gzip. `React.lazy` (bukan `next/dynamic`) supaya fallback bisa memakai props. |
| 17 Okt 2026 | Batas dan pesan form sewa dipisah ke `lib/validation/booking-constants.ts` (tanpa zod); locale zod diimpor langsung (`zod/v4/locales/id.js`). | Kartu sewa dan galeri menarik zod ke muatan awal detail unit, dan `z.locales.id()` membundel semua locale zod (chunk 392 KB mentah / 91 KB gzip). |
| 17 Okt 2026 | `ErrorFallback` memakai elemen biasa dengan kelas tombol yang sama (`buttonVariants` dipindah ke `button-variants.ts`), `<a>` biasa, dan `DEFAULT_WHATSAPP_NUMBER` saja. | Tiga error boundary dimuat di setiap halaman dan Turbopack memberi masing-masing salinan sendiri next/link, Slot/Button, lucide, dan seluruh `DEFAULT_SETTINGS` (±25 KB gzip). Muat ulang penuh setelah galat juga lebih aman. |
| 17 Okt 2026 | Tidak dipakai: hidrasi sidebar filter `/sewa` hanya di desktop (Suspense yang tidak pernah selesai di mobile), `experimental.turbopackChunking`, dan `experimental.inlineCss`. | Di React 19, update transition ke boundary yang belum terhidrasi menunda commit, jadi navigasi filter di mobile bisa macet. Dua opsi lain eksperimental dan belum diuji di Vercel. |
| 17 Okt 2026 | Pengukuran performa lokal memakai A/B bergantian (build lama vs baru diselang-seling per putaran, 5 putaran, median), skrip `D:\vdl-tmp\lh\ab.sh`. | Beban CPU mesin berubah-ubah (benchmarkIndex 97–1133 dalam satu sesi); pengukuran berurutan tidak bisa dibandingkan. |
| 18 Okt 2026 | Dua ikon digambar sendiri gaya lucide lewat `createLucideIcon` (`wardrobe`, `hanger`) di `components/icons/custom-lucide.ts`; kursi memakai `armchair` lucide. | Pemilik minta ikon lemari dan gantungan baju; lucide-react 1.49 tidak punya keduanya (penyimpangan dari "lucide saja" di CLAUDE.md, disetujui pemilik). |
| 18 Okt 2026 | Chevron `NativeSelect` memakai `bg-size-[16px] bg-position-[right_14px_center]`, bukan `bg-[length:…] bg-[right_…]`. | `tailwind-merge` 3.7 mengira `bg-[right_14px_center]` warna latar dan membuangnya saat digabung `bg-brand-50` (select status permintaan). |
| 18 Okt 2026 | Pemilih ikon: Popover `modal` + tinggi daftar mengikuti `--radix-popover-content-available-height`, scrollbar tampil, ikon centang cmdk disembunyikan. | Di dalam dialog/sheet, roda mouse di popover non-modal diblokir react-remove-scroll sehingga baris terakhir ikon tidak terjangkau. |
| 18 Okt 2026 | Header hanya satu tombol WhatsApp (ikon di HP, ikon + "Tanya admin" di desktop). Menu "Apartemen" ditulis sendiri (pola menu button APG, tanpa Radix DropdownMenu): terbuka saat disorot mouse, klik tidak menutup, sentuh/keyboard biasa, Esc dan klik di luar menutup. | Permintaan pemilik. `DropdownMenuContent` Radix tidak mengekspos `onOpenAutoFocus`, jadi menu hover akan selalu menarik fokus; komponen sendiri lebih kecil daripada chunk Radix + floating-ui. |
| 18 Okt 2026 | Kota asal **wajib** (2–60 karakter, teks bebas) di form sewa; disimpan `leads.origin_city`, placeholder `{kota}` di template WA, tampil di admin (tabel, kartu, detail, pencarian, CSV). Data "Ingat data saya" lama tanpa kota tetap terisi tapi tidak diringkas. | Pemilik ingin tahu asal tamu. Migrasi 0004 mengganti baris "Kota Asal: " kosong yang diketik pemilik dengan baris ber-placeholder. |
| 18 Okt 2026 | Hapus permintaan sewa = hapus permanen dari database (per baris lewat menu/ikon, atau mode Pilih + "Hapus yang dipilih", maks 100 per aksi) dengan konfirmasi; tag `popularity` dikedaluwarsakan. | Permintaan pemilik supaya Supabase tetap ringan; tanpa arsip. |
| 18 Okt 2026 | Satu pemeriksaan referensi Storage (`collectReferencedPaths`: unit sampul+galeri, apartemen, fasilitas, pengaturan) dipakai semua aksi hapus foto, tanpa `.or()` dari path; sapuan "Bersihkan file tak terpakai" di Pengaturan menghapus file yatim per 100 setelah cek ulang referensi. Gagal baca referensi = tidak ada yang dihapus. | Pemilik: yang tersimpan di Storage harus sama dengan yang dipakai situs. Cek lintas tabel mencegah foto yang dipakai baris lain ikut terhapus. |
| 18 Okt 2026 | `locations.has_towers` (Delft CPI = false): field Tower disembunyikan di form unit, tower disimpan null, situs/pesan WA menulis "Delft CPI · Lantai N", penanda "perlu dicek" tidak menuntut tower. Nilai "Utama" yang terlanjur diisi dikosongkan migrasi 0004. | Delft hanya satu gedung. |
| 18 Okt 2026 | (Diganti baris berikutnya.) Titik peta Delft diambil dari koordinat yang diberikan pemilik; `gmaps_url` dibiarkan (sudah link place yang sama). URL embed dari pemilik tidak disimpan. | `lib/gmaps.ts` tidak membaca URL embed `pb=`; link place lebih berguna untuk tombol "Buka di Google Maps". |
| 18 Okt 2026 | Titik peta apartemen = **pin tempat** di link Google Maps (`!3d…!4d…`), bukan `@lat,lng` (titik tengah tampilan peta saat link disalin). Migrasi 0005: Delft `-5.1499287, 119.3944552` (titik 0004 `-5.1446, 119.3941` dan titik lama `-5.1491, 119.3764` sama-sama di laut), Vida View `-5.1547578, 119.4416827` (sebelumnya ±140 m di jalan). Form apartemen memberi peringatan kalau latitude/longitude berbeda > 50 m dari pin di link (tombol "Pakai pin dari link"), dan link yang hanya berisi `@` ditandai "belum tentu tepat di gedung". | Pemilik melapor pin Delft di tengah laut; link pendek dari pemilik (`maps.app.goo.gl/aW4MH7DfNXknCgcv6`) menunjuk tempat yang sama dengan pin di darat CPI. |
| 18 Okt 2026 | `fillTemplate` menganggap teks `\n` harfiah di template WhatsApp sebagai ganti baris; migrasi 0006 membetulkan template di database, dan teks pengganti `regexp_replace` di file 0004 dibetulkan untuk database baru (`E'\n'`). E2E form sewa memeriksa "Kota asal" di barisnya sendiri dan tidak ada `\n` harfiah; tes lead asli diberi batas 60 detik. | Uji lead asli setelah migrasi 0004 menunjukkan pesan `Nama: UJI QA\nKota asal: Makassar`: di teks pengganti `regexp_replace`, `\n` tidak menjadi ganti baris. |
| 18 Okt 2026 | Gate admin pascamigrasi menemukan dan memperbaiki: (1) dialog yang dibuka dari item menu (hapus permintaan/unit) mengembalikan fokus ke tombol menu, bukan `<body>` (`returnFocusTarget` di `components/ui/dialog.tsx`); (2) form unit Delft tidak lagi menampilkan "Perlu dicek" palsu (`hasTowers` ikut ke penanda awal); (3) fokus kembali ke tombol Periksa file setelah memeriksa; (4) field Tower memberi saran dari tower unit lain di apartemen itu (`<datalist>`) dan tombol "Pakai Brentsville" untuk ejaan mirip (`lib/admin/towers.ts`, perbandingan per kata: "Blok A"/"Blok B" tidak dianggap salah ketik). | Unit baru 489 kembali diketik "Brensville" setelah 0004 menormalkannya; fokus hilang terlihat saat uji keyboard. |
| 18 Okt 2026 | Review adversarial kedua (4 lensa, 13 temuan terkonfirmasi, semua diperbaiki): tombol "Pakai …" yang hilang setelah dipakai memindah fokus ke isiannya; peringatan pin bukan `role=status` (tidak dibacakan tiap ketikan); refocus Periksa file tidak menarik fokus yang sudah pindah; gelembung chat tetap tampil selama difokus keyboard; observer hero memakai entri terakhir; area sentuh tautan Ringkasan tidak bertumpuk mulai sm; FAQ umum di landing hanya disaring kalau FAQ tipe dengan topik itu benar-benar dibuat; `ll=` di link Maps dianggap titik tengah tampilan; `\n` di PROGRESS dibetulkan. Perayap AI (`AI_CRAWLERS`) ditambahkan ke `htmlLimitedBots` sehingga menerima canonical/robots/description di `<head>` seperti Googlebot. | Review 878c7cd..HEAD; perayap AI membaca HTML mentah. |
| 18 Okt 2026 | Bot chat "Asisten VIDALIDAY" (nama pilihan pemilik) berbasis aturan di browser: data dari `GET /chat-data` (cache tag sama dengan halaman, noindex), normalisasi slang + Damerau-Levenshtein, slot memori percakapan, jawaban dari knowledge (hitungan sama dengan `/sewa` lewat `matchesRow`), kartu unit ≤ 3, tombol WhatsApp berisi pertanyaan saat tidak paham; tidak pernah mengonfirmasi tanggal. Mobile sheet 92dvh, desktop kartu 380×600 non-modal; riwayat `sessionStorage` 24 jam. Gelembung ada di semua halaman publik menggantikan FAB WhatsApp; grup rute `(with-fab)` dibubarkan. | Pemilik minta bot tanpa API yang akurat dari data situs, toleran typo, mengarahkan ke halaman unit, dan menyerahkan ke admin bila tidak bisa menjawab. |
| 18 Okt 2026 | Bot chat menyerahkan ke admin (bukan menebak) untuk layanan di luar data: antar-jemput/transportasi, sarapan, layanan kebersihan, kasur tambahan, refund/ganti tanggal, nego harga, invoice, kedatangan dini hari (`SERVICE_TOPICS` di `lib/chat/lexicon.ts`), kecuali FAQ menjawabnya. Tempat yang ditanya tapi tidak terdaftar ("jarak Delft ke bandara") dijawab "belum tercantum" + daftar yang ada + tombol WA. Panel desktop memindah fokus ke dirinya saat dibuka, lalu ke kotak tulis setelah data siap; penanda "Menyiapkan chat" tampil selama modul diunduh pertama kali. | Uji manual: "bisa antar jemput bandara jam 3 pagi?" sempat dijawab daftar landmark; di mesin lambat Enter berikutnya mengenai tombol pembuka dan menutup panel. |
| 18 Okt 2026 | Hasil review adversarial batch 2 (3 lensa) diperbaiki: sapuan Storage melewati file < 24 jam (foto di form yang belum disimpan), menghitung URL publik bucket sendiri sebagai referensi, membaca referensi per 1000 baris, dan tidak lagi terblokir nama file tak lazim / > 2000 file; IndexNow hanya melaporkan unit yang terbaca publik, ikut melaporkan profil apartemen dan landing tipe, dan tidak dikirim saat permintaan sewa dihapus; chip balasan cepat memindah fokus ke kotak tulis; jawaban yang sedang "berpikir" ikut tersimpan kalau panel ditutup; nama aksesibel tombol chat memuat "Tanya kami"; menu Apartemen bisa ditutup Esc walau dibuka dengan hover dan tidak tertutup saat keyboard di dalamnya; setelah hapus permintaan fokus pindah ke daftar, dialog detail tetap terbuka sampai hapus berhasil (catatan yang belum disimpan tidak hilang), teks konfirmasi tidak berkedip; hasil "Periksa file" dibacakan pembaca layar; Googlebot ditambahkan ke `htmlLimitedBots` (next.config.ts) supaya canonical/robots `/sewa` yang dihitung dari filter ada di `<head>`, bukan di-stream ke `<body>`; FAQPage tidak lagi dipasang di halaman unit, dan di landing tipe hanya untuk tanya-jawab khusus tipe (FAQ umum cukup di beranda dan profil apartemen). | Review 3 lensa (keamanan, aksesibilitas/interaksi, SEO/cache) + verifikasi adversarial: 11 dari 12 temuan terkonfirmasi, semuanya diperbaiki. Satu ditolak: URL gambar sitemap tidak di-escape, tetapi path Storage dibentuk aplikasi sehingga tidak bisa berisi karakter XML. |
| 18 Okt 2026 | SEO: landing `/apartemen/[slug]/[tipe]` (H1 entitas + kota, kotak Ringkasan, unit, fasilitas umum, FAQ dari data), kartu tipe dan footer menautkan landing; `/sewa` tanpa filter dan per apartemen diindeks, apartemen+tipe canonical ke landing (tanpa noindex), filter lain `noindex,follow` tanpa canonical (tidak dicampur, sesuai panduan Google); sitemap bergambar; robots mengizinkan perayap AI (grup eksplisit) dan melarang `/admin`, `/chat-data`; `llms.txt` + `llms-full.txt`; JSON-LD Organization/WebSite/LodgingBusiness(+lokasi gedung, jam, sameAs)/AggregateOffer/ItemList/FAQPage/Breadcrumb 4 tingkat; judul bawaan "Sewa Apartemen Harian di Makassar | VIDALIDAY"; IndexNow opsional lewat `after()` di `invalidate()`; tautan sosial di Pengaturan untuk `sameAs`. | Target pemilik: peringkat organik "sewa apartemen di makassar" dan mudah dirayapi AI untuk AI Overview. |
| 18 Okt 2026 | Review visual screenshot e2e 390/1280 (5 kelompok halaman, diverifikasi ulang): 37 temuan terkonfirmasi, semua yang berasal dari kode diperbaiki; sisanya data pemilik (lihat "Rapikan data di admin"). Di antaranya: hero landing sejajar kontainer 1200px; waktu tempuh landmark tetap di kanan; Ringkasan dua kolom mulai lg dengan area sentuh 44px; email footer putus sebelum "@"; FAQ umum di landing tidak mengulang topik FAQ tipe; kalimat ringkasan unit "muat maksimal N tamu, dengan harga …"; panah carousel disembunyikan kalau tidak ada yang digeser; chip filter sidebar satu per baris; teks input chat 16px; pesan WhatsApp kosong "Tulis nomor WhatsApp-mu". | Pemeriksaan tampilan sebelum CP-D; 12 temuan lain ditolak (artefak tangkapan layar, sesuai PRD, atau data). |
| 18 Okt 2026 | Di HP, gelembung chat disembunyikan (`invisible`, keluar dari urutan Tab) selama kotak pencarian hero beranda terlihat dan muncul lagi setelah digulir (`<body data-hero-visible>` diatur `HeroSearch`, varian `hero-visible`). Desktop tidak berubah. | Gelembung 56px menutupi ujung kanan tombol "Cari unit" di layar pertama 390px; tombol WhatsApp header tetap tersedia. |
| 18 Okt 2026 | Label preset budget menjadi "Sampai Rp300rb" dan "Mulai Rp1jt" (nilai URL tetap `max=300000` / `min=1000000`, batas inklusif). PRD §6.2 diperbarui. | "Di bawah Rp300rb" ikut menghitung unit Rp300.000; mengganti nilai ke 299.999 membuat URL janggal. |
| 18 Okt 2026 | `/sewa`: halaman `noindex` tidak lagi menulis canonical; apartemen + tipe tetap canonical ke landing tanpa `noindex`. | Google menyarankan tidak menggabungkan noindex dengan canonical ke URL lain. |

## Keterbatasan yang diketahui

- **Lighthouse CLI 13 lokal memberi SEO 92 di `/sewa`** ("tidak ada meta description"): CLI ini memakai UA Chrome biasa sehingga menerima metadata yang di-stream ke `<body>` seperti pengunjung biasa. Googlebot, Bingbot, perayap AI, dan PageSpeed Insights (UA berisi `Chrome-Lighthouse`) menerima metadata di `<head>`; dicek dengan `curl -A`.

- Mengganti nama tipe kamar tidak memperbarui kolom lama `units.room_type` di unit yang sudah ada (kolom itu hanya untuk kompatibilitas; aplikasi membaca `room_type_id`).
- Filter apartemen di admin permintaan sewa mencocokkan nama apartemen saat ini dengan `leads.location_name`; permintaan lama dengan nama apartemen yang sudah diganti tidak ikut tersaring.
- Form admin belum memakai kunci versi (optimistic concurrency): kalau dua admin mengubah data yang sama bersamaan, simpanan terakhir yang berlaku.
- **Performa Lighthouse mobile di mesin lokal masih di bawah target ≥ 90.** Accessibility dan SEO tetap 100, Best Practices 96 (satu-satunya pengurang: skrip Vercel Analytics 404 di lokal), CLS 0.
  - Mesin pengembangan sangat lambat dan CPU-nya penuh oleh aplikasi lain (benchmarkIndex 97–1133 dalam satu sesi; acuan Lighthouse sekitar 1500), jadi `cpuSlowdownMultiplier=1`. Bahkan tanpa throttling, FCP teramati di beranda 4,8 detik. Server lokal juga masih HTTP/1.1 + gzip, sedangkan Vercel memakai HTTP/2 + Brotli + CDN.
  - Pengurangan JS bersama (17 Okt): A/B bergantian, build lama (A) vs baru (B), Lighthouse 13.5.0 mobile, median 5 run per halaman. JS awal = chunk yang dirujuk HTML, ukuran transfer.

    | Halaman | Skor A → B | LCP A → B | TBT A → B | JS awal A → B |
    |---|---|---|---|---|
    | `/` | 65 → 72 | 4,76 → 4,75 s | 502 → 233 ms | 291 → 204 KB (22 → 16 file) |
    | `/sewa?lokasi=vida-view` | 59 → 69 | 6,02 → 4,96 s | 476 → 346 ms | 281 → 209 KB (21 → 16 file) |
    | `/unit/studio-at-26x-292` | 68 → 66 | 5,67 → 4,68 s | 210 → 155 ms | 410 → 220 KB (24 → 17 file) |

    Detail unit: LCP, TBT, dan FCP membaik, tapi median skornya turun 2 poin karena Speed Index (6,7 → 7,6 s) dan sebaran antar-run besar (A 61–76, B 51–77). Skor sebelumnya (74–77) diukur saat mesin lebih senggang, jadi tidak bisa dibandingkan langsung dengan tabel ini.
  - Yang tersisa di muatan awal: React + runtime Next (±120 KB gzip), tailwind-merge (`cn`, ±9 KB), komponen halaman yang memang tampil (hero, kartu, galeri, panel filter sidebar `/sewa`), dan Radix Accordion untuk FAQ.
  - Yang menahan LCP di simulasi 4G (1,6 Mbps): foto hero berebut bandwidth dengan font (28 KB), CSS render-blocking (25 KB), JS, dan foto kartu di bawah lipatan yang ikut diminta sebelum LCP (±240 KB di beranda). TBT lokal didominasi hidrasi React dan style/layout, yang berayun 2× antar-run karena beban CPU.
  - Langkah berikutnya (perlu keputusan pemilik): ukur PageSpeed Insights di Vercel Preview. Kalau masih < 90: (1) `images.formats: ["image/avif", "image/webp"]` untuk memperkecil foto hero dan kartu; (2) uji `experimental.inlineCss` (menghapus 2 CSS render-blocking, tapi CSS ikut terduplikasi di payload RSC); keduanya diuji dulu di Preview.
- **Pemeriksaan visual admin terbatas:** panel browser aplikasi terlalu kecil untuk screenshot 1280px yang terbaca. Admin diverifikasi lewat sapuan DOM (elemen terpotong) di semua halaman pada 390 dan 1280 plus uji fungsi per entitas. Playwright tidak bisa memakai sesi admin karena Claude tidak memegang kredensial.
- **Cache CDN Storage:** file yang dihapus dari bucket (mis. foto unit yang dihapus) masih bisa terbuka lewat URL publik lama selama cache Cloudflare Supabase belum kedaluwarsa. Objeknya sendiri sudah terhapus (`NoSuchKey`).
- **Lama penyimpanan data lead** belum ada mekanisme hapus otomatis; draf kebijakan privasi menulis "selama diperlukan, dihapus atas permintaan" (lihat Pertanyaan terbuka). Admin kini bisa menghapus permanen per baris atau pilih banyak (batch 2).
- **Hapus permintaan sewa** juga mereset batas rate `submit_lead` untuk nomor itu (hitungan 5/jam dibaca dari baris yang tersisa).
- **Bot chat** berbasis aturan: satu maksud per giliran (pertanyaan gabungan seperti "harga dan lokasi delft" dijawab satu topik, sisanya lewat chip), tidak memahami tanggal (hanya menyarankan konfirmasi admin), dan data di chat bisa basi paling lama 60 detik setelah admin menyimpan (cache browser `/chat-data`). Kata/alias baru ditambah di `lib/chat/lexicon.ts`.
- **Metadata `/sewa` di-stream** (membaca `searchParams`) untuk pengunjung biasa; Googlebot, Bingbot, dan perayap di daftar `htmlLimitedBots` menerima render blocking dengan canonical/robots di `<head>` (diperiksa dengan `curl -A Googlebot` di build lokal). Akibatnya setiap halaman yang dirayapi Googlebot dirender per permintaan (data tetap dari cache), sedikit menambah pemakaian fungsi Vercel.
- **Header `Cache-Control` route `/chat-data`, `/llms.txt`** bisa ditimpa header ISR Vercel; datanya tetap benar lewat invalidasi tag, hanya cache browser yang tidak diatur.
- **Alamat bisnis di JSON-LD** memakai alamat gedung pertama (Vida View) sampai pemilik memberi alamat kantor resmi.

## Pertanyaan terbuka

Dari PRD §14 (sisa):

1. Apakah ada harga mingguan/bulanan per unit? (bisa diisi admin kapan saja)
2. Koordinat Delft sudah diberikan pemilik (migrasi 0004); koordinat Vida View masih dari data lama, cek di admin.
3. Teks final kebijakan privasi dan peraturan menginap. Termasuk lama penyimpanan data permintaan sewa: kalau mau tetap "12 bulan", Claude siapkan SQL penghapusan terjadwal (admin sudah bisa menghapus manual).
4. Tower Delft CPI: selesai, Delft ditandai satu gedung (`has_towers = false`), situs menulis "Delft CPI · Lantai N".
5. Deskripsi "Studio AT 17S" masih menyebut Tower Brentsville, padahal tower-nya Ashton (keputusan pemilik). Rapikan teksnya di admin.
6. Dua unit bernama "2BR BV 18Y" (id 479 dan 480) sengaja dibiarkan; beri nama pembeda di admin kalau perlu.
7. Logo: setting `site_logo` lama menunjuk file yang sudah tidak ada, dikosongkan saat impor; situs memakai logo bawaan. Unggah logo baru di Pengaturan kalau mau.

Terjawab: jam layanan 10.00–23.00 WITA (dari data); nama badan hukum ditampilkan "PT Perdana Mega Trans" otomatis; label promo lama semuanya "Promo Spesial" dan dikosongkan (situs menampilkan "Hemat X%").
