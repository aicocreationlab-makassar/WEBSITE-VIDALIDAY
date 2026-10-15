> Laporan audit Fase 0 (15 Okt 2026). Path Laravel di laporan ini relatif ke root lama; sekarang semuanya ada di `legacy-laravel/`.

# Admin panel audit of the legacy Laravel app (D:\website-vidaliday)

Stack: Laravel ^11, Tailwind **v3.4.19** (`@tailwind base`, so not v4), Vite 5. Font is Plus Jakarta Sans 300–800, set through `fontFamily.sans: ['Plus Jakarta Sans','Inter','sans-serif']`. The `brand.*` colours in `tailwind.config.js` are blue and WhatsApp green, but admin never uses them. Admin is **red/rose/slate** throughout.

Files read: `resources/views/admin/{layout,login,dashboard}.blade.php`, `admin/units/{index,create,edit}`, `admin/{facilities,landmarks,faqs,settings,about}/index`, `app/Http/Controllers/Admin/*.php` (8 files), `app/Support/StorageHelper.php`, `routes/web.php`, the models, the seeders, `app/Providers/AppServiceProvider.php` and `resources/css/app.css`.

---

## 1. Admin layout (`resources/views/admin/layout.blade.php`)

**Global**
- `<html lang="id">`. Title is `@yield('title','Admin Dashboard') | VIDALIDAY CMS`.
- Body: `bg-slate-50 text-slate-800 font-sans antialiased min-h-screen relative overflow-x-clip selection:bg-red-200 selection:text-slate-900`.
- Two ambient glow orbs: `fixed inset-0 pointer-events-none z-0`.
  - `absolute -top-40 -left-40 w-96 h-96 bg-rose-500/10 rounded-full blur-[130px]`
  - `top-1/2 -right-40 ... bg-red-400/10 blur-[130px]`
- Wrapper: `relative min-h-screen md:flex`. The breakpoint is **768px (`md`)**.
- `$siteLogo` reaches every view through the `View::composer('*')` in `AppServiceProvider`. That composer also shares `heroImage` and `companyLegalName`, and sets the value to null if the file is missing on the public disk. The logo URL is `storage/{site_logo}`, falling back to `images/logo_vidaliday.png`.

**Sidebar** `<aside id="main-sidebar">`
```
fixed md:sticky top-0 h-screen h-[100dvh] w-72 max-w-[85vw] md:w-64 bg-white border-r border-slate-200
flex flex-col shrink-0 z-50 transition-all duration-300 -translate-x-full md:translate-x-0 shadow-2xl md:shadow-none overflow-hidden
```
- Width is **288px on mobile** (capped at 85vw) and **256px on desktop**.
- **Brand header** (`shrink-0 p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white`):
  - Logo circle: `w-10 h-10 rounded-full overflow-hidden border border-slate-200/80 p-0.5 shadow-sm bg-white`, containing an `<img class="w-full h-full object-cover rounded-full">`.
  - Text block (`sidebar-text truncate`): `<span class="font-black text-base text-slate-900 tracking-tight">VIDALIDAY</span><span class="text-red-600 font-bold">.</span>`, then `<p class="text-[10px] text-red-600 font-bold uppercase tracking-wider">Apartment By Us</p>`.
  - Right side:
    - A mobile-only logout form (`md:hidden`): `px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold border border-rose-200`, logout SVG plus the label "Logout".
    - A close button: X SVG, `p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100`, `onclick="closeSidebar()"`.
- **Nav**: `flex-1 overflow-y-auto min-h-0 p-3 sm:p-3.5 space-y-1 sm:space-y-1.5 text-xs sm:text-sm font-semibold`.
  - Every icon is an **inline Heroicons v1 outline SVG** (`w-5 h-5 shrink-0`, stroke-width 2). **No emoji.**
  - Item base: `flex items-center gap-3 px-3.5 py-2.5 sm:py-3 rounded-xl transition`.
  - **Active**: `bg-red-50 text-red-700 font-bold border border-red-200/80 shadow-sm`, icon `text-red-600`.
  - **Inactive**: `text-slate-600 hover:bg-slate-100 hover:text-slate-900`, icon `text-slate-400`.
  - Active state is decided by `request()->routeIs(...)`.

| # | Label | Route | Heroicon |
|---|---|---|---|
| 1 | Dashboard & Promo | admin.dashboard | home |
| 2 | Kamar & Upload Foto | admin.units.* | office-building |
| 3 | Fasilitas Gedung | admin.facilities.* | sparkles |
| 4 | Tanya Jawab (FAQ) | admin.faqs.* | question-mark-circle |
| 5 | Akses & Landmark | admin.landmarks.* | location-marker (2 paths) |
| 6 | Tentang Kami (About) | admin.about.* | information-circle |
| 7 | No. WA & Banner | admin.settings.* | cog |

- **Sidebar footer**: `shrink-0 p-3.5 sm:p-4 border-t border-slate-200 bg-white space-y-2 pb-6 md:pb-4 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]`.
  - "Lihat Web Publik" (`target=_blank`, external-link icon in `text-red-600`): `w-full ... px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-200`.
  - "Keluar (Logout)": POST form, `bg-rose-50 hover:bg-rose-100 text-rose-600 ... border-rose-200`.

