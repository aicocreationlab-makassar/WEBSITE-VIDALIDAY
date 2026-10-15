# DESIGN — VIDALIDAY v2

Tampilan situs publik dan admin. Fitur ada di `PRD.md`.

---

## 1. Arah desain

**Pola aplikasi booking, wajah VIDALIDAY.**

- **Struktur dan alur** meniru pola aplikasi sewa/booking (jendela360, Traveloka, Agoda): hero dengan kotak pencarian, hasil berbentuk kartu, detail dengan CTA yang menempel di bawah layar.
- **Identitas visual** diambil dari situs lama: merah VIDALIDAY untuk aksi, slate untuk teks dan garis, Plus Jakarta Sans, logo bulat dengan wordmark "VIDALIDAY." dan tagline "Apartment By Us".
- **Satu elemen yang diingat:** foto asli gedung (laut di Delft CPI, skyline di Vida View) dengan kotak pencarian putih yang tegas di atasnya. Bagian lain tenang: putih, slate, satu warna aksen.
- **Merah hanya untuk aksi dan diskon.** Harga ditulis gelap (ink) dan besar, bukan merah.

**Aturan referensi:** `docs/referensi/hero-search-referensi.png` adalah tangkapan layar jendela360.com, dipakai **hanya** sebagai acuan pola (posisi kotak pencarian, urutan field, ukuran tombol). Jangan menyalin logo, foto, ilustrasi, teks, warna biru, atau detail visual khas mereka.

---

## 2. Sumber gaya di situs lama (`legacy-laravel/`)

| File | Ambil apa |
|---|---|
| `resources/css/app.css` | `.glass-card` (kartu), `.glass-input` (input + fokus merah), `.glass-nav` (header blur), `.glass-badge`, warna seleksi teks, scrollbar |
| `tailwind.config.js` | shadow, font family. Warna `brand.blue` **sudah tidak dipakai** (tema berubah ke merah) |
| `resources/views/layouts/app.blade.php` | markup logo (logo bulat 48px + "VIDALIDAY" + titik merah + "Apartment By Us"), struktur header & footer |
| `resources/views/partials/unit-card.blade.php` | isi kartu unit (badge, harga coret, fasilitas) |
| `resources/views/admin/layout.blade.php` | sidebar 256px, item aktif merah muda, topbar 64–80px, drawer mobile + overlay, sidebar bisa diciutkan |
| `resources/views/admin/units/*.blade.php` | field form unit |
| `public/images/logo_vidaliday.png` | logo default (salin ke `web/public/images/`) |

Yang **tidak** dibawa: emoji (ikon ombak, gedung, pin, bintang di situs lama), label huruf kapital semua ("TARIF SEWA", "FASILITAS KAMAR:"), teks berjalan, font Cinzel/Playfair/Great Vibes (dimuat tapi tidak terpakai), satu halaman super panjang.

---

## 3. Token

### 3.1 Warna — `web/src/app/globals.css` (Tailwind v4)

```css
@theme {
  /* Brand: merah VIDALIDAY (dari situs lama: red-50…red-700) */
  --color-brand-50:  #fef2f2;
  --color-brand-100: #fee2e2;
  --color-brand-200: #fecaca;  /* border badge, seleksi teks */
  --color-brand-500: #ef4444;  /* ring fokus */
  --color-brand-600: #dc2626;  /* tombol utama, aksi */
  --color-brand-700: #b91c1c;  /* hover, teks badge */
  --color-brand-800: #991b1b;

  /* Netral: slate */
  --color-ink:     #0f172a;    /* teks utama, harga */
  --color-ink-2:   #334155;    /* teks sekunder kuat */
  --color-muted:   #64748b;    /* teks pendukung (min. untuk teks) */
  --color-subtle:  #94a3b8;    /* ikon nonaktif, BUKAN untuk teks */
  --color-line:    #e2e8f0;    /* border */
  --color-surface: #f8fafc;    /* latar section */
  --color-surface-2: #f1f5f9;  /* hover, latar input nonaktif */

  /* Status */
  --color-success: #059669;    /* "Tersedia" */
  --color-warning: #d97706;    /* peringatan kapasitas */
  --color-danger:  #b91c1c;    /* error: selalu dengan ikon + teks */

  /* Gelap untuk overlay foto & footer (dari situs lama: slate-950 → rose-950) */
  --color-night: #020617;
  --color-night-rose: #4c0519;
}
```

