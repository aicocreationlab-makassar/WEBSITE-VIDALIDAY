# PRD — VIDALIDAY v2

| | |
|---|---|
| Versi | 1.0 — 15 Oktober 2026 |
| Domain | https://vidaliday.com |
| Stack | Next.js 16 (App Router), Supabase (Postgres, Auth, Storage), Vercel |
| Dokumen terkait | `DESIGN.md` (tampilan), `SETUP.md` (setup manual), `../CLAUDE.md` (aturan kerja agen), `../PROMPT.md` (urutan pengerjaan) |

Dokumen ini adalah sumber kebenaran untuk **apa** yang dibangun. Kalau ada konflik: PRD menang untuk fitur, DESIGN.md menang untuk tampilan.

---

## 1. Ringkasan

VIDALIDAY adalah layanan sewa apartemen harian, mingguan, dan bulanan di Makassar (Vida View dan Delft CPI) di bawah PT Perdana Mega Trans. Situs lama (Laravel) berupa satu halaman katalog panjang dengan admin CMS. Data lama **sudah dimigrasi ke Supabase**.

Versi 2 dibangun ulang dengan alur seperti aplikasi booking (pola jendela360, Traveloka, tiket.com, Agoda):

**cari → pilih unit → lihat detail → isi form sewa → kirim ke WhatsApp admin**

---

## 2. Tujuan dan ukuran keberhasilan

1. Tamu menemukan unit yang cocok dalam kurang dari 1 menit, lalu menghubungi admin dengan data lengkap.
2. Admin mengelola 45+ unit dengan cepat: cari, filter, ubah harga, ganti foto.
3. Apartemen dan tipe kamar baru bisa ditambah dari admin tanpa mengubah kode.
4. Situs cepat dan mudah ditemukan di Google.

| Metrik | Target |
|---|---|
| Konversi halaman detail → form sewa terkirim | ≥ 8% (diukur lewat event) |
| Lighthouse mobile: Performance / Accessibility / SEO | ≥ 90 / ≥ 95 / ≥ 95 |
| LCP mobile (4G) | < 2,5 detik |
| Waktu admin mengubah harga promo satu unit | < 30 detik |
| Permintaan sewa yang tercatat di admin | 100% yang berhasil disimpan |

**Di luar cakupan v2:** pembayaran online, kalender ketersediaan real-time, akun tamu, multi-bahasa, ulasan tamu, aplikasi mobile (lihat §13).

---

## 3. Pengguna

**Tamu** — mayoritas membuka dari HP, datang dari Instagram, WhatsApp, atau Google. Keperluan: liburan, kerja, staycation, tinggal sementara. Ingin cepat tahu: harga, lokasi, foto, kapasitas, cara pesan.

**Admin** — staf PT Perdana Mega Trans. Mengubah harga/promo, menambah unit dan foto, membalas permintaan sewa lewat WhatsApp. Sering bekerja dari HP juga.

---

## 4. Prinsip produk

1. **Kesan pertama on point.** Hero langsung menjawab: sewa apartemen di mana, mulai berapa, bagaimana caranya.
2. **Satu tujuan per layar, satu tombol utama.** "Cari unit" di beranda, "Sewa sekarang" di detail.
3. **Sedikit tapi lengkap.** Info sekunder dilipat (accordion, "Lihat semua"), bukan dihapus.
4. **Mobile dulu.** Teks besar, harga mencolok, tombol minimal 48px, CTA sewa selalu terjangkau jempol.
5. **Pola booking app yang sudah dikenal.** Ambil pola UX-nya, bukan menyalin desain situs lain.
6. **Identitas VIDALIDAY tetap.** Merah + slate, Plus Jakarta Sans, logo bulat (lihat DESIGN.md).
7. **Ikon garis, tanpa emoji.** Berlaku di UI, data seed, dan teks default.
8. **Semua dinamis.** Harga, apartemen, tipe kamar, teks penting, nomor WA, template pesan diubah dari admin.
9. **WhatsApp tidak boleh terhalang.** Penyimpanan data boleh gagal; pengalihan ke WA tetap jalan.

---

## 5. Peta situs dan alur

### 5.1 Halaman publik

| Rute | Halaman | Catatan |
|---|---|---|
| `/` | Beranda | Hero + kotak pencarian |
| `/sewa` | Hasil pencarian + filter | Semua state di query URL |
| `/unit/[slug]` | Detail unit | Form sewa (modal / bottom sheet) |
| `/apartemen/[slug]` | Profil gedung | Fasilitas, landmark, peta, tipe kamar |
| `/about` | Tentang kami | Path lama dipertahankan |
| `/kebijakan-privasi` | Kebijakan privasi | Wajib, karena form mengumpulkan data pribadi |

### 5.2 Halaman admin

| Rute | Halaman |
|---|---|
| `/admin/login` | Masuk |
| `/admin` | Dashboard |
| `/admin/units`, `/admin/units/new`, `/admin/units/[id]` | Unit kamar |
| `/admin/leads` | Permintaan sewa |
| `/admin/locations`, `/admin/locations/[id]` | Apartemen & tipe kamar |
| `/admin/amenities` | Fasilitas kamar |
| `/admin/facilities` | Fasilitas gedung |
| `/admin/landmarks` | Landmark |
| `/admin/faqs` | FAQ |
| `/admin/about` | Halaman About |
| `/admin/settings` | Pengaturan |

### 5.3 Alur utama

