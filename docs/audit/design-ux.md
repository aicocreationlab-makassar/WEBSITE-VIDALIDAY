> Laporan desain Fase 0 (15 Okt 2026). Path Laravel di laporan ini relatif ke root lama; sekarang semuanya ada di `legacy-laravel/`.

# VIDALIDAY v2: mobile booking UX and fidelity review

## 0. New facts checked in this pass (not in the audits)

**Unit photos** (`storage-backupunits/units`, 52 files, no duplicate hashes):
- **24 are iPhone screenshots of video frames, not photos.** That is all 15 files at 589×1280 and all 9 at 736×1600. Each has black letterbox bars covering about 9% at the top and 9% at the bottom, plus the white iOS home-indicator bar at the bottom. The real picture is about 589×1040 (9:16). I opened 2lApJj, 2KfNTA, 91650S, tOqIOg and wennZh, and all five match.
- 2 are clean 9:16 frames: coTbZu at 734×1280 and oOF7HL at 725×1280.
- About 12 are roughly 3:4: 761–785×1024, 960×1280, 1200×1600 and 828×1210.
- 4 are near-square portrait (1320×1400–1485).
- 10 are landscape.
- So any `object-contain` view (lightbox, contain over a blurred backdrop) will show the black bars and the home-indicator bar. The draft plan's "lightbox foto utuh (object-contain)" has this defect.
- 52 photos for about 45 units means most units have 1–2 photos.

**Hero image:**
- The current `hero_image` (`settings/HaUY…jpg`, 941×638) is a pool photo. It is the same size, 182,880 bytes, as `facilities/WKhakU…jpg`, so it is a facility photo, not the building that DESIGN §1 calls for.

**Legacy images in `public/images`:**
- Real building photos:
  - `bg_brentsville_tower.jpg` (1024×786, Vida View, Brentsville tower)
  - `bg_brentsville_wide.jpg` (1024×576)
  - `hero_delft_cpi_entrance.jpg` (1024×682, Delft)
  - `hero_aerial_vida_view.jpg` (574×1024, portrait)
- AI composites with text and gold styling baked in: `client_hero_full.jpg`, `client_hero_card.jpg`, `buildings_panorama.jpg`. Never use these.

**Amenity backfill:**
- `backfill_v2()` turns every free-text `facilities_list` item with no alias into an amenity with icon `check` and sort 50. That breaks the owner's "fasilitas kamar … masing-masing icon sesuai".

**Reference screenshot:**
- The tabs sit on the card's top edge.
- Each field row has an icon on the left and a chevron on the right, with one full-width button.
- The whole card is visible without scrolling at about 390×700.

---

## 1. Gap list