| Pemakaian | Token |
|---|---|
| Tombol utama, link aksi, ring fokus | `brand-600` / hover `brand-700` / ring `brand-500` 3px 12% |
| Badge diskon ("Hemat 7%") | bg `brand-50`, border `brand-200`, teks `brand-700` |
| Harga | `ink`, tebal 800 |
| Harga coret | `muted`, garis coret |
| Teks pendukung | `muted` (jangan `subtle` untuk teks, kontrasnya kurang) |
| Badge "Tersedia" / "Penuh" | `success` / `muted` |
| Tombol WhatsApp | tetap merah brand (seperti situs lama) dengan ikon WA putih; hijau WA tidak dipakai sebagai warna tombol |

Kontras yang sudah dicek: putih di atas `brand-600` 4,8:1; `brand-600` di atas putih 4,8:1; `muted` di atas putih 4,8:1. Semua lolos AA untuk teks normal.

### 3.2 Tipografi

Satu keluarga: **Plus Jakarta Sans** via `next/font/google` (weight 400, 500, 600, 700, 800), variabel `--font-jakarta`, `--font-sans: var(--font-jakarta), ui-sans-serif, system-ui, sans-serif`.

| Peran | Mobile | Desktop | Weight |
|---|---|---|---|
| Judul hero | 30/36 | 48/56 | 800, tracking −0,02em |
| Judul halaman (H1) | 26/32 | 36/44 | 800 |
| Judul section (H2) | 22/28 | 28/36 | 700 |
| Judul kartu / unit di kartu | 18/26 | 18/26 | 700 |
| Body | 16/26 | 16/26 | 400 |
| Kecil | 14/20 | 14/20 | 500 |
| Keterangan | 13/18 | 13/18 | 500 (tidak pernah di bawah 12px) |
| Harga besar (detail) | 28/34 | 32/40 | 800, `tabular-nums` |
| Harga kartu | 20/28 | 20/28 | 800, `tabular-nums` |

Kalimat biasa di semua label dan tombol. Satu-satunya huruf kapital semua: tagline logo "Apartment By Us". Panjang baris teks maks ±70 karakter.

### 3.3 Radius, bayangan, spasi, gerak

| Token | Nilai | Untuk |
|---|---|---|
| `--radius-control` | 12px | input, tombol, select |
| `--radius-card` | 16px | kartu unit, kartu admin |
| `--radius-sheet` | 24px | kotak pencarian hero, bottom sheet (sudut atas), modal |
| pill | 9999px | chip, badge |
| `--shadow-card` | `0 1px 4px 0 rgb(30 41 59 / .06), 0 4px 16px -4px rgb(30 41 59 / .05)` | kartu (dari `.glass-card`) |
| `--shadow-card-hover` | `0 8px 24px -8px rgb(220 38 38 / .16)` | hover kartu desktop (dari `.glass-card-hover`) |
| `--shadow-raised` | `0 16px 40px -16px rgb(15 23 42 / .35)` | kotak pencarian hero |
| `--shadow-sticky` | `0 -6px 24px rgb(15 23 42 / .08)` | bar CTA bawah |

- Spasi basis 4px. Padding halaman 16px (mobile), 24px (tablet), 32px (desktop). Container maks 1200px.
- Jarak antar section: 40px mobile, 72px desktop.
- Gerak: 150–250ms ease-out, hanya sebagai respons aksi (buka sheet, accordion, hover kartu desktop, geser galeri). Tanpa animasi masuk per section. Hormati `prefers-reduced-motion`.

---

## 4. Komponen publik

### 4.1 Header

```
Mobile 390px
┌──────────────────────────────────────────┐
│ (logo) VIDALIDAY.            [WA]  [≡]    │  56–64px, putih 92% + blur, garis bawah
│        Apartment By Us                    │
└──────────────────────────────────────────┘
```

Desktop: logo, lalu tautan Cari unit, Apartemen ▾, Tentang kami, dan tombol [Tanya admin] (outline, ikon WA). Menempel saat scroll.

### 4.2 Hero + kotak pencarian

