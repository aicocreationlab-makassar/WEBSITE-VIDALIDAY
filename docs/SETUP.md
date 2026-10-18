# SETUP — Langkah manual pemilik proyek

Bagian ini dikerjakan **kamu** (bukan Claude Code), karena menyangkut akun, kunci, dan domain. Langkah 1–4 dikerjakan sebelum Fase 1 di `PROMPT.md`. Langkah 5–8 menjelang go-live.

---

## 1. Susun folder kerja

```
vidaliday/                       ← folder kerja kamu (buka Claude Code di sini)
├── CLAUDE.md
├── PROMPT.md
├── README.md
├── .gitignore
├── docs/                        ← dari paket ini
├── supabase/migrations/         ← dari paket ini
├── legacy-laravel/              ← isi zip repo GitHub lama (ganti nama foldernya)
└── tools/
    └── vidaliday-migrasi-supabase/   ← paket migrasi data (dipakai lagi saat go-live)
```

1. Salin semua isi paket ini ke folder kerja.
2. Pindahkan folder hasil extract zip repo GitHub ke dalam folder kerja dan **ganti namanya** jadi `legacy-laravel`.
3. Pindahkan folder paket migrasi data ke `tools/vidaliday-migrasi-supabase` (opsional, tapi nanti dipakai lagi di langkah 7).
4. Folder `web/` belum ada; Claude Code membuatnya di Fase 1.

> `.gitignore` di paket ini sengaja mengecualikan `legacy-laravel/` dari Git, karena seeder lamanya berisi password admin. Jangan ubah bagian itu.

---

## 2. Prasyarat

| Kebutuhan | Catatan |
|---|---|
| Node.js 20.9 atau lebih baru | cek `node -v` (disarankan versi 22 LTS) |
| Git + akun GitHub | repo **private** |
| Claude Code | dijalankan di folder kerja |
| Supabase | project yang sudah berisi data hasil migrasi |
| Vercel | plan **Pro** (situs bisnis tidak boleh di plan Hobby) |
| Akses DNS domain vidaliday.com | panel registrar atau cPanel hosting lama |

Untuk produksi, Supabase sebaiknya di plan **Pro** (plan Free di-pause setelah seminggu tidak aktif dan storage-nya 1 GB).

---

## 3. Supabase

### 3.1 Jalankan migrasi fitur v2 (sekali)

1. Buka Supabase Dashboard → **SQL Editor** → New query.
2. Tempel seluruh isi `supabase/migrations/20261015000200_fitur_v2.sql` → **Run**.
3. Hasil terakhir menampilkan JSON dari `backfill_v2()`, misalnya `{"units_mapped_to_room_type": 45, "amenity_links_created": 300, "units_without_room_type": 0}`. Pastikan `units_without_room_type` = 0.

File `20261015000100_schema_awal.sql` **tidak perlu** dijalankan lagi (sudah dijalankan saat migrasi data). Kalau tidak sengaja menjalankannya, jalankan ulang file 0002.

Cek cepat di Table Editor:

- `room_types` berisi tipe kamar Vida View (Studio, Studio Plus, 2 Bedroom, 2 Bedroom Corner, 3 Bedroom) dan Delft CPI (Studio, Studio Corner, 2 Bedroom / Corner, 3 Bedroom). Tipe tambahan muncul kalau data lama punya tipe lain.
- `units` punya kolom `room_type_id`, `tower`, `floor_number`, `view_type` terisi (tower/lantai/view adalah tebakan dari deskripsi lama; dicek lagi nanti di admin).
- `amenities` berisi fasilitas kamar dengan ikon.

### 3.2 Pengaturan Auth

Di pengaturan **Authentication**:

1. **URL Configuration** → Site URL: `https://vidaliday.com`. Redirect URLs: `http://localhost:3000/**`, `https://vidaliday.com/**`, dan pola domain preview Vercel kamu (misalnya `https://*-namatim.vercel.app/**`).
2. Matikan **Allow new users to sign up** (supaya tidak ada orang yang bisa membuat akun sendiri).

