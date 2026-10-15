> Laporan audit Fase 0 (15 Okt 2026). Path Laravel di laporan ini relatif ke root lama; sekarang semuanya ada di `legacy-laravel/`.

# Vidaliday legacy data audit (read-only)

The project root is `D:\website-vidaliday`. Two files hold plaintext admin credentials: `database/seeders/DatabaseSeeder.php` (two admin accounts with emails and passwords) and `PANDUAN_PENGGUNAAN_VIDALIDAY.md` §2 (a default login). Both are shown here as [secret omitted]. None of these values should be ported. Admins are created in Supabase Auth and listed in `public.admins`.

## 1. Models (`app/Models/*.php`)

**Unit**
- Fillable: `location_id, name, slug, room_type, max_guests, normal_price, promo_price, promo_badge, is_promo_active, rental_period, description, facilities_list, youtube_video_url, main_image, gallery_images, is_featured, is_available`.
- Casts:
  - `facilities_list` and `gallery_images` are `array`.
  - `is_promo_active`, `is_featured` and `is_available` are `boolean`.
  - `normal_price` and `promo_price` are `decimal:2`.
- Relationship: `belongsTo(Location)`.
- Hooks:
  - `creating`: if the slug is empty, it becomes `Str::slug($unit->name.'-'.rand(100,999))`.
  - `deleting`: deletes `main_image` and every `gallery_images` file through `StorageHelper`.
- Accessors to port:
  - `formatted_normal_price` and `formatted_promo_price` → `'Rp ' . number_format(x, 0, ',', '.')`, e.g. "Rp 399.000".
  - `discount_percent`:
    ```php
    if ($this->normal_price > 0 && $this->promo_price > 0 && $this->normal_price > $this->promo_price)
        return (int) round((($this->normal_price - $this->promo_price) / $this->normal_price) * 100);
    return 0;
    ```
    It does not check `is_promo_active`. In v2, `effective_price` (a generated column) already does: `case when is_promo_active and promo_price > 0 then promo_price else normal_price end`.
  - `image_url`:
    - If the value starts with `http://` or `https://` it is used as-is.
    - Otherwise it becomes `asset('storage/'.path)`.
    - If empty, it falls back to the Unsplash URL `photo-1522771739844-6a9f6d5f14af`. The PRD/DESIGN asks for a neutral `building-2` placeholder instead.
  - `all_images`: main image first, then gallery images (same URL rule), de-duplicated with `array_unique`, and the Unsplash fallback when empty.
  - `youtube_embed_url`: matches 4 regex patterns (`youtu.be/ID`, `[?&]v=ID`, `/embed/ID`, `/shorts/ID`) and returns `https://www.youtube.com/embed/{ID}?autoplay=1`. If nothing matches it returns the raw URL.

**Location**
- Fillable: `slug, name, tagline, description, address, gmaps_url, hero_image`. No casts.
- Relationships: `units()`, `facilities()`, and `landmarks()` (ordered by `sort_order`, then `id`).
- `deleting` deletes the `hero_image` file and cascades to delete all units and facilities. In v2 the database now restricts this: `units_location_id_fkey on delete restrict`.

**Facility**
- Fillable: `location_id, name, icon, description, image`. No casts.
- `belongsTo(Location)`.
- Accessor `image_url` returns null if empty, otherwise uses the same http/`storage/` rule.
- `deleting` deletes the image file.

**Landmark**
- Fillable: `location_id, name, distance_time, notes, sort_order, is_active`.
- Casts: `is_active` boolean, `sort_order` integer.
- `belongsTo(Location)`.

**Faq**
- Fillable: `question, answer, badge, sort_order, is_active`.
- Casts: `is_active` boolean, `sort_order` integer.
- No relationship. FAQs are global, with no `location_id`.

**Setting**
- Fillable: `key, value`.
- `Setting::get($key, $default)` runs one query per call. `Setting::set` uses `updateOrCreate`.
- `deleting` removes the file when the key is `site_logo` or contains `image` or `logo`.

