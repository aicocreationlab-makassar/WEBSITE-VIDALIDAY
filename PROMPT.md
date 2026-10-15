# PROMPT — Eksekusi VIDALIDAY v2 dengan Claude Code

Cara pakai:

1. Pastikan langkah 1–4 di `docs/SETUP.md` sudah selesai (folder, Supabase, migrasi 0002, `.env.local`).
2. Buka Claude Code di folder root proyek.
3. Untuk setiap sesi, tempel **prompt pembuka** di bawah, ganti `{N}` dengan nomor fase.
4. Satu fase per sesi. Periksa hasilnya, baru lanjut ke fase berikutnya.

---

## Prompt pembuka (tempel setiap sesi)

```
Kamu engineer senior yang membangun ulang VIDALIDAY (https://vidaliday.com)
dari Laravel ke Next.js 16 + Supabase + Vercel.

Baca dulu: CLAUDE.md, docs/PROGRESS.md, docs/PRD.md, docs/DESIGN.md,
lalu bagian "Fase {N}" di PROMPT.md.

Kerjakan HANYA Fase {N}. Ikuti semua aturan di CLAUDE.md.
Jika ada hal ambigu yang memengaruhi data atau tampilan, tanyakan dulu
(maks 5 pertanyaan). Hal kecil: putuskan sendiri dan catat di PROGRESS.md.

Selesai kalau semua "Kriteria selesai" fase ini terpenuhi.
Lalu laporkan: apa yang dibuat, keputusan yang diambil,
dan apa yang perlu saya lakukan. Setelah itu berhenti.
```

---

## Fase 0 — Orientasi (tanpa kode aplikasi)

Tugas:

1. Baca semua dokumen di `docs/` dan `CLAUDE.md`. Lihat `docs/referensi/hero-search-referensi.png`.
2. Telusuri `legacy-laravel/` (hanya baca): `resources/css/app.css`, `tailwind.config.js`, `resources/views/layouts/app.blade.php`, `home.blade.php`, `partials/unit-card.blade.php`, `about.blade.php`, `admin/layout.blade.php`, `admin/units/*.blade.php`, `app/Models/*.php`.
3. Bandingkan dengan `docs/DESIGN.md`. Catat di `docs/PROGRESS.md` bagian "Catatan audit": token atau pola dari situs lama yang belum ada di DESIGN.md, dan perilaku lama yang perlu dipertahankan.
4. Cek apakah `web/.env.local` sudah ada (jangan baca isinya ke log). Kalau belum, sebutkan variabel yang perlu diisi pemilik (SETUP.md §4).
5. Tulis rencana kerja singkat per fase di `docs/PROGRESS.md`.

Kriteria selesai: PROGRESS.md berisi catatan audit + rencana; daftar pertanyaan (kalau ada) sudah diajukan; tidak ada file aplikasi yang dibuat.

---

## Fase 1 — Fondasi

Tugas:

1. Buat aplikasi di `web/`: Next.js 16 App Router, TypeScript strict, Tailwind v4, ESLint, folder `src/`, alias `@/*`. Pin versi persis.
2. Pasang dependensi sesuai CLAUDE.md "Stack". Inisialisasi shadcn/ui; tambahkan hanya komponen yang dipakai (button, input, textarea, select, dialog, sheet, popover, dropdown-menu, slider, checkbox, switch, tabs, table, badge, skeleton, accordion, command, tooltip).
3. Token desain di `src/app/globals.css` (`@theme`) persis DESIGN.md §3. Font Plus Jakarta Sans via `next/font/google`. `lang="id"`.
4. Klien Supabase: `lib/supabase/public.ts` (publishable key, tanpa cookie, untuk data publik yang di-cache), `server.ts` (`@supabase/ssr`, cookie), `browser.ts`. `src/proxy.ts`: refresh sesi dan alihkan `/admin/*` (kecuali `/admin/login`) ke login bila belum masuk.
5. Utilitas + unit test (vitest): `lib/format.ts` (Rupiah, Rupiah singkat "Rp280rb", tanggal & jam WITA, normalisasi/validasi nomor WA), `lib/pricing.ts` (harga efektif, diskon %, estimasi PRD §6.5), `lib/whatsapp.ts` (isi template + hapus baris kosong + link `wa.me`), `lib/media.ts`, `lib/icons.tsx` (registry DESIGN.md §6), komponen `components/icons/whatsapp.tsx`.
6. `next.config.ts`: `images.remotePatterns` (Supabase Storage + images.unsplash.com), header keamanan (PRD §9), redirect `www.vidaliday.com` → `vidaliday.com`.
7. Generate `src/types/database.ts` (`supabase gen types`). Kalau CLI belum login/link, beri pemilik perintah persisnya dan pakai tipe sementara.
8. Kerangka layout: publik (header, footer, pengumuman, tombol WA mengambang sesuai aturan PRD §6.1) dan admin (sidebar, topbar, drawer mobile sesuai DESIGN.md §5) dengan halaman kosong per rute PRD §5.
9. Salin logo dari `legacy-laravel/public/images/logo_vidaliday.png` ke `web/public/images/`.