| # | Gap | Where | Acceptance check |
|---|---|---|---|
| G1 | PRD §4.1 says the hero must answer "mulai berapa", but the §6.2 hero spec has no price line. | `components/public/hero-search.tsx` | Under the segmented control: "[building-2] 24 unit tersedia · mulai **Rp250rb**/malam". It updates when the apartment changes. Values equal the count and minimum `effective_price` of that apartment's published, available units. |
| G2 | No check that the hero card fits on screen. | Home page | Playwright at 390×664, 375×548 and 360×640, with and without the promo banner: the bottom of the "Cari unit" button is ≤ `innerHeight`. |
| G3 | Backfilled free-text amenities show a generic `check`, which breaks the brief. | `lib/icons.tsx`, unit detail, cards, filter | `resolveAmenityIcon(name, icon)` guesses the icon from the name whenever the icon is `check` or unknown. Vitest runs every amenity name from the Phase 2 query through it; unresolved names are listed in PROGRESS. |
| G4 | The map may not land on the building: `latitude`/`longitude` are null and `gmaps_url` is a `?q=` search link. | `components/public/location-map.tsx` | Embed query falls back to `${name}, ${address}`. Phase 4 includes screenshots of both apartment maps showing the correct pin. |
| G5 | The hero type list will show "belum tersedia" for Vida Studio Plus, 2 Bedroom Corner and 3 Bedroom, which looks like empty stock. | Data, plus admin bulk actions | Phase 2 read query of unit counts per `room_type`. Add "Ubah tipe kamar" to admin bulk actions (not in the PRD §7.4 list). Go-live gate: every active type has at least 1 unit, or the owner accepts "belum tersedia" or turns the type off. |
| G6 | PRD shows the sticky CTA only after the gallery scrolls past. The brief asks for a clear CTA. | `components/public/sticky-book-bar.tsx`, root `layout.tsx` | Show it from first paint, and record this deviation in PROGRESS. Requires `export const viewport = { viewportFit: 'cover', interactiveWidget: 'resizes-content' }`. At 390×664 the bar is visible, `padding-bottom` uses `env(safe-area-inset-bottom)`, and no content sits hidden under it. |
| G7 | Letterboxed screenshots show bars and the home-indicator bar in the lightbox and in contain frames. | Gallery and lightbox | See §3: an image whose width/height ratio is under 0.5 is shown in a 9:16 frame with cover. Screenshot check of lightbox photo 1 for unit "wennZh" (or any 589×1280 unit). |
| G8 | Gallery spec assumes many photos ("1/8", 1 large + 4 small), but most units have 1–2. | Gallery | Layout varies by photo count (§3c). With one photo there is no counter, dots or "Lihat semua". |
| G9 | "Promo pilihan" and its fill rule can pick units with stock photos or units marked penuh. | `lib/data/units.ts` `getFeaturedUnits` | Exclude `isStockPhoto` / no-photo units and `is_available = false`, both for the featured set and for the "diskon terbesar" fill. |
| G10 | Stale `promo_badge` values ("Hemat 27% (Best Seller)" on a 7% discount). | `lib/pricing.ts` `badgeFor(unit)` | Rule in §4.3, with unit tests. |
| G11 | The old site let guests book straight from the card; v2 adds a step (card → detail → book). | `/unit/[slug]` | The detail page must stay cached: never read `searchParams` on the server there. Build output must not show it as dynamic (ƒ). |
| G12 | The cleanup in PRD §8 and SETUP §7C has no admin UI support. | `lib/admin/data-health.ts`, unit list | "Perlu dicek (n)" quick filter. Flags:<br>- tower or floor empty<br>- guest count below the type default minus 2<br>- promo label with "%"<br>- stock or missing photo<br>- letterboxed photo<br>- amenity with `check` icon<br>- non-nightly `rental_period` |
| G13 | "tambahkan jenis apartemen": a new apartment with 0 units must not appear in the hero (PRD §7.5). | `lib/data/locations.ts` | Hero, menu and filter list apartments that are active and have ≥1 published unit. With more than 3 apartments, the segmented control becomes a dropdown. A test location with 0 units does not appear. |
| G14 | PRD §6.5 step 6 (confirmation after returning from WhatsApp) has no mechanism. | `booking-sheet.tsx` | sessionStorage `vdl:lastLead` plus a `pageshow` listener (fires on bfcache restore) shows the success panel, with a "Belum terbuka? Buka WhatsApp lagi" link. |
| G15 | Guests arrive from WhatsApp and Instagram, so the link preview is their first impression. | OG route | `og:image` is JPEG or PNG, 1200×630, under 300 KB, checked with `curl -sI`. A `next/og` PNG with a full photo can exceed this; fall back to the plain default OG image. |
| G16 | iOS zooms into inputs smaller than 16px. | All forms | Computed `font-size` ≥ 16px on every input, select and textarea. |
| G17 | FAQ answers mention a "Pesan via WhatsApp" button that no longer exists, and contain markdown `*`. | FAQ render | Strip `*`. Hide `badge` on public pages. Include the owner FAQ question (§4). |
| G18 | `company_legal_name` is "PT PERDANA MEGA TRANS", which breaks DESIGN's no-all-caps rule. | Trust line, footer | Display helper (§4.7), plus an owner question. |
| G19 | Free-text amenities would flood the filter's amenity chips. | `/sewa` sheet | Show only amenities used by at least 2 published units, sorted by `sort_order`, at most 10, then "Lihat semua (n)". |
| G20 | The draft plan has no visual QA tooling and no way to record deviations from the docs. | All phases | Pin `@playwright/test` as a devDependency (reason recorded in PROGRESS). `web/e2e/viewport.spec.ts` covers:<br>- hero fit (G2)<br>- sticky bar (G6)<br>- no horizontal overflow at 360px (`scrollWidth <= innerWidth`)<br>- screenshots at 390 and 1280 per page<br><br>Update DESIGN.md §4.8/§7 when a deviation is accepted. |

---

## 2. Component recommendations

### 2.1 Hero search card, mobile (390px)

**Header and banner**
- Header is 56px on mobile.
- Promo banner (when set): 36px, one line with ellipsis, the whole bar links to `/sewa?urut=diskon`, close button has a 44px hit area.

**Photo**
- Height `clamp(232px, calc(100svh - 300px), 340px)`. Subtract another 36px when the banner shows.
- `object-cover`, `priority`, `sizes="100vw"`.
- Gradient from `night/80` at the bottom to `night/10` at the top.
- Title: 30/36, weight 800, white, at most 2 lines.
- Subtitle: 15/22, white at 90%, `line-clamp-2`.
- The title block ends 16px above the card.

**Card**
- `-mt-16` (overlaps the photo by 64px), `mx-4`, radius 24, padding 16, gap 12, `shadow-raised`. Total height about 290px.