```
Mobile 390px
┌──────────────────────────────────────────┐
│  [ foto gedung asli, tinggi ±340px ]      │
│  overlay gradien gelap dari bawah         │
│                                           │
│  Sewa apartemen harian                    │  judul hero, putih
│  di Makassar                              │
│  Unit resmi di Vida View dan Delft CPI.   │  subjudul, putih 90%
│ ┌──────────────────────────────────────┐  │
│ │ ┌─────────────┬──────────────┐       │  │  segmented control apartemen
│ │ │ Vida View ● │  Delft CPI   │       │  │  (aktif: bg brand-600, teks putih)
│ │ └─────────────┴──────────────┘       │  │
│ │ ┌──────────────────────────────────┐ │  │
│ │ │ [bed] Tipe kamar                 │ │  │  label kecil di atas nilai
│ │ │       Semua tipe              ⌄  │ │  │  tinggi 56px
│ │ └──────────────────────────────────┘ │  │
│ │ ┌──────────────────────────────────┐ │  │
│ │ │ [wallet] Budget per malam        │ │  │
│ │ │       Semua harga             ⌄  │ │  │
│ │ └──────────────────────────────────┘ │  │
│ │ ┌──────────────────────────────────┐ │  │
│ │ │        [search] Cari unit        │ │  │  primary, 52px
│ │ └──────────────────────────────────┘ │  │
│ └──────────────────────────────────────┘  │  kartu putih, radius 24, shadow-raised
│   [shield-check] Dikelola resmi oleh       │
│   PT Perdana Mega Trans                    │
└──────────────────────────────────────────┘
```