**Topbar** `<header>`
- `h-16 md:h-20` (**64px mobile, 80px desktop**), `bg-white border-b border-slate-200 px-3.5 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs`.
- Left side:
  - Toggle button `#sidebar-toggle-btn`: `w-10 h-10 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200`. Its icon is the "menu-alt" path `M4 6h16M4 12h16M4 18h7`.
  - `<h1 class="text-sm sm:text-lg font-bold text-slate-900 truncate max-w-[170px] xs:max-w-[220px] sm:max-w-none">@yield('page_title','Dashboard')`.
- Right side:
  - A green pulse dot `w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse`, then `auth()->user()->name` (`hidden sm:inline`).
  - "Web Depan" link: `px-2.5 py-1.5 sm:px-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold border border-red-200/60`, external-link icon.
  - Logout button: `rounded-lg bg-rose-50 text-rose-600 border-rose-200 text-xs font-bold`, label hidden below `sm`.

**Main area**
- `<main class="p-4 sm:p-6 md:p-8 pb-36 sm:pb-28 md:pb-24 w-full md:flex-1">`.
- Flash messages:
  - Success: `mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm shadow-sm` with a solid check-circle SVG. There is no close button and no auto-dismiss.
  - Errors: `bg-rose-50 border-rose-200 text-rose-800`, heading "Terjadi kendala input:", then a `<ul class="list-disc list-inside text-xs">` of all errors.
- Footer: `mt-12 pt-6 border-t border-slate-200 text-xs text-slate-400 flex flex-col sm:flex-row justify-between pb-12 sm:pb-6`.
  - Left: "© {Y} VIDALIDAY. Apartment By Us. Seluruh hak cipta dilindungi."
  - Right: "Panel Pengelola Resmi PT PERDANA MEGA TRANS" (`text-[11px]`).

**Drawer and collapse mechanics** (vanilla JS)
- **Mobile (<768px)**: the drawer toggles `-translate-x-full` / `translate-x-0` on the aside.
  - Overlay `#sidebar-overlay`: `fixed inset-0 bg-slate-900/30 z-40 hidden md:hidden` (no blur). Clicking it closes the drawer.
  - **Escape** closes it, but only on mobile.
  - Clicking any `nav a` closes it on mobile.
- **Desktop (≥768px)**: collapsing hides the sidebar completely. It is not an icon-rail.
  - CSS class `.desktop-closed { margin-left:-16rem; transform:translateX(-100%); pointer-events:none }`.
  - Transition: `margin-left .3s cubic-bezier(.4,0,.2,1), transform .3s`.
- **localStorage key `admin_sidebar_closed`** holds `'true'` or `'false'`.
  - A head script adds `html.sidebar-initially-closed` before paint to avoid a flash; it is removed on `DOMContentLoaded`.
  - `toggleSidebar()`, `openSidebar()` and `closeSidebar()` branch on `innerWidth < 768`.
  - `updateToggleBtnState()` sets the button's `title` ("Buka Sidebar" / "Tutup Sidebar") and `aria-expanded`.
- **Logout** is `POST /admin/logout` with CSRF. There are 3 buttons (sidebar header on mobile, topbar, sidebar footer), so mobile shows the same action twice or more.
  - `AuthController@logout`: `Auth::logout()`, invalidate the session, regenerate the token, then redirect to `admin.login` with "Anda telah berhasil logout."

**Shared CSS** (`resources/css/app.css`, `@layer utilities`)
```css
.glass-card{background:#fff;border:1px solid rgba(226,232,240,.9);box-shadow:0 1px 4px 0 rgba(30,41,59,.06),0 4px 16px -4px rgba(30,41,59,.05)}
.glass-card-hover:hover{border-color:rgba(254,202,202,.85);transform:translateY(-3px);box-shadow:0 8px 24px -8px rgba(220,38,38,.16)}
.glass-input{background:#fff;border:1.5px solid #e2e8f0;color:#0f172a;transition:border-color .18s,box-shadow .18s}
.glass-input:focus{border-color:#ef4444;outline:none;box-shadow:0 0 0 3px rgba(239,68,68,.12)}
.glass-input::placeholder{color:#94a3b8}
::selection{background:#fecaca;color:#0f172a}
```

**Recurring UI patterns** (worth turning into components)
- **Label**: `block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5`.
- **Input**: `w-full px-4 py-3 rounded-xl glass-input text-sm`. The compact variant is `px-3.5 py-2.5 ... text-xs`.
- **Primary button**: `rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wider shadow-md shadow-red-500/25`. Labels are UPPERCASE ("SIMPAN UNIT & FOTO").
- **Secondary button**: `bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold`.
- **Edit icon button**: `p-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200`.
- **Delete icon button**: `bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border-rose-200`.
- **Status pills**:
  - Active: `px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200` ("Aktif").
  - Inactive: `bg-slate-100 text-slate-500` ("Nonaktif").
- **Section box**: `p-5 rounded-2xl bg-red-50/50 border border-red-200/80` (also amber-50/50 and emerald-50/70 variants). The header is a dot `w-2.5 h-2.5 rounded-full bg-red-600` followed by an `h4 text-xs font-bold text-red-800 uppercase tracking-wider`.
- **Confirm modal**:
  - Overlay: `fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4`.
  - Panel: `bg-white rounded-2xl border border-rose-200 p-6 max-w-sm w-full space-y-4 shadow-2xl`.
  - Icon tile: `w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border-rose-200` with an exclamation-triangle.
  - Text: title "Konfirmasi Hapus", subtitle "Tindakan ini permanen".
  - Buttons: "Batal" and "Ya, Hapus …" (`bg-rose-600`).