**Apartment segmented control**
- Native `<input type="radio" name="lokasi">` inside a `<fieldset>` with an sr-only legend. This gives arrow-key behaviour and a working submit without JavaScript.
- Height 44px, label is `short_name` at 15px weight 700, truncated.
- Under it, the G1 helper line at 13/18 `ink-2`, with the price in `ink` weight 700.

**Field triggers**
- `<button type="button" aria-haspopup="dialog">`, 56px tall, 1.5px border in `line`, radius 12.
- 20px icon in `brand-600` on the left (`bed-double` / `wallet`).
- Label 13/500 `muted` above the value at 16/600 `ink`, chevron on the right.
- Hidden inputs `tipe`, `min`, `max` are rendered `disabled` while empty, so a submit with nothing chosen goes to exactly `/sewa?lokasi=vida-view` (PRD acceptance).
- This replaces draft plan decision 4: no native `<select>` swapped in after hydration, which avoids a flash and duplicate markup.

**Type sheet**
- Radix Dialog sheet with `side="bottom"`, top radius 24, `max-h-[85svh]`.
- Header 56px: "Pilih tipe kamar", subtitle "di Vida View", 44px close button.
- Rows are 56px, `role="radio"`: name at 16/600 on the left, "9 unit" at 14/500 `ink-2` on the right.
- Selected row: `brand-50` background, `check` icon in `brand-600`, text `brand-700`.
- Disabled row: name in `muted`, "belum tersedia" on the right, `aria-disabled`.
- First row is "Semua tipe" with the total count.
- Tapping a row selects it, closes the sheet, and returns focus to the trigger. Changing apartment resets the type.

**Budget sheet**
- Quick-pick rows, 56px, each with a live count for the selected apartment: "Rp300rb – Rp500rb · 8 unit". Rows with 0 units are disabled with "tidak ada unit".
- Bucket parameters (bounds are inclusive; covered by tests):

  | Bucket | Query |
  |---|---|
  | Di bawah Rp300rb | `max=300000` |
  | Rp300rb – Rp500rb | `min=300000&max=500000` |
  | Rp500rb – Rp1jt | `min=500000&max=1000000` |
  | Di atas Rp1jt | `min=1000000` |

- "Atur sendiri" expands inside the sheet:
  - Radix Slider with two thumbs, step 50000, bounds = that apartment's minimum and maximum price rounded down/up to Rp50.000.
  - Two 48px inputs ("Minimum", "Maksimum", `inputmode="numeric"`, shown as "Rp350.000").
  - Live text "12 unit dalam rentang ini".
  - Sticky 52px "Terapkan" button.
- Field value text: "Rp300rb – Rp500rb", "Di bawah Rp300rb", "Mulai Rp1jt".

**Shared data**
- One cached `getSearchIndex()` returns rows `{id, l, t, c, p, g, a[], av}` (about 3 KB for 45 units).
- It powers the hero counts, the budget counts, and the `/sewa` "Tampilkan n unit" button.

**Desktop**
- Same content in 360px popovers. One row: `[Tipe kamar] [Budget per malam] [Cari unit]`, with the segmented control above.

**Bottom sheets: no `vaul`**
- Use the shadcn Sheet (Radix Dialog) with a decorative 36×4 handle, overlay tap, Esc and a close button. `vaul` is not in the pinned list.

### 2.2 Unit card

**Image**
- 4:3, `object-cover`, `object-position: 50% 55%`.
- `sizes="(max-width:767px) 92vw, (max-width:1279px) 46vw, 380px"`; in carousels, `82vw`.
- Wrapper background `surface-2` (no white flash while loading).

**Badges** (top-left, at most 2)
- "Penuh" replaces the discount badge.
- Otherwise `badgeFor()`: "Hemat X%" when the discount is ≥5%, or a valid custom label.
- "Unggulan": white pill with `sparkles` icon.
- Penuh units: image at `grayscale(.6)`.

**Body** (padding 16)
- Place line, 14px `muted`, built by `formatUnitPlace()`:
  - "Vida View · Tower Ashton lt. 26" when tower and floor exist
  - "Vida View · Lantai 26" when only the floor exists
  - "Vida View · Panakkukang" (area) when neither exists
  - Never broken fragments like "Tower  lt.".
- Name: 18/700, `line-clamp-2`.
- Specs: `bed-double` + type name, `users` + "Maks. 3 tamu".
- 3 canonical amenities (`sort_order < 50`) with resolved icons, 13px `muted`, no wrapping.
- Price: "Rp280.000" at 20/800 tabular + " /malam" at 14px `muted`. Struck-through price at 13px `muted` only when the promo is active and `normal > promo`.