```
Beranda ──(apartemen, tipe kamar, budget)──▶ /sewa?lokasi=vida-view&tipe=studio&max=300000
   │                                              │  filter, urutkan
   │                                              ▼
   └──(kartu promo / apartemen)───────────▶ /unit/studio-at-26x
                                                  │  "Sewa sekarang"
                                                  ▼
                                   Form sewa (bottom sheet / modal)
                                                  │  "Kirim via WhatsApp"
                                                  ▼
                 simpan permintaan (submit_lead) ──▶ buka wa.me admin dengan pesan terisi
```

### 5.4 Query `/sewa`

| Param | Isi | Contoh |
|---|---|---|
| `lokasi` | slug apartemen | `vida-view` |
| `tipe` | slug tipe kamar (berlaku bersama `lokasi`) | `2-bedroom-corner` |
| `kategori` | `studio` / `1br` / `2br` / `3br` (lintas apartemen) | `2br` |
| `min`, `max` | harga per malam (Rupiah) | `300000` |
| `tamu` | kapasitas minimal | `4` |
| `fasilitas` | id amenities, dipisah koma | `1,5` |
| `penuh` | `1` = tampilkan unit penuh | `1` |
| `urut` | `rekomendasi`, `termurah`, `termahal`, `diskon`, `terbaru` | `termurah` |
| `hal` | halaman | `2` |

Param yang tidak valid diabaikan tanpa error.

---

## 6. Kebutuhan halaman publik

### 6.1 Elemen global

- **Header mobile (56–64px):** logo kiri (logo bulat + wordmark). Kanan: satu tombol ikon WhatsApp (pesan umum ke admin) dan tombol menu (sheet: Cari unit, daftar apartemen aktif, Tentang kami, FAQ).
- **Header desktop:** logo, tautan (Cari unit, Apartemen ▾ yang terbuka saat disorot mouse, Tentang kami), satu tombol "Tanya admin" (outline, ikon WA + teks). Hanya satu tombol WhatsApp di header.
- **Tidak ada** tautan "Portal Admin" di situs publik.
- **Pengumuman** (opsional, setting `promo_banner_text`): satu baris tipis di atas header, statis (bukan teks berjalan), bisa ditutup (diingat di sessionStorage). Tidak tampil kalau kosong.
- **Footer:** logo, satu kalimat deskripsi, badan hukum, kontak (WA, jam layanan), tautan (apartemen, about, kebijakan privasi), hak cipta.
- **Gelembung chat (menggantikan tombol WA mengambang):** tombol 56px kanan bawah di semua halaman publik, termasuk detail unit (naik di atas bar CTA mobile) dan kebijakan privasi; tidak di admin. Membuka bot chat "Asisten VIDALIDAY" (§6.11). Tombol WhatsApp ke admin tetap ada di header dan di dalam panel chat.

### 6.2 Beranda `/`

Urutan blok (maksimal 6 setelah hero):

1. **Hero + kotak pencarian** (spesifikasi di bawah).
2. **Promo pilihan** — carousel kartu unit `is_featured` (maks 8). Kalau kurang dari 4, lengkapi dengan unit diskon terbesar.
3. **Pilih apartemen** — kartu per apartemen aktif: foto, nama, area, jumlah unit tersedia, "Mulai RpX/malam", tombol "Lihat unit" → `/sewa?lokasi=...`.
4. **Terakhir kamu lihat** — hanya kalau ada riwayat di perangkat (§6.6).
5. **Kenapa VIDALIDAY** — tiga poin berikon: resmi dan berbadan hukum, unit bersih siap huni, pesan cepat via WhatsApp. Satu kalimat per poin.
6. **FAQ** — 5 pertanyaan teratas (accordion) + "Lihat semua pertanyaan" (expand di tempat).
7. **Penutup** — "Masih bingung pilih unit? Tanya admin." + tombol WhatsApp.

Tidak ditaruh di beranda: daftar 45 unit, daftar landmark panjang, seluruh fasilitas gedung (pindah ke `/apartemen/[slug]` dan detail unit).

#### Kotak pencarian hero (fitur utama)

Mengikuti pola referensi `docs/referensi/hero-search-referensi.png`.

**Mobile:** foto gedung penuh lebar (setting `hero_image`), judul (`hero_title`) dan subjudul (`hero_subtitle`) di atas foto, kartu putih menimpa bagian bawah foto.

**Isi kartu:**

1. **Apartemen** — segmented control berisi apartemen aktif (label = `short_name`, urut `sort_order`), contoh: `Vida View | Delft CPI`. Default: apartemen pertama. Kalau apartemen aktif lebih dari 3, berubah jadi dropdown "Pilih apartemen" dengan opsi "Semua apartemen".
2. **Tipe kamar** — dropdown yang isinya bergantung pada apartemen terpilih: tipe kamar aktif apartemen itu (urut `sort_order`). Tiap opsi menampilkan jumlah unit tersedia, misalnya "Studio (9 unit)". Tipe tanpa unit tetap tampil tapi nonaktif dengan teks "belum tersedia". Opsi pertama "Semua tipe". Ganti apartemen → tipe kembali ke "Semua tipe".
   - Data awal (bisa diubah admin): **Vida View** — Studio, Studio Plus, 2 Bedroom, 2 Bedroom Corner, 3 Bedroom. **Delft CPI** — Studio, Studio Corner, 2 Bedroom / Corner, 3 Bedroom.
3. **Budget per malam** — pilihan cepat: Semua harga, di bawah Rp300rb, Rp300rb–500rb, Rp500rb–1jt, di atas Rp1jt; plus "Atur sendiri" (slider dua titik, langkah Rp50.000, batas dari harga unit terendah dan tertinggi yang tampil). Label field menampilkan pilihan aktif, misalnya "Rp300rb – Rp500rb".
4. **Tombol "Cari unit"** (primary, lebar penuh) → `/sewa` dengan query.