**User**
- Default Laravel model: `name, email, password`.
- Casts: `password => hashed`, `email_verified_at => datetime`.
- Not ported.

**StorageHelper** (`app/Support/StorageHelper.php`)
- Ignores http(s) URLs.
- Strips leading `storage/` and `public/` before deleting.
- `deleteMany` accepts an array or a JSON string.
- Port this as "only delete bucket paths, ignore external URLs."

**Legacy Laravel migrations**
- These are 1:1 with the Supabase `schema_awal`.
- Column comments:
  - `room_type`: "Studio, 1 Bedroom, 2 Bedroom, Penthouse".
  - `rental_period` defaults to `'Harian'`.
  - `facilities.icon`: "e.g. swimming-pool, gym, wifi, shield-check".
- `youtube_video_url` was added in `2026_10_11_120322`.

## 2. Settings keys

**Where they are read**
- `AppServiceProvider` view composer (all views): `site_logo`, `hero_image` (both nulled if the file is missing on disk), `company_legal_name`.
- `HomeController` (`home` and `preview-client`).
- `AboutController`.
- `Admin\SettingController`, `Admin\AboutController`, `Admin\DashboardController`.
- `routes/console.php` (`site_logo`, for an orphan-file cleanup command).

**Keys in the legacy code**

| Key | Code defaults | Seeder value | Used on |
|---|---|---|---|
| `whatsapp_number` | Home: `6285711696970`. About and admin: `6281234567890` (placeholder). Dashboard: `'-'` | `6285711696970` | layouts/app header and footer, home, partials/unit-card, about, preview-client, admin dashboard |
| `whatsapp_template` (legacy, replaced by `booking_whatsapp_template`) | "Halo Admin VIDALIDAY, saya ingin memesan/tanya ketersediaan unit:\n- Lokasi: {apartment}\n- Unit: {unit_name} ({room_type})\n- Harga: {price} / {period}\n\nMohon info ketersediaan kamar. Terima kasih!" | same | home |
| `promo_banner_text` | Home: "PROMO VIDALIDAY: Sewa apartemen harian & bulanan resmi di Makassar." Admin: `''` | "FLASH DEAL VIDALIDAY: Nikmati diskon promo hingga 30% untuk pemesanan hari ini! Sewa harian, mingguan, & bulanan." | home banner (hidden if empty) |
| `company_legal_name` | `PT PERDANA MEGA TRANS` | same | everywhere: header info bar, footer, copyright, admin |
| `contact_phone` | Home: `+62 857-1169-6970`. About: `+62 812-3456-7890` (placeholder). Admin: `''` | `+62 857-1169-6970` | footer, preview-client |
| `contact_email` | `info@vidaliday.com` | same | footer and about |
| `office_hours` | `Setiap Hari: 08.00 - 23.00 WITA`. Layout fallback: `08.00 - 23.00 WITA` | same | footer |
| `site_logo` | null, so the default logo is used | upload only, stored as `settings/xxx.png` | all layouts and admin. Validation: jpeg/png/jpg/webp/svg, max 5120 KB |
| `hero_image` | null; admin preview falls back to `images/bg_brentsville_wide.jpg` | upload only, stored as `settings/xxx.jpg` | home hero. Validation: max 8192 KB |
| `about_tagline` | "Your Comfort, Our Priority" | same | /about |
| `about_hero_title` | "VIDALIDAY — Partner Terpercaya untuk Menginap Nyaman di Makassar." | same | /about |
| `about_intro_p1`, `about_intro_p2`, `about_intro_p3` | full paragraphs in the public `AboutController`; `''` in admin | same text in `AboutSeeder` | /about |
| `about_commit_title` | "KOMITMEN KAMI" | same | /about |
| `about_commit_text` | "Kepuasan dan kepercayaan pelanggan adalah prioritas VIDALIDAY. …" | same | /about |
| `about_closing_quote` | "VIDALIDAY — Menginap Nyaman, Harga Bersahabat, Pilihan Terpercaya." | same | /about |
| `about_closing_cta` | "Temukan unit favorit Anda dan nikmati pengalaman menginap yang lebih menyenangkan bersama VIDALIDAY!" | same | /about |
| `about_reasons` | `'[]'` | JSON with 6 items (see §3) | /about |