### 3.3 Buat akun admin

1. **Authentication → Users → Add user** → email + password baru (centang auto confirm).
2. Di SQL Editor, jadikan admin:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'email-admin@contoh.com';
   ```

3. Ulangi untuk setiap admin.

### 3.4 Ambil kunci

Di **Project Settings → API Keys / Data API**:

| Nilai | Dipakai di |
|---|---|
| Project URL | `.env.local` dan Vercel |
| Publishable key (`sb_publishable_…`, di project lama bernama `anon`) | `.env.local` dan Vercel |
| Project ref (bagian depan URL, `https://<ref>.supabase.co`) | perintah `supabase gen types` |
| Secret key (`sb_secret_…`) | **hanya** untuk paket migrasi data di `tools/`. Jangan dipasang di aplikasi atau Vercel. |

---

## 4. Variabel lingkungan

Setelah Fase 1 membuat folder `web/`, buat file `web/.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

Hanya tiga itu yang wajib. Nomor WhatsApp, template pesan, dan teks lain diambil dari tabel `settings` (bisa diubah di admin).

Variabel opsional (isi di Vercel → Settings → Environment Variables, lalu redeploy):

| Variabel | Fungsi |
|---|---|
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Verifikasi Google Search Console lewat tag HTML. Isi hanya nilai `content` dari tag yang diberikan Google (bukan seluruh tag). Tidak perlu kalau memakai properti *Domain* (verifikasi DNS). |
| `INDEXNOW_KEY` | Mengaktifkan IndexNow: setiap admin menyimpan perubahan, URL yang berubah dilaporkan ke Bing/Yandex. Isi dengan 32 karakter acak (huruf dan angka); kunci dilayani di `/indexnow.txt`. |

Untuk generate tipe TypeScript (diminta Claude Code di Fase 1–2):

```bash
cd web
npx supabase login
npx supabase gen types typescript --project-id <ref> > src/types/database.ts
```

---

## 5. GitHub dan Vercel

1. Buat repo **private** di GitHub, push folder kerja (pastikan `legacy-laravel/` dan file `.env*` tidak ikut — sudah diatur `.gitignore`).
2. Vercel → **Add New Project** → import repo.
3. **Root Directory:** `web`. Framework: Next.js (terdeteksi otomatis).
4. **Environment Variables** (Production dan Preview):

   | Nama | Production | Preview |
   |---|---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://vidaliday.com` | URL preview Vercel |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL | sama |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key | sama |

5. **Functions → Region:** Singapore (`sin1`), supaya dekat dengan database Supabase (pilih region Supabase Singapore juga).
6. Deploy. Uji di domain `*.vercel.app` dulu sampai semua beres.

---

## 6. Domain vidaliday.com

Lakukan **setelah** langkah 7 bagian A–C.

1. Sehari sebelumnya, turunkan TTL record `@` dan `www` ke 300 detik di panel DNS sekarang.
2. **Catat nilai record lama** (A record `@`, record `www`) untuk rollback.
3. Vercel → project → **Settings → Domains** → tambah `vidaliday.com` dan `www.vidaliday.com`; atur `www` dialihkan ke `vidaliday.com`.
4. Vercel menampilkan record DNS yang harus dipasang (biasanya A record untuk `@` dan CNAME untuk `www`). Ganti record `@` dan `www` di panel DNS sekarang dengan **nilai yang ditampilkan Vercel**.
5. **Jangan ubah** record MX, TXT (SPF/DKIM), atau record email lain, supaya email `@vidaliday.com` tetap jalan.
6. Tunggu status domain di Vercel menjadi valid; sertifikat SSL dibuat otomatis.