Di bawah kartu: satu baris kecil "Dikelola resmi oleh PT Perdana Mega Trans".

**Desktop:** foto hero lebar, judul rata kiri, kotak pencarian satu baris: tab apartemen di atas, lalu `[Tipe kamar] [Budget per malam] [Cari unit]`.

**Tidak ada input tanggal di hero** (belum ada kalender ketersediaan). Tanggal diminta di form sewa.

**Kriteria terima:**
- Pilih Delft CPI → dropdown tipe hanya berisi tipe Delft.
- Klik "Cari unit" tanpa memilih apa pun → `/sewa?lokasi=<apartemen default>`.
- Form memakai `<form method="get" action="/sewa">` sehingga tetap jalan sebelum JavaScript termuat.
- Bisa dioperasikan penuh dengan keyboard; label terbaca screen reader.

### 6.3 Hasil pencarian `/sewa`

- **Ringkasan atas:** "24 unit di Vida View" + chip filter aktif (masing-masing bisa dihapus) + "Hapus semua".
- **Mobile:** bar menempel di bawah header berisi `[Filter (n)]` dan `[Urutkan]`. "Filter" membuka bottom sheet penuh: Apartemen, Tipe kamar, Budget per malam (pilihan cepat + slider), Jumlah tamu (stepper 1–10+), Fasilitas kamar (chip berikon, multi-pilih), "Tampilkan unit penuh" (switch). Tombol bawah: "Tampilkan 12 unit" (angka diperbarui langsung) dan "Reset".
- **Desktop:** filter di sidebar kiri yang menempel, hasil grid 3 kolom (2 kolom di tablet).
- **Urutkan:** Rekomendasi (default: unggulan → paling diminati 30 hari → harga terendah), Harga terendah, Harga tertinggi, Diskon terbesar, Terbaru.
- **Kartu unit:** spesifikasi di DESIGN.md §4.6. Seluruh kartu adalah tautan ke detail (satu aksi per kartu).
- **Unit penuh** (`is_available = false`) disembunyikan secara default; kalau ditampilkan, berada di urutan bawah dengan label "Penuh".
- **Paginasi:** 12 per halaman, tombol "Muat lebih banyak" (menambah di bawah, `hal` di URL ikut diperbarui). Halaman pertama dirender di server.
- **Empty state:** "Belum ada unit yang cocok. Coba ubah tipe kamar atau naikkan budget." + tombol "Hapus semua filter" + 3 unit terdekat (longgarkan filter harga dulu, lalu tipe).
- Filter harga memakai kolom `effective_price`.

**Kriteria terima:** semua kombinasi filter tercermin di URL dan bisa dibagikan; tombol back browser mengembalikan filter sebelumnya; ada skeleton saat memuat.

### 6.4 Detail unit `/unit/[slug]`

Urutan blok di mobile:

1. **Galeri** — geser penuh lebar rasio 4:3, penanda "1/8", tombol "Video tur" kalau ada URL YouTube. Ketuk → lightbox layar penuh. Desktop: grid 1 foto besar + 4 kecil + "Lihat semua foto".
2. **Breadcrumb** (desktop): Beranda / Vida View / Studio AT 26X.
3. **Judul** — nama unit. Di bawahnya: ikon pin + "Vida View, Tower Ashton lt. 26" + tautan "Lihat peta" (gulir ke peta).
4. **Harga** — harga per malam besar, harga coret + badge "Hemat 7%". Kalau ada: harga per minggu dan per bulan. Catatan kecil: "Harga final dikonfirmasi admin."
5. **Fakta kunci** — chip berikon dua kolom: Tipe kamar, Kapasitas maks., Lantai, Tower, View, Luas. Yang kosong tidak ditampilkan.
6. **Fasilitas kamar** — grid ikon + label dari `unit_amenities`. Tampil maks 8, sisanya "Lihat semua (12)".
7. **Deskripsi** — maks 4 baris + "Selengkapnya".
8. **Info menginap** — check-in mulai `checkin_time`, check-out paling lambat `checkout_time`, syarat (`checkin_requirements`), dan accordion "Peraturan menginap" (`house_rules`, satu poin per baris).
9. **Lokasi** — peta Google Maps (iframe lazy, tinggi 240px di mobile), alamat, tombol "Buka di Google Maps", 5 landmark terdekat (ikon + nama + waktu tempuh) + "Lihat semua".
10. **Fasilitas gedung** — carousel kecil foto fasilitas gedung apartemen tersebut.
11. **Unit serupa** — carousel 6 kartu (§6.6).
12. **Pertanyaan umum** — 3–5 FAQ.

**CTA menempel (mobile):** muncul setelah galeri lewat dan tetap di bawah layar. Kiri: harga per malam + harga coret. Kanan: tombol "Sewa sekarang" (lebar ≥ 50%, tinggi 52px). Memperhitungkan safe area iPhone.

**Desktop:** kolom kanan berisi kartu sewa yang menempel: harga, input check-in/check-out dan jumlah tamu, tombol "Sewa sekarang" (membuka form dengan data terisi).

**Unit penuh:** tombol menjadi "Tanya ketersediaan" (tetap membuka form; pesan WA menyebut unit sedang penuh). Blok "Unit serupa" dipindah tepat di bawah harga.

**Peta:** pakai `latitude,longitude` apartemen kalau ada; kalau tidak, cari dengan teks `nama apartemen + alamat`. Embed tanpa API key: `https://www.google.com/maps?q=<query>&z=16&output=embed`. Tombol luar: `gmaps_url` apartemen, atau `https://www.google.com/maps/search/?api=1&query=<query>`.