- **Edit modal** (FAQ, Landmark): `max-w-lg max-h-[90vh] flex flex-col`, header with `border-b`, scrollable form body `overflow-y-auto flex-1 px-6 py-4`.
- **File input**: `file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-700 border border-slate-300 rounded-xl bg-white p-2`. The gallery input uses `file:bg-slate-700`; the hero input uses `file:bg-amber-600`.

---

## 2. Pages

### Login (`admin/login.blade.php`)
- Standalone page, not using the layout. Body: `bg-slate-50 min-h-screen flex flex-col p-4 sm:p-6`. Orbs: `bg-rose-500/15` and `bg-red-400/15`, `blur-[140px]`.
- Card: `glass-card rounded-3xl p-6 sm:p-8 border border-white/80 shadow-xl bg-white/95`, inside `max-w-md m-auto`.
- Logo: `w-16 h-16 rounded-full border-2`.
- Heading: `h1 text-2xl font-black` "VIDALIDAY" plus a red "." at `text-3xl`. Subline: "Apartment By Us • Panel Pengelola Unit & Promo Resmi".
- Fields:
  - `email` (type=email, required, autocomplete=email): label "Email Pengelola", placeholder "Masukkan email pengelola".
  - `password` (required): label "Kata Sandi".
  - Checkbox `remember`: "Ingat saya di perangkat ini".
- Submit: "MASUK KE PANEL PENGELOLA" (`w-full py-3.5 bg-red-600 font-extrabold text-sm shadow-red-500/25`).
- Back link: "Kembali ke Halaman Depan" (arrow-left SVG).
- Footer note: "Dikelola di bawah naungan PT PERDANA MEGA TRANS".
- Controller: `email => ['required','email']`, `password => ['required']`. The email is `strtolower(trim())`, then `Auth::attempt($cred, $remember)` and session regenerate.
  - On failure: error "Email atau kata sandi yang Anda masukkan salah.", via `onlyInput('email')`.
  - On success: `redirect()->intended(admin.dashboard)` with flash "Selamat datang kembali di Admin Dashboard VIDALIDAY!".
  - `showLogin` redirects to the dashboard if already authenticated. `/login` is an alias for `admin.login`.
- **There is no throttling and no role check**: any `users` row is an admin. Seeded admin accounts: 2 users, credentials [secret omitted].

### Dashboard (`/admin`, `DashboardController@index`)
- Data: `totalUnits` = `Unit::count()`, `availableUnits` = `where is_available`, `totalFacilities`, `locations` = `withCount(['units','facilities'])`, `whatsappNumber` = `Setting whatsapp_number` (default '-'), `companyName`, `featuredUnit` = **first** unit with `is_featured`.
- Section 1: 4 stat cards in `grid-cols-2 lg:grid-cols-4`, each `p-3.5 sm:p-6 rounded-2xl glass-card bg-white`. Numbers are `text-2xl sm:text-3xl font-black`.

  | Card | Value | Pill | Subtext / link |
  |---|---|---|---|
  | "Total Unit Kamar" | `totalUnits` | "Kamar" | "Delft CPI & Vida View" (**hardcoded**) |
  | "Unit Tersedia" | emerald-700 | "Siap Sewa" | |
  | "Fasilitas Gedung" | | "Fasilitas" | "Kolam, gym, security" |
  | "WhatsApp Kontak" | font-mono | "Aktif" | "Atur Kontak →" |

- Section 2, the featured box: `border-red-200/80 bg-gradient-to-r from-red-50/70 via-white to-red-50/40`.
  - Pill with a star: `Unit "Pilihan Favorit Tamu" (Hero Web)`. Heading: "Unit Unggulan yang Dipromosikan Saat Ini".
  - Mini card: 56–64px thumbnail, location (red uppercase), name, `formatted_promo_price`, link "Ganti Unit Favorit →".
  - Empty state: "Admin belum menambahkan unit kamar pilihan favorit… Pilih unit favorit sekarang →".
- Section 3: per-location cards (`md:grid-cols-2`).
  - "Lokasi Apartemen" label, name, tagline, pill "{units_count} Unit".
  - `Str::limit(description,130)`.
  - "Fasilitas terdaftar: N".
  - Button "Lihat Unit Lokasi Ini →" goes to `/admin/units?location_id=X`.
- Section 4, "Navigasi Cepat Pengelolaan" (3 tiles; icon tile `w-10 h-10 rounded-xl bg-red-100 text-red-600`):
  - "Tambah Kamar Baru": "Input unit baru, upload foto kamar asli hingga 5MB…"
  - "Kelola Fasilitas Gedung"
  - "Pengaturan Kontak & WA"

### Units: list (`/admin/units`, `UnitController@index`)
- Query: `Unit::with('location')`. The **only filter** is `?location_id=` (exact match). Order is `location_id`, then `promo_price`. **No search and no pagination.**
- Filter bar: label "Filter:", then chip links "Semua" plus one per location.
  - Active chip: `bg-red-600 text-white font-bold shadow-sm`.
  - Inactive chip: `bg-white text-slate-600 border border-slate-200`.
  - Chip shape: `px-3 py-1.5 rounded-xl text-xs`.
