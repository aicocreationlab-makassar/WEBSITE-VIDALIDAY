> Laporan audit Fase 0 (15 Okt 2026). Path Laravel di laporan ini relatif ke root lama; sekarang semuanya ada di `legacy-laravel/`.

# Public UI audit: legacy Laravel site at `D:\website-vidaliday`

Sources read: `resources/views/layouts/app.blade.php`, `home.blade.php`, `partials/unit-card.blade.php`, `about.blade.php`, `preview-client.blade.php`, `welcome.blade.php` (skimmed), `resources/js/app.js`, `resources/css/app.css`, `tailwind.config.js`, `public/preview-card.html`. Supporting files: `app/Http/Controllers/HomeController.php`, `AboutController.php`, `Admin/AboutController.php`, `app/Models/Unit.php`, `app/Providers/AppServiceProvider.php`, `database/seeders/AboutSeeder.php`.

- `welcome.blade.php` is the stock Laravel welcome page. Ignore it.
- `resources/js/app.js` only does `import './bootstrap'`. All JS is inline in the Blade files.
- Tailwind is 3.4.19. The only custom tokens in `tailwind.config.js` are `brand.blue/#2563eb`, `blue-light`, `blue-accent`, `sky`, `wa #25D366`, `wa-hover #1eb757` and the shadows `glass-light`, `glass-hover`, `glow-blue`, `glow-wa`. None of them are used on public pages (old blue theme). The font is `sans: ['Plus Jakarta Sans','Inter','sans-serif']`.

---

## 1. Layout (`layouts/app.blade.php`)

**Head**
- Fonts loaded: Google Fonts Cinzel 700–900, Playfair Display, Plus Jakarta Sans 300–800 and Great Vibes. `app.css` loads Plus Jakarta Sans a second time through `@import`.
- `.font-script`, `.font-luxury-title`, `.text-gold-gradient`, `.bg-gold-gradient`, `.bg-gold-glow` and `.text-shadow-*` are defined in an inline `<style>`. None of them are used on home or about.
- Selection colors: `::selection { background:#fecaca; color:#0f172a }`.
- Body: `bg-slate-50 text-slate-800 font-sans antialiased min-h-screen overflow-x-hidden`.
- Ambient orbs, fixed at z-0 with `pointer-events-none`:
  - `bg-rose-500/10 w-[32rem] blur-[130px]` at -top-40 -left-40
  - `bg-red-400/15 w-[36rem] blur-[140px]` at top-1/3 -right-40
  - `bg-rose-400/10 w-[30rem] blur-[130px]`
  - `bg-red-500/10 w-[28rem] blur-[120px]`

**Top trust bar** (`<aside>`, not sticky)
- Container: `bg-white/90 border-b border-red-100/80 text-xs py-2 px-4 backdrop-blur-md`, inner `max-w-7xl flex-col sm:flex-row`.
- Left side:
  - Pill `bg-red-50 text-red-700 border-red-200 rounded-full text-[11px] font-bold px-2.5 py-0.5` with a check-circle SVG and the text "Resmi & Terverifikasi".
  - "Dikelola resmi oleh" (shown at `md` and up).
  - `<strong class="uppercase font-bold tracking-wide text-slate-900">{company_legal_name ?? 'PT PERDANA MEGA TRANS'}`.
- Right side:
  - `text-red-700 font-semibold hidden lg:inline` with the text "★ Sewa Harian • Mingguan • Bulanan Makassar".
  - A link "Portal Admin" to `admin.login`. This exposes the admin link publicly.

**Header**
- `<header class="sticky top-0 z-40 glass-nav">`. `.glass-nav` is `rgba(255,255,255,.92)`, `blur(20px)`, `border-bottom 1px rgba(226,232,240,.8)`.
- Inner: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20` (80px), `justify-between`.

Logo markup, exactly:
```html
<a href="/" class="flex items-center gap-3 group">
  <div class="w-12 h-12 rounded-full overflow-hidden border border-slate-200/80 shadow-md group-hover:scale-105 transition-transform shrink-0 bg-white">
    <img src="{siteLogo ? storage/siteLogo : /images/logo_vidaliday.png}" alt="VIDALIDAY Logo" class="w-full h-full object-cover">
  </div>
  <div>
    <div class="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-1">
      VIDALIDAY <span class="text-red-600 text-3xl leading-none">.</span>
    </div>
    <p class="text-[10px] tracking-widest uppercase text-slate-500 -mt-1 font-bold">Apartment By Us</p>
  </div>
</a>
```
- `siteLogo` comes from setting `site_logo` through a View composer in `AppServiceProvider`. The composer also shares `heroImage` (setting `hero_image`) and `companyLegalName`.

Desktop nav:
- `hidden md:flex items-center gap-6 lg:gap-7 text-sm font-semibold text-slate-600`, links `hover:text-red-600`.
- Links: "Pilihan Apartemen" (#lokasi), "Kamar & Promo" (#katalog-kamar), "Fasilitas" (#fasilitas), "Lokasi" (#jarak), "FAQ" (#faq), "Tentang Kami" (/about, active state `text-red-600 font-bold`).

Header right side:
- WhatsApp icon button: `w-11 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 hover:scale-105 active:scale-95`, WA brand SVG `w-5 h-5`.
- Its link is `wa.me/{digits(whatsapp_number ?? '6285711696970')}?text=` with "Halo Admin VIDALIDAY, saya ingin tanya ketersediaan sewa apartemen di Makassar."
- Hamburger: `md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100`, icon `w-6`, `onclick="toggleMobileNav()"`.

Mobile drawer `#mobile-nav`:
- Hidden by default. `px-4 pt-2 pb-6 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl space-y-3`.
- Items: `block py-2 text-sm font-semibold text-slate-700`.
- Labels: "Pilihan Apartemen", "Daftar Kamar & Promo", "Fasilitas Gedung", "Lokasi & Landmark Sekitar", "Tanya Jawab (FAQ)", "Tentang Kami (About Us)" (`text-red-600`).