**Structure and photo swipe**
- `<article>` with the title `<a>` stretched over the card (`after:absolute after:inset-0`). Slider buttons sit at `z-10` above it, so there are no interactive elements nested inside a link.
- Swipeable photos (CSS scroll-snap, at most 5, all but the first lazy, dots only when there are 2 or more) only in the `/sewa` grid.
- Carousels (promo, unit serupa, terakhir dilihat) show one photo per card, to avoid a swipe inside a swipe.

**No photo**
- `surface-2` background, 40px `building-2` icon in `subtle`, "Foto segera hadir" at 13px `muted`.

### 2.3 `/sewa` filters

**Sticky bar** (`top-14`, 52px)
- Two half-width secondary buttons:
  - `[sliders-horizontal] Filter` with a 20px `brand-600` count badge (number of active groups)
  - `[arrow-up-down] Rekomendasi` (shows the current sort)

**Summary**
- H1 at 22/28: "24 unit di Vida View" or "24 unit di semua apartemen", with `aria-live`.
- Active-filter chips scroll horizontally (36px tall, 44px hit area), followed by a "Hapus semua" ghost button.

**Filter sheet** (`h-[100dvh]`)
- Header: "Filter" and a close button.
- Sections, 24px apart:
  1. Apartemen: chips including "Semua".
  2. Tipe kamar: chips with counts, "(0)" disabled. With "Semua apartemen", show Studio / 1BR / 2BR / 3BR chips that set `kategori`.
  3. Budget: the same quick picks as 2-column chips, plus the slider.
  4. Jumlah tamu: stepper with 44px buttons, 1 to "10+".
  5. Fasilitas kamar: icon chips per G19.
  6. "Tampilkan unit penuh": switch.
- Sticky footer: `Reset` (1fr, secondary) and `Tampilkan 12 unit` (2fr, 52px), with the count recomputed from the index.
- When the count is 0, the button is disabled, reads "Tidak ada unit yang cocok", and the hint "Coba naikkan budget atau pilih tipe lain." appears above it.

**Navigation and history**
- Apply uses `router.push` (a new history entry, so Back restores the previous filters). Scroll to the results top and move focus to the H1.
- "Muat lebih banyak" uses `router.replace(..., {scroll:false})`.
- Sort sheet: 5 rows of 56px; tap selects, closes and pushes.

**Desktop**
- 280px sticky sidebar that applies changes instantly; the slider is debounced by 300ms.

### 2.4 Unit detail page (mobile order)

1. Gallery (§3b): counter pill bottom-right only when there are 2 or more photos; "Video tur" pill with `play` icon bottom-left.
2. H1 at 26/32; place line with `map-pin` and a "Lihat peta" link (target has `scroll-margin-top: 72px`).
3. Price at 28/34, with:
   - struck-through price and badge
   - "/minggu" and "/bulan" rows only when set
   - "Harga final dikonfirmasi admin."
   - Penuh units: "Penuh" badge, then "Unit serupa yang tersedia" right here.
4. Key facts as 2-column tiles (24px `brand-600` icon, 13px `muted` label, 16/700 value). Empty facts are hidden, never shown as "Lantai –".
5. Fasilitas kamar: 2-column grid, 20px icons, 8 shown, then "Lihat semua (n)" opens a sheet.
6. Description: 4 lines plus "Selengkapnya", with `*` removed.
7. Info menginap: check-in and check-out tiles with `clock` icons, the requirements line, and the house rules accordion.
8. Lokasi: lazy iframe (240px), address, "Buka di Google Maps", 5 landmarks, then "Lihat semua".
9. Fasilitas gedung: carousel of 4:3 cards with icon and name.
10. Unit serupa.
11. FAQ (3–5 items).

**Sticky bar, always on (G6)**
- 72px plus the safe area, white, `shadow-sticky`.
- Left: price at 20/800 + "/malam", struck-through price below.
- Right: "Sewa sekarang", ≥50% of the width, 52px tall.
- Penuh units: "Tanya ketersediaan".
- Page `padding-bottom` = bar height + safe area + 16px.

**Desktop**
- Content column `1fr` plus a 360px sticky booking card (top 88px): price, check-in/check-out, guests, a live estimate, and "Sewa sekarang", which opens the modal pre-filled.

### 2.5 Booking sheet (mobile, full height)

**Layout**
- Header: "Atur rencana menginap" at 18/700, 44px close button. A summary row below: 56px thumbnail, name at 15/700, "Vida View · Rp280.000/malam".
- Scrollable body.
- Footer is `position: sticky` inside the scroll container, not `position: fixed`, so it stays clear of the keyboard. It holds the estimate line and a 52px button.
- The two microcopy lines and the "Kebijakan privasi" link go at the end of the body, which keeps the footer at 100px or less.