**SEO:** title `{nama unit} — {tipe kamar} di {apartemen} | VIDALIDAY`; description dari harga dan fasilitas utama; OG image = foto utama; JSON-LD `Apartment` + `Offer` (IDR) + `BreadcrumbList`. Slug tidak ada atau unit draft → 404.

### 6.5 Form sewa

Dibuka dari "Sewa sekarang". Mobile: bottom sheet tinggi penuh. Desktop: modal. Judul: **"Atur rencana menginap"**. Di atas form: ringkasan unit (thumbnail, nama, apartemen, harga per malam).

| Field | Wajib | Aturan |
|---|---|---|
| Nama lengkap | ya | 2–100 karakter |
| Kota asal | ya | 2–60 karakter, teks bebas (mis. Makassar); ikut di pesan WhatsApp (`{kota}`), tampil di admin dan CSV |
| Nomor WhatsApp | ya | `type="tel"`, terima `08…`, `62…`, `+62…` dengan spasi/strip; disimpan sebagai `628…`; valid jika cocok `^628\d{7,11}$` |
| Check-in | ya | ≥ hari ini (zona Asia/Makassar), ≤ 365 hari ke depan |
| Check-out | ya | > check-in; tampilkan "2 malam" otomatis |
| Jumlah tamu | ya | stepper 1 sampai kapasitas unit. Melebihi → peringatan + tautan ke unit serupa yang lebih besar |
| Keperluan | tidak | chip: Liburan, Kerja/Bisnis, Staycation, Tinggal sementara, Lainnya |
| Catatan | tidak | ≤ 500 karakter, placeholder "Contoh: minta early check-in" |
| Ingat data saya | tidak | checkbox; simpan nama, kota asal, dan nomor di localStorage perangkat ini |

- **Estimasi langsung** di atas tombol: "Estimasi Rp560.000 untuk 2 malam", dengan catatan "Harga final dikonfirmasi admin via WhatsApp."
- **Tombol utama:** "Kirim via WhatsApp" (ikon WA, lebar penuh). Di bawahnya: "Pesanmu akan terbuka di WhatsApp, tinggal tekan kirim." dan "Data dipakai untuk memproses reservasi. Kebijakan privasi".
- **Honeypot:** field tersembunyi; kalau terisi, lewati penyimpanan.

**Saat dikirim:**

1. Validasi di klien (zod), pesan error per field.
2. Server Action `submitLead` memanggil RPC `submit_lead` (timeout 4 detik) → dapat `code`.
3. Bangun pesan dari setting `booking_whatsapp_template`. Placeholder: `{unit} {apartemen} {lokasi_unit} {harga} {nama} {whatsapp} {checkin} {checkout} {malam} {tamu} {keperluan} {catatan} {estimasi} {kode} {link}`. Baris yang placeholder-nya kosong dihapus.
4. Arahkan ke `https://wa.me/{whatsapp_number}?text={encodeURIComponent(pesan)}`. Mobile: tab yang sama. Desktop: buka tab baru secara sinkron saat klik, isi URL-nya setelah action selesai (supaya tidak diblok popup blocker).
5. Simpan gagal (jaringan, rate limit, apa pun) → tetap lanjut ke WA tanpa kode. Jangan pernah menghalangi tamu.
6. Kembali ke situs → tampilkan "Permintaan terkirim ke WhatsApp. Admin membalas di jam layanan {office_hours}."

**Pemetaan error RPC:**

| Kode | Pesan |
|---|---|
| `INVALID_PHONE` | "Nomor WhatsApp belum benar. Contoh: 0812 3456 7890." |
| `INVALID_NAME` | "Tulis nama lengkap minimal 2 huruf." |
| `INVALID_DATES` | "Tanggal check-out harus setelah check-in, dan check-in tidak boleh lewat." |
| `INVALID_GUESTS` | "Jumlah tamu 1 sampai 30 orang." |
| `UNIT_NOT_FOUND` | "Unit ini sudah tidak tersedia. Coba unit serupa di bawah." |
| `TOO_MANY_REQUESTS` | tidak ditampilkan; langsung lanjut ke WA |

**Rumus estimasi** (sama persis di DB `submit_lead` dan `lib/pricing.ts`):

- malam ≥ 30 dan ada harga bulanan → `round(bulanan × malam / 30)`
- malam ≥ 7 dan ada harga mingguan → `round(mingguan × malam / 7)`
- selain itu → `harga efektif per malam × malam`

**Contoh pesan (template default):**

```
Halo Admin VIDALIDAY, saya mau sewa unit ini:

Unit: Studio AT 26X
Apartemen: Vida View
Lokasi unit: Tower Ashton lt. 26
Harga: Rp280.000/malam

Nama: Budi Santoso
Kota asal: Jakarta
No. WhatsApp: 0812-3456-7890
Check-in: Sab, 18 Okt 2026
Check-out: Sen, 20 Okt 2026 (2 malam)
Jumlah tamu: 2 orang
Keperluan: Liburan

Estimasi: Rp560.000
Kode permintaan: VDL-5A1EAE
https://vidaliday.com/unit/studio-at-26x
```

### 6.6 Rekomendasi "Unit serupa" dan "Terakhir kamu lihat"

Tujuan: menampilkan unit yang paling mungkin cocok, dan makin relevan mengikuti perilaku pengunjung — tanpa akun dan tanpa mengirim riwayat pribadi ke server.

**Tahap 1 — skor konten (server, `lib/recommend.ts`).** Untuk unit yang sedang dilihat `u` dan setiap kandidat `c` (published, tersedia, `c ≠ u`):