**Footer**
- `mt-20 border-t border-slate-200/80 bg-white/80 backdrop-blur-xl`, inner `max-w-7xl py-14`, `grid md:grid-cols-4 gap-10`.
- Column 1 (`md:col-span-2`):
  - Logo `w-11 h-11` with the same pattern, plus `VIDALIDAY` (`text-2xl font-black`), red "." (`text-2xl font-black`) and `<p class="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Apartment By Us`.
  - Copy: "Katalog digital resmi sewa apartemen harian, mingguan, dan bulanan di Makassar. Menjamin kenyamanan kelas satu, kebersihan terstandarisasi, dan transaksi resmi aman 100%."
  - Legal card `p-4 rounded-xl glass-card border-red-200/60 max-w-md`: shield-check icon in `p-2 rounded-lg bg-red-50 text-red-600`, then "Badan Hukum Resmi" (`text-xs font-bold uppercase tracking-wider`), then `{company_legal_name}` (`text-sm font-bold text-red-700`), then "Jaminan transaksi aman langsung terkonfirmasi ke WhatsApp admin resmi."
- Column 2, heading "Pilihan Lokasi" (`text-xs font-bold uppercase tracking-wider border-l-2 border-red-600 pl-3 mb-4`):
  - "Apartemen Delft CPI (Pantai)" and "Apartemen Vida View (Panakkukang)", each with a red 1.5px dot and `onclick switchLocation('delft-cpi'|'vida-view')`. These are hardcoded.
  - "Fasilitas Gedung", "Akses Lokasi & Landmark", "Tentang VIDALIDAY" (`font-semibold text-red-700`).
- Column 3, heading "Kontak & Layanan":
  - "WA:" (red bold) followed by `{contact_phone ?? '+62 857-1169-6970'}` as a link (`font-mono text-red-700 font-bold`).
  - "Jam Layanan:" `{office_hours ?? '08.00 - 23.00 WITA'}`. The controller default is "Setiap Hari: 08.00 - 23.00 WITA".
  - "Area: Makassar, Sulawesi Selatan".
- Bottom bar (`mt-12 pt-6 border-t text-xs text-slate-500`): "© {Y} VIDALIDAY — Seluruh Hak Cipta Dilindungi. Naungan {company_legal_name}." and "Sewa Apartemen Modern & Tepercaya di Makassar".
- The `contact_email` setting (default `info@vidaliday.com`) is loaded but never rendered.

**Floating WhatsApp**
- There is no round floating FAB. Instead there is a mobile-only sticky bottom bar: `fixed bottom-0 inset-x-0 p-3 sm:hidden z-50 glass-nav border-t shadow-2xl`, inner `max-w-md flex gap-2`.
- Buttons:
  - "Pilih Kamar": `flex-1 py-3 rounded-xl bg-slate-100 border-slate-200 text-xs font-bold`, goes to #katalog-kamar.
  - "Pesan via WhatsApp": `flex-[2] py-3 rounded-xl bg-red-600 text-white text-xs font-extrabold shadow-lg shadow-red-500/25`, WA icon `w-4`, same default WA URL.
- On desktop the header icon is the only WhatsApp entry point.
- Bug: the body has no bottom padding, so the bar covers the end of the footer on mobile.

**Inline layout JS**
- `toggleMobileNav()`.
- Unit-card slider: `nextUnitSlide`, `prevUnitSlide`, `updateUnitSlider`. Translates `.slider-track` by `idx*100/total %`. Updates `.slide-counter` to "`i/N`" (the "Foto" suffix is dropped after the first change). Updates `.slide-dot`: active `bg-white w-3`, inactive `bg-white/40 w-1.5`.
- Touch swipe on `.group/slider`: horizontal movement over 35px.
- `switchLocation(slug)`: swaps the tab classes and toggles `#units-delft-cpi`, `#units-vida-view`, `#facilities-delft-cpi` and `#facilities-vida-view`. The two slugs are hardcoded.

---

## 2. Colors, shadows, radii, type

**Hex values used** (layout `<style>` and `app.css`)
- `#0f172a` (selection text, input text)
- `#fecaca` (selection background)
- `#ef4444` (input focus border, with ring `rgba(239,68,68,.12)` 3px)
- `#e2e8f0` (input border 1.5px)
- `#94a3b8` (placeholder)
- `#f1f5f9` / `#cbd5e1` / `#94a3b8` (scrollbar track / thumb / thumb hover; scrollbar is 7px with fully rounded thumb)
- `#b91c1c` (`.glass-badge` text; background `rgba(254,242,242,.95)`, border `rgba(254,202,202,.85)`)
- `#991b1b → #881337 → #0f172a` (inline 135° gradient on the landmark card headers)
- Gold, unused on home: `#fce99f / #d4af37 / #aa771c` and `#fde48b / #e5b946 / #b8860b`

