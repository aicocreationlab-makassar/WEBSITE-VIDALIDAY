> Laporan audit Fase 0 (15 Okt 2026). Path Laravel di laporan ini relatif ke root lama; sekarang semuanya ada di `legacy-laravel/`.

# Completeness critique: PRD/DESIGN vs legacy Laravel app (`D:\website-vidaliday`)

Sources read: `docs/PRD.md`, `docs/DESIGN.md`, `docs/SETUP.md`, `docs/PROGRESS.md`, `CLAUDE.md`, `PROMPT.md`, `README.md`, `.gitignore`, `.editorconfig`, `.gitattributes`, both migrations, `routes/web.php`, `docs/referensi/hero-search-referensi.png`, `storage-backupunits/*` (checked with `file`), `public/`, `database/seeders/DatabaseSeeder.php`, `data_dummy_vidaliday.txt`.

## (a) PRD/DESIGN dependencies the audits missed (checked now)

1. **`.gitignore` does not match the real layout. Release blocker.**
   - It ignores `legacy-laravel/` and `storage-backup/`, but neither exists. Laravel sits at the root and the photo folder is `storage-backupunits/`.
   - On the first push, all of this would go to GitHub: `database/seeders/DatabaseSeeder.php` (plaintext admin credentials, [secret omitted]), `PANDUAN_PENGGUNAAN_VIDALIDAY.md` (default login), `data_dummy_vidaliday.txt`, and `storage-backupunits/` (about 6.9 MB of client photos).
   - SETUP §1 and §5 say `.gitignore` already handles this. It does not.
   - Fix: add every root Laravel path to `.gitignore`: `app/ bootstrap/ config/ database/ resources/ routes/ storage/ storage-backupunits/ public/ tests/ artisan composer.* package*.json vite.config.js tailwind.config.js postcss.config.js phpunit.xml PANDUAN_*.md data_dummy_*.txt vidaliday_project_blueprint.md`. The project is not a git repo yet.
2. **Every path in CLAUDE.md, DESIGN §2 and PROMPT Fase 0/1 points at `legacy-laravel/...`.**
   - The real paths are at the root, e.g. `public/images/logo_vidaliday.png`.
   - The rule "never modify `legacy-laravel/`" has to be read as "never modify the root Laravel files". `web/` is created next to them.
3. **`tools/vidaliday-migrasi-supabase` is missing.**
   - SETUP §7B (final re-migration) depends on it.
   - Without it we can't confirm the stored path format (`units/<hash>.jpg` vs `storage/units/...`).
   - Legacy `->store('units'|'facilities'|'settings','public')` writes bare `units/<40-char hash>.jpg`. The backup filenames match that pattern.
   - Still, `lib/media.ts` should strip leading `/`, `storage/` and `public/`, the same way `StorageHelper` does.
4. **Legacy public URLs need redirects in `next.config.ts`. The PRD has none.**
   - `/preview-client` → `/`
   - `/login` → `/admin/login`
   - `/about` is kept.
5. **There is no favicon.** `public/favicon.ico` is 0 bytes. The PRD and DESIGN never mention one. Add `app/icon.png` and `apple-icon.png` made from the logo.
6. **Unit photos don't fit the DESIGN's 4:3 landscape frames.**
   - 42 of the 52 photos in `storage-backupunits/units` are portrait phone shots (mostly 589×1280, 736×1600, ~775×1024).
   - 34 of 52 are under 800px wide.
   - DESIGN §4.6 and §4.8 use 4:3 landscape for cards and the mobile gallery. That crops away about 65% of a portrait image and looks blurry on 3x screens.
   - Decide in Phase 3: a 4:5 or 3:4 gallery on mobile, or `object-contain` over a blurred backdrop.