The public `AboutController` defaults are the right fallback copy to put in `lib/settings.ts`.

**Keys inserted by `20261015000200_fitur_v2.sql`** (`on conflict (key) do nothing`)

| Key | Value |
|---|---|
| `hero_title` | "Sewa apartemen harian di Makassar" |
| `hero_subtitle` | "Unit resmi di Vida View dan Delft CPI. Bisa harian, mingguan, atau bulanan." |
| `checkin_time` | "14.00 WITA" |
| `checkout_time` | "12.00 WITA" |
| `checkin_requirements` | "Usia minimal 18 tahun dan membawa KTP, SIM, atau identitas lain." |
| `house_rules` | 7 lines separated by newlines: no smoking indoors (balcony only); no drugs, alcohol or prostitution; keep quiet; keep the unit clean and the furniture intact; dispose of rubbish properly; items may not be removed without admin permission; check-out after 12.10 WITA costs Rp50.000 per hour |
| `seo_title` | "VIDALIDAY \| Sewa Apartemen Harian di Makassar, Vida View & Delft CPI" |
| `seo_description` | "Sewa apartemen resmi di Makassar: Vida View Panakkukang dan Delft CPI. Harian, mingguan, bulanan. Pesan cepat via WhatsApp." |
| `booking_whatsapp_template` | uses `{unit} {apartemen} {lokasi_unit} {harga} {nama} {whatsapp} {checkin} {checkout} {malam} {tamu} {keperluan} {catatan} {estimasi} {kode} {link}` |

**Status of each PRD §7.9 key**

| Key | Source | Status |
|---|---|---|
| `whatsapp_number`, `contact_phone`, `contact_email`, `office_hours` | Laravel seeder only | Probably in the migrated database; not in the v2 SQL |
| `hero_title`, `hero_subtitle` | v2 SQL | Present |
| `hero_image` | Admin upload only | May be missing or null; needs a fallback, e.g. `public/images/hero_vida_view.jpg` or `bg_brentsville_wide.jpg` |
| `promo_banner_text` | Laravel seeder | Probably present |
| `booking_whatsapp_template` | v2 SQL | Present |
| `checkin_time`, `checkout_time`, `checkin_requirements`, `house_rules` | v2 SQL | Present |
| `site_logo` | Admin upload only | May be missing; fall back to `public/images/logo_vidaliday.png` |
| `company_legal_name` | Laravel seeder | Probably present |
| `seo_title`, `seo_description` | v2 SQL | Present |
| `about_*`, `about_reasons` | `AboutSeeder` only | May be missing if that seeder was never run on production |

- I could not check the live database, so the "probably present" entries are not confirmed. A read query on `settings` would settle it.
- Every key needs a typed default in `lib/settings.ts`.
- The legacy `whatsapp_template` is not used in v2. Its placeholders (`{apartment}`, `{unit_name}`, `{room_type}`, `{price}`, `{period}`) are not compatible with the v2 template.

## 3. Shape of the data values

**`facilities.icon`**
- Values are plain kebab-case text names, lucide-style. There are no emoji and no SVG.
- Seeder values:
  - Delft: `waves`, `dumbbell`, `sun`, `shield-check`, `coffee`.
  - Vida: `waves`, `dumbbell`, `store`, `shield-check`, `trees`.