> Kalau DNS domain saat ini dikelola oleh hosting lama (nameserver hosting), **jangan batalkan hosting** sebelum memindahkan pengelolaan DNS ke registrar, Vercel, atau Cloudflare (dan menyalin semua record, termasuk email). Kalau hosting diputus duluan, DNS ikut hilang.

---

## 7. Checklist go-live

**A. Sebelum pindah**

- [ ] Semua checklist Fase 0–7 di `docs/PROGRESS.md` selesai.
- [ ] Situs di domain `*.vercel.app` sudah dicek di HP (alur cari → detail → form → WhatsApp).
- [ ] Akun admin baru bisa masuk; user non-admin tidak bisa.
- [ ] Nomor WhatsApp, template pesan, jam layanan, teks kebijakan privasi sudah disetujui klien.

**B. Bekukan dan migrasi final**

- [ ] Minta klien berhenti mengedit di admin lama, dan belum mengedit di admin baru.
- [ ] Export ulang database dari phpMyAdmin hosting lama (format SQL; tabel locations, units, facilities, landmarks, faqs, settings; tanpa users) ke folder `export/`, plus foto baru dari `storage/app/public/{units,facilities,settings}`.
- [ ] `cd web` lalu `node scripts/convert-mysql-dump.mjs --perbarui ../export/<file>.sql`, kemudian jalankan `export/impor_data_lama.sql` di SQL Editor (sudah termasuk `sync_id_sequences()` dan `backfill_v2()`). Unggah foto baru ke bucket `media` dengan nama folder yang sama.
- [ ] `node --env-file=.env.local scripts/make-backfill-v3.mjs`, tinjau `supabase/data-fixes/pratinjau_backfill_v3.sql`, lalu jalankan `supabase/data-fixes/backfill_v3.sql` di SQL Editor.
- [ ] Admin → Pengaturan → **Segarkan data situs** (atau redeploy di Vercel). Data yang diubah langsung di database (paket migrasi, SQL Editor, Table Editor) tidak menyegarkan cache situs sendiri.
- [ ] Cek jumlah unit dan beberapa foto di situs Vercel.

**C. Pembersihan data di admin baru**

- [ ] Cek tower, lantai, view setiap unit (hasil tebakan otomatis).
- [ ] Perbaiki data janggal (PRD §8), isi harga mingguan/bulanan kalau ada, isi link Google Maps tiap apartemen.

**D. Pindah domain** — langkah 6.

**E. Setelah pindah**

- [ ] Uji `https://vidaliday.com` dan `https://www.vidaliday.com` (harus dialihkan).
- [ ] Kirim satu permintaan sewa uji, pastikan muncul di Admin → Permintaan sewa, lalu ubah statusnya jadi Batal.
- [ ] Jalankan langkah SEO di bagian 9 (Search Console, sitemap, Google Business Profile).
- [ ] Biarkan hosting lama hidup 2–4 minggu sebagai cadangan, lalu matikan (perhatikan catatan DNS di langkah 6).
- [ ] Matikan akun admin lama Laravel dan ganti password yang pernah bocor di repo.

---

## 8. Rollback

Kalau ada masalah serius setelah pindah domain: kembalikan record `@` dan `www` ke nilai lama yang dicatat di langkah 6.2. Dengan TTL 300 detik, situs lama aktif lagi dalam beberapa menit. Data yang masuk di situs baru tetap aman di Supabase.

---

## 9. SEO dan AI (langkah pemilik, urut)

Situs sudah menyiapkan sendiri: `sitemap.xml` (dengan gambar), `robots.txt` (perayap AI diizinkan), data terstruktur JSON-LD (Organization, WebSite, LodgingBusiness, ApartmentComplex, Apartment, Offer, AggregateOffer, ItemList, BreadcrumbList, FAQPage), halaman landing per apartemen × tipe kamar (`/apartemen/vida-view/studio` dst.), kotak "Ringkasan" dan kalimat ringkasan teks polos untuk AI Overview, `llms.txt` + `llms-full.txt`, canonical/noindex di `/sewa`, dan IndexNow (opsional). Yang perlu dilakukan di luar kode:

1. **Google Search Console** (https://search.google.com/search-console): tambah properti *Domain* `vidaliday.com` → verifikasi lewat record DNS TXT di registrar (nilai diberikan Google). Alternatif: properti *URL prefix* `https://vidaliday.com` + metode "Tag HTML": salin nilai `content` ke env `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` di Vercel, redeploy, lalu klik Verify. Setelah terverifikasi: menu *Sitemaps* → kirim `https://vidaliday.com/sitemap.xml`. Lalu *URL Inspection* → "Request indexing" untuk `/`, `/sewa`, `/apartemen/vida-view`, `/apartemen/delft-cpi`, dan tiap landing tipe (tautan ada di footer). Pantau tab *Pages* (halaman "Excluded by noindex" dan "Alternate page with proper canonical tag" hanya boleh berasal dari `/sewa?...` berfilter) dan *Core Web Vitals*.
2. **Admin → Pengaturan**: SEO → judul `Sewa Apartemen Harian di Makassar | VIDALIDAY` (bawaan baru) dan deskripsi ≤ 155 karakter yang menyebut Vida View dan Delft CPI; "Media sosial dan Google" → isi tautan Instagram, Facebook, TikTok, dan Google Business Profile (dipakai `sameAs`); Kontak → jam layanan sesuai kenyataan (mis. `10.00–23.00 WITA`); Apartemen → pastikan alamat, koordinat (Delft: `-5.144628657051978, 119.39411188027171`), dan link Google Maps berbentuk `/maps/place/...` (bukan link embed).
3. **Google Business Profile** (https://business.google.com): satu profil "VIDALIDAY" dengan kategori utama *Apartment rental agency* (tambahan: *Serviced accommodation*, *Holiday apartment rental*), nama persis "VIDALIDAY", nomor WhatsApp yang sama dengan situs, jam layanan yang sama, situs `https://vidaliday.com`, tombol "Booking/Appointment" ke `https://vidaliday.com/sewa`, minimal 10 foto gedung dan unit. Posting ringan tiap minggu (promo, unit baru) dan balas setiap ulasan. Profil per gedung hanya kalau ada alamat layanan fisik yang bisa diverifikasi di tiap gedung.
4. **Ulasan**: setelah tamu check-out, kirim tautan ulasan Google Business Profile lewat WhatsApp. Target 10 ulasan pertama dalam 30 hari; jangan membeli ulasan.
5. **Bing Webmaster Tools** (https://www.bing.com/webmasters): "Import from Google Search Console", lalu kirim sitemap yang sama. Ini yang mengisi Copilot dan pencarian ChatGPT. Kalau `INDEXNOW_KEY` dipasang, cek tab IndexNow.
6. **Sitasi dan tautan**: profil OTA (Airbnb, Traveloka, Tiket.com, Booking.com) dan media sosial menautkan ke `https://vidaliday.com` dengan nama brand yang sama persis; bio Instagram/TikTok ke `/sewa`. Hindari spam di grup komunitas.
7. **Konten lanjutan (bulan ke-2+)**: satu halaman panduan tiap 2–4 minggu dari data nyata, mis. "sewa apartemen harian Makassar: apa yang perlu disiapkan", "Vida View atau Delft CPI untuk keluarga", "tempat makan dekat Panakkukang". Minta Claude Code membuatkannya sebagai halaman statis.
8. **Pantau tiap bulan**: PageSpeed Insights mobile (target ≥ 90), Search Console (query "sewa apartemen makassar", "sewa apartemen harian makassar", "vida view", "delft cpi"), Rich Results Test untuk `/`, `/apartemen/vida-view`, satu landing, satu unit (https://search.google.com/test/rich-results), dan buka `https://vidaliday.com/llms.txt` untuk memastikan datanya terbaru.