**Utility classes in `app.css`**
- `.glass-card`: `#fff`, border `rgba(226,232,240,.9)`, shadow `0 1px 4px 0 rgba(30,41,59,.06), 0 4px 16px -4px rgba(30,41,59,.05)`.
- `.glass-card-hover:hover`: border `rgba(254,202,202,.85)`, `translateY(-3px)`, shadow `0 8px 24px -8px rgba(220,38,38,.16)`.
- `.red-glow`: `0 0 30px rgba(239,68,68,.2)`.

**Tailwind color classes by frequency** (layout, home, card, about)
- **Red:** red-600 (text 46, bg 23), red-700 (text 38, bg 10), red-50 (20), red-200 and red-200/80 / /60 / /70 / /90, red-100, red-300, red-500, red-950 (gradient), red-400/15 and red-500/10 (orbs).
- **Slate:** text-slate-500 (33), slate-900 (24), slate-700 (24), slate-800 (23), slate-600 (21), slate-400 (13), slate-300, slate-200. Backgrounds slate-50 (13), slate-100 (11), slate-200, slate-800, slate-900 and slate-900/50 /70 /75 /80 /85 /90, slate-950/85. Borders slate-200/80 /90 /70, slate-100, slate-800.
- **Rose:** rose-300 (6), rose-400, rose-500, rose-600, rose-700, rose-200, rose-50, rose-50/60, rose-100, rose-500/15, rose-950 (gradient).
- **Emerald:** 400, 500, 600, 700, 50, 100 ("Promo Aktif" badge, "Unit Bersih" check, pulse dots, check-in dot, hospital icon).
- **Amber:** 300 (Best Seller text), 400/40 (its border), 100/700 (food landmark icon), 300/30 (hero glow).
- **Purple** 100/700 (mall icon), **teal** 100/700 (road icon).

**Gradients**
- `from-red-950 via-rose-950 to-slate-950`: facility card without a photo, plus blobs `bg-red-500/10 blur-2xl` and `bg-rose-500/15 blur-xl`.
- `from-slate-950 via-slate-950/60 to-black/30` (photo overlay) and `from-slate-950 via-slate-950/40 to-transparent`.
- Unit card image overlay: `from-slate-950/75 via-transparent to-black/30`.
- Hero promo box: `from-red-50 via-rose-50/80 to-red-100/60` with `border-2 border-red-300`.
- `from-red-600 to-rose-600` (icon tile, `bg-gradient-to-tr`).
- Hero glow: `from-red-300/30 via-rose-300/30 to-amber-300/30 blur-2xl`.
- About: text gradient `from-red-600 via-rose-600 to-red-700`; commitment card `from-white via-red-50/30 to-rose-50/40`.

**Shadows**
- Plain: shadow-sm (32), shadow-md (17), shadow-lg (10), shadow-2xl (5), shadow-xl, shadow-inner.
- Colored: `shadow-red-500/20`, `/25`, `/30`, `/10`; `shadow-emerald-500/30`; `shadow-rose-500/20`; `shadow-slate-950/30` (hero card); `shadow-slate-300/60`; `shadow-slate-200/50`.
- Hover: `hover:shadow-xl` (cards), `hover:shadow-2xl` (facility).

**Radii**
- rounded-full (50), rounded-xl 12px (45), rounded-2xl 16px (28), rounded-lg 8px (14), rounded-3xl 24px (10), rounded-md 6px (5), `rounded-[2rem]` 32px (hero featured card), `rounded-[2.5rem]` (glow).

**Type**
- Sizes: text-xs (81), text-[11px] (46), text-[10px] (40), text-sm (32), text-[9px] (11), text-[13px] (2). Headings: text-xl/2xl/3xl/4xl/5xl (about h1 is `lg:text-5xl`).
- Weights: font-bold (84), font-black 900 (35), font-semibold (19), font-extrabold (17), font-medium (13), font-mono (landmark chips, phone).
- Labels are usually `uppercase tracking-wider` (42 uses).