- `data_dummy` suggests `swimming-pool`, `dumbbell`, `sun`, `running`, `shield-check`. The migration comment adds `gym` and `wifi`.
- These are not lucide names: `swimming-pool`, `running`, `gym`. The icon registry should alias them (`swimming-pool` → `waves`, `gym` → `dumbbell`, `running` → `footprints` or `activity`) and fall back to `check`.
- The legacy admin facility form has no icon input at all (no "icon" anywhere in `resources/views/admin/`). The public `home.blade.php` ignores `$fac->icon` and always draws a fixed sparkles SVG. So the stored values come only from seeds and are unreliable.

**`faqs.badge`**
- Short free-text labels.
- Seeder: `14.00 / 12.00 WITA`, `Durasi Fleksibel`, `Transfer Resmi PT`, `Full Furnished`, `Akses Gratis`, `Kitchen Set`, `Aman 24 Jam`, `Parkir Luas`.
- `data_dummy`: `Waktu Menginap`, `Reservasi & Bayar`, `Kebersihan Unit`, `Fasilitas Gedung`, `Durasi Fleksibel`.
- `data_dummy` answers contain markdown asterisks (`*deep cleaning*`, `*swimming pool*`, `*gym*`, `*special rate*`). Render them as plain text or strip the `*`.
- Seeded answers still say "klik tombol \"Pesan via WhatsApp\"", which may not match the v2 CTA copy.

**`landmarks`**
- Fields: `name`, `distance_time`, `notes`, `sort_order`, `is_active`, plus `icon` from v2.
- `distance_time` is free text, e.g. "1 Menit (Area CPI)", "25 Menit (via Akses Tol)", "1 Menit (Jalan Kaki)", "20 Menit (Tol)".
- `notes` is a category-style label, e.g. "Ikon Religi & Sunset", "Mall & Layanan Medis".
- There are 8 landmarks per location in the seeder and 6 per location in `data_dummy`.
- `icon` is null for all existing rows because `backfill_v2()` does not fill it.
- The legacy view picks an icon from keywords in the name (`home.blade.php` ~L620–652). This logic is worth porting as a fallback or backfill:

  | Keywords | Category |
  |---|---|
  | bandara, airport | plane |
  | mall, transmart, tsm, pipo | shopping |
  | kuliner, cafe, topaz, pisang epe, seafood | food |
  | pantai, losari, masjid, benteng, rotterdam, kubah | tourism/landmark |
  | sakit, hospital, siloam, primaya, hermina | hospital |
  | tol, jalan | transport |
  | anything else | map-pin |

**`about_reasons` JSON**
- An array of `{title, desc, icon}`, stored pretty-printed with `JSON_UNESCAPED_UNICODE`.
- The seeder has 6 items, with icons `shield`, `sparkles`, `home`, `tag`, `lock`, `chat`:

  | Title | desc |
  |---|---|
  | Terpercaya & Berlegalitas | Brand di bawah naungan PT PERDANA MEGA TRANS. |
  | Unit Bersih & Nyaman | Kebersihan dan kenyamanan menjadi prioritas kami. |
  | Fasilitas Lengkap | Nikmati fasilitas penunjang untuk pengalaman menginap yang lebih praktis. |
  | Harga Kompetitif & Promo Menarik | Pilihan harga yang sesuai dengan kebutuhan dan anggaran Anda. |
  | Privasi & Keamanan | Kami mengutamakan privasi tamu dan kenyamanan selama menginap. |
  | Pemesanan Mudah | Hubungi admin kami melalui WhatsApp untuk mendapatkan informasi unit, harga, dan ketersediaan kamar. |

- `chat` is not a lucide name (use `message-circle`). `home` should be `house`.
- There is a bug: the admin About form posts no `reasons_icon[]`, so saving resets every icon to `'shield'`. The public view ignores `icon` and always draws a check SVG. On the live database every icon may therefore already be `shield`.