```
Desktop 1280px
┌──────────────────────────────────────────────────────────────────────┐
│ [ foto gedung lebar, tinggi ±520px ]                                  │
│   Sewa apartemen harian di Makassar                                   │
│   Unit resmi di Vida View dan Delft CPI…                              │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │ ( Vida View ● )( Delft CPI )                                  │   │
│   │ [Tipe kamar ⌄]        [Budget per malam ⌄]      [ Cari unit ] │   │
│   └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

- Di mobile, dropdown tipe kamar dan budget terbuka sebagai bottom sheet (opsi besar, 52px per baris). Di desktop sebagai popover.
- Opsi tipe kamar: nama + jumlah unit di kanan ("9 unit"); tipe tanpa unit abu-abu dengan "belum tersedia".
- Budget: daftar pilihan cepat, lalu "Atur sendiri" (slider dua titik + dua input angka).

### 4.3 Segmented control apartemen

Kontainer `surface-2`, radius 12, padding 4. Segmen aktif: bg `brand-600`, teks putih, weight 700. Segmen lain: teks `ink-2`. Tinggi 44px. Role `radiogroup` + panah kiri/kanan untuk keyboard. Lebih dari 3 apartemen → ganti dropdown.

### 4.4 Tombol

| Varian | Tampilan | Untuk |
|---|---|---|
| Primary | bg `brand-600`, teks putih 700, hover `brand-700` | satu aksi utama per layar |
| Secondary | border `line` 1.5px, teks `ink`, hover `surface-2` | aksi pendamping |
| Ghost | tanpa border, teks `brand-700` | tautan aksi dalam konten |
| Icon | 44×44, radius 12 | WA di header, tutup sheet |

Ukuran: `md` 44px, `lg` 52px (CTA mobile). State: hover, active (sedikit lebih gelap), focus (ring `brand-500` 3px 12% + outline), disabled (opacity 50%), loading (spinner + teks tetap, tombol tidak bisa diklik ganda).

### 4.5 Input (dari `.glass-input`)

Putih, border 1.5px `line`, radius 12, tinggi 48px (mobile 52px untuk field form sewa), fokus border `brand-500` + ring 3px `rgb(239 68 68 / .12)`. Label di atas input (14px, 600, `ink-2`). Pesan error di bawah: ikon `circle-alert` + teks `danger` 13px. Placeholder `muted`.

### 4.6 Kartu unit

```
┌──────────────────────────────────┐
│ [foto 4:3, geser, titik 1–5]      │
│ ┌──────────┐                      │  badge kiri atas:
│ │Hemat 7%  │  ┌─────────┐         │  "Hemat X%" (brand-50/700) jika diskon ≥ 5%
│ └──────────┘  │Unggulan │         │  "Unggulan" (putih, ikon sparkles)
│               └─────────┘         │
├──────────────────────────────────┤
│ [map-pin] Vida View, Tower Ashton lt. 26   │  14px muted
│ Studio AT 26X                     │  18px 700 ink
│ [bed-double] Studio  [users] 3 tamu│  14px ink-2
│ [air-vent] AC  [wifi] WiFi  [tv] TV│  3 fasilitas utama, 13px muted
│                                   │
│ Rp280.000 /malam                  │  20px 800 ink + 14px muted
│ Rp300.000                         │  13px muted, coret
└──────────────────────────────────┘
```

Radius 16, `shadow-card`, hover desktop `shadow-card-hover` + naik 2px. Seluruh kartu satu tautan (bukan tombol di dalam tombol). Unit penuh: foto grayscale 60%, badge "Penuh" menggantikan badge diskon. Lebar kartu di carousel mobile 82% layar (kartu berikutnya terlihat sebagian).

### 4.7 Filter `/sewa`

```
Mobile
┌──────────────────────────────────────────┐
│ 24 unit di Vida View                      │
│ (Studio ×) (Rp300rb–500rb ×)  Hapus semua │  chip aktif
├──────────────────────────────────────────┤
│ [sliders] Filter (2)   │   [arrow-up-down] Urutkan │  bar menempel
└──────────────────────────────────────────┘
Bottom sheet filter: judul + tombol tutup; section berjarak 24px;
bawah menempel: [Reset]  [Tampilkan 12 unit]
```

Chip fasilitas: pill, ikon + teks, terpilih = border `brand-600` + bg `brand-50` + teks `brand-700`.

### 4.8 Detail unit

```
Mobile 390px
┌──────────────────────────────────────────┐
│ [ galeri 4:3, geser ]            1/8      │
│                         [play] Video tur  │
├──────────────────────────────────────────┤
│ Studio AT 26X                             │  H1 26/32
│ [map-pin] Vida View, Tower Ashton lt. 26  │
│           Lihat peta                      │
│                                           │
│ Rp280.000 /malam                          │  harga besar 28/34
│ Rp300.000  (Hemat 7%)                     │
│ Rp1.800.000 /minggu                       │  hanya jika ada
│ Rp6.500.000 /bulan                        │
│ Harga final dikonfirmasi admin.           │  13px muted
├──────────────────────────────────────────┤
│ ┌────────────────┐ ┌────────────────┐     │  fakta kunci
│ │[bed-double]    │ │[users]         │     │  ikon 24px brand-600
│ │Tipe kamar      │ │Kapasitas       │     │  label 13px muted
│ │Studio          │ │Maks. 3 tamu    │     │  nilai 16px 700
│ └────────────────┘ └────────────────┘     │
│ (Lantai 26) (Tower Ashton) (View kolam)   │
├──────────────────────────────────────────┤
│ Fasilitas kamar                           │  grid 2 kolom, ikon 20px
│ [air-vent] AC         [wifi] WiFi         │
│ [tv] Smart TV         [clapperboard] Netflix│
│ Lihat semua (9)                           │
├──────────────────────────────────────────┤
│ Info menginap, Lokasi (peta), Fasilitas   │
│ gedung, Unit serupa, FAQ                  │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ Rp280.000 /malam   ┌───────────────────┐  │  bar menempel, putih,
│ Rp300.000          │  Sewa sekarang    │  │  shadow-sticky, tinggi 72px
│                    └───────────────────┘  │  + safe-area-inset-bottom
└──────────────────────────────────────────┘
```

Desktop: kolom kiri (galeri grid + konten), kolom kanan 360px berisi kartu sewa menempel (harga, check-in, check-out, tamu, "Sewa sekarang").

### 4.9 Form sewa (bottom sheet / modal)

```
┌──────────────────────────────────────────┐
│ Atur rencana menginap               [x]   │
│ [thumb] Studio AT 26X                     │
│         Vida View, Rp280.000/malam        │
├──────────────────────────────────────────┤
│ Nama lengkap                              │
│ [                                     ]   │
│ Nomor WhatsApp                            │
│ [ 0812 3456 7890                      ]   │
│ Check-in            Check-out             │
│ [ Sab, 18 Okt ]     [ Sen, 20 Okt ]       │
│ 2 malam                                   │
│ Jumlah tamu              [ – ]  2  [ + ]  │
│ Keperluan (opsional)                      │
│ (Liburan) (Kerja/Bisnis) (Staycation) …   │
│ Catatan (opsional)                        │
│ [                                     ]   │
│ [ ] Ingat data saya di perangkat ini      │
├──────────────────────────────────────────┤
│ Estimasi Rp560.000 untuk 2 malam          │  aria-live="polite"
│ Harga final dikonfirmasi admin via WA.    │
│ ┌──────────────────────────────────────┐  │
│ │ [WA] Kirim via WhatsApp              │  │  primary 52px, menempel di bawah sheet
│ └──────────────────────────────────────┘  │
│ Pesanmu akan terbuka di WhatsApp,         │
│ tinggal tekan kirim. Kebijakan privasi    │
└──────────────────────────────────────────┘
```

Tanggal memakai input `type="date"` bawaan (kalender native di HP), ditampilkan dengan format Indonesia di ringkasan.

### 4.10 Lain-lain

- **Peta:** kartu radius 16, iframe tinggi 240 (mobile) / 320 (desktop), `loading="lazy"`, `title` deskriptif, tombol "Buka di Google Maps" di bawahnya.
- **Galeri lightbox:** latar `night` 95%, geser, tombol tutup 44px, penanda "3/8".
- **Accordion (FAQ, peraturan):** baris 56px, ikon `chevron-down` berputar, konten 16/26.
- **Empty state:** ikon 40px `subtle` dalam lingkaran `surface-2`, judul 18px 700, satu kalimat arahan, satu tombol.
- **Skeleton:** blok `surface-2` dengan shimmer halus (mati jika reduced motion).
- **Toast:** kanan bawah (desktop), atas (mobile), pakai `sonner`.

---

## 5. Komponen admin (layout mirip admin lama)

```
Desktop
┌───────────────┬──────────────────────────────────────────────────┐
│ (logo)        │ Unit kamar                    [Lihat situs] [akun] │ topbar 64px
│ VIDALIDAY.    ├──────────────────────────────────────────────────┤
│ APARTMENT BY US│ [search Cari nama unit, tower…]  [+ Tambah unit] │
│───────────────│ [Apartemen ⌄][Tipe ⌄][Status ⌄][Promo ⌄] Reset     │
│ Dashboard     │ ┌──────────────────────────────────────────────┐ │
│▌Unit kamar    │ │ □ Foto Unit        Apartemen Tipe  Harga  Status│ │
│ Permintaan (3)│ │ □ [img] Studio AT… Vida View Studio Rp280… ●   │ │
│ Apartemen     │ │ …                                              │ │
│ Fasilitas kmr │ └──────────────────────────────────────────────┘ │
│ Fasilitas gdg │ 1–20 dari 45                    ‹ 1 2 3 ›        │
│ Landmark      │                                                   │
│ FAQ           │                                                   │
│ About         │                                                   │
│ Pengaturan    │                                                   │
│ [Keluar]      │                                                   │
└───────────────┴──────────────────────────────────────────────────┘
```

| Bagian | Spesifikasi (dari admin lama) |
|---|---|
| Sidebar | 256px, putih, border kanan `line`. Header: logo bulat 40px + "VIDALIDAY" 800 + titik `brand-600` + tagline 10px `brand-600`. |
| Item menu | tinggi 44px, radius 12, ikon 20px. Aktif: bg `brand-50`, teks `brand-700` 700, border `brand-200`, ikon `brand-600`. Normal: teks slate-600, ikon `subtle`, hover `surface-2`. |
| Topbar | 64px, putih, border bawah, menempel. Judul halaman 18px 700. |
| Mobile | sidebar 288px (maks 85vw) sebagai drawer + overlay `ink` 30%; tombol menu di topbar. |
| Kartu konten | `.glass-card` (putih, border `line`, `shadow-card`), radius 16, padding 20–24. |
| Tabel | header menempel, baris 64px, hover `surface`, kolom aksi kanan (ikon `pencil`, `copy`, menu `ellipsis`). Mobile → daftar kartu. |
| Badge status | Tampil (success), Draft (muted), Penuh (muted, garis), Promo (brand-50/700), Unggulan (ikon `sparkles`). Status permintaan sewa: Baru (brand), Dihubungi (warning), Deal (success), Batal (muted). |
| Form | kartu per bagian dengan judul 16px 700 + deskripsi 14px muted; grid 2 kolom di desktop; bar aksi menempel di bawah. |
| Pengunggah foto | area drop putus-putus `line`, ikon `image-plus`; thumbnail 96px dalam grid, pegangan drag, badge "Sampul" di foto pertama, tombol hapus 32px, progres per file. |
| Pemilih ikon | popover dengan pencarian, grid ikon 40px, ikon terpilih ber-ring `brand-500`. |

---

## 6. Ikon

- Hanya `lucide-react`. **Tanpa emoji di mana pun** (UI, data seed, teks default, notifikasi).
- Registry `web/src/lib/icons.tsx`: memetakan nama kebab-case (disimpan di DB) → komponen lucide. Hanya ikon dalam daftar kurasi yang bisa dipilih admin; nama tidak dikenal → `check` (fasilitas) atau `map-pin` (landmark).
- Ukuran: 16px (inline kecil), 20px (list, menu), 24px (fakta kunci). Stroke 1,75.
- Cek nama ikon terhadap versi `lucide-react` yang terpasang (nama yang dipakai di bawah sudah dicek di lucide-react 1.56).

| Fasilitas kamar | Ikon |
|---|---|
| AC | `air-vent` |
| WiFi | `wifi` |
| Smart TV, Smart TV 43 inci | `tv` |
| Netflix | `clapperboard` |
| Water Heater | `shower-head` |
| Kitchen Set | `cooking-pot` |
| Queen Bed | `bed-double` |
| Balkon | `fence` |
| Kulkas | `refrigerator` |
| Mesin Cuci | `washing-machine` |
| Microwave | `microwave` |
| Sofa | `sofa` |
| Meja Kerja | `laptop` |
| Perlengkapan Mandi | `bath` |
| Setrika | `shirt` |
| Dispenser Air | `glass-water` |

| Fasilitas gedung | Ikon |
|---|---|
| Kolam renang | `waves` |
| Gym | `dumbbell` |
| Taman | `trees` |
| Area anak | `baby` |
| Ruang kerja | `laptop` |
| Lobby | `door-open` |
| Keamanan 24 jam / CCTV | `shield-check` / `cctv` |
| Parkir | `square-parking` |
| Lift | `arrow-up-down` |
| Minimarket | `store` |

| Landmark (kategori) | Ikon |
|---|---|
| Belanja / mall | `shopping-bag` |
| Kuliner | `utensils-crossed` |
| Rumah sakit | `hospital` |
| Kampus / sekolah | `graduation-cap` |
| Wisata / pantai | `tree-palm` |
| Transportasi / bandara | `plane` |
| Hiburan | `music` |
| Ibadah / landmark kota | `landmark` |

| UI | Ikon |
|---|---|
| Lokasi | `map-pin` |
| Tipe kamar | `bed-double` |
| Kapasitas | `users` |
| Lantai | `layers` |
| Tower | `building-2` |
| View | `eye` |
| Luas | `ruler` |
| Check-in/out | `clock` |
| Peraturan | `cigarette-off`, `ban` |
| Filter / urutkan | `sliders-horizontal` / `arrow-up-down` |
| Video tur | `play` |
| Promo / unggulan | `badge-percent` / `sparkles` |
| Navigasi peta | `navigation` |

Ikon WhatsApp tidak ada di lucide: pakai SVG resmi WhatsApp (satu warna, `currentColor`) di `components/icons/whatsapp.tsx`.

---

## 7. Gambar

- Selalu `next/image` dengan `sizes` yang tepat. `remotePatterns`: `<project>.supabase.co/storage/v1/object/public/media/**` dan `images.unsplash.com` (data lama).
- Rasio: kartu 4:3, galeri detail 4:3 (mobile) / grid (desktop), hero mobile ±340px tinggi, hero desktop ±520px.
- `priority` hanya untuk foto hero dan foto pertama galeri.
- Teks di atas foto selalu dengan overlay gradien gelap supaya kontras terjaga.
- Alt: "{nama unit}, foto {n}", "Gedung {apartemen}", "Fasilitas {nama} di {apartemen}".
- Tanpa foto: placeholder netral `surface-2` + ikon `building-2` (bukan foto stok acak).

---

## 8. Aksesibilitas (cek tiap fase)

- Kontras teks ≥ 4,5:1 (teks besar ≥ 3:1); `subtle` hanya untuk ikon dekoratif.
- Target sentuh ≥ 44×44px; CTA utama mobile 52px.
- Fokus keyboard selalu terlihat (ring brand).
- Dialog/sheet: focus trap, `Esc` menutup, fokus kembali ke pemicu.
- Semua input punya `<label>`; error dihubungkan lewat `aria-describedby`.
- Carousel bisa dioperasikan keyboard, punya label "Foto 2 dari 8".
- `prefers-reduced-motion`: matikan shimmer, transisi geser jadi instan.
- Bahasa halaman `id`; ikon dekoratif `aria-hidden`.