| Sinyal | Bobot |
|---|---|
| Apartemen sama | +25 |
| Tipe kamar sama | +25 |
| Kategori sama tapi tipe beda (mis. Studio dan Studio Corner) | +15 |
| Kedekatan harga | +20 × max(0, 1 − \|p_c − p_u\| / p_u) |
| Kedekatan kapasitas | +10 × max(0, 1 − \|g_c − g_u\| / max(g_u, 1)) |
| Kemiripan fasilitas (Jaccard) | +10 × J(fasilitas_c, fasilitas_u) |
| View sama | +5 |
| Tower sama | +3 |
| Popularitas 30 hari (`unit_popularity`) | +5 × lead_c / max(lead) |
| Unggulan | +2 |

Ambil 12 teratas dan kirim ke klien.

**Tahap 2 — personalisasi di perangkat (client component).**

- Riwayat dilihat disimpan di localStorage `vdl:recent` (maks 12 entri: id, slug, location_id, category, effective_price, viewed_at). Tidak pernah dikirim ke server.
- Profil dari riwayat: apartemen tersering, kategori tersering, median harga.
- Bonus: apartemen sama dengan profil +6, kategori sama dengan profil +6, harga dalam ±25% median +4, unit yang sudah pernah dilihat −4 (supaya ada variasi).
- Urutkan ulang, tampilkan 6. Maks 3 unit dengan tipe kamar yang sama persis.
- Kandidat kurang dari 3 → lengkapi dengan unit unggulan apartemen yang sama, lalu yang termurah.

**Tempat tampil:** detail unit ("Unit serupa"), beranda dan `/sewa` ("Terakhir kamu lihat", maks 6, dengan tombol "Hapus riwayat").

**Evaluasi:** event `recommendation_click` (posisi, unit asal, unit tujuan) untuk menyetel bobot nanti.

### 6.7 Profil apartemen `/apartemen/[slug]`

Foto gedung, nama, area, deskripsi singkat; daftar tipe kamar (kartu: nama, kapasitas, mulai harga, jumlah unit → `/sewa?lokasi=...&tipe=...`); fasilitas gedung (grid foto + ikon); lokasi (peta + seluruh landmark aktif); FAQ; CTA "Lihat semua unit di {apartemen}". Title: `Sewa Apartemen {nama} Makassar Harian & Bulanan | VIDALIDAY`.

### 6.8 Tentang kami dan kebijakan privasi

- **`/about`:** konten dari setting `about_*` dan `about_reasons` (JSON) seperti versi lama, tanpa emoji, layout lebih ringkas.
- **`/kebijakan-privasi`:** data yang dikumpulkan (nama, nomor WA, tanggal, jumlah tamu, catatan), tujuannya (memproses reservasi), lama penyimpanan (usulan 12 bulan), cara minta dihapus (hubungi admin). Mengacu UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi. Teks final perlu disetujui klien.

### 6.9 SEO dan berbagi

- Domain kanonik `https://vidaliday.com`; `www` dialihkan (308) ke apex.
- `generateMetadata` di semua halaman; default dari setting `seo_title` dan `seo_description`.
- OG image default (foto hero + logo, dibuat dengan `next/og`) dan per unit (foto utama).
- `sitemap.xml` (beranda, `/sewa`, `/apartemen/*`, `/unit/*` yang published, `/about`, `/kebijakan-privasi`) dan `robots.txt` (blok `/admin`).
- JSON-LD: `LodgingBusiness` (beranda), `Apartment` + `Offer` (detail), `FAQPage` (beranda, apartemen), `BreadcrumbList`.
- `lang="id"`, format angka dan tanggal `id-ID`.

### 6.10 Analitik

Vercel Web Analytics + Speed Insights. Event: `search_submit`, `filter_apply`, `unit_view`, `gallery_open`, `booking_open`, `booking_submit` (dengan kode permintaan), `whatsapp_redirect`, `recommendation_click`, `chat_open`, `chat_question` (hanya jenis pertanyaan), `chat_unit_click`, `chat_handoff`. Event tidak boleh berisi nama, nomor telepon, atau teks pertanyaan chat.

### 6.11 Bot chat "Asisten VIDALIDAY"

Bot percakapan berbasis aturan (tanpa API/LLM) yang menjawab dari data situs yang sama dengan halaman publik.

- **Data:** `GET /chat-data` (JSON ringkas: unit published, apartemen aktif + tipe, fasilitas, landmark, FAQ, pengaturan kontak/check-in/peraturan), di-cache dengan tag yang sama dengan halaman, kedaluwarsa saat admin menyimpan; tidak diindeks (`robots.txt` dan `X-Robots-Tag`). Diambil sekali per tab saat panel dibuka.
- **Mesin (di browser):** normalisasi slang/singkatan chat Indonesia, toleransi typo (Damerau-Levenshtein per panjang kata), pengenalan apartemen (alias + nama), tipe/kategori, kode unit, budget (300rb/0,5jt/300.000), jumlah tamu, lama menginap, fasilitas, landmark, FAQ; satu maksud per giliran dengan memori slot (apartemen, tipe, unit, budget, tamu, malam) untuk pertanyaan lanjutan ("yang di Delft?").
- **Jawaban:** harga mulai + hitungan tersedia/penuh (hitungan sama dengan `/sewa` lewat `matchesRow`), kartu unit (maks 3, tautan ke halaman unit, "Lihat semua N unit" ke `/sewa` dengan filter), tipe per apartemen, detail unit, kapasitas, harga mingguan/bulanan, estimasi N malam (rumus `estimateTotal`), promo, fasilitas kamar/gedung, landmark, alamat + Google Maps, jam check-in + syarat, peraturan, kontak, cara pesan, FAQ. Bahasa Indonesia, sapaan "kamu", tanpa emoji, tanpa mengarang angka.
- **Batas:** tidak pernah mengonfirmasi tanggal (status "tersedia" mengikuti data situs; menyebut tanggal → arahan konfirmasi ke admin). Tidak paham → "belum paham" + tombol WhatsApp admin berisi pertanyaan tamu (`Halo Admin VIDALIDAY, saya mau tanya: …`).
- **UI:** mobile bottom sheet 92dvh, desktop kartu 380×600 non-modal; gelembung tamu kanan (brand), bot kiri (abu); indikator "mengetik" tiga titik (statis bila reduced motion); chip balasan cepat; tombol Mulai ulang; Esc menutup dan fokus kembali ke tombol. Riwayat di `sessionStorage` perangkat (maks 30 pesan, 24 jam), tidak pernah dikirim ke server.