- CTA: "Tambah Unit & Upload Foto" (plus icon, red).
- Layout is a **card grid, not a table**: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5`. Card: `bg-white rounded-2xl border p-4 sm:p-5 hover:border-red-300 hover:shadow-md`.
  - Thumbnail `w-16/20 h-16/20 rounded-xl`.
  - Location (red uppercase 10px).
  - Badge "Promo Aktif" (emerald) or "Normal" (slate).
  - Name.
  - "`{room_type} • {rental_period}` • Maks. {max_guests} Tamu".
- Price box `bg-slate-50`:
  - Label "Tarif Sewa".
  - Promo price `text-red-700 font-extrabold`.
  - `line-through text-rose-500` normal price, shown only if the promo is active and `normal > promo`.
  - `promo_badge` pill.
- Optional extras:
  - Full description box ("Deskripsi:"), not clamped.
  - Facility chips (`bg-red-50/80 border-red-100 text-red-700 text-[10px]`) under "Fasilitas Kamar:".
  - YouTube indicator "Video Room Tour Ditautkan" with a "Buka ↗" link.
- Card actions:
  - **Toggle featured** (POST `/admin/units/{id}/toggle-featured`). When on: `bg-amber-100 text-amber-800 border-amber-300`, star `text-amber-500 fill-current`, label "Favorit Tamu". When off: "Set Favorit".
  - **Edit**: opens a "Konfirmasi Edit" modal ("Apakah Anda ingin mengedit data unit kamar "X"?", buttons "Batal" / "Lanjutkan Edit"). This step is unnecessary.
  - **Hapus**: opens a delete modal. Copy: "…Seluruh foto dan data unit ini akan dihapus dari server." Button: "Ya, Hapus Unit". It submits a hidden `DELETE` form `delete-form-{id}`.
- Empty state: "Belum ada unit kamar di lokasi ini."

### Units: create and edit (`create.blade.php` / `edit.blade.php`)
- Container `max-w-4xl mx-auto`. Back link "Kembali ke Daftar Kamar". Card `glass-card rounded-2xl p-5 sm:p-8`. Form uses `multipart/form-data`; edit uses `@method('PUT')`.
- Header:
  - Create: "Informasi Unit & Upload Foto".
  - Edit: "Edit Unit: {name}" plus a location pill.
- Fields:

| name | UI type | Default (create) | Notes |
|---|---|---|---|
| `location_id` | select, required | "Pilih Lokasi Apartemen..." | Locations |
| `name` | text, required | placeholder "e.g. Studio Premium Sea View" | |
| `room_type` | select `#room_type_select` (no name) plus hidden-until-custom text `#room_type_input` (the named one) | 'Studio' | Options are defaults `['Studio','1 Bedroom','2 Bedroom','Penthouse','Family Suite','VIP Suite']` merged with distinct DB values (edit also adds the current value), then `+ Tambah Tipe Kustom...` (`__custom__`). The toggle button "+ Tipe Baru" switches to "Batal". |
| `max_guests` | number, min 1 | 2 | |
| `rental_period` | same select-plus-custom pattern | 'Malam' | Defaults `['Malam','Minggu','Bulan','Tahun']` plus DB values; option text "Per {x}"; custom placeholder "e.g. 3 Hari, Semester, Tahun" |
| `image` | file, accept `.jpg,.jpeg,.png,.heic,.heif,.webp` | Unsplash fallback | Label "1. Foto Utama (Sampul Depan) *" (the asterisk is shown but the field is not required). FileReader live preview: create uses a `w-28 h-20` box with "Preview Sampul"; edit uses `w-32 h-24` with a hover overlay "Foto Saat Ini". Edit hint: "Biarkan kosong jika tidak ingin mengubah foto sampul saat ini." |
| `gallery_images[]` | file multiple | – | Preview grid `grid-cols-3 sm:grid-cols-6`, `aspect-video`. Badge "#n" on create, "+Baru" on edit. Hint about Ctrl/Shift with `<kbd>`. |
| `deleted_gallery_images[]` | hidden inputs (edit only) | – | Existing gallery grid `grid-cols-2 sm:grid-cols-4 md:grid-cols-6`. Each tile has a "✕ Hapus" button that shows overlay `bg-rose-600/85 backdrop-blur-[2px]` with "Akan Dihapus" and a "Batal" button; this adds or removes the hidden input `id="del-"+btoa(path)`. Counter pill "{n} Foto Galeri". Empty state: "Belum ada foto galeri tambahan untuk unit ini…" |
| `normal_price` | **hidden**, fed by `#normal_price_display` (text, `inputmode=numeric`) | 500000 | Label "Harga Normal (Dicoret) *", hint "Akan tampil dicoret merah di website" |
| `promo_price` | hidden plus display | 350000 | Label "Harga Promo (Aktif) *" (red), hint "Tarif yang dibayarkan tamu" |
| `promo_badge` | text | 'Promo Spesial' | placeholder "e.g. Hemat 30%, Best Seller", hint "Muncul di pojok foto kamar" |
| `is_promo_active` | checkbox | checked | "Aktifkan promo harga coret" (emerald) |
| `is_featured` | checkbox | unchecked | "Jadikan Pilihan Favorit Tamu (Hero Card)" (amber) |
| `is_available` | checkbox | checked | "Kamar Tersedia untuk Disewa" |
| `facilities_input` | text, comma-separated | 'AC Dingin, Smart TV 43 Netflix, Free WiFi, Water Heater, Balkon, Kitchen Set, Queen Bed' | Split on `,`, trimmed, empties dropped, stored as JSON `facilities_list` |
| `youtube_video_url` | type=url | – | Hint "Opsional. Jika diisi, tombol Video Tur akan muncul di card unit halaman depan." |
| `description` | textarea, rows=3 | – | |