**Fields**
- Order follows the brief and the PRD: Nama → WhatsApp → Check-in / Check-out → Tamu → Keperluan → Catatan → Ingat data.
- If saved data exists, name and number collapse into one row: "Atas nama Budi Santoso · 0812-3456-7890 [Ubah]". The dates are then the first thing to fill in.
- Inputs are 52px with 16px text.
  - Name: `autocomplete="name"`.
  - Phone: `autocomplete="tel"`, `inputmode="tel"`.
  - All: `enterkeyhint="next"`.

**Dates**
- Native `type="date"`, two columns, `min` = today in WITA, `max` = +365 days.
- Defaults: today and tomorrow (or the values from the desktop card), so an estimate shows straight away.
- If check-in moves to or past check-out, check-out moves to keep the previous number of nights (at least 1).
- Under the inputs, a WITA-formatted summary: "Sab, 18 Okt → Sen, 20 Okt · 2 malam". Native inputs follow the device locale, so this line keeps the format Indonesian.
- Style empty iOS date inputs with `appearance:none; min-height:52px; text-align:left`.

**Guests**
- Stepper with 44px buttons, range 1–30, prefilled from client-side sessionStorage `vdl:lastSearch.tamu`.
- Above `max_guests`: a non-blocking warning with `triangle-alert`: "Unit ini untuk maks. 3 tamu. Lihat unit untuk 4 tamu" linking to `/sewa?lokasi=…&tamu=4`.

**Other fields**
- Keperluan: single-select pills, 40px.
- Catatan: textarea with a "0/500" counter.
- "Ingat data saya": unchecked by default.

**Estimate**
- `aria-live="polite"`.
- With dates: "Estimasi Rp560.000 untuk 2 malam", adding "(tarif mingguan)" or "(tarif bulanan)" when that rate applies.
- Without dates: "Pilih tanggal untuk melihat estimasi".

**Validation**
- On blur and on submit. On submit, focus the first invalid field and `scrollIntoView({block:'center'})`.

**Submit**
- Red button with the WhatsApp icon, "Kirim via WhatsApp". While working: "Menyiapkan pesan…" for at most 4 seconds.
- Desktop new tab:
  1. `const w = window.open('', '_blank')` (no `noopener`)
  2. `w.opener = null`
  3. set `w.location` when the action returns
  4. if `w` is null, fall back to the same tab.

**After returning**
- Success panel: "Permintaan terkirim ke WhatsApp. Admin membalas di jam layanan, 08.00–23.00 WITA." plus the request code.
- Outside service hours (parsed from `office_hours`): "Saat ini di luar jam layanan. Admin membalas mulai 08.00 WITA."

**Error codes**
- Map `TEXT_TOO_LONG` and any unknown error to a generic message, then continue to WhatsApp.

**Honeypot**
- Off-screen field with `tabindex=-1` and `autocomplete="off"`.

### 2.6 Recommendations

**Unit serupa**
- H2 "Unit serupa" with the line "Dipilih dari tipe, harga, dan fasilitas yang mirip" (14px `muted`).
- `lib/recommend.ts` returns one `reason` per candidate, shown as a single 13px chip with an icon, in this priority:
  1. "Lebih hemat Rp20rb" (same category, at least Rp10rb cheaper; success colour)
  2. "Muat 5 tamu" (larger capacity)
  3. "Gedung sama"
  4. "Tipe sama"
  5. "View sama"
- The chip shows why a unit was picked, which is what the brief means by "pelajari agar cocok".
- Mobile: scroll-snap carousel, cards at 82% width. Desktop: 3-column grid, 2 rows.
- At most 3 units of exactly the same type (PRD).
- The server renders the stage-1 order. The client re-ranks right after hydration; the section is far below the fold, so nobody sees a reshuffle.
- `recommendation_click` event with position.

**Terakhir kamu lihat**
- Client-only compact row (64px thumbnail, name, price) with a "Hapus riwayat" button.
- On `/sewa`, place it after the results, not above them, to avoid layout shift. On the home page it is block 4, below the fold.

### 2.7 Admin unit list on mobile

**Toolbar**
- Topbar 56px (menu, title, "Lihat situs" icon).
- Sticky toolbar:
  - 48px search: `search` icon, clear `x`, placeholder "Cari nama unit, tower, tipe…", 300ms debounce, URL param `q`
  - 48px square "Filter" button with a count badge; opens a sheet with apartment, type, status and sort

**Quick chips** (horizontal scroll)
- "Semua 45 · Perlu dicek 9 · Penuh 3 · Promo aktif 12 · Draft 2 · Unggulan 6".
- Below them: "23 dari 45 unit · Reset filter".

