# PROGRESS — VIDALIDAY v2

Diperbarui oleh Claude Code di akhir setiap fase. Posisi terakhir dibaca dari sini di awal sesi.

**Fase aktif:** 6 (kode Fase 2–5 selesai dan lulus lint/typecheck/430 unit test; verifikasi dengan data asli — build, e2e, screenshot, Lighthouse — menunggu `web/.env.local`)

Status verifikasi per fase:

| Fase | Kode | Unit test | Build + e2e + screenshot dengan data asli |
|---|---|---|---|
| 1 | selesai | lulus | lulus (tanpa data, bingkai saja) |
| 2 | selesai (kecuali audit data + `backfill_v3`) | lulus | menunggu env |
| 3 | selesai | lulus | menunggu env |
| 4 | selesai | lulus | menunggu env |
| 5 | selesai | lulus | menunggu env + CP-C (login admin) |
| 6 | sedang dikerjakan | — | menunggu env |

Rencana eksekusi lengkap yang disetujui pemilik: `docs/audit/rencana-eksekusi.md`.
Laporan audit dan desain (acuan untuk semua fase): `docs/audit/*.md`.

---

## Checklist fase

- [x] **Fase 0** — Orientasi: dokumen dibaca, audit gaya situs lama, rencana kerja
- [x] **Fase 1** — Fondasi: Next.js 16 di `web/`, token desain, klien Supabase, proxy, utilitas + test, layout publik & admin
  - lint, typecheck, 150 unit test, build, cek emoji, cek secret: lulus
  - e2e `e2e/fase-1.spec.ts` terhadap `next start`: 33 lulus (390px & 1280px), screenshot diperiksa
  - `/admin` tanpa sesi → 307 ke `/admin/login`; header keamanan dan redirect URL lama berjalan
- [ ] **Fase 2** — Lapisan data v2: query + cache tag, rekomendasi tahap 1, validasi zod, action `submitLead`
- [ ] **Fase 3** — Beranda (hero + kotak pencarian) dan `/sewa` (filter, urutan, paginasi)
- [ ] **Fase 4** — Detail unit, form sewa → WhatsApp, rekomendasi tahap 2, apartemen, about, privasi, SEO, analitik
- [ ] **Fase 5** — Admin 1: login, layout, dashboard, unit (daftar + form + foto), apartemen & tipe kamar, fasilitas kamar
- [ ] **Fase 6** — Admin 2: fasilitas gedung, landmark, FAQ, permintaan sewa, about, pengaturan
- [ ] **Fase 7** — QA, performa, aksesibilitas, keamanan, README, checklist go-live

## Yang perlu dilakukan pemilik

Checkpoint di sesi ini (Claude berhenti dan menunggu hanya di sini):

- [ ] **CP-A** (setelah scaffold Fase 1):
  1. Buat `web/.env.local` berisi 3 variabel dari SETUP.md §4 (tanpa secret key).
  2. Opsional: jalankan `npx supabase login` di terminal sendiri, supaya tipe database bisa di-generate.
  3. Matikan sign-up publik di Supabase Auth (SETUP.md §3.2).
  4. Buat dua akun uji di Supabase Auth: `admin-qa` (lalu `insert into public.admins`) dan `nonadmin-qa`. Password tidak dikirim ke chat.
- [ ] **CP-B** (setelah audit data Fase 2): tinjau SQL pratinjau, jalankan migrasi `20261015000300_v2_perbaikan.sql` di SQL Editor, jawab pertanyaan data.
- [ ] **CP-C** (Fase 5): login sendiri sebagai `admin-qa` di panel browser aplikasi saat diminta, lalu sekali sebagai `nonadmin-qa`.

- [ ] **Supabase Auth untuk lupa kata sandi admin** (Fase 5):
  1. Authentication → URL Configuration: Site URL `https://vidaliday.com`; Redirect URLs tambah `https://vidaliday.com/admin/auth/confirm` dan `http://localhost:3000/admin/auth/confirm`.
  2. Authentication → Email Templates → Reset Password: ganti tautan menjadi
     `{{ .SiteURL }}/admin/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/admin/atur-password`
     (supaya link bisa dibuka dari perangkat mana pun).

Menjelang go-live: lihat bagian "Checklist go-live" (diisi di Fase 7).

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

## Pertanyaan terbuka

Dari PRD §14 (sisa):

1. Apakah ada harga mingguan/bulanan per unit? (bisa diisi admin kapan saja)
2. Koordinat atau link Google Maps persis tiap gedung.
3. Teks final kebijakan privasi dan peraturan menginap.
4. Jam layanan yang benar: data lama 08.00–23.00, situs live 10.00–23.00 WITA. (ditanyakan lagi di CP-B)

Akan ditanyakan di CP-B (setelah data dicek):

- Arti kode nama unit (AT = Tower Ashton? BV = Brentsville? angka = lantai?) dan nama tower di Delft.
- Penulisan nama badan hukum di UI ("PT Perdana Mega Trans").
- Boleh mengosongkan label promo lama yang berisi persen.