- Section headings:
  - "Foto Utama & Galeri Slider Kamar", with sub "Maksimal 5MB per file • Format: JPG, JPEG, PNG, HEIC, WEBP".
  - "Pengaturan Harga Coret & Diskon".
- Submit button: "SIMPAN UNIT & FOTO" or "PERBARUI UNIT & FOTO". Cancel: "Batal".
- Rupiah formatter to port:
```js
// display "Rp 1.250.000" <-> hidden raw int; on blur empty -> 0
const raw=v.replace(/[^0-9]/g,''); hidden.value=raw?parseInt(raw,10):''; display.value=raw?formatRupiahString(raw):'';
```
  - Server-side formatting: `'Rp ' . number_format(x,0,',','.')`.
  - `discount_percent` = `round((normal-promo)/normal*100)` when `normal > promo > 0`.
- Image handling:
  - Stored with `->store('units','public')`, giving `storage/app/public/units/<hash>.<ext>`. URL is `asset('storage/'.path)`; values starting with `http(s)` are used as-is.
  - With no main image, `main_image` is set to `https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80`.
  - On replace, the old main image is deleted with `StorageHelper::delete`.
  - On edit, the gallery is `array_diff(current, deleted)` with the new uploads appended. **No reordering.**
  - Destroy deletes the main and gallery files. The model's `deleting` event does it again (harmless).
- Slug: `Str::slug(name.'-'.rand(100,999))`, set only on create and **never regenerated** on rename.
- Flash messages:
  - Store: "Unit kamar dan foto-foto galeri berhasil ditambahkan!"
  - Update: "Data unit kamar dan foto-foto galeri berhasil diperbarui!"
  - Delete: "Unit kamar dan foto terkait berhasil dihapus dari sistem & storage."
  - Toggle: "Unit '{name}' berhasil dijadikan Pilihan Favorit Tamu di Hero Website!" or "…dihapus dari Pilihan Favorit Tamu!"

### Facilities (`/admin/facilities`)
- `Location::with('facilities')`. Layout `grid lg:grid-cols-12`.
- Left (`lg:col-span-4`, `lg:sticky lg:top-24`): form "+ Tambah Fasilitas Baru" ("Lengkapi fasilitas gedung beserta foto opsional.").
  - Fields: `location_id` (select, "Pilih Gedung Apartemen *"), `name` ("e.g. Infinity Ocean Pool"), `description` (textarea rows 2, "Keterangan Singkat").
  - `image`: optional file in a red-50 box ("Upload Foto Fasilitas (Opsional)", "Maksimal 5MB (JPG, JPEG, PNG, WEBP, HEIC)") with an `h-24` preview.
  - Submit: "SIMPAN FASILITAS".
- Right (`col-span-8`): one card per location.
  - Header: name, tagline (red), pill "{n} Fasilitas".
  - Grid `sm:grid-cols-2` of items: optional `h-32` image, name, description, and an **icon-only delete** button (trash) that opens the "Hapus Fasilitas" modal ("Ya, Hapus").
  - Empty state: "Belum ada fasilitas terdaftar di lokasi ini."
- **No edit UI**, even though the `update` route exists. The `icon` column (seeded values: waves, dumbbell, sun, shield-check, coffee, store, trees) is validated but **has no input**, so admin-created facilities get `icon = null`.
- Images go to `facilities/` on the public disk; the old image is deleted on replace and on destroy.

### Landmarks (`/admin/landmarks`)
- `?location_id=` defaults to the **first location**. Landmarks are filtered by it and ordered `sort_order`, then `id`.
- Top card "Pilih Lokasi Apartemen" with tab links per location.
  - Active tab: `bg-red-600 text-white shadow-md shadow-red-500/25`. Inactive: `bg-slate-100`.
  - Each tab is prefixed with the **📍 emoji**.
- Left form "Tambah Landmark Baru" (sub "Tampil di card 'Dekat dengan Berbagai Landmark'"), with a "+" text tile:
  - `location_id` (pre-selected to the current tab).
  - `name`: "e.g. Masjid 99 Kubah Makassar".
  - `distance_time`: "e.g. 1 Menit, 25 Menit (via Tol)", styled `font-mono font-semibold text-red-600`.
  - `notes`: "Opsional".
  - `sort_order`: number, default `count+1`.
  - `is_active`: checkbox, checked, "Tampilkan di Homepage".
  - Submit: "SIMPAN LANDMARK".
- Right list, titled "Daftar Landmark - {loc} ({n})". Each row:
  - `#sort_order` chip.
  - Name, plus `distance_time` pill (`bg-red-50 text-red-700 font-mono`).
  - "Lokasi: X • notes".
  - Aktif/Nonaktif pill, icon edit, icon delete.
- Edit modal "Edit Akses & Landmark" uses a ✎ glyph tile and a ✕ close. The form action is hardcoded `/admin/landmarks/${id}` and it is filled from `json_encode($item)`.
- Delete modal button: "Ya, Hapus Landmark".
- Redirects go back to `?location_id=`.