**Rows**
- 72px thumbnail.
- Name at 16/700, one line.
- "Vida View · Studio · lt. 26" at 13px `muted`.
- Price row is a button that opens a quick-price bottom sheet: normal price, promo price, switch, the "Tamu melihat: …" preview, and a 52px "Simpan harga". Target under 30 seconds.
- Status badges.
- 44px `ellipsis` button opens an action sheet:
  - Edit
  - Ubah harga
  - Tandai penuh/tersedia
  - Jadikan unggulan
  - Duplikat
  - Lihat di situs
  - Hapus (red, separated from the rest)

**Bulk mode**
- A "Pilih" button turns on checkboxes. A bottom bulk bar offers Tersedia, Penuh, Promo on/off, Tampil/Sembunyi and **Ubah tipe kamar**.

**Search implementation**
- Fetch every unit (fewer than 200) and filter, sort and paginate with the pure function `lib/admin/unit-query.ts`, covered by tests.
- Matching:
  - every token must match
  - case-, space- and punctuation-insensitive (`at26x` finds "AT 26X")
  - searches name, slug, tower, type name and apartment `short_name`
  - example: "vida 2br corner" finds "2BR CORNER BV 19V"
- Pagination: 20 per page, mobile pager "‹ 1/3 ›".

---

## 3. Portrait photos

**(a) Cards: 4:3 cover at `object-position: 50% 55%`.**
- On a 589×1280 frame, the 4:3 slice is 442px tall, which is 34.5% of the height. Centred at 55%, it spans 38–72% of the height, inside the real picture (9–91%). The black bars and the home-indicator bar never show, and the slice catches the furniture rather than ceiling or floor.
- A 358px card uses about 1.6× the source pixels, which looks acceptable.
- No blurred backdrop: on 12 cards it costs GPU on cheap Android phones and halves the visible photo.
- No 4:5 cards: only about 1.4 cards fit per screen, which slows scanning.

**(b) Mobile detail gallery: `aspect-ratio: 4/5; max-height: 60svh`, cover at 50% 55%, full width.**
- The 4:5 slice spans 26–84% of the height, also inside the real picture.
- In practice this is about 1:1 on iPhone Safari and 4:5 on tall Android phones.
- It shows about twice as much of the room as 4:3, and it is Instagram's native shape for an audience that comes from Instagram.
- The always-on bar keeps the price visible.
- Landscape sources (10, all at least 1280px wide) lose their sides but have the resolution for it.
- Not contain over blur: a contained 9:16 photo would be about 170px wide on a 390px screen, which looks small and cheap.
- This deviates from DESIGN's 4:3, so record it and update DESIGN §4.8/§7.

**(c) Desktop grid: fixed 440px height, layout by photo count, all cover 50% 55%.**

| Photos | Layout |
|---|---|
| 1 | One 16:9 frame: `contain` over a blurred copy of the same photo (`blur(28px) scale(1.1) brightness(.85)`), with the 9:16 trim from (d) |
| 2 | Two halves |
| 3–4 | Large tile plus 2 stacked |
| 5 or more | Large tile plus a 2×2 grid, then "Lihat semua foto (n)" |

- The large tile is 50% of the width (about 404×440). This replaces the 2:1 wide tile, which would upscale a 589px portrait photo and cut it into a narrow strip.

**(d) Lightbox**
- `night` at 95%, `object-contain` within `100vw × (100dvh − 120px)`, counter "3/8", 44px close button, thumbnail strip on desktop.
- Letterbox fix: in `onLoad`, if `naturalWidth / naturalHeight < 0.5`, show the photo inside a 9:16 frame with cover. That crops exactly the bars and the home-indicator bar.
- Optional upgrade: `lib/image-meta.ts`.
  - Range-fetch the first 64 KB and parse the JPEG SOF, PNG IHDR or WebP VP8X header.
  - Cache it by URL with `'use cache'` and `cacheLife('max')`; uploads are uuid-named and never change.
  - This lets the server choose grid layouts and pass real `width`/`height`.

**Permanent fix at upload**
- In the admin uploader, run `trimLetterbox(imageData)` before WebP compression.
  - Scan rows from the top and bottom. A row is a bar when at least 96% of its pixels have luma under 20.
  - At the bottom, also drop rows that are bars outside the middle 50% (the home-indicator bar).
  - Vitest with synthetic ImageData.
- Uploader hint: "Pakai foto asli kamera (bukan screenshot), horizontal, minimal 1600px."
- P1: admin bulk action "Rapikan foto lama", run by the owner, which re-encodes the legacy photos with the same function.

---

## 4. Data quality: how the UI copes, and what to ask