**`room_type` text values**
- Seeder: `Studio`, `1 Bedroom`, `2 Bedroom`.
- `data_dummy`: `Studio`, `2 Bedroom`. Unit 4 is a corner unit but is typed as `2 Bedroom`.
- Admin default options: `Studio, 1 Bedroom, 2 Bedroom, Penthouse, Family Suite, VIP Suite`. Custom types were also allowed.
- v2 `room_types`:
  - Vida View: Studio (3 guests), Studio Plus (5), 2 Bedroom (5), 2 Bedroom Corner (7), 3 Bedroom (10).
  - Delft CPI: Studio (3), Studio Corner (5), 2 Bedroom / Corner (5), 3 Bedroom (10).
- Backfill side effect: `1 Bedroom` units find no category-1br type, so backfill creates a new type "1 Bedroom" (slug `1-bedroom`, sort 99) for each location. The client did not ask for this type.

**`rental_period`**: database default `Harian`; seeder `Malam`; admin options `Malam, Minggu, Bulan, Tahun`.

**`facilities_list` distinct values**

From the seeder (6 units):
- Queen Bed Premium, AC Dingin, Smart TV 43" Netflix, Balkon View Laut, Water Heater, Kulkas & Dispenser, WiFi High Speed, Kitchen Set Ringan
- King Bed, Living Room Terpisah, Sofa Bed Nyaman, 2 Unit AC, Smart TV 50", Dapur & Microwave, Kulkas 2 Pintu, Balkon Luas
- 1 King Bed + 1 Queen Bed, Kapasitas 4-5 Orang, Meja Makan Keluarga, Dapur Memasak Lengkap, Mesin Cuci, 3 Unit AC, Smart TV 55", Balkon Panoramic Ocean View
- Queen Bed Nyaman, AC Dingin Maksimal, Smart TV + Netflix, Meja Kerja & Belajar, Kulkas Mini, Free High-Speed WiFi
- Ruang Santai + Sofa, Kitchen Set + Kompor Listrik, Kulkas, Smart TV 43", View Kolam Renang
- 1 King Bed + 1 Single Bed, Sofa Bed, Ruang Keluarga Luas, Dapur Lengkap, Meja Makan

From `data_dummy` (4 units):
- Smart TV 43 Inch, Netflix Ready, AC Dingin Daikin, High-Speed WiFi, Kitchen Set Lengkap, Dispenser Air, Meja Kerja, Handuk & Amenities Bersih
- 2 Kamar Tidur Ber-AC, Smart TV 50 Inch, Ruang Tamu Luas, Kitchen Set & Kompor Induksi, Microwave, Water Heater Ariston, WiFi Fiber Optic, Balkon Panorama Laut, Set Peralatan Mandi Lengkap
- AC Super Dingin, Smart TV Android, Kasur Springbed Empuk, Lemari Pakaian, Dapur Mini, Teko Listrik, Alat Makan, Meja Rias, Perlengkapan Mandi Higienis
- Master Bedroom King Bed, Second Bedroom Single Bed, Sofa Bed Santai, Kitchen Set Kompor Gas, Rice Cooker, Balkon City View, WiFi Unlimited

How the backfill aliases resolve them:
- To canonical amenities: `AC Dingin` → AC, `Water Heater`, `Smart TV 43"` / `Smart TV 43 Inch` → "Smart TV 43 inci", and exact matches `Kulkas`, `Mesin Cuci`, `Microwave`, `Dispenser Air`, `Meja Kerja`.
- Everything else becomes its own amenity with icon `check` and sort 50. Expect many near-duplicates (WiFi variants, AC variants, Balkon variants) that admins must merge.

**Locations**
- `delft-cpi` → "Apartemen Delft CPI"; backfill sets `short_name` "Delft CPI", `area` "Center Point of Indonesia", `sort_order` 2.
- `vida-view` → "Apartemen Vida View"; backfill sets `short_name` "Vida View", `area` "Panakkukang", `sort_order` 1.