Kriteria selesai: `npm run dev` jalan; lint, typecheck, test, build lulus; header/footer & sidebar admin tampil benar di 390px dan 1280px; `/admin` mengalihkan ke `/admin/login` saat belum masuk.

---

## Fase 2 — Lapisan data v2

Tugas:

1. Pastikan migrasi `supabase/migrations/20261015000200_fitur_v2.sql` sudah dijalankan (cek kolom `units.room_type_id` dan tabel `room_types` lewat query baca). Kalau belum: berhenti dan minta pemilik menjalankannya (SETUP.md §3). Jangan menjalankannya sendiri tanpa izin.
2. Regenerate tipe database.
3. `lib/data/` (server-only, dengan tag cache):
   - `settings.ts` — semua setting jadi satu objek bertipe, dengan nilai default.
   - `locations.ts` — apartemen aktif + tipe kamar aktif + jumlah unit tersedia per tipe + harga terendah.
   - `units.ts` — `listUnits(filter)` sesuai query `/sewa` (PRD §5.4) dengan paginasi dan urutan; `getUnitBySlug(slug)` lengkap (lokasi, tipe kamar, fasilitas, foto); `getFeaturedUnits()`; `getUnitPriceBounds()`.
   - `content.ts` — FAQ aktif, landmark per apartemen, fasilitas gedung, amenities aktif.
   - `popularity.ts` — `unit_popularity(30)`.
4. `lib/recommend.ts` — skor tahap 1 (PRD §6.6) sebagai fungsi murni + unit test dengan data contoh.
5. `lib/validation/` — skema zod: filter `/sewa` (parse aman dari searchParams), form sewa, form unit, form apartemen, tipe kamar, amenity, facility, landmark, faq, settings.
6. `lib/actions/booking.ts` — Server Action `submitLead` memanggil RPC `submit_lead`, memetakan kode error (PRD §6.5), timeout 4 detik, tidak pernah melempar error ke UI (kembalikan `{ ok, code?, error? }`).

Kriteria selesai: test lulus (format, pricing, whatsapp, recommend, validasi filter); halaman uji sementara (hapus sebelum commit akhir) menampilkan data asli dari Supabase; build lulus.

---

## Fase 3 — Beranda dan hasil pencarian

Tugas:

1. Beranda (PRD §6.2): hero + kotak pencarian persis spesifikasi (segmented apartemen dinamis, dropdown tipe kamar bergantung apartemen dengan jumlah unit, budget pilihan cepat + slider, `<form method="get" action="/sewa">`), promo pilihan, pilih apartemen, terakhir kamu lihat, kenapa VIDALIDAY, FAQ, penutup.
2. Kartu unit (DESIGN.md §4.6) dengan galeri geser ringan.
3. `/sewa` (PRD §6.3): ringkasan + chip filter aktif, bar Filter/Urutkan + bottom sheet di mobile, sidebar di desktop, urutan, paginasi "Muat lebih banyak", empty state dengan saran, skeleton (`loading.tsx`).
4. Riwayat "Terakhir kamu lihat" (localStorage `vdl:recent`) — komponen klien.
5. Metadata halaman + JSON-LD beranda (LodgingBusiness, FAQPage).
6. Event analitik `search_submit`, `filter_apply`.

Kriteria selesai: semua kriteria terima PRD §6.2–6.3 terpenuhi; filter tercermin di URL dan tombol back berfungsi; Lighthouse mobile beranda Performance ≥ 90; tampilan dicek 390px & 1280px.

---

## Fase 4 — Detail unit, form sewa, halaman lain, SEO

Tugas:

1. `/unit/[slug]` (PRD §6.4) lengkap: galeri + lightbox + video tur, harga, fakta kunci, fasilitas berikon, deskripsi, info menginap, peta + landmark, fasilitas gedung, unit serupa, FAQ, CTA menempel mobile, kartu sewa menempel desktop, kondisi unit penuh, 404.
2. Form sewa (PRD §6.5): bottom sheet/modal, validasi, estimasi langsung, "Ingat data saya", honeypot, `submitLead`, bangun pesan dari template, alihkan ke `wa.me` (aturan tab mobile/desktop), konfirmasi setelah kembali.
3. Rekomendasi tahap 2 di klien (personalisasi + diversitas, PRD §6.6) + event `recommendation_click`.
4. `/apartemen/[slug]`, `/about` (dari setting `about_*`), `/kebijakan-privasi` (draf teks, tandai "perlu disetujui klien").
5. SEO: `generateMetadata` semua halaman, OG image default (`next/og`) dan per unit, `sitemap.ts`, `robots.ts`, JSON-LD (Apartment + Offer, BreadcrumbList), halaman 404 yang mengarahkan.
6. Event `unit_view`, `gallery_open`, `booking_open`, `booking_submit`, `whatsapp_redirect`. Pasang Vercel Analytics & Speed Insights.

Kriteria selesai: alur lengkap beranda → hasil → detail → form → WhatsApp berjalan dengan data asli; permintaan tersimpan di tabel `leads` dengan kode; matikan jaringan ke Supabase (simulasi) → tetap diarahkan ke WA; Lighthouse mobile detail unit Performance ≥ 90, Accessibility ≥ 95.

---

## Fase 5 — Admin bagian 1

Tugas:

1. `/admin/login` (email + password), keluar, cek tabel `admins` (PRD §7.1). Helper `requireAdmin()` dipakai di layout panel dan di **setiap** Server Action.
2. Layout panel final (DESIGN.md §5): sidebar dengan badge jumlah permintaan baru, item aktif, drawer mobile, sidebar bisa diciutkan.
3. Dashboard (PRD §7.3).
4. Unit kamar (PRD §7.4): daftar dengan pencarian, filter, urutan, paginasi di URL; tabel desktop & kartu mobile; aksi per baris; ubah harga cepat; aksi massal; duplikat; hapus dengan dialog. Form tambah/edit lengkap: tipe kamar bergantung apartemen, harga + pratinjau, fasilitas berikon, pengunggah foto (kompres WebP di browser, unggah langsung ke `media/units/`, urutkan, sampul, hapus file lama), YouTube, status, bar aksi menempel, peringatan perubahan belum disimpan, revalidasi cache publik.
5. Apartemen & tipe kamar (PRD §7.5) termasuk ambil koordinat dari link Google Maps dan larangan hapus bila masih dipakai.
6. Fasilitas kamar (PRD §7.6) dengan pemilih ikon.

Kriteria selesai: user bukan admin tidak bisa membaca/menulis apa pun lewat UI maupun Server Action; ubah harga di admin langsung terlihat di situs publik; tambah apartemen baru + tipe kamar → muncul di tab hero dan filter; foto terunggah sebagai WebP; tampilan admin dicek 390px & 1280px.

---

## Fase 6 — Admin bagian 2

Tugas:

1. Fasilitas gedung, Landmark (dengan pilihan ikon kategori), FAQ — filter per apartemen, pencarian, urutan, switch aktif (PRD §7.7).
2. Permintaan sewa (PRD §7.8): daftar, pencarian, filter, ubah status langsung, catatan admin, tombol chat WA ke tamu, ekspor CSV.
3. Halaman About dan Pengaturan (PRD §7.9) termasuk editor template WA dengan daftar placeholder dan pratinjau pesan langsung.
4. Pola umum admin (PRD §7.10) diterapkan konsisten di semua halaman.

Kriteria selesai: semua halaman admin di PRD §5.2 berfungsi; setiap perubahan konten langsung tercermin di situs publik; ekspor CSV terbuka benar di Excel/Google Sheets (UTF-8 BOM).

---

## Fase 7 — QA dan siap rilis

Tugas:

1. Uji manual alur utama di lebar 360, 390, 768, 1280px; perbaiki yang rusak.
2. Lighthouse mobile untuk beranda, `/sewa`, detail unit: target PRD §2. Perbaiki LCP/CLS bila perlu.
3. Cek aksesibilitas DESIGN.md §8 (keyboard, fokus, label, kontras, reduced motion).
4. Cek keamanan: tidak ada secret di bundle klien (`grep` hasil build), semua Server Action admin memanggil `requireAdmin()`, anon tidak bisa membaca `leads` (uji dengan publishable key).
5. Pastikan tidak ada emoji di seluruh `web/src`.
6. Tulis `web/README.md` (cara menjalankan, env, deploy) dan lengkapi checklist go-live di PROGRESS.md (rujuk SETUP.md §6–7).

Kriteria selesai: semua checklist PROGRESS.md fase 0–7 tercentang; build produksi lulus; daftar "Yang perlu dilakukan pemilik sebelum go-live" jelas.