1. **Empty Vida types.**
   - UI: keep the disabled rows per the PRD.
   - Fix: write `supabase/data-fixes/01_room_types.sql` (not a migration; the owner runs it) with preview SELECTs that map by name:
     - `~* 'corner'` → 2 Bedroom Corner (Vida)
     - `~* '3\s*(br|bed)'` → 3 Bedroom
     - `~* 'studio\s*(plus|\+)'` → Studio Plus
   - Also add the bulk "Ubah tipe kamar" action.

2. **Tower and floor empty.**
   - UI: `formatUnitPlace` falls back to the area, empty key-fact tiles are hidden, and the WhatsApp "Lokasi unit:" line is dropped.
   - Fix: `02_tower_floor.sql` with a preview that parses name codes (AT → Ashton, BV → Brentsville, leading floor digits). The owner confirms what the codes mean first.

3. **Stale promo labels.**
   - Rule in `badgeFor()`: show the custom label only when the promo is active, it contains no `\d+\s*%`, it is 24 characters or fewer, and it is not "Promo Spesial". Otherwise compute "Hemat X%" (≥5%).
   - Fix: `03_promo_badge.sql` sets these to null. The edit form shows a legacy label longer than 24 characters with an inline note to shorten it.

4. **Unsplash stock photos.**
   - `lib/media.ts` `isStockPhoto()` treats any `images.unsplash.com` URL as "no photo": show the placeholder, exclude from Promo pilihan and OG images, and rank last in "Rekomendasi".
   - Apartment cards fall back to `web/public/images/locations/vida-view.jpg` (from `bg_brentsville_tower.jpg`) and `delft-cpi.jpg` (from `hero_delft_cpi_entrance.jpg`).

5. **Hero is a 941px pool photo.**
   - Default fallback becomes a real building photo.
   - Desktop hero sits inside the 1200px container with radius 24, not full-width at 1440 (1.27× upscale instead of 1.53×), with a strong gradient.
   - P1: switch the hero photo when the apartment changes, using `locations.hero_image`, only when both apartments have real photos.

6. **`office_hours` reads "Setiap Hari: 08.00 - 23.00 WITA".**
   - `formatOfficeHours()` removes a leading "Setiap hari:" and turns "-" into "–", which gives "setiap hari, 08.00–23.00 WITA".
   - Settings hint: "Tulis jam saja, contoh 08.00–23.00 WITA".

7. **Legal name in caps.** `toDisplayLegalName()` keeps PT/CV/Tbk in capitals and title-cases the rest. Ask the owner to store the mixed-case name.

8. **Long promo banner ("FLASH DEAL … hingga 30%").** Shown on one line with ellipsis; the settings field gets a counter suggesting at most 60 characters.

9. **FAQ text.** Strip `*` and hide badges; the owner question is listed below.

10. **Free-text amenities.**
    - Keyword map in the resolver:
      - ac → `air-vent`
      - wifi/internet → `wifi`
      - tv → `tv`
      - netflix → `clapperboard`
      - heater / air panas → `shower-head`
      - dapur / kitchen / kompor / rice cooker → `cooking-pot`
      - kulkas → `refrigerator`
      - dispenser / galon → `glass-water`
      - teko → `coffee`
      - mesin cuci → `washing-machine`
      - setrika / lemari → `shirt`
      - sofa / ruang tamu / living → `sofa`
      - meja kerja / belajar → `laptop`
      - meja makan / alat makan → `utensils`
      - bed / kasur / ranjang → `bed-double`
      - balkon → `fence`
      - view → `eye`
      - mandi / handuk → `bath`
      - kapasitas → `users`
    - Vitest that every registry name exists in lucide-react 1.49.
    - Admin "Gabungkan" (merge duplicates) on `/admin/amenities` (P1).

11. **Odd guest counts** (for example "2BR CORNER BV 19V" with 1 guest): shown as stored, flagged in "Perlu dicek".

12. **`rental_period` other than nightly.** Run the Phase 2 query. If any Minggu/Bulan units exist, hide them from public pages until the price moves to `weekly_price` or `monthly_price`.

13. **WhatsApp number fallback.**
    - The fallback must be the real `6285711696970` (confirm with the owner), never `6281234567890`.
    - Phase 7: grep the build for that placeholder.

14. **Map coordinates.** Embed by `name + address` until the owner gives pins. Set Vida's `gmaps_url` to the legacy `maps.app.goo.gl/fkvUg2jpHedbgXXC9` for the "Buka di Google Maps" button only.

15. **Landmark icons are null.** Guess them at render time from the legacy keyword table.