---

## 7. Kebutuhan admin `/admin`

### 7.1 Akses dan keamanan

- Masuk dengan email + password (Supabase Auth) di `/admin/login`. Pendaftaran publik dimatikan di Supabase.
- Hanya user yang ada di tabel `admins` yang boleh masuk. User lain → sesi diakhiri + pesan "Akun ini tidak punya akses admin."
- Proteksi berlapis: `proxy.ts` (alihkan ke login), cek ulang di layout server admin, cek di **setiap** Server Action (proxy tidak melindungi Server Action), RLS sebagai lapis terakhir.
- Sesi lewat cookie (`@supabase/ssr`). Tombol keluar di sidebar dan topbar.
- Lupa password lewat email reset Supabase: prioritas P1.

### 7.2 Layout (mirip admin lama)

- Sidebar kiri putih, lebar 256px: logo bulat + "VIDALIDAY." + tagline merah "Apartment By Us".
- Menu: Dashboard, Unit kamar, Permintaan sewa (badge jumlah "baru"), Apartemen & tipe kamar, Fasilitas kamar, Fasilitas gedung, Landmark, FAQ, Halaman About, Pengaturan.
- Item aktif: latar merah muda, teks merah, border tipis. Item lain: abu, hover abu muda.
- Topbar 64px: judul halaman, tombol "Lihat situs", menu akun (Keluar).
- Mobile: sidebar jadi drawer + overlay. Desktop: sidebar bisa diciutkan (diingat di localStorage).

### 7.3 Dashboard

Kartu angka: Permintaan baru (hari ini / 7 hari), Unit tampil, Unit penuh, Unit promo aktif. Lima permintaan terbaru (klik → `/admin/leads`). Lima unit paling diminati 30 hari. Aksi cepat: "Tambah unit", "Lihat permintaan baru".

### 7.4 Unit kamar

**Daftar unit:**

- Pencarian teks (nama, slug, tower), debounce 300ms.
- Filter: Apartemen, Tipe kamar (bergantung apartemen), Tampil/Draft, Tersedia/Penuh, Promo aktif/tidak, Unggulan.
- Urutkan: Terakhir diubah, Nama A–Z, Harga terendah, Harga tertinggi.
- Semua state di query URL (bisa di-bookmark) + "Reset filter".
- Desktop: tabel (foto kecil, unit + tower/lantai, apartemen, tipe, kapasitas, harga per malam promo + coret, badge status, waktu diubah, aksi). Mobile: daftar kartu.
- Aksi per baris: Edit, Duplikat (salinan jadi draft dengan nama "… (salinan)"), Tandai penuh/tersedia, Jadikan unggulan, Hapus.
- Dialog hapus: judul "Hapus unit Studio AT 26X?", isi "Foto ikut terhapus dan tidak bisa dikembalikan.", tombol "Hapus unit" / "Batal".
- **Ubah harga cepat:** klik harga → popover (harga normal, harga promo, switch promo aktif) → "Simpan harga".
- **Aksi massal** (centang beberapa): tandai tersedia/penuh, aktifkan/matikan promo, tampilkan/sembunyikan.
- Paginasi 20 per halaman dengan total.

**Form tambah/edit unit** (dibagi kartu):

1. **Info dasar** — Apartemen*, Tipe kamar* (bergantung apartemen; kapasitas default ikut terisi dari tipe), Nama unit*, Slug (otomatis dari nama + apartemen, bisa diedit, unik), Tower, Lantai, View, Luas m² (opsional), Kapasitas maks. tamu* (1–30).
2. **Harga** — Harga normal per malam*, Harga promo per malam, switch "Promo aktif", Label promo (opsional, maks 24 karakter; kosong = otomatis "Hemat X%", disimpan di kolom `promo_badge`), Harga per minggu (opsional), Harga per bulan (opsional). Validasi: promo < normal saat promo aktif. Pratinjau: "Tamu melihat: Rp280.000/malam, coret Rp300.000, Hemat 7%".
3. **Fasilitas kamar** — chip multi-pilih berikon dari tabel `amenities` + tautan "Kelola fasilitas".
4. **Foto & video** — unggah banyak (drag & drop / pilih file). Kompres di browser jadi WebP (sisi terpanjang 2000px, kualitas 0,8), unggah langsung ke Storage `media/units/{uuid}.webp`, progres per file, urutkan dengan drag, foto pertama = sampul, hapus foto. Maks 15 foto, maks 10 MB per file sebelum kompres. File HEIC ditolak dengan pesan cara mengubahnya ke JPG. URL YouTube divalidasi dan ditampilkan pratinjaunya.
5. **Deskripsi** — textarea dengan penghitung karakter (saran 150–400).
6. **Status** — Tampil di website (`is_published`), Tersedia (`is_available`), Unggulan (`is_featured`).