7. **The hero photo is low resolution.**
   - The current `hero_image` setting file (`settings/HaUY…jpg`) is 941×638.
   - Every local fallback is ≤1024px wide (`bg_brentsville_wide.jpg` 1024×576, `hero_aerial_vida_view.jpg` 574×1024).
   - The desktop hero (about 1280–1440 × 520) will be upscaled. Ask the client for a photo of at least 1920px.
   - `settings/TSDN…png` (the logo) is 573×566, not square, so the round logo will crop slightly.
8. **`locations.hero_image` holds Unsplash stock URLs.**
   - Seeder lines 61 and 149: `photo-1545324418…` and `photo-1512917774080…`.
   - Legacy had no admin screen for locations, so production almost certainly still has these.
   - PRD §6.2 ("Pilih apartemen" cards) and §6.7 need the real building photo, and DESIGN §1 and §7 ban stock photos.
   - Fallback by slug to `public/images/hero_aerial_vida_view.jpg` and `hero_delft_cpi_entrance.jpg`, or make the photo upload a go-live task.
9. **Stock photos are stored as unit images.**
   - `UnitController:73` saves the Unsplash fallback `photo-1522771739844-6a9f6d5f14af` as `main_image` when no photo is uploaded.
   - All 6 seeded units have Unsplash `main_image` values.
   - DESIGN §7 wants a neutral `building-2` placeholder. `lib/media.ts` should treat that specific URL (or any `images.unsplash.com` URL) as "no photo".
10. **Reference screenshot.** The real labels are "Sewa Apartemen Murah dan Mudah", "Pilih Tipe Bedroom", "Pilih Tipe Furnish" and "Cari Apartemen".
    - The user said "tipe bedroom"; the PRD says "Tipe kamar". This is fine, since we take the pattern only.
    - The reference's search box sits over a family photo. Ours uses the building photo, as DESIGN says.

## (b) Contradictions with the legacy data and schema

1. **`facilities` has no `sort_order` or `is_active`** (confirmed in both SQL files), but PRD §7.7 needs both. FAQs have no `location_id`, so "filter per apartemen" can't apply to them.
   - Needs a new migration 0003. It must re-run `grant usage, select on all sequences … to authenticated` if it creates any identity tables.
2. **Facility icons stored in the DB are not in the DESIGN §6 table.**
   - Seeds use `sun` and `coffee`. `data_dummy` uses `swimming-pool` and `running`.
   - Add `sun` and `coffee` to the registry, and alias `swimming-pool` → `waves`, `running` → `footprints`, `gym` → `dumbbell`.
   - Seeded `about_reasons` icons are `shield`, `home`, `tag`, `lock` and `chat`, none of which are in the registry. Alias them: `shield` → `shield-check`, `home` → `house`, `chat` → `message-circle`, and add `tag` and `lock`. Production may have every icon reset to `shield` (legacy save bug).
3. **`submit_lead` can raise errors the PRD §6.5 table doesn't map.**
   - `TEXT_TOO_LONG` is raised when purpose > 50, notes > 500 or source_path > 300 characters.
   - Map it, and give any other or unknown error a generic message that still continues to WhatsApp.
4. **`promo_badge` legacy values conflict with v2 behaviour.**
   - Legacy values are free text up to 100 characters, often with a hardcoded percentage: "Hemat 27% (Best Seller)", "Flash Sale 24%", "Hemat 25%", "Spesial Keluarga". The create default is "Promo Spesial".
   - PRD §7.4 caps it at 24 characters and uses it to override the auto "Hemat X%". The result is stale or wrong percentages on almost every card, and legacy units fail zod when an admin opens and saves them.
   - Options: clear `promo_badge` in a migration, or show the auto discount and ignore any badge matching `/\d+\s*%/`. Also relax the max length for existing values.
5. **`rental_period` is ignored in v2.**
   - Legacy allowed Malam, Minggu, Bulan, Tahun and custom values, and showed the price as "/ {period}".
   - v2 treats `normal_price`/`promo_price` as per night (`effective_price`, filters, estimate). Seeds and dummy data are all "Malam", but production is unverified.
   - Any 'Bulan' or 'Minggu' unit would show, for example, Rp3.000.000/malam. Check this before Phase 2.