**Spacing**
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
- Sections: `py-12 sm:py-16`.
- Section header: `text-center max-w-2xl|3xl mx-auto mb-8 sm:mb-10 space-y-2`, with a pill (`px-3 py-1 rounded-full glass-badge text-xs font-bold uppercase tracking-wider`), H2 (`text-xl sm:text-2xl|3xl lg:text-3xl|4xl font-black text-slate-900`) and a subline (`text-xs sm:text-sm text-slate-600`).
- Card grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8`.

**Classes that don't exist in Tailwind v3** (they do nothing today)
- `h-84`, `sm:h-84`, `shadow-xs`, `shadow-2xs`, `backdrop-blur-xs`, `animate-fade-in`, and `active:scale-98` (preview-card).

**Patterns not covered by the DESIGN tokens**
1. The whole **rose** scale (50–700 and 950), especially:
   - Strike-through price in `text-rose-500`.
   - "Hemat X%" badge in `bg-rose-50 text-rose-600 border-rose-200`. DESIGN says brand-50/brand-700.
2. **red-950 `#450a0a`** and **rose-900 `#881337`** in the dark gradients. Only night `#020617` and night-rose `#4c0519` are tokens.
3. **slate-600 `#475569`** (main body text, 21 uses) and **slate-800 `#1e293b`** (23 uses, and it's the body color). Only slate-700, 500, 400, 200, 100, 50 and 900/950 map to tokens. slate-300 `#cbd5e1` (bullet separators, scrollbar) is also missing.
4. Semantic accent colors: emerald (success, "Promo Aktif"), amber (Best Seller), purple, teal.
5. Colored shadows (`shadow-red-500/20–30`, `shadow-emerald-500/30`, `shadow-slate-950/30`), `.red-glow`, and blur orbs and blobs.
6. Radii 6px (`rounded-md`), 8px (`rounded-lg`), 32px, 40px and full pills. Unit cards use **24px** (`rounded-3xl`), not the DESIGN 16px.
7. Font sizes 9, 10, 11 and 13px, and weight 900.
8. Overlays: modal backdrop `bg-slate-900/50 backdrop-blur-md`, video `bg-slate-950/85`, glass chips `bg-white/20 border-white/30 backdrop-blur-md`, image chips `bg-slate-900/75`.
9. Gold gradients (only used in preview-client).
10. `.glass-card-hover` lifts 3px. DESIGN says 2px.

---

## 3. Unit card (`partials/unit-card.blade.php`)

**Root**
- `unit-card-item bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl flex flex-col justify-between group`.
- Data attributes: `data-price` (effective price), `data-created` (timestamp), `data-unit-id`.
- `effectivePrice = is_promo_active && promo_price ? promo_price : normal_price`.

**Media**
- `h-56 sm:h-60` (224/240px), `bg-slate-900`, a multi-image slider over `all_images` (`main_image` plus `gallery_images`). Both may be storage paths or http URLs.
- Fallback image: Unsplash `photo-1522771739844-6a9f6d5f14af`.
- Overlay `from-slate-950/75 via-transparent to-black/30`.
- Top-left: `room_type` chip (`bg-white/95 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase`).
- Top-right, in order:
  - If more than one image: counter "1/N Foto" (`bg-slate-900/80 rounded-md text-[9px]`).
  - Promo badge (see badge logic below).
- Bottom-left chips (`bg-slate-900/75 rounded-md text-[10px]`): user icon (rose-300) "Maks. {max_guests} Tamu", and emerald check "Unit Bersih" (static).
- Arrows: `w-8 h-8 rounded-full bg-slate-900/70`, `opacity-80` on mobile, `sm:opacity-0 group-hover/slider:opacity-100`.
- Dots in a pill at bottom-right (`bg-slate-900/50`): active `bg-white w-3 h-1.5`, inactive `bg-white/50 w-1.5`.

**Body** (`p-4 sm:p-5 space-y-3.5`)
- `{locationName}`: `text-[10px] sm:text-xs font-bold text-red-600 uppercase tracking-wider`.
- `<h3>{name}`: `text-base sm:text-lg font-bold text-slate-900 group-hover:text-red-600`.
- Meta line: "{room_type} • {rental_period} • Maks. {max_guests} Tamu" (`text-[11px] text-slate-500`).
- **Price box** `p-3.5 rounded-2xl bg-slate-50 border-slate-100/90 flex justify-between`:
  - Label "TARIF SEWA" (`text-[10px] text-slate-400 uppercase font-bold`).
  - **Active price:** `is_promo_active ? formatted_promo_price : formatted_normal_price`, styled `text-red-700 font-black text-lg sm:text-xl`, followed by "/ {rental_period}" (`text-[11px] text-slate-500`).
  - **Crossed-out price**, shown only if `is_promo_active && normal_price > promo_price`: "Normal:" (slate-400, 10px) then `formatted_normal_price` with `line-through font-semibold text-rose-500 text-[11px]`. It sits under the active price.
  - Price format: `'Rp ' . number_format(x,0,',','.')`, e.g. "Rp 450.000".
- **Description** (if present): `text-xs bg-slate-50/70 p-3 rounded-xl border-slate-100`, prefix "Deskripsi:" in bold. The full text is shown, not clamped.
- **Facilities:** label "FASILITAS KAMAR:" (`text-[10px] slate-400 uppercase`). Each item in `facilities_list` (JSON array of strings) is a plain text chip with no icon: `px-2.5 py-1 rounded-lg bg-red-50/80 border-red-100 text-[10px] sm:text-[11px] text-red-700 font-medium`.

**Badge logic**
- Image top-right:
  - `is_promo_active && promo_badge` → `bg-red-600 text-white font-extrabold rounded-lg shadow-red-500/30` with the `{promo_badge}` text.
  - Else if `is_promo_active` → `bg-emerald-500` "Promo Aktif".
- Price box right side:
  - `is_promo_active && discount_percent > 0` → "Hemat {n}%" (`rounded-xl bg-rose-50 text-rose-600 border-rose-200 font-black`).
  - Else if `is_promo_active && promo_badge` → `{promo_badge}` (`bg-red-50 text-red-700 border-red-200`).
- `discount_percent = round((normal - promo) / normal * 100)` when both are greater than 0 and normal > promo.
- **There is no featured badge and no availability state.** `is_available` is never shown, and units are not filtered by it in the grid.

**Price display bug:** if `is_promo_active` is true but `promo_price` is null, the card shows "Rp 0". `effectivePrice` guards against this; the displayed price does not.

**Footer / CTA** (`p-4 sm:p-5 pt-0 border-t border-slate-100 mt-2`)
- If `youtube_embed_url` exists, two columns:
  - "Video Tur": `bg-red-50 text-red-600 border-red-200 rounded-xl`, YouTube SVG, calls `openVideoModal(url, 'Room Tour {name}')`.
  - "Pesan WA": `bg-red-600 font-extrabold shadow-red-500/20`.
- Otherwise a full-width "PESAN VIA WHATSAPP" button.
- Both call `openBookingModal(name, room_type, locationName, priceDisplay, rental_period, image_url, max_guests)`.
- The card itself is not a link, and no detail page exists.
- YouTube URL handling: `youtu.be/ID`, `?v=ID`, `/embed/ID` and `/shorts/ID` all become `https://www.youtube.com/embed/ID?autoplay=1`.

**How the WhatsApp message is built**
- Dead code: the card's own `$msg` / `$waUrl` (lines 2–9) are never used. That template was: "Halo Admin VIDALIDAY, saya ingin memesan/tanya ketersediaan unit:\n- Lokasi: {loc}\n- Unit: {name} ({room_type})\n- Harga: {price} / {period}\n\nMohon info ketersediaan unit untuk rencana jadwal menginap saya. Terima kasih!"
- Unused setting: `whatsapp_template` (placeholders `{apartment}`, `{unit_name}`, `{room_type}`, `{price}`, `{period}`) is loaded by `HomeController` but no view uses it.
- **The actual message comes from the booking modal in `home.blade.php`** (`submitBookingPlan`):
```
Halo Admin VIDALIDAY, saya ingin memesan unit apartemen dengan rincian berikut:\n\n
📍 Lokasi: {location}\n🏨 Unit: {name} ({roomType})\n💰 Tarif: {price} / {period}\n\n
📅 RENCANA TANGGAL MENGINAP:\n• Check-In: {id-ID long date}\n• Check-Out: {..}\n• Durasi: {duration}\n• Jumlah Tamu: {guests}\n
[\n📝 Catatan Tambahan: {note}\n]
\nMohon info ketersediaan unit untuk jadwal tersebut. Terima kasih!
```
- It opens with `window.open('https://wa.me/{digits}?text='+encodeURIComponent(msg))`.
- Dates are formatted with `toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'})`.

**Booking modal** `#booking-modal`
- Backdrop `fixed inset-0 bg-slate-900/50 backdrop-blur-md z-50`. Panel `glass-card rounded-3xl max-w-lg p-4 sm:p-7 max-h-[92vh] overflow-y-auto`.
- Header: image `w-14 sm:w-20 rounded-2xl`, location (red, 10px uppercase), name (`font-black`), room_type chip (`red-50/red-700`), price (`font-extrabold red-700`), "/ period".
- Hint: calendar icon in `emerald-50`, "Rencana Jadwal Menginap Anda" / "Tentukan perkiraan tanggal agar admin langsung mengecek ketersediaan unit."
- Fields:
  - "Rencana Check-In *": date, default today, min today, emerald dot.
  - "Rencana Check-Out *": date, default today + 1, 7 or 30 days if the period contains "minggu" or "bulan", rose dot.
  - "Jumlah Tamu": select "1 Orang Tamu" … "6 Orang Tamu" and "7+ Tamu / Rombongan", pre-selected to `max_guests`, with the hint "Kapasitas: Maks. N Tamu".
  - "Estimasi Durasi": read-only. Shows "N Malam (N Hari)", "X Minggu Y Hari (N Malam)" or "X Bulan Y Hari (N Malam)". Checkout is forced to at least checkin + 1.
  - "Catatan Khusus (Opsional)": textarea, placeholder "e.g. Ingin lantai tinggi, butuh parkir mobil, atau ada permintaan khusus...".
- Buttons: "Batal" and "LANJUTKAN PESAN KE WHATSAPP". Closes on Esc or backdrop click.
- **There are no name or WhatsApp-number fields**, which the new spec requires.

**Video modal** `#video-modal`: `bg-slate-950/85`, panel `max-w-4xl bg-slate-900 rounded-3xl`, `aspect-video` iframe, "Tutup Video" button. The iframe `src` is cleared on close.

---

## 4. Home page, sections in order

**Data and query rules**
- `HomeController` passes `locations` (with facilities; landmarks where `is_active`, ordered by `sort_order`, `id`; units ordered `is_featured desc, promo_price asc`), `delft` (slug `delft-cpi`), `vida` (slug `vida-view`), `featuredUnit`, `faqs` and `settings`.
- `featuredUnit`: `is_featured` and `is_available` true or null, latest `updated_at`.
- `faqs`: `is_active`, ordered by `sort_order`.
- `settings`: `whatsapp_number`, `whatsapp_template`, `promo_banner_text`, `company_legal_name`, `contact_phone`, `contact_email`, `office_hours`.
- Shared by the composer: `heroImage`, `siteLogo`.

**1. Hero**
- `section relative pt-8 pb-16 md:pt-16 md:pb-24`.
- Full-bleed background `<img>`: `storage/{hero_image}` or `/images/bg_brentsville_wide.jpg`. There is **no dark overlay**.
- Grid `lg:grid-cols-12 gap-10`.
- Left (`col-span-7`), white card `bg-white rounded-3xl p-4 sm:p-8 shadow-2xl shadow-slate-950/30`:
  - Pill `bg-slate-900` with a pulse dot, "SEWA APARTEMEN" (rose-400) • "Makassar", plus a "Best Rate Guarantee" pill (`red-50/red-700`).
  - H1 "Nikmati Hunian Nyaman di", then a red-600 block "Delft & Vida View Makassar" (`text-xl → lg:text-4xl font-extrabold/black`).
  - Bold line "Stay Nyaman, Fasilitas Lengkap, Harga Bersahabat!"
  - Paragraph "Temukan pengalaman menginap yang nyaman, bersih, dan privat bersama VIDALIDAY. Pilihan apartemen terbaik di Delft CPI dan Vida View Makassar, dengan fasilitas lengkap serta promo menarik untuk staycation, liburan, maupun perjalanan bisnis."
  - If `featuredUnit`, a promo box:
    - Coin icon tile.
    - "PROMO" pulse chip, shown only if promo.
    - Label "HARGA SPESIAL MULAI DARI" or "TARIF SEWA TERBAIK".
    - Price `text-lg → lg:text-3xl font-black text-slate-950`, strike price `rose-500`, "/{period lowercased}" in red-700.
    - Chips "HARIAN • MINGGUAN • BULANAN".
  - Otherwise: a "Pilihan Durasi Sewa:" strip.
  - CTAs:
    - "Reservasi via WhatsApp": `rounded-2xl bg-red-600 py-3.5 shadow-lg shadow-red-500/25`. Message: "Halo Admin VIDALIDAY, saya ingin reservasi apartemen (Delft CPI / Vida View Makassar). Mohon info ketersediaan kamar. Terima kasih!"
    - "Lihat Unit": `bg-slate-100 uppercase`, goes to #katalog-kamar.
- Right (`col-span-5`):
  - Gradient glow, then card `rounded-[2rem] bg-white/90 p-4 sm:p-5 shadow-2xl`.
  - Photo `h-64 sm:h-80 rounded-2xl` (`featuredUnit.image_url`).
  - Badge "⭐ Best Seller Panakkukang", **hardcoded** even when the featured unit is at Delft.
  - `promo_badge` (`rose-600`), shown even when the promo is inactive.
  - Two micro tiles: "Kapasitas Tamu / Maks. N Orang" and "Keamanan Resmi / 100% Bebas Penipuan".
  - Price row with a "Pesan Kamar Ini" button that opens the booking modal.
- Fallback when there is no featured unit: a dashed box "Pilihan Favorit Tamu / Admin belum menambahkan unit kamar pilihan favorit…" with a "Lihat Semua Unit" link to `#units-section`. **That anchor doesn't exist.**

**2. Promo strip** (shown if `promo_banner_text`)
- `-mt-4 mb-10 p-4 rounded-2xl bg-white/80 border-red-200/80`: "PROMO" chip (`bg-red-600`), the text, and a "Lihat Promo" button.

**3. `#katalog-kamar`**
- Pill "Katalog Kamar & Promo".
- H2 "Pilih Lokasi & Unit Kamar Sesuai Kebutuhan Anda".
- Sub "Seluruh unit dilengkapi ranjang berkualitas, pendingin ruangan (AC), hiburan Smart TV, WiFi kecepatan tinggi, serta perlengkapan mandi bersih."
- `#lokasi` label "PILIH KATEGORI LOKASI APARTEMEN:". Two hardcoded tab buttons in a `glass-card` (`grid sm:grid-cols-2`):
  - Delft (active by default): emoji icon 🌊, "Apartemen Delft CPI" / "Pantai Losari & Center Point", count badge "{n} Unit".
  - Vida: 🏙️, "Apartemen Vida View" / "Pusat Kota Panakkukang".
  - Active tab: `bg-red-600 text-white shadow-lg shadow-red-500/30 ring-2 ring-red-600`. Inactive: `bg-slate-50 border-slate-200/90`.
- Filter bar `glass-card p-4 rounded-2xl`: funnel icon, "Filter & Urutan Kamar", indicator `#unit-count-indicator`, and a select `#unit-sort-filter` with options:
  - `featured`: "Paling Populer & Rekomendasi"
  - `terbaru`: "Terbaru (Baru Ditambahkan)"
  - `termurah`: "Termurah (Harga Terendah)"
  - `termahal`: "Termahal (Kamar Eksklusif)"
- Per-location group `#units-{slug}`:
  - Info card with a hardcoded chip ("Center Point of Indonesia" • "Waterfront & Sunset View" / "Panakkukang District" • "City Skyline & Sebelah Mall"), `location.name`, `location.description`, and a hardcoded address ("Jl. Metro Tanjung Bunga, Makassar" / "Jl. Topaz Raya, Panakkukang, Makassar").
  - The DB fields `tagline`, `address` and `gmaps_url` exist but are not used here.
  - Grid of unit cards.
  - JS shows only the first 3, with a "Tampilkan Lebih Banyak ({n-3} Kamar Lainnya)" / "Tampilkan Lebih Sedikit (Hanya 3 Kamar)" toggle.
- Sorting runs client-side on the `data-*` attributes. Bug: `featured` sorts by **id asc**, which overrides the server's featured/price order.
- Indicator text: "Menampilkan 3 kamar teratas ({label})" or "Menampilkan semua kamar ({label})".

**4. `#fasilitas`** (toggled per location together with the tabs)
- Pill "Fasilitas Gedung", H2 "Fasilitas Lengkap untuk Kenyamanan Anda", sub "Kenyamanan menginap didukung fasilitas gedung yang siap dinikmati selama waktu sewa Anda."
- Cards `h-80 rounded-3xl`: full-bleed `facility.image_url` with a dark overlay (or the red-950 gradient when there's no image).
- Top: glass chip "Gedung Delft CPI" / "Vida View Panakkukang" plus a hardcoded icon (sparkles for Delft, building for Vida). The `facility.icon` column is **ignored**.
- Bottom: name (`text-lg sm:text-xl font-black text-white`, hover `rose-300`), description (`line-clamp-2`), footer "● Fasilitas Gedung • Akses Penghuni & Tamu".
- Image zooms with `group-hover:scale-110` over 700ms.

**5. `#jarak`**
- Pill "Akses Strategis", H2 "Dekat dengan Berbagai Landmark Makassar", sub "Akses mudah ke tempat wisata, kuliner legendaris, dan pusat perbelanjaan."
- Grid `md:2`, one card per location.
- Header uses the inline gradient `#991b1b → #881337 → #0f172a`: label "Lokasi Strategis" or "Pusat Kota & Bisnis" (by whether the slug contains "delft"), title "Dari Apartemen {name minus leading 'Apartemen '}", chip "Waterfront Living" or "Pusat Panakkukang".
- Landmark rows (`p-3 rounded-2xl bg-slate-50 hover:bg-red-50/70`): icon tile `w-8 h-8 rounded-xl`, name, notes, and a `font-mono font-black` chip for `distance_time`.
- Icons are chosen by keyword:

| Keywords | Icon (current SVG) | Colors | Suggested lucide |
|---|---|---|---|
| bandara, airport | paper-plane | rose; chip also rose | Plane |
| mall, transmart, tsm, pipo | bag | purple | ShoppingBag |
| kuliner, cafe, topaz, pisang epe, seafood | book (odd choice) | amber | Utensils |
| pantai, losari, masjid, benteng, rotterdam, kubah | globe | rose | Landmark or Waves |
| sakit, hospital, siloam, primaya, hermina | building | emerald | Hospital |
| tol, jalan | map | teal | Route |
| anything else | map-pin | slate | MapPin |

  All chips except the airport one use `bg-red-50 text-red-700 border-red-200/80`.
- Card footer: clock icon, "Akses Transportasi Mudah", then "Grab & Gojek Siaga 24 Jam" or "Jalan Kaki Langsung ke Mall".
- Then a **Google Maps embed for Vida View only**, hardcoded:
  - Title "Peta Lokasi: APARTEMEN VIDA VIEW BY VIDALIDAY".
  - Address "Jl. Topaz Raya, Masale, Kec. Panakkukang, Kota Makassar, Sulawesi Selatan 90231".
  - Button "Buka di Google Maps" linking to `maps.app.goo.gl/fkvUg2jpHedbgXXC9`.
  - Iframe `maps.google.com/maps?q=…&z=16&output=embed`, `h-72 sm:h-96 rounded-2xl`.

**6. `#faq`** (`max-w-4xl`)
- Pill "FAQ", H2 "Pertanyaan Seputar Sewa Apartemen", sub "Ketentuan dan prosedur sewa kamar di VIDALIDAY Makassar."
- Static cards, **not an accordion**: question, plus `badge` on the right (`text-red-600`), and the answer always visible.
- The first 3 are shown, with a "Lihat Semua FAQ ({n} Pertanyaan Lainnya)" / "Sembunyikan FAQ" toggle.
- `preview-card.html` "Opsi 1" (lines 1696–1818) shows the intended accordion: numbered circles "01", status chip on the right, chevron that rotates.

**7. Modals:** booking and video (see section 3).

**Animations:** `animate-pulse` dots and the "PROMO" chip, `hover:scale-105`, `active:scale-95`, `hover:-translate-y-0.5`. There is **no marquee or running text, and no carousel** other than the per-card image slider.

**Every emoji and symbol, with suggested lucide replacements**
- `layouts/app.blade.php:83`: "★" in "★ Sewa Harian • Mingguan • Bulanan Makassar" → `Star`
- `home.blade.php:165`: "⭐" in the "Best Seller Panakkukang" hero badge → `Star` or `Award`
- `home.blade.php:301`: "🌊" Delft tab icon → `Waves`
- `home.blade.php:320`: "🏙️" Vida View tab icon → `Building2`
- `home.blade.php:1095–1105`: inside the WhatsApp message text, not the UI: 📍 Lokasi, 🏨 Unit, 💰 Tarif, 📅 RENCANA TANGGAL MENGINAP, 📝 Catatan Tambahan. Decide whether to keep these or switch to plain text or `*bold*` WhatsApp formatting.
- `about.blade.php:57, 68`: "📍" location highlight tiles → `MapPin`
- `preview-client.blade.php`: 65 "🔴", 70 "←", 274 and 302 "📍", 421 "🌊", 428 "🏙️"
- `public/preview-card.html:84`: "⭐"
- "•" separators and "—" dashes are typographic, not emoji.

---

## 5. About page (`about.blade.php`, `AboutController`)

**Settings keys and defaults**

| Key | Default |
|---|---|
| `about_tagline` | "Your Comfort, Our Priority" |
| `about_hero_title` | "VIDALIDAY — Partner Terpercaya untuk Menginap Nyaman di Makassar." |
| `about_intro_p1` | Brand under PT PERDANA MEGA TRANS… |
| `about_intro_p2` | Units at Delft CPI & Vida View… |
| `about_intro_p3` | Cleanliness… |
| `about_commit_title` | "KOMITMEN KAMI" |
| `about_commit_text` | (paragraph) |
| `about_closing_quote` | "VIDALIDAY — Menginap Nyaman, Harga Bersahabat, Pilihan Terpercaya." |
| `about_closing_cta` | "Temukan unit favorit Anda dan nikmati pengalaman menginap yang lebih menyenangkan bersama VIDALIDAY!" |
| `about_reasons` | JSON string |

- The page also uses `whatsapp_number`, whose fallback here is the placeholder `6281234567890`. `contact_phone` falls back to the placeholder `+62 812-3456-7890`. Both differ from the home page defaults.

**`about_reasons` shape:** `[{ "title": string, "desc": string, "icon": "shield"|"sparkles"|"home"|"tag"|"lock"|"chat" }]`
- Admin saves it from the arrays `reasons_title[]`, `reasons_desc[]`, `reasons_icon[]` (default icon "shield").
- Seeded items (`AboutSeeder`):
  - Terpercaya & Berlegalitas / shield
  - Unit Bersih & Nyaman / sparkles
  - Fasilitas Lengkap / home
  - Harga Kompetitif & Promo Menarik / tag
  - Privasi & Keamanan / lock
  - Pemesanan Mudah / chat
- **The view ignores `icon` and always renders a check mark.** Suggested lucide map: ShieldCheck, Sparkles, House, Tag, Lock, MessageCircle.

**Layout** (`section pt-12 pb-16 md:pt-20 md:pb-24`, `max-w-5xl`, `space-y-12`)
1. Centered header:
   - Pill (`glass-card border-red-200/80 text-red-700`, pulse dot) "TENTANG VIDALIDAY".
   - H1 `hero_title` (`text-2xl sm:text-4xl lg:text-5xl font-black`).
   - `tagline` as gradient text (`from-red-600 via-rose-600 to-red-700`, `text-base sm:text-xl font-bold`).
2. Story card (`glass-card rounded-3xl p-5 sm:p-10 shadow-xl shadow-slate-200/50 bg-white/80`):
   - Logo circle 48/56px.
   - `intro_p1` (`font-medium slate-800`), `intro_p2`, `intro_p3`.
   - Two hardcoded location tiles (`grid sm:grid-cols-2`):
     - "APARTEMEN 1 / Delft CPI Makassar / Tepi Laut CPI & Sunset Losari": `bg-red-50/60`, icon tile `bg-red-600` with 📍.
     - "APARTEMEN 2 / Vida View Makassar / Jantung Komersial Panakkukang": rose variant.
   - `$locations` is passed to the view but not used.
3. Reasons:
   - Pill "Keunggulan Kami", H2 "MENGAPA MEMILIH VIDALIDAY?", sub "Standar pelayanan terbaik untuk setiap momen menginap Anda di Makassar."
   - Grid `md:2 lg:3 gap-5`. Cards `glass-card rounded-2xl p-5 sm:p-6`, hover `border-red-300`. Icon tile `w-10 h-10 rounded-xl bg-red-50 text-red-600`, switching to `bg-red-600 text-white` on hover.
   - Empty state: "Data keunggulan sedang diperbarui."
4. Commitment card (`rounded-3xl border-red-200/80 p-6 sm:p-12`, gradient white → red-50/30 → rose-50/40, centered):
   - Pill `commit_title` (`bg-red-100/80 text-red-800`), `commit_text`.
   - `"closing_quote"` between `border-y red-200/60`, `font-black`.
   - `closing_cta`.
   - Buttons: "LIHAT UNIT KAMAR KAMI" (red-600, goes to `/#katalog-kamar`) and "Hubungi via WhatsApp" (glass, red dot). Message: "Halo Admin VIDALIDAY, saya ingin konsultasi sewa apartemen di Makassar."

---

## 6. Images in `public/images`

| File | Real format and size | Used in |
|---|---|---|
| `logo_vidaliday.png` | **Actually a JPEG**, 1024×1024. Byte-identical to `logo_vidaliday.jpg` | Fallback logo when `site_logo` is empty: header, footer, about, admin layout, admin login, admin settings |
| `logo_vidaliday.jpg` | JPEG 1024² | Unused (duplicate) |
| `bg_brentsville_wide.jpg` | 1024×576 | Home hero background fallback (when `hero_image` is empty), featured card image fallback, admin settings preview |
| `hero_aerial_vida_view.jpg` | 574×1024 portrait. Identical to `bg_jumbotron_vida.jpg` | preview-client hero background and Vida View building card; preview-card |
| `hero_delft_cpi_entrance.jpg` | 1024×682. Identical to `bg_jumbotron_delft.jpg` | preview-client Delft building card; preview-card |
| `hero_delft_cpi.jpg` (307×336), `hero_vida_view.jpg` (327×336), `building_delft_cpi.jpg` (280×270) | Low resolution | Only `preview-card.html` |
| `bg_brentsville_tower.jpg` (1024×786), `building_vida_view.jpg` (320×315), `buildings_panorama.jpg` (610×340), `client_hero_card.jpg` (935×518) | | **Unused** |
| `client_hero_full.jpg` = `client_hero_reference.jpg` | 1024×576, identical | **Unused** (client reference mockup) |
| `client_pmt_logo.png` (PT PMT logo, 56×46), `client_vidaliday_logo.png` (63×63) | Real PNGs, tiny | **Unused** |
| `bg_jumbotron_delft.jpg`, `bg_jumbotron_vida.jpg` | Duplicates of the hero files above | **Unused** |

- Unit images come from `storage/` paths or http URLs. Fallbacks are Unsplash `photo-1522771739844-6a9f6d5f14af` (cards) and `photo-1545324418-cc1a3fa10c00` (modal).
- Facility images come from `facility.image_url`.
- `Location.hero_image` is seeded with Unsplash URLs and is not used on the public pages.

**Suggestions for the port**
- Best building photos for the new hero apartment chooser: Vida View → `hero_aerial_vida_view.jpg` (portrait); Delft → `hero_delft_cpi_entrance.jpg` (landscape); wide hero → `bg_brentsville_wide.jpg` or `bg_brentsville_tower.jpg`.
- Rename the logo to `.jpg` or convert it to a real PNG/WebP before using it with `next/image`.