- Bar aksi menempel di bawah: "Simpan perubahan" (primary), "Batal", "Lihat di situs" (kalau published).
- Peringatan kalau meninggalkan halaman dengan perubahan yang belum disimpan.
- Setelah simpan: toast "Perubahan disimpan" + revalidasi halaman publik terkait.
- Foto yang dihapus/diganti ikut dihapus dari Storage (hanya path di bucket; URL eksternal diabaikan).
- Kompatibilitas: kolom lama `room_type` diisi nama tipe kamar, `facilities_list` diisi array nama fasilitas.

### 7.5 Apartemen & tipe kamar (baru)

- **Daftar apartemen** (kartu): foto, nama, jumlah unit, status aktif, urutan (naik/turun).
- **Form apartemen:** Nama*, Nama singkat* (label tab di hero, maks 16 karakter), Slug*, Area, Alamat, Link Google Maps (ditempel → koordinat diambil otomatis kalau ada pola `@lat,lng` atau `q=lat,lng`), Latitude, Longitude, Tagline, Deskripsi, Foto utama (`media/locations/...`), Urutan, Aktif.
- **Tipe kamar** (di halaman apartemen): tabel inline — nama, kategori (Studio / 1BR / 2BR / 3BR / Lainnya), kapasitas default, urutan, aktif. Tambah, ubah, nonaktifkan. Tidak bisa dihapus selama dipakai unit (tampilkan jumlah unit, tawarkan "Nonaktifkan").
- Apartemen tidak bisa dihapus selama masih punya unit (DB juga menolak).
- Apartemen baru yang aktif dan punya unit otomatis muncul di tab hero, filter, menu, dan sitemap.

### 7.6 Fasilitas kamar

Tambah/ubah/hapus: nama, ikon (pemilih ikon dari daftar kurasi di `lib/icons.tsx`, dengan pencarian), urutan, aktif. Tampilkan jumlah unit yang memakai.

### 7.7 Fasilitas gedung, landmark, FAQ

Seperti versi lama, ditambah: filter per apartemen, pencarian, urutan (drag atau naik/turun), switch aktif. Landmark punya pilihan ikon kategori (kolom `icon`): belanja, kuliner, rumah sakit, kampus, wisata, transportasi, hiburan, ibadah.

### 7.8 Permintaan sewa (leads)

- Pencarian (nama, nomor, kode). Filter: status (Baru / Dihubungi / Deal / Batal), apartemen, rentang tanggal masuk, rentang check-in.
- Kolom: waktu masuk, kode, nama, WhatsApp, unit, check-in → check-out (malam), tamu, estimasi, status (ubah langsung), catatan admin.
- Tombol "Chat di WhatsApp" → `wa.me/{nomor tamu}` dengan sapaan pembuka.
- Ekspor CSV sesuai filter.
- Badge jumlah "baru" di sidebar.

### 7.9 Halaman About dan pengaturan

Pengaturan dikelompokkan:

| Grup | Setting |
|---|---|
| Kontak | `whatsapp_number`, `contact_phone`, `contact_email`, `office_hours` |
| Beranda | `hero_title`, `hero_subtitle`, `hero_image`, `promo_banner_text` |
| Pemesanan | `booking_whatsapp_template` (daftar placeholder + pratinjau langsung), `checkin_time`, `checkout_time`, `checkin_requirements`, `house_rules` |
| Brand | `site_logo`, `company_legal_name` |
| SEO | `seo_title`, `seo_description` |

Halaman About: seperti versi lama (`about_*`, `about_reasons`).

### 7.10 Pola umum admin

Toast sukses/gagal, dialog konfirmasi dengan label tindakan spesifik, skeleton tabel, empty state yang mengarahkan ("Belum ada unit di Delft CPI. Tambah unit pertama." + tombol), validasi zod di klien dan server, revalidasi cache publik setelah setiap perubahan.

---

## 8. Data dan backend

Skema ada di `supabase/migrations/`:

- `20261015000100_schema_awal.sql` — tabel 1:1 dari Laravel (sudah dijalankan saat migrasi data).
- `20261015000200_fitur_v2.sql` — fitur v2 (dijalankan manual sekali di SQL Editor, lihat SETUP.md).

| Tabel | Isi | Baru di v2 |
|---|---|---|
| `locations` | apartemen | `short_name`, `area`, `latitude`, `longitude`, `sort_order`, `is_active` |
| `room_types` | tipe kamar per apartemen | tabel baru |
| `units` | unit | `room_type_id`, `tower`, `floor_number`, `view_type`, `size_sqm`, `weekly_price`, `monthly_price`, `is_published`, `sort_order`, `effective_price` (generated) |
| `amenities`, `unit_amenities` | fasilitas kamar + relasi | tabel baru |
| `facilities` | fasilitas gedung | — |
| `landmarks` | landmark sekitar | `icon` |
| `faqs` | FAQ | — |
| `settings` | key-value | key baru: lihat §7.9 |
| `leads` | permintaan sewa | tabel baru (publik tidak bisa membaca) |
| `admins` | user admin | — |

**Fungsi:** `submit_lead(...)` dan `unit_popularity(days)` bisa dipanggil publik. `sync_id_sequences()` dan `backfill_v2()` hanya service role / SQL Editor.

**Storage:** bucket publik `media` dengan folder `units/`, `facilities/`, `settings/`, `locations/`. Database menyimpan path relatif (`units/abc.webp`); URL dibentuk di `lib/media.ts`. Nilai yang sudah berupa URL penuh dipakai apa adanya.

**Kolom lama** (`room_type`, `facilities_list`, `rental_period`) tetap ada untuk kompatibilitas. Sumber kebenaran baru: `room_type_id`, `unit_amenities`, `weekly_price` / `monthly_price`. `promo_badge` dipakai sebagai label promo kustom.