**Unit counts**
- Seeder: 3 units per location (Studio 1, 1 Bedroom 1, 2 Bedroom 1).
- `data_dummy`: Delft Studio 1 and 2 Bedroom 1; Vida Studio 1 and 2 Bedroom 1.
- Real data is not in the repo. The PRD says ~45 units, and `storage-backupunits/units` holds 52 images. Real unit names follow patterns like "Studio AT 26X", "2BR CORNER BV 19V", "STUDIO 1633".
- Vida View towers: Ashton (AT) and Brentsville/"Brensville" (BV).

## 4. Supabase schema gaps compared with the PRD

**Confirmed: `facilities` has no `sort_order` and no `is_active`.**
- Not in `schema_awal` and not added by v2. PRD §7.7 needs both.
- A new migration (0003) is needed:
  - `add column sort_order int not null default 0, is_active boolean not null default true`
  - index `(location_id, sort_order)`
  - replace its "public read" policy with `using (is_active or public.is_admin())`

**Other gaps**
1. **No `updated_at` triggers in either file.** Laravel set this column automatically. Several features depend on it: admin sort "Terakhir diubah", the featured-unit pick (`latest('updated_at')`), and the dashboard. Either add a shared `set_updated_at()` trigger on all tables (including `room_types`, `amenities`, `leads`) or set it explicitly in every Server Action.
2. **No text-search indexes.** Units have only btree indexes (`location_id`, `room_type_id`, `effective_price`, `(location_id, is_published, is_available)`) — nothing on `name`, `slug` or `tower`. Leads have btree indexes on `created_at`, `status`, `(whatsapp, created_at)` and a unique `code`, but nothing on `full_name`. At about 45 units `ilike` is fine; `pg_trgm` GIN indexes are optional. Leads also have no index on `check_in` for the check-in date filter (minor).
3. **`leads` has no `location_id`** (only a `location_name` text snapshot). PRD §7.8 wants a filter by apartment. That needs a join through `unit_id` to `units.location_id`, but `unit_id` is set to null when a unit is deleted. Either add `location_id` to `leads` and `submit_lead`, or filter on `location_name`.
4. **`landmarks.icon` is null for every existing row** (no backfill). Port the keyword mapping from §3 or run a backfill.
5. **`locations.latitude` and `longitude` are never backfilled.** The seeded `gmaps_url` values are query style (`https://maps.google.com/?q=Delft+Apartment+CPI+Makassar`), so the PRD's `@lat,lng` / `q=lat,lng` extraction finds nothing. The map on the unit detail page needs either coordinates entered by an admin or an embed built from the address as a fallback.
6. **FAQs have no `location_id`.** The PRD §7.7 "filter per apartemen" cannot apply to FAQs; they are global.
7. **Units of an inactive location stay publicly readable.** The units policy only checks `is_published`. The same applies to `room_types`, `facilities` and `landmarks` of inactive locations. Queries must also filter `locations.is_active`, or the policies need an `exists(...)` check.
8. **`unit_popularity()` is `security definer` and callable by anon.** It returns lead counts for all units, including unpublished ones. This is a minor leak with no personal data.
9. **`submit_lead` checks `is_published` but not `is_available` or the location's `is_active`.** Leads can be submitted for full units. That may be intended, but it should be a conscious choice.
10. **`unit_amenities` public read is `using (true)`.** It exposes `unit_id` and `amenity_id` pairs for draft units (trivial).
11. **Backfill data quality.**
    - Tower, floor and view are guessed by regex from descriptions; the PRD notes cleanup cases.
    - Duplicate free-text amenities with the `check` icon.
    - Possible unwanted "1 Bedroom" room types.
12. **Storage paths.**
    - Legacy relative paths are `units/…`, `facilities/…`, `settings/…`. Seeded rows use full Unsplash URLs, so `lib/media.ts` must pass full URLs through unchanged.
    - The new `locations/` folder has no legacy data.
    - Public pages need `remotePatterns` for `images.unsplash.com`.