### FAQs (`/admin/faqs`)
- Ordered `sort_order`, then `id`. **No location scoping, no search.**
- Left form "Tambah Pertanyaan Baru" ("FAQ akan tampil di halaman utama"):
  - `question`: "e.g. Bagaimana jam check-in & check-out?"
  - `answer`: textarea rows 4.
  - `badge`: "e.g. Fleksibel, 14.00 WITA", hint "Muncul di samping judul".
  - `sort_order`: default `count+1`, hint "Angka lebih kecil tampil awal".
  - `is_active`: checked, "Tampilkan FAQ di Website".
  - Submit: "SIMPAN PERTANYAAN".
- List "Daftar Pertanyaan & Jawaban ({n})": `#order` chip, question, badge pill, answer, Aktif/Nonaktif pill, icon edit and icon delete.
- Edit modal "Edit Tanya Jawab (FAQ)" (✎ / ✕). Delete modal button: "Ya, Hapus FAQ".

### About (`/admin/about`, GET plus POST)
- Container `max-w-5xl`. "Lihat Halaman" link goes to `/about`.
- Groups:
  1. "Header & Tagline": `about_tagline` (hint "Contoh: Your Comfort, Our Priority") and `about_hero_title`.
  2. "Narasi Tentang VIDALIDAY":
     - `about_intro_p1` "Paragraf 1 — Legalitas & Naungan PT *"
     - `about_intro_p2` "Paragraf 2 — Pilihan Unit Apartemen & Layanan"
     - `about_intro_p3` "Paragraf 3 — Standar Kebersihan & Kenyamanan"
  3. "Mengapa Memilih VIDALIDAY?": a dynamic repeater, `reasons_title[]` (required) and `reasons_desc[]` (required).
     - "+ Tambah Poin" button (emerald) and per-row "✕ Hapus". Row header: "Poin #n".
     - The JS `addReasonRow()` uses placeholders "Contoh: Unit Bersih & Nyaman" and "Penjelasan ringkas...".
  4. "Komitmen & Pesan Penutup": `about_commit_title`, `about_closing_quote`, `about_commit_text`, `about_closing_cta`.
- Submit: "SIMPAN PERUBAHAN TENTANG KAMI".
- Reasons are stored as JSON in the setting `about_reasons`: `[{title,desc,icon}]`. Rows with an empty title are dropped.

### Settings (`/admin/settings`, GET plus POST)
- Card title: "Identitas Visual, Logo & Kontak Resmi". Four groups:
  1. **"Logo Brand Website"** (red box):
     - Preview `w-24 h-24 rounded-full`.
     - Checkbox `remove_logo` "Gunakan Logo Default".
     - File input `site_logo` (accept png/jpeg/webp/svg).
     - Hint "Maksimal ukuran file 5 MB. Disarankan PNG transparan… 1:1".
     - A "Di mana logo ini akan tampil?" list with 5 places.
  2. **"Foto Background Hero (Halaman Depan)"** (amber box):
     - Preview `h-36`; the default is `images/bg_brentsville_wide.jpg`.
     - Checkbox `remove_hero_image` "Gunakan Foto Default Gedung".
     - File input `hero_image`, hint "Maksimal 8 MB… 1920x1080 atau 2560x1440".
  3. **"Integrasi WhatsApp Click-to-Chat"** (emerald box):
     - `whatsapp_number` (required, mono, placeholder 6281234567890, hint "diawali kode negara 62… tanpa tanda + atau spasi").
     - `contact_phone` ("Tampilan No. Telepon di Footer").
     - `whatsapp_template` (textarea rows 4, mono). Variables: `{apartment}`, `{unit_name}`, `{room_type}`, `{price}`, `{period}`.
  4. Ungrouped:
     - `promo_banner_text` ("Teks Banner Promo Berjalan", rows 2).
     - `company_legal_name` (required, "Tampil di badge legalitas resmi dan footer.").
     - `office_hours` ("Jam Operasional Layanan").
- Submit: "SIMPAN SEMUA PENGATURAN". Flash: "Pengaturan identitas logo, kontak WhatsApp, dan banner promo berhasil disimpan!"
- Files go to `settings/` on the public disk. The old file is deleted on replace or remove, and remove sets the value to `null`.

**All settings keys** (`settings` table: `key` unique, `value` text nullable)

| Key | Meaning | Seed / default |
|---|---|---|
| `site_logo` | Logo path (navbar, footer, about, admin sidebar, login) | null, so `images/logo_vidaliday.png` |
| `hero_image` | Homepage hero background path | null, so `images/bg_brentsville_wide.jpg` |
| `whatsapp_number` | WhatsApp click-to-chat target | seed `6285711696970`, fallback `6281234567890` |
| `whatsapp_template` | Booking message template | "Halo Admin VIDALIDAY, saya ingin memesan/tanya ketersediaan unit:\n- Lokasi: {apartment}\n- Unit: {unit_name} ({room_type})\n- Harga: {price} / {period}\n\nMohon info ketersediaan kamar. Terima kasih!" |
| `promo_banner_text` | Top running promo banner | "FLASH DEAL VIDALIDAY: Nikmati diskon promo hingga 30%…" |
| `company_legal_name` | Legal entity name (footer, badges) | "PT PERDANA MEGA TRANS" |
| `contact_phone` | Phone shown in the footer | "+62 857-1169-6970" |
| `contact_email` | Public contact email | "info@vidaliday.com". **No admin input** (see bugs). |
| `office_hours` | Service hours | "Setiap Hari: 08.00 - 23.00 WITA" |
| `about_tagline` | About page tagline | "Your Comfort, Our Priority" |
| `about_hero_title` | About page headline | "VIDALIDAY — Partner Terpercaya untuk Menginap Nyaman di Makassar." |
| `about_intro_p1`..`p3` | Three narrative paragraphs | AboutSeeder text |
| `about_commit_title` | Commitment heading | "KOMITMEN KAMI" |
| `about_commit_text` | Commitment body | |
| `about_closing_quote` | Closing slogan | "VIDALIDAY — Menginap Nyaman, Harga Bersahabat, Pilihan Terpercaya." |
| `about_closing_cta` | Closing call to action | |
| `about_reasons` | JSON `[{title,desc,icon}]` | 6 items; icons shield, sparkles, home, tag, lock, chat |