**Akses data:**

- Publik membaca dengan publishable key **tanpa cookie** supaya bisa di-cache.
- Admin memakai sesi cookie user.
- Secret key **tidak dipakai** aplikasi sama sekali.
- Tipe TypeScript dihasilkan dari DB → `web/src/types/database.ts`.

**Pembersihan data (tugas admin setelah rilis):** cek tower/lantai/view hasil tebakan otomatis di semua unit; perbaiki data janggal (contoh: "2BR CORNER BV 19V" kapasitas 1 tamu, "Studio AT 17S" deskripsinya Tower Brensville, "STUDIO 1633" tertulis lantai 10); isi harga mingguan/bulanan kalau ada.

---

## 9. Kebutuhan non-fungsional

| Area | Kebutuhan |
|---|---|
| Performa | Halaman publik di-cache dan di-invalidasi dari admin; JS klien minimal (Server Components default); gambar lewat `next/image` dengan `sizes` yang tepat; iframe peta dan YouTube lazy; font self-host via `next/font`. |
| Aksesibilitas | WCAG 2.1 AA: kontras ≥ 4,5:1, target sentuh ≥ 44px, fokus terlihat, dialog dengan focus trap, label di semua input, `prefers-reduced-motion` dihormati. |
| Keamanan | RLS di semua tabel; validasi zod di server; cek admin di tiap Server Action; rate limit permintaan sewa di DB; honeypot; header keamanan (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY` untuk `/admin`); secret tidak pernah di klien. |
| Keandalan | Pengalihan WA tidak bergantung pada DB; error boundary per halaman; halaman 404/500 yang mengarahkan. |
| Kompatibilitas | Chrome/Safari/Firefox/Edge dua versi terakhir; iOS 16+; Android 10+. Lebar 360–1440px. |
| Lokal | Bahasa Indonesia; zona waktu Asia/Makassar (WITA); `Rp280.000`; tanggal "Sab, 18 Okt 2026"; jam "14.00 WITA". |

---

## 10. Copy dan istilah

Gaya: kalimat biasa (bukan huruf kapital semua), sapaan "kamu", singkat, tombol diawali kata kerja.

| Pakai | Jangan |
|---|---|
| unit | kamar / room (kecuali "tipe kamar") |
| apartemen | properti / gedung (di UI tamu) |
| per malam | /night, permalam |
| Sewa sekarang | Booking, Pesan Kamar Ini |
| Kirim via WhatsApp | Submit, Lanjutkan |
| Permintaan sewa (admin) | lead, inquiry |
| Penuh | Sold out, tidak available |

| Elemen | Copy |
|---|---|
| Judul hero (default) | Sewa apartemen harian di Makassar |
| Subjudul hero (default) | Unit resmi di Vida View dan Delft CPI. Bisa harian, mingguan, atau bulanan. |
| Tombol hero | Cari unit |
| Empty state hasil | Belum ada unit yang cocok. Coba ubah tipe kamar atau naikkan budget. |
| Judul form sewa | Atur rencana menginap |
| Sukses kirim | Permintaan terkirim ke WhatsApp. Admin membalas di jam layanan. |
| Simpan admin | Perubahan disimpan |

---

## 11. Rencana rilis

Urutan fase dan kriteria selesai ada di `PROMPT.md`; progres dicatat di `docs/PROGRESS.md`.

| Fase | Isi |
|---|---|
| 0 | Orientasi: baca dokumen, audit gaya situs lama |
| 1 | Fondasi Next.js, token desain, klien Supabase, layout |
| 2 | Lapisan data v2 dan cache |
| 3 | Beranda + hasil pencarian |
| 4 | Detail unit, form sewa, rekomendasi, apartemen, about, privasi, SEO |
| 5 | Admin: auth, layout, dashboard, unit, apartemen & tipe kamar, fasilitas kamar |
| 6 | Admin: fasilitas gedung, landmark, FAQ, permintaan sewa, about, pengaturan |
| 7 | QA, performa, aksesibilitas, siap go-live |

**Definition of Done (setiap fase):** `npm run lint`, `npm run typecheck`, `npm run build` lulus; tampilan dicek di lebar 390px dan 1280px; tidak ada emoji; tidak ada secret di kode klien; `docs/PROGRESS.md` diperbarui.

---

## 12. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Data lama tidak konsisten | Backfill otomatis + tugas pengecekan admin (§8) |
| Spam form sewa | Validasi + rate limit di DB, honeypot |
| Biaya plan (Vercel Pro, Supabase Pro) | Sudah diinformasikan ke klien sebelum go-live |
| Iframe peta memperlambat halaman | Lazy load, tinggi tetap, tombol buka di Google Maps |
| Data berubah di situs lama sebelum DNS pindah | Freeze admin lama + migrasi final (SETUP.md §7) |

---

## 13. Setelah v2

- Kalender ketersediaan dan blokir tanggal
- DP/pembayaran online
- Ulasan tamu
- Versi bahasa Inggris
- Sinkron iCal dengan Airbnb/Traveloka
- Simpan unit favorit
- Landing page promo musiman

---

## 14. Pertanyaan terbuka untuk klien

1. Tipe Delft "2 Bedroom / Corner": tetap satu tipe atau dipisah jadi "2 Bedroom" dan "2 Bedroom Corner"?
2. Apakah ada harga mingguan/bulanan per unit?
3. Koordinat atau link Google Maps persis tiap gedung.
4. Teks final kebijakan privasi dan peraturan menginap.
5. Jam layanan yang benar (data lama: 08.00–23.00, situs live: 10.00–23.00 WITA).