6. **Room type mapping will leave Vida View types empty.**
   - Real unit names carry the type ("2BR CORNER BV 19V"), but the legacy `room_type` text is likely just "2 Bedroom".
   - Backfill rule 1 (exact name) then maps those units to Vida "2 Bedroom", not "2 Bedroom Corner".
   - So Studio Plus, 2 Bedroom Corner and 3 Bedroom will show "belum tersedia" in the hero until an admin retypes the units.
   - Delft "2 Bedroom" maps through rule 2 to "2 Bedroom / Corner", which is fine. A legacy "1 Bedroom" creates an unrequested type.
7. **Tower and floor will be mostly empty.**
   - The backfill only parses `description` (`tower\s+([a-z]+)`, `lantai\s*(\d{1,2})`). The real tower codes are in the unit name ("AT" = Ashton, "BV" = Brentsville), and the backfill never reads names.
   - So the card and detail line "Vida View, Tower Ashton lt. 26" (DESIGN §4.6/§4.8, `{lokasi_unit}`) will mostly be empty.
   - Options: parse the name codes, or plan the admin cleanup.
8. **Settings text doesn't fit the PRD copy.**
   - `office_hours` is "Setiap Hari: 08.00 - 23.00 WITA", which makes the PRD §6.5 success sentence read badly. The PRD's open question also says the live site shows 10.00–23.00.
   - `contact_email` may be null in production because of the legacy save bug.
   - The seeded FAQ answers say "Pesan via WhatsApp", which goes against PRD §10.
9. **Maps can't get coordinates from the stored links.**
   - `gmaps_url` is `https://maps.google.com/?q=Delft+Apartment+CPI+Makassar` (query style), so the `@lat,lng` / `q=lat,lng` parse yields nothing. Latitude and longitude are never backfilled.
   - The better Vida link is hardcoded in `home.blade.php` (`maps.app.goo.gl/fkvUg2jpHedbgXXC9`). Short links can't be parsed without following the redirect.
10. **Two DESIGN colour pairs fail WCAG AA. DESIGN only checked them against white.**
    - `muted` #64748b on `surface-2` #f1f5f9: 4.34:1.
    - `brand-600` text on `brand-50`: 4.42:1.
    - Use `ink-2` on `surface-2`, and keep `brand-700` on `brand-50`.
11. **Node version conflict.** CLAUDE.md and SETUP say Node ≥20.9, but `@supabase/supabase-js` 2.117 needs ≥22 and vitest 5 needs ≥22.12. Set Vercel to Node 22.x and add `engines`.
12. **Icon names were checked on lucide 1.56, but the pinned version is 1.49.** Re-check the registry against 1.49. Old aliases (`Home`, `AlertCircle`, `ParkingSquare`, `Palmtree`) may be gone in v1.
13. **Public visibility gaps.**
    - Units, room types, facilities and landmarks of inactive locations stay publicly readable.
    - A published unit whose `room_type` is inactive loses its embed, so a `!inner` join would 404 it.
    - Decide the behaviour explicitly.
14. **No `updated_at` triggers on any table, including `leads`.** "Terakhir diubah" and status edits need either a trigger in 0003 or explicit sets in every Server Action.

## (c) Risks for the Next.js 16 build

1. **Lockfile and config inheritance.**
   - Root `package-lock.json` plus `package.json` (`"type":"module"`) makes Turbopack infer `D:\website-vidaliday` as the workspace root ("multiple lockfiles"). Set `turbopack.root` and `outputFileTracingRoot` to `web/`.
   - The root `postcss.config.js` uses the Tailwind v3 plugin. `web/postcss.config.mjs` must exist, or PostCSS walks up to the root one and the build fails.
   - The root `.editorconfig` (indent 4) also applies to `web/`; add `web/.editorconfig` with indent 2.