**There is no admin CRUD for Locations** (apartment buildings). They exist only through the seeder. Location fields are `slug`, `name`, `tagline`, `description`, `address`, `gmaps_url`, `hero_image`. The new requirement that admin can add apartments will need a new module.

---

## 3. Validation rules (exact, for porting to zod)

**AuthController@login**
```
email: required|email          password: required          (+ remember: boolean)
```

**UnitController@store** (update uses the same rules plus the last two)
```
location_id        required|exists:locations,id
name               required|string|max:255
room_type          required|string|max:100
max_guests         required|integer|min:1
normal_price       required|numeric|min:0
promo_price        required|numeric|min:0
promo_badge        nullable|string|max:100
rental_period      required|string|max:50
description        nullable|string
facilities_input   nullable|string
youtube_video_url  nullable|string|max:500
image              nullable|file|mimes:jpeg,jpg,png,heic,heif,webp|max:5120   (KB = 5MB)
gallery_images     nullable|array
gallery_images.*   file|mimes:jpeg,jpg,png,heic,heif,webp|max:5120
-- update only --
deleted_gallery_images    nullable|array
deleted_gallery_images.*  string
```
Custom messages:
- `image.max`: "Ukuran file foto utama maksimal 5MB."
- `image.mimes`: "Format file foto utama harus JPG, JPEG, PNG, WEBP, atau HEIC."
- `gallery_images.*.max`: "Ukuran setiap foto galeri maksimal 5MB."
- `gallery_images.*.mimes`: "Format file foto galeri harus JPG, JPEG, PNG, WEBP, atau HEIC."

Booleans are read with `$request->has(...)` (checkbox semantics).

**UnitController@quickPromoUpdate** (route exists, **no UI uses it**)
```
normal_price required|numeric|min:0 ; promo_price required|numeric|min:0 ; promo_badge nullable|string|max:100 ; is_promo_active = has()
```

**FacilityController** store (update has the same rules minus `location_id`)
```
location_id required|exists:locations,id ; name required|string|max:255 ; icon nullable|string|max:100
description nullable|string ; image nullable|file|mimes:jpeg,jpg,png,heic,heif,webp|max:5120
```
Messages: "Ukuran file gambar maksimal 5MB." and "Format file gambar harus JPG, JPEG, PNG, WEBP, atau HEIC."

**LandmarkController** (store and update)
```
location_id required|exists:locations,id ; name required|string|max:255 ; distance_time required|string|max:100
notes nullable|string|max:255 ; sort_order nullable|integer ; is_active = has()
sort_order fallback: store => max(sort_order where location)+1 ; update => keep existing
```

**FaqController** (store and update)
```
question required|string|max:255 ; answer required|string ; badge nullable|string|max:100 ; sort_order nullable|integer ; is_active = has()
sort_order fallback: store => Faq::max+1 ; update => keep existing
```

**AboutController@update**
```
about_tagline required|string|max:255 ; about_hero_title required|string|max:255 ; about_intro_p1 required|string
about_intro_p2 nullable|string ; about_intro_p3 nullable|string ; about_commit_title required|string|max:255
about_commit_text required|string ; about_closing_quote nullable|string|max:255 ; about_closing_cta nullable|string|max:255
reasons_title nullable|array ; reasons_desc nullable|array ; reasons_icon nullable|array
```

**SettingController@update**
```
site_logo nullable|image|mimes:jpeg,png,jpg,webp,svg|max:5120
hero_image nullable|image|mimes:jpeg,png,jpg,webp|max:8192
whatsapp_number required|string|max:30 ; company_legal_name required|string|max:255
contact_phone nullable|string|max:50 ; contact_email nullable|string|max:100 ; office_hours nullable|string|max:100
promo_banner_text nullable|string ; whatsapp_template nullable|string
+ remove_logo / remove_hero_image == '1'
```

**Database columns** (for the Supabase schema)
- **units**: `location_id` FK cascade, `name`, `slug` unique, `room_type` string, `max_guests` int default 2, `normal_price` / `promo_price` decimal(12,2) default 0, `promo_badge` nullable, `is_promo_active` default true, `rental_period` default 'Harian', `description` text, `facilities_list` json, `youtube_video_url` nullable, `main_image`, `gallery_images` json, `is_featured` default false, `is_available` default true.
- **facilities**: `location_id` FK cascade, `name`, `icon`, `description`, `image`.
- **faqs**: `question`, `answer`, `badge`, `sort_order` default 0, `is_active` default true.
- **landmarks**: `location_id` FK cascade, `name`, `distance_time`, `notes`, `sort_order`, `is_active`.

---

## 4. Behaviours to keep, and bugs