**Owner questions, batch 1 (CLAUDE.md allows at most 5):**
1. Which unit names are Studio Plus, 2 Bedroom Corner and 3 Bedroom? Does "AT 26X" mean Tower Ashton, floor 26? What are the Delft tower names?
2. Can you send original landscape photos (at least 1600px), and building photos of at least 2400px for Vida and Delft? Until then, may we use `bg_brentsville_tower.jpg` and `hero_delft_cpi_entrance.jpg`?
3. Service hours (08.00 or 10.00), the legal name in mixed case, and new promo banner text (or empty)?
4. May we clear promo labels that contain "%" and use the automatic "Hemat X%"?
5. Google Maps pins or share links for both buildings?

**Batch 2:** FAQ rewrite, `rental_period` exceptions, the privacy policy text.

---

## 5. First-impression polish not to skip

- **Copy.** Sentence case and "kamu" throughout. "Rp280.000" with no space, "Rp280rb" in chips, en dash with spaces in ranges, "/malam". No all-caps text other than the logo tagline.
- **Skeletons that match the real layout.**
  - `/sewa/loading.tsx`: filter bar plus 3 cards (4:3 block plus 4 lines).
  - `/unit/[slug]/loading.tsx`: 4:5 block plus title and price lines.
  - Shimmer off under `prefers-reduced-motion`.
- **Empty states.**
  - `/sewa`: PRD copy, "Hapus semua filter", and 3 near matches (relax price first, then type).
  - Admin: "Belum ada unit di Delft CPI. Tambah unit pertama."
  - Search with no results: "Tidak ada unit untuk 'xyz'" plus "Reset filter".
- **Image loading.** `surface-2` wrapper background, `placeholder="empty"`, quality 75 only (Next 16 default `qualities`), `priority` only on the hero and the first gallery photo.
- **Spacing.** Sections 40px apart on mobile, 72px on desktop. Container max 1200px. Page padding 16px.
- **Floating WhatsApp button.** 56px at bottom-right, 16px plus the safe area from the edges. Pages that show it get `pb-24` so it never covers a price or "Muat lebih banyak". Hidden on unit detail and admin pages.
- **Icons.** Favicon, `app/icon.png` and `apple-icon.png` made from the logo. Convert the logo (a JPEG named `.png`).
- **Link previews.** OG check per G15. Default OG image: logo plus building, flat background.
- **Accessibility basics.** Visible `brand-500` focus ring, 44px touch targets, 16px inputs, `aria-describedby` on errors. Fix the two failing colour pairs:
  - `ink-2` instead of `muted` text on `surface-2`
  - `brand-700` instead of `brand-600` text on `brand-50`
- **Toasts.** At the top on mobile, bottom-right on desktop. "Perubahan disimpan" after every admin save.
- **No horizontal scroll at 360px**, no emoji (grep `web/src` for emoji character ranges), and no `subtle` colour for text.

---

## Corrections to the draft plan

- **Photo decision:** "galeri detail mobile 4:5" becomes 4:5 with `max-h-[60svh]`. "lightbox object-contain" gets the 9:16 trim for ratios under 0.5. Add the desktop grid by photo count, upload-time `trimLetterbox`, and update DESIGN §4.8/§7.
- **Decision 4:** drop the native `<select>` swapped in after hydration. Render the final triggers on the server, with `disabled` empty hidden inputs.
- **Shared search index:** add `getSearchIndex()` as one cached source for the hero and the `/sewa` counts.
- **Phase 2 read queries:** add the type-count query per `room_type`, plus `supabase/data-fixes/*.sql` with preview SELECTs, run by the owner, never by the agent.
- **Root layout:** add the `viewport` export (`viewportFit: 'cover'`, `interactiveWidget: 'resizes-content'`).
- **Unit detail:** no server-side `searchParams` on `/unit/[slug]`. Carry `tamu` through sessionStorage.
- **Bottom sheets:** no `vaul`; use the Radix Dialog sheet.
- **Visual QA:** add `@playwright/test`, with the reason recorded in PROGRESS, plus `e2e/viewport.spec.ts` (G2, G6, overflow, screenshots).
- **Admin:** `lib/admin/unit-query.ts`, `lib/admin/data-health.ts`, the bulk "Ubah tipe kamar" action, and the "Perlu dicek" chip.

### Critical Files for Implementation
- D:\website-vidaliday\docs\DESIGN.md (§4.2, §4.6, §4.8, §4.9, §7 need the accepted deviations recorded)
- D:\website-vidaliday\supabase\migrations\20261015000200_fitur_v2.sql (`backfill_v2` behaviour behind G3, G5 and §4)
- D:\website-vidaliday\web\src\components\public\hero-search.tsx (new: G1, G2, §2.1)
- D:\website-vidaliday\web\src\components\public\unit-gallery.tsx and lightbox (new: §3, G7, G8)
- D:\website-vidaliday\web\src\lib\icons.tsx, \lib\media.ts, \lib\pricing.ts (new: `resolveAmenityIcon`, `isStockPhoto`, `badgeFor`, `formatUnitPlace`)