**RLS review**
- **`settings` public read `using(true)`:** every current key is public-facing (contact details, copy, templates, SEO, image paths). Nothing is sensitive today. The risk is any future secret stored there (an API token, a notification gateway key, an admin-only number), which would be readable with the anon key. Document "no secrets in settings", or add an `is_public` column or a separate admin-only table.
- **`facilities` public read `using(true)`:** fine now, but it must change to `is_active or is_admin()` once `is_active` is added.
- **Fine as written:**
  - `leads` has no anon policy, and inserts happen only through the `security definer` `submit_lead` with validation and rate limits (5 per number per hour, 30 per minute globally).
  - `admins` has a read-own-row policy only.
  - The `media` bucket is public with admin-only list and write.
  - `is_admin()` is `security definer` with `search_path ''`.

## 5. Business data found in the files (not secrets)
- **WhatsApp (wa.me format):** `6285711696970`. Display format: `+62 857-1169-6970`.
- **Office hours:** `Setiap Hari: 08.00 - 23.00 WITA`.
- **Legal name:** `PT PERDANA MEGA TRANS`.
- **Public contact email setting:** `info@vidaliday.com`.
- **Placeholder numbers to remove:** `6281234567890` and `+62 812-3456-7890` (defaults in About and admin).
- **Check-in / check-out:** 14.00 / 12.00 WITA. Late check-out after 12.10 costs Rp50.000 per hour.
- **Addresses:**
  - Delft: "Kawasan Center Point of Indonesia (CPI), Jl. Metro Tanjung Bunga, Makassar, Sulawesi Selatan".
  - Vida: "Jl. Topaz Raya, Masale, Kec. Panakkukang, Kota Makassar, Sulawesi Selatan".
- **Taglines:**
  - Delft: "Luxury Waterfront Living di Center Point of Indonesia".
  - Vida: "The Heart of Makassar Business & Leisure District".
- **Domain typo:** `PANDUAN_PENGGUNAAN_VIDALIDAY.md` and `data_dummy_vidaliday.txt` say `vidayliday.com`. The correct domain is `vidaliday.com`.
- **Local assets in `public/images/`:** `logo_vidaliday.png`, `logo_vidaliday.jpg`, `client_vidaliday_logo.png`, `client_pmt_logo.png`, `hero_vida_view.jpg`, `hero_delft_cpi.jpg`, `hero_aerial_vida_view.jpg`, `bg_brentsville_wide.jpg`, `building_delft_cpi.jpg`, `building_vida_view.jpg`, plus others.
- **`storage-backupunits/`:** 52 unit photos, 11 facility photos, 2 settings files (logo and hero).

**Files read**
- `D:\website-vidaliday\app\Models\{Unit,Location,Facility,Landmark,Faq,Setting,User}.php`
- `D:\website-vidaliday\app\Support\StorageHelper.php`
- `D:\website-vidaliday\app\Providers\AppServiceProvider.php`
- `D:\website-vidaliday\app\Http\Controllers\{HomeController,AboutController}.php`
- `D:\website-vidaliday\app\Http\Controllers\Admin\{SettingController,AboutController,FacilityController,UnitController}.php`
- `D:\website-vidaliday\database\migrations\2026_10_1*.php`
- `D:\website-vidaliday\database\seeders\{DatabaseSeeder,AboutSeeder,FaqSeeder,LandmarkSeeder}.php`
- `D:\website-vidaliday\supabase\migrations\20261015000100_schema_awal.sql` and `20261015000200_fitur_v2.sql`
- `D:\website-vidaliday\data_dummy_vidaliday.txt`
- `D:\website-vidaliday\PANDUAN_PENGGUNAAN_VIDALIDAY.md`
- `D:\website-vidaliday\vidaliday_project_blueprint.md`
- `D:\website-vidaliday\docs\PRD.md` (§7–8) and `D:\website-vidaliday\docs\DESIGN.md` (§6 icons)
- `D:\website-vidaliday\resources\views\home.blade.php` (L466–660) and `about.blade.php` (L92–100)