**Keep**
- Delete the old file when an image is replaced or removed. `StorageHelper::delete` ignores `http(s)` URLs and strips leading `/`, `storage/` and `public/` prefixes.
- Delete all of a unit's files on unit delete. Location delete cascades to its units and facilities.
- Gallery "mark for delete" with an undo overlay, then the diff applied on save; new uploads are appended.
- Live FileReader previews for the main image, the gallery, facility images, the logo and the hero.
- Rupiah input mask, with the raw integer kept in a hidden field.
- Room type and rental period dropdowns that merge DB values with defaults and allow a custom value ("+ Tipe Baru"). Room types should become admin-managed per location, as requested.
- `is_featured` one-click toggle ("Set Favorit" / "Favorit Tamu") and the promo active toggle.
- `sort_order` auto-increment (max+1) when left empty.
- Landmark location tabs that preserve `location_id` across redirects.
- Settings "use default" checkboxes for the logo and hero.
- Facilities split from comma-separated input into a JSON array.
- YouTube embed parser (`Unit::youtube_embed_url`), matching youtu.be/ID, `?v=ID`, /embed/ID and /shorts/ID, and producing `https://www.youtube.com/embed/ID?autoplay=1`.

**Bugs and oddities**
1. **`is_available` can never be set to false.** Store and update both use `has('is_available') ? boolean : true`, and an unchecked checkbox is not sent, so the value is always true.
2. **`is_featured` cannot be turned off from the edit form.** On update an unchecked box is absent, so the code keeps `$unit->is_featured`. Only the toggle button works.
3. **Saving Settings wipes `contact_email`.** It is in the `$fields` loop but has no form input, so `Setting::set('contact_email', null)` runs on every save. The public site reads this key.
4. **Saving About resets every reason icon to `'shield'`.** `reasons_icon[]` has no input, which destroys the seeded icons (sparkles, home, tag, lock, chat).
5. **Path deletion through `deleted_gallery_images[]`.** The paths are not checked against the unit's gallery, so any public-disk file can be deleted. `public_path('storage/'.$path)` with `../` could also reach outside storage. Admin-only, but the port should check membership.
6. **SVG logo uploads fail.** Laravel 11's `image` rule rejects SVG unless `image:allow_svg` is used, but the UI advertises SVG.
7. **HEIC/HEIF is accepted** but browsers cannot render it, so images break.
8. **No check that `promo_price <= normal_price`.**
9. **Slug is never regenerated** on rename, and is `rand(100,999)`-suffixed, so collisions are possible against the unique index.
10. **Main image is labelled required ("*")** in create, but it is nullable and falls back to a hardcoded Unsplash image.
11. **The dashboard shows only `->first()` featured unit**, while the seed marks all 6 units featured. "Delft CPI & Vida View" is hardcoded.
12. **Facility edit is missing in the UI**, and the `icon` field has no input.
13. **`quick-promo` is a dead route** with no UI.
14. **Unnecessary "Konfirmasi Edit" modal** before navigating to the edit page.
15. **`toggleCustomType` / `toggleCustomPeriod` "Batal"** resets to `selectedIndex 0` instead of the previous value. In create, after a validation error with a custom type, the select shows 'Studio' while the hidden input keeps the custom value.
16. **`rental_period` defaults are inconsistent**: the migration default is 'Harian' but the UI defaults are Malam/Minggu/Bulan/Tahun.
17. **Units index has no search or pagination** and shows full descriptions. FAQs and landmarks have no search either. This is the gap the user wants filled.
18. **Three logout buttons** are visible on mobile.
19. **`shadow-xs` and the `xs:` breakpoint do nothing** in Tailwind v3 with this config.
20. **Login has no rate limit, there is no admin role**, and flash messages are not dismissible.
21. **The `sort_order` default in the form** is `count+1`, while the controller fallback is `max+1`, so they can differ.

---

## 5. Emoji and glyphs in admin views and seed data

- **True emoji**:
  - **📍** in `admin/landmarks/index.blade.php` line 20, in the location tab chips. Replace it with an SVG map-pin.
- **Unicode glyphs used as icons** (also replace with SVG):
  - **✎**: edit modal header tile in `faqs/index.blade.php` line 141 and `landmarks/index.blade.php` line 173.
  - **✕**: modal close buttons (faqs line 148, landmarks line 180), and "✕ Hapus" buttons (units/edit line 173; about lines 90 and 159).
  - **↗**: "Buka ↗" in units/index line 98.
  - **→**: dashboard links "Atur Kontak →", "Ganti Unit Favorit →", "Pilih unit favorit sekarang →", "Lihat Unit Lokasi Ini →" (lines 44, 72, 77, 105).
  - **"+"** as a text icon in the FAQ and Landmark form header tiles, and in "+ Tambah Fasilitas Baru", "+ Tipe Baru", "+ Periode Baru", "+ Tambah Poin".
- **Typographic, fine to keep**: `•` separators (login subline, unit meta, landmark notes, file-format hints) and `—` in About labels and seeded copy.
- **Seeders** (`DatabaseSeeder`, `FaqSeeder`, `LandmarkSeeder`, `AboutSeeder`) contain **no emoji**.
  - Icons are stored as keyword strings: facilities use `waves, dumbbell, sun, shield-check, coffee, store, trees`; about reasons use `shield, sparkles, home, tag, lock, chat`. These map directly onto lucide-react names.
  - Seeded facility strings include inch marks, e.g. `Smart TV 43" Netflix`.