2. **Revalidation semantics.**
   - `revalidateTag(tag, 'max')` is stale-while-revalidate, so the next visitor still sees the old price. That breaks "ubah harga langsung terlihat" (PROMPT Fase 5).
   - Use `updateTag(tag)` in Server Actions, or `revalidateTag(tag, { expire: 0 })`.
3. **Pick the caching model in Phase 1.**
   - `"use cache"` + `cacheTag` needs `cacheComponents: true`. With it, every `searchParams` or `cookies()` read needs a Suspense boundary, and `export const dynamic/revalidate` is not allowed.
   - The alternative is `unstable_cache` with tags.
   - Scope the `proxy.ts` matcher to `/admin/:path*` so public pages stay cacheable.
4. **`next lint` is removed in Next 16.** The `lint` script must be `eslint .` with a flat config importing `eslint-config-next/core-web-vitals` and `/typescript`. `next build` no longer lints.
5. **Images.**
   - Next 16 defaults: `images.qualities` = `[75]`, so other quality values fail. Optimizing images on a local or private IP needs `dangerouslyAllowLocalIP`. Local images with query strings need `localPatterns`.
   - Build the Supabase `remotePatterns` from `NEXT_PUBLIC_SUPABASE_URL`, and keep `images.unsplash.com` for legacy rows.
6. **Upload size limits.**
   - Server Actions accept 1 MB bodies by default, and Vercel functions cap at 4.5 MB. Legacy allowed an 8 MB hero.
   - Upload all images (units, facilities, locations, logo, hero) from the browser straight to Storage, then send only paths to the actions.
7. **The desktop WhatsApp new-tab trick (PRD §6.5) has a gotcha.** `window.open('', '_blank', 'noopener')` returns `null`. Open without `noopener`, set `w.opener = null`, then set `w.location` after the action returns.
8. **Generating types on Windows.** `npx supabase gen types … > src/types/database.ts` in PowerShell 5.1 may write UTF-16 output, which breaks tsc. Run it in Git Bash or pipe to `Out-File -Encoding utf8`.
9. **shadcn token collision.**
   - shadcn v4 writes `--color-muted: var(--muted)`, where muted is a background colour used by Tabs, Slider tracks and Command. DESIGN defines `--color-muted` as the text colour #64748b, so the two clash.
   - Set shadcn's `--muted` to #f1f5f9, `--muted-foreground` to #64748b, `--primary` to #dc2626, `--ring` to #ef4444, `--border`/`--input` to #e2e8f0 and `--radius` to 12px. Keep DESIGN text tokens from being overwritten.
   - The mobile bottom sheet with drag needs the `drawer` component (vaul), which isn't in PROMPT's shadcn list.
10. **Per-unit OG images.** New uploads are WebP. WhatsApp link previews with WebP `og:image` are unreliable, and Satori's WebP decoding needs to be tested. Serve a JPEG or PNG OG image, e.g. a `next/og` PNG.
11. **`/sewa` behaviour.**
    - "Rekomendasi" sorting uses popularity from an RPC, so it can't be expressed as a PostgREST `order`. With about 50 units, fetch everything that matches and sort/paginate in code.
    - On a fresh load with `hal=N`, render `N×12` items.
    - The live "Tampilkan 12 unit" count needs either a small client-side index of all units or a debounced server action.

## Read-only checks to run at the start of Phase 2

- `select rental_period, count(*) from units group by 1`
- `select room_type, location_id, count(*) from units group by 1,2`
- `select promo_badge, count(*) from units group by 1`
- `select key, value is null from settings`
- `select slug, hero_image, gmaps_url, latitude from locations`
- `select count(*) from units where main_image like 'http%'`
- `select main_image from units limit 5` (path format)
- `select icon, count(*) from facilities group by 1`