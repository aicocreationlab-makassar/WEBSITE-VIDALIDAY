> Laporan desain Fase 0 (15 Okt 2026). Path Laravel di laporan ini relatif ke root lama; sekarang semuanya ada di `legacy-laravel/`.


# VIDALIDAY v2: execution orchestration (phases 0–7)

All paths are relative to `D:\website-vidaliday`. "Orch" means the orchestrating agent.

## 0. Rules for the orchestrator and subagents

**What only the orchestrator does**
- Anything that writes `web/package.json`, `web/package-lock.json` or `node_modules`. That covers `npm install` and `npx shadcn`.
- `next dev`, `next build` and `next start`, plus Playwright, Lighthouse and git.
- `supabase/migrations/*` and `docs/PROGRESS.md`.

**What only the orchestrator owns after phase 1** (frozen for subagents)
- `web/src/app/globals.css`, `web/src/components/ui/**`, `web/src/app/layout.tsx`.
- `web/next.config.ts`, `web/tsconfig.json`, `web/eslint.config.mjs`, `web/vitest.config.mts`, `web/playwright.config.ts`.
- `web/src/types/**` and `web/src/proxy.ts`.

**What subagents may run**
- `npx vitest run <own test files>`
- `npx eslint <own paths>`
- `npx tsc --noEmit --incremental false`, reading only errors under their own paths. `--incremental false` matters: the scaffolded tsconfig has `incremental: true`, so parallel runs would race on `tsconfig.tsbuildinfo`.

**What subagents must never do:** install anything, start a server, run git, or touch files outside their globs. If one needs a shared file changed, it writes the request in its final report.

**Stub-first contracts.** Before each parallel batch, the orchestrator commits:
- the shared types;
- every cross-agent module as an exported signature with a TODO body.

The owner of a module fills in the body without changing the signature. No `index.ts` barrels.

**Batch protocol**
1. Commit the foundation, so `git status` is clean.
2. Spawn N agents in one message, each with: owned globs, PRD/DESIGN sections, `docs/audit/*.md` sections, contracts, allowed commands, and a definition of done (own tests pass, own files lint-clean).
3. Join, then run an ownership audit: every path in `git status --porcelain` must match the owning agent's globs. Anything else is reverted or inspected.
4. Run lint, typecheck and test, then commit.

**Durable state for a long session.** `docs/PROGRESS.md` gets one line per finished batch and full notes per phase (decisions, base SHAs, pending owner items). The audit reports are copied from Temp into `docs/audit/` in phase 0, because Temp is volatile and later subagent briefs cite them.

**Parallelism:** at most 4 builder agents plus 1 e2e-spec writer per batch.

## 1. Work units per phase

### Phase 0 — orientation (orch only, serial; nothing worth parallelising)
- **0.1** Move the legacy files (§5 below).
- **0.2** Update root `.gitignore`, add a new root `.gitattributes`, run `git init -b main`, run the guard, first commit.
- **0.3** Copy the five audit reports to `docs/audit/{public-ui,admin-ui,data-models,npm-versions,critic}.md`, rewriting root paths to `legacy-laravel/...`.
- **0.4** Write `docs/PROGRESS.md` with:
  - **Catatan audit**, condensed from the audits.
  - **Keputusan:** the owner decisions, including Delft as one type, the one-session mode, Node ≥22.12, and `tools/` being ignored.
  - The phase plan.
  - The owner TODO, including that `web/` doesn't exist yet and which 3 env vars are needed.
  - Up to 5 questions, each with a default.
- **0.5** Commit and tag `fase-0`.

**Done when:** `Test-Path web` is false, PROGRESS.md is complete, and the questions have been asked.

### Phase 1 — foundation

**Serial foundation (orch)**
- **1.1 Scaffold**
  - Run `npx create-next-app@16.3.8 web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git --skip-install`. `--disable-git` matters: without a parent repo it would create a nested `web/.git`.
  - Rewrite `web/package.json` to exact pins. Add `.npmrc` with `save-exact=true` and `engine-strict=true`, and `"engines": {"node": ">=22.12"}`.
  - Install every runtime dependency now, including `@vercel/analytics`, `@vercel/speed-insights`, `embla-carousel-react`, `browser-image-compression`, `sonner`, react-hook-form and `@hookform/resolvers`. After this, nothing should need a mid-phase install.
  - Add dev dependencies `vitest@5.0.3`, `vite@8.3.2` and `@playwright/test@1.63.0`. Playwright is a new dependency: justify it in PROGRESS, and use `channel: 'chrome'` so no browser download is needed.
  - Add `web/.editorconfig` (indent 2) and `web/.env.example` (3 placeholder vars).
  - If create-next-app generates `web/AGENTS.md` or `web/CLAUDE.md`, read it and keep it if it only points at `node_modules/next/dist/docs`.
  - **Then send owner checkpoint CP-A.**
- **1.2 Tooling**
  - `eslint.config.mjs` (flat config with core-web-vitals and typescript).
  - `vitest.config.mts` (node environment, `@` alias, `src/**/*.test.ts`).
  - `playwright.config.ts` (projects `m390` at 390×844 and `d1280` at 1280×800; baseURL from `E2E_BASE_URL`, default `:3100`).
  - `scripts/check-emoji.mjs`, `scripts/check-secrets.mjs`, `scripts/guard-staged.mjs`.
  - Root `.claude/launch.json` with `web-dev` (`npm --prefix web run dev`, port 3000) and `web-start` (`... run start -- -p 3100`, port 3100). The executable may need to be `npm.cmd`.
  - Scripts: `lint` (`eslint .`), `typecheck` (`next typegen && tsc --noEmit`), `test` (`vitest run`), `e2e` (`playwright test`), and `verify`, which chains all gates with `&&` (npm runs scripts through cmd.exe).
- **1.3 `next.config.ts`:** `cacheComponents`, `images.remotePatterns` built from the env URL plus unsplash, security headers, redirects (www→apex, `/preview-client`→`/`, `/login`→`/admin/login`), and `turbopack.root`.
- **1.4 shadcn**
  - `npx shadcn@4.21.1 init`, then `add` all PROMPT components in one go.
  - **Re-pin** whatever the CLI pulled at latest: `radix-ui@1.6.7`, `cmdk@1.1.1`, lucide 1.49.0, and the rest. Confirm with `npm ls`.
  - No `vaul`: use Sheet `side="bottom"`.
  - Write the DESIGN §3 tokens into `globals.css` and map shadcn's own variables (`--muted`, `--primary`, etc., per critic c9).
- **1.5 Shared basics**
  - Root `layout.tsx`: Plus Jakarta Sans, `lang="id"`, Toaster.
  - `components/brand/logo.tsx` and `components/icons/whatsapp.tsx`.
  - Copy the logo to `web/public/images/logo-vidaliday.jpg`. The legacy `.png` is really a JPEG.
  - `src/types/settings.ts` and `src/lib/settings-defaults.ts`.
  - `src/types/database.ts`: generated if CP-A login is done, otherwise hand-written from 0001 and 0002.
  - Contract stubs for `lib/{format,pricing,whatsapp,media,icons}`.
- **Commit:** `chore(web): scaffold Next 16.3.8, pinned deps, tooling, tokens, shadcn`.

**Parallel batch P1** (all disjoint)

| Agent | Owns |
|---|---|
| A lib-core | `src/lib/{format,pricing,whatsapp}.ts` and their `*.test.ts` |
| B lib-assets | `src/lib/{media,icons,youtube}.ts(x)` and tests. The icons test asserts every registry entry and alias resolves to a defined lucide 1.49 export. |
| C supabase/auth | `src/lib/env.ts` (lazy getters, never at module scope); `src/lib/supabase/{public,server,browser}.ts`; `src/proxy.ts` (matcher `/admin/:path*` minus login; fails closed when env is missing); `src/lib/auth/require-admin.ts` and its test |
| D public shell | `src/app/(public)/layout.tsx`, placeholder pages for all 6 public routes, `src/components/public/layout/**`, `src/app/not-found.tsx` |
| E admin shell | `src/components/admin/layout/**` (an `AdminShell` with pure props), `src/app/admin/(panel)/layout.tsx` and 11 placeholder pages, `src/app/admin/login/page.tsx` placeholder, and a dev-only `src/app/dev-preview/admin-shell/page.tsx` (`notFound()` in production), so the shell can be screenshotted without logging in |
| e2e writer | `web/e2e/fase-1.spec.ts` |

### Phase 2 — data layer

- **2.0 Data audit (orch; the first point that needs env)**
  - Check that `web/.env.local` exists and lists the 3 variable names. Print names only, never values, and warn if it contains `sb_secret_`.
  - Run `node --env-file=.env.local scripts/data-audit.ts` (Node 24 type stripping). It uses the publishable key and prints aggregates only (checks in §6).
  - Turn the findings into decisions, write `supabase/migrations/20261015000300_v2_perbaikan.sql`, and send **CP-B**.
- **2.1 Contracts (orch)**
  - Regenerate types if logged in.
  - `src/types/domain.ts`: UnitCard, UnitDetail, LocationWithTypes, Settings, Faq, Landmark, Facility, Amenity. Frozen once written.
  - `src/lib/cache-tags.ts`, and stub signatures for every `lib/data` function.

**Parallel batch P2**

| Agent | Owns |
|---|---|
| D1 | `src/lib/data/{settings,content,popularity}.ts` |
| D2 | `src/lib/data/{locations,units}.ts`, `src/lib/search.ts` and its test |
| D3 | `src/lib/validation/{filters,unit,location,room-type,amenity,facility,landmark,faq,settings,about}.ts`, `filters.test.ts`, `src/lib/recommend.ts` and its test |
| D4 | `src/lib/validation/booking.ts`, `src/lib/actions/booking.ts` and `booking.test.ts`. The test uses a mocked RPC and covers every error code, including `TEXT_TOO_LONG` and unknown codes, and a never-resolving fetch with fake timers (4 s), confirming it never throws. |

- If env isn't there yet: D3, D4 and 2.1 still run; only D1/D2 runtime checks and the gate wait.
- **2.2** Dev-only page `src/app/dev-preview/data/page.tsx` showing counts and sample rows. Screenshot it, then delete it before the phase commit. Check with `git ls-files | Select-String dev-preview`, which must print nothing.

### Phase 3 — home and `/sewa`

- **3.0 Foundation (orch)**
  - Decide the photo ratio. Real photos are mostly portrait (42 of 52), so choose between 4:5 and contain plus blur.
  - `src/components/public/unit-card/{unit-card,card-gallery}.tsx`, `price.tsx`, `badges.tsx`, `section-heading.tsx`, `empty-state.tsx`, `skeletons.tsx`.
  - `src/lib/recent.ts` and its test (`vdl:recent`).
  - `src/lib/analytics.ts`: a typed `track()` that rejects any PII fields.
  - Stub `src/components/public/hero/{types.ts,hero-search.tsx}`.
  - Copy fallback building photos from `legacy-laravel/public/images` into `web/public/images/`.

**Parallel batch P3**

| Agent | Owns |
|---|---|
| H1 hero | `src/components/public/hero/**`, `src/lib/budget.ts` and its test |
| H2 home | `src/app/(public)/page.tsx`, `src/components/public/home/**` (promo carousel, location cards, recently viewed, why-us, FAQ, closing), `src/lib/seo/home-jsonld.ts` |
| S1 /sewa | `src/app/(public)/sewa/{page,loading,error}.tsx`, `src/components/public/search/**`, `src/lib/filter-url.ts` and its test. Filter changes use `router.push` (so back works); "Muat lebih banyak" uses `router.replace`. |
| e2e writer | `web/e2e/fase-3.spec.ts` |

### Phase 4 — unit detail, booking, other pages, SEO

- **4.0 Foundation (orch)**
  - `src/lib/seo/{site,metadata,jsonld}.ts` (builders). Escape `<` inside JSON-LD.
  - Move the FAQ accordion from `home/` to `src/components/public/shared/faq-accordion.tsx`, and add `map-embed.tsx`.
  - Booking contract: `src/components/public/booking/{types.ts,booking-provider.tsx}` stub.
  - Mount `<Analytics/>` and `<SpeedInsights/>` in the root layout.

**Parallel batch P4**

| Agent | Owns |
|---|---|
| U1 detail | `src/app/(public)/unit/[slug]/{page,loading,not-found,opengraph-image}.tsx`, `src/components/public/unit/**` |
| U2 booking | `src/components/public/booking/**` (taking over the stub), `src/lib/wa-redirect.ts` and its test |
| U3 recommendations | `src/components/public/recommend/**`, `src/lib/recommend-client.ts` and its test |
| U4 pages + SEO | `src/app/(public)/{apartemen/[slug],about,kebijakan-privasi}/**`, `src/app/{sitemap.ts,robots.ts,opengraph-image.tsx}`, `src/components/public/{apartment,about}/**` |
| e2e writer | `web/e2e/fase-4.spec.ts` |

### Phase 5 — admin part 1

- **5.0 Foundation (orch, or one serial agent)**
  - Final `require-admin.ts` plus `src/lib/actions/admin/_guard.ts` (a `withAdmin` wrapper).
  - Login: `src/app/admin/login/**` and `src/lib/actions/admin/auth.ts` (non-admin gets signed out with "Akun ini tidak punya akses admin.").
  - Final panel layout, with the new-leads badge from `src/lib/data/admin/counts.ts`.
  - Admin form kit `src/components/admin/kit/**`: field, rupiah-input, form-card, sticky-action-bar, unsaved-guard, confirm-dialog, data-table, list-toolbar, `use-url-filters`, pagination, status-badge, icon-picker, empty-state.
  - Uploads: `src/lib/upload/{compress,upload}.ts` (WebP, longest side 2000 px, quality 0.8, HEIC rejected, `media/<folder>/<uuid>.webp`).
  - `src/lib/storage-cleanup.ts`: delete a path only if no unit still references it.
  - `src/lib/actions/admin/guard-coverage.test.ts`: statically checks that every exported action in `lib/actions/admin/**` and every `route.ts` under `app/admin` goes through requireAdmin.
  - **Then send CP-C.**

**Parallel batch P5**

| Agent | Owns |
|---|---|
| A1 | Dashboard and amenities: `src/app/admin/(panel)/{page.tsx,amenities/**}`, `src/components/admin/{dashboard,amenities}/**`, `src/lib/data/admin/dashboard.ts`, `src/lib/actions/admin/amenities.ts` |
| A2 | Unit list: `src/app/admin/(panel)/units/page.tsx`, `src/components/admin/units/list/**`, `src/lib/data/admin/units.ts`, `src/lib/actions/admin/units-list.ts` (quick price, bulk, duplicate, toggles, delete) |
| A3 | Unit form: `src/app/admin/(panel)/units/{new,[id]}/**`, `src/components/admin/units/form/**`, `src/components/admin/photos/**`, `src/lib/actions/admin/units-form.ts`. Takes over `src/lib/validation/unit.ts`. |
| A4 | Locations: `src/app/admin/(panel)/locations/**`, `src/components/admin/locations/**`, `src/lib/actions/admin/{locations,room-types}.ts`, `src/lib/gmaps.ts` and its test |

### Phase 6 — admin part 2

- **6.0 (orch):** re-run `data-audit.ts` to see whether 0003 has been applied, then regenerate types.

**Parallel batch P6**

| Agent | Owns |
|---|---|
| B1 facilities | Facilities route, components and actions. **Needs 0003.** |
| B2 | Landmarks and FAQs: routes, components, actions |
| B3 leads | Route, components, actions (status, notes), `src/app/admin/(panel)/leads/export/route.ts` (calls requireAdmin), `src/lib/csv.ts` and its test (BOM, quoting, formula-injection guard) |
| B4 | About and settings: routes, components, actions, and the WA template editor with live preview (reuses `lib/whatsapp.ts`) |

### Phase 7 — QA

- Five read-only reviewers in parallel:
  1. Responsive screenshot matrix at 360, 390, 768 and 1280.
  2. Lighthouse.
  3. Accessibility (DESIGN §8).
  4. Security.
  5. Copy and emoji (PRD §10 forbidden terms).
- Fixes are grouped by file ownership and run in parallel only when the files don't overlap.
- Then the orchestrator writes `web/README.md`, the PROGRESS go-live checklist, runs the final verify, and tags `v2.0.0-rc1`.

## 2. Verification gate (orch, every phase)

1. `cd web; npm run verify`. This runs lint, typecheck, test, build (stop any `next start` first, because of Windows EPERM file locks), the emoji check and the secret check.
2. **Emoji scan.** `scripts/check-emoji.mjs src ../supabase/migrations` fails on `/[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/u`. The Grep-tool equivalent is the pattern `[\x{1F000}-\x{1FAFF}\x{2300}-\x{23FF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]` over `web/src`.
3. **Secret scan.** `scripts/check-secrets.mjs .next/static` fails on:
   - `sb_secret_`, `service_role`, `SERVICE_ROLE` or `-----BEGIN`;
   - any `eyJ…` JWT whose decoded payload has `"role":"service_role"`;
   - any `process.env.X` where X isn't `NEXT_PUBLIC_*`.

   A legacy anon JWT used as the publishable key is allowed. Also run `git check-ignore web/.env.local` (it must print the path) and confirm `git ls-files web/.env.local` prints nothing.
4. **Runtime checks.**
   - Start `web-start` on port 3100 (a production build, so caching behaves as in production).
   - Run `npm run e2e -- e2e/fase-N.spec.ts`. Every spec asserts `scrollWidth <= innerWidth` and saves full-page screenshots to `test-results/screens/`. The orchestrator views them with Read.
   - Spot-check interactions in the in-app browser with `resize_window` at 390×844 and 1280×800, then reset to `desktop`.
   - The dev-only previews (`dev-preview/*`) are checked on the dev server at port 3000.
5. **Lighthouse (phases 3, 4, 7).**
   - Warm each URL once with `curl`.
   - Run 3 times and take the median: `npx -y lighthouse@13.5.0 http://localhost:3100/<path> --quiet --chrome-flags="--headless=new" --only-categories=performance,accessibility,seo,best-practices --output=json --output-path=<scratchpad>\lh\<page>-<n>.json`
   - Thresholds: phase 3 home Performance ≥90; phase 4 unit detail Performance ≥90 and Accessibility ≥95; phase 7 home, `/sewa` and detail at ≥90/95/95.
6. **Adversarial review.**
   - Four read-only lenses run in parallel on `git diff fase-(N-1)..HEAD`:
     - Spec compliance against the PRD/DESIGN sections and the PROMPT criteria.
     - Security: requireAdmin, server-side zod, RLS assumptions, `dangerouslySetInnerHTML`, secrets.
     - Accessibility: DESIGN §8 and critic b10 colour pairs.
     - Next 16 API correctness: proxy, awaited params, `cacheComponents` rules (no `cookies()` inside `'use cache'`, Suspense around `searchParams` and `cookies`), `updateTag` vs `revalidateTag`, images config. This reviewer reads `node_modules/next/dist/docs` if present.
   - Phases 5 and 6 add a data-integrity lens: storage cleanup, `updated_at`, cache tags.
   - Each finding needs file:line and a concrete failure scenario. The orchestrator confirms or rejects each one. Confirmed findings are fixed, a regression test is added where feasible, and the gate re-runs. At most 2 review rounds per phase; leftover low-severity items go to PROGRESS for phase 7.

**Phase-specific evidence**

| Phase | Evidence |
|---|---|
| 0 | `git ls-files` whitelist; `Test-Path web` is false |
| 1 | `fase-1.spec`: `request.get('/admin', {maxRedirects: 0})` returns 307 with Location `/admin/login`; `/` renders header and footer; admin shell via dev-preview at 390 and 1280 |
| 2 | Vitest covers format, pricing, whatsapp, recommend and filters; dev-preview data screenshot shows real rows |
| 3 | Delft shows only Delft types; an empty submit goes to `/sewa?lokasi=<first sort_order>`; the form works with `javaScriptEnabled: false`; keyboard works (Tab, arrow keys on the radiogroup, `getByLabel`); filter → URL → `goBack()` restores the previous state; chips remove filters; `hal` updates; an impossible filter shows the empty state with suggestions |
| 4 | Full flow with real data. Mobile: `page.route('https://wa.me/**')` is fulfilled and the URL captured. Desktop: `context.waitForEvent('page')`. The message contains `Kode permintaan: VDL-`, which proves the lead row exists. Supabase-down simulation: abort the request carrying a `next-action` header, and wa.me must still open without a code; the D4 vitest covers the server-side timeout. 404 for an unknown slug; sitemap and robots; JSON-LD parses; OG returns `image/png`. |
| 5 | Non-admin denial (CP-C), the guard-coverage test, and the `withAdmin` unit test. Price change in the admin pane must appear on the first load of `:3100/unit/<slug>`. A test apartment plus type and unit appears in the hero and filters, then gets removed. HEAD on the uploaded photo returns `image/webp` under `units/<uuid>.webp`. |
| 6 | One change per entity type shows on the public site, then is reverted. The CSV starts with bytes EF BB BF and parses (node check), and the owner opens it in Excel. |
| 7 | Everything above re-run, plus `requireAdmin` coverage, and an anon `select` on `leads` returns nothing or is denied |

## 3. Owner checkpoints

| ID | When | Owner does | Orch continues with | Hard block |
|---|---|---|---|---|
| A | Right after 1.1 | (1) Create `web/.env.local` from `.env.example` with 3 vars and no secret key. (2) Optionally run `cd web; npx -y supabase@2.119.0 login` in their own terminal. (3) Auth: sign-ups off; create `admin-qa` (plus `insert into public.admins`) and `nonadmin-qa`. Passwords are never shared in chat. (4) Answer the phase-0 questions. (5) Consent to test writes: ≤5 leads named "UJI QA" with distinct numbers, plus a test apartment, unit and photo in phases 5–6, all cleaned up. | All of phase 1. Build passes without env because env is read lazily and the proxy fails closed. Also 2.1, D3, D4. | Phase 2.0 data audit, D1/D2 runtime checks, phase-2 gate |
| B | After 2.0 | Answer ≤5 data decisions (defaults stated). Run migration 0003 in the SQL Editor and report its JSON output. | Phases 2–5. Code tolerates a missing 0003: it filters `is_active !== false` and sets `updated_at` explicitly. | Phase 6 B1 (facilities) only |
| C | After 5.0 | Log in as `admin-qa` in the in-app browser at `:3000/admin/login` (cookies are shared with `:3100`). Later log in once as `nonadmin-qa` for the denial check. | P5 builders | Phase-5 gate |
| D | Phase-6 gate | Open the CSV in Excel (optional) | — | None |
| E | End of phase 7 | Go-live tasks (SETUP §5–7; §6 below) | — | Session ends |

- The orchestrator never types passwords. Type generation uses the owner's CLI token.
- The project ref is read without echoing the env file: `node -e` prints only the hostname match.
- Run type generation in Git Bash (`> src/types/database.ts`). PowerShell 5.1 would write UTF-16.
- The per-phase report is posted in chat and does not block; the orchestrator stops only at A, B and C, or if the owner says stop.

## 4. Git

- **Cadence:**
  - one commit per foundation unit;
  - one per joined batch, after lint, typecheck and test pass;
  - `fix(<scope>): …` for confirmed review findings;
  - `docs(progress): fase N selesai`, then tag `fase-N`.

  Subjects: `chore:`, `feat(public|admin|lib|web):`, `fix:`, `docs:`. Every message ends with the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer. No push; the owner creates the private repo (SETUP §5).
- **Never commit:**
  - `.env` and `.env.*` (except `.env.example`);
  - `legacy-laravel/`, `storage-backupunits/`, `tools/`;
  - `.next/`, `node_modules/`, `test-results/`, `playwright-report/`, Lighthouse output (kept in the scratchpad);
  - `*.tsbuildinfo`, `.claude/settings.local.json`, `supabase/.temp/`;
  - `dev-preview/` at phase-end commits.
- **Guard before every commit:** `git add -A`, then `node web/scripts/guard-staged.mjs`. It fails if `git diff --cached --name-only` matches:

  ```
  ^(legacy-laravel|storage-backupunits|tools)/|(^|/)\.env(?!\.example$)|\.next/|node_modules/|dev-preview/
  ```

  (`dev-preview/` only at phase end.)
- **Root `.gitignore` additions** (keeping what's already there): `storage-backupunits/`, `tools/`, `*.tsbuildinfo`, `test-results/`, `playwright-report/`, `.claude/settings.local.json`, `supabase/.temp/`.
- **New root `.gitattributes`:** `* text=auto eol=lf`, plus `*.png *.jpg *.jpeg *.webp *.ico *.woff2 binary`. This machine has `core.autocrlf=true` and `init.defaultBranch=master` in its system config, hence `git init -b main`.

## 5. Moving the Laravel files

**Classification**
- **Laravel, move (24 entries, 123 files today):** `.editorconfig`, `.env.example`, `.gitattributes`, `app`, `artisan`, `bootstrap`, `composer.json`, `composer.lock`, `config`, `database`, `package.json`, `package-lock.json`, `phpunit.xml`, `postcss.config.js`, `public`, `resources`, `routes`, `storage`, `tailwind.config.js`, `tests`, `vite.config.js`, `PANDUAN_PENGGUNAAN_VIDALIDAY.md` (contains credentials), `data_dummy_vidaliday.txt`, `vidaliday_project_blueprint.md`. All have the same timestamp as the Laravel files.
- **Stay at root:** `CLAUDE.md`, `PROMPT.md`, `README.md`, `.gitignore`, `docs/`, `supabase/`.
- **Stay at root, ignored:** `storage-backupunits/`.

The move also removes three of the critic's build risks:
- the root lockfile and `"type": "module"` that would confuse Turbopack's workspace root;
- the root Tailwind v3 `postcss.config.js`;
- the root `.editorconfig` with indent 4.

**PowerShell 5.1 sequence**

```powershell
$ErrorActionPreference='Stop'; $root='D:\website-vidaliday'; $dest=Join-Path $root 'legacy-laravel'
$snap='C:\Users\RISWAN\AppData\Local\Temp\claude\D--website-vidaliday\2cb260b0-cabc-48f1-859d-33e0e733f383\scratchpad\legacy-before.csv'
$items='.editorconfig','.env.example','.gitattributes','app','artisan','bootstrap','composer.json','composer.lock','config','database','package.json','package-lock.json','phpunit.xml','postcss.config.js','public','resources','routes','storage','tailwind.config.js','tests','vite.config.js','PANDUAN_PENGGUNAAN_VIDALIDAY.md','data_dummy_vidaliday.txt','vidaliday_project_blueprint.md'
if (Test-Path -LiteralPath $dest) { throw 'legacy-laravel exists' }; if (Test-Path -LiteralPath "$root\.git") { throw 'already git' }
foreach($i in $items){ if(-not(Test-Path -LiteralPath (Join-Path $root $i))){ throw "missing $i" } }
function Get-Manifest($base,$names){ foreach($n in $names){ $p=Join-Path $base $n
  $fs= if((Get-Item -LiteralPath $p -Force).PSIsContainer){ Get-ChildItem -LiteralPath $p -Recurse -Force -File } else { Get-Item -LiteralPath $p -Force }
  foreach($f in $fs){ [pscustomobject]@{Rel=$f.FullName.Substring($base.Length+1);Hash=(Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash} } } }
$before=@(Get-Manifest $root $items); $before | Export-Csv -LiteralPath $snap -NoTypeInformation -Encoding UTF8
New-Item -ItemType Directory -Path $dest | Out-Null; $moved=@()
try { foreach($i in $items){ Move-Item -LiteralPath (Join-Path $root $i) -Destination (Join-Path $dest $i); $moved+=$i } }
catch { foreach($m in $moved){ Move-Item -LiteralPath (Join-Path $dest $m) -Destination (Join-Path $root $m) }; throw }
$after=@(Get-Manifest $dest $items); $d=Compare-Object $before $after -Property Rel,Hash
if($d -or $before.Count -ne $after.Count){ $d; throw "MISMATCH $($before.Count)/$($after.Count)" }
$exp='.gitignore','CLAUDE.md','PROMPT.md','README.md','docs','legacy-laravel','storage-backupunits','supabase'
if(Compare-Object ((Get-ChildItem -LiteralPath $root -Force).Name) $exp){ throw 'root set wrong' }
'resources\css\app.css','tailwind.config.js','resources\views\layouts\app.blade.php','resources\views\home.blade.php','resources\views\partials\unit-card.blade.php','resources\views\about.blade.php','resources\views\admin\layout.blade.php','resources\views\admin\units','app\Models','public\images\logo_vidaliday.png' | % { if(-not(Test-Path -LiteralPath (Join-Path $dest $_))){ throw "ref path missing $_" } }
"OK $($after.Count) files identical"   # expect 123
```

- If a move fails because an editor holds a file lock, the `catch` moves everything back. Ask the owner to close the editor and retry.
- Then: update `.gitignore`, add `.gitattributes`, and run:

  ```
  git init -b main
  git add -A
  git ls-files
  ```

  `git ls-files` should list only `.gitattributes`, `.gitignore`, the 3 root `.md` files, `docs/**` and `supabase/migrations/*`.
- Then `git ls-files | Select-String '^(legacy-laravel|storage-backupunits|tools)/|(^|/)\.env'` must print nothing, and `git check-ignore -v legacy-laravel/database/seeders/DatabaseSeeder.php storage-backupunits` must show the rules. Then commit.
- **References to `legacy-laravel/`** in CLAUDE.md, DESIGN.md §2 and PROMPT phases 0/1 become correct after the move, as do SETUP §1/§5 claims about `.gitignore` once it's updated. No doc edits are needed; PROGRESS records that the critic's items (a)1, (a)2 and (c)1 are resolved by the move.

## 6. Sequencing risks

**Read-only data checks at 2.0** (publishable key; all units are visible to anon because `is_published` defaults to true)

| Check | Decision it feeds | Consumer |
|---|---|---|
| `rental_period` distribution | Prices are treated as per night; non-nightly units go on an admin fix list, or 0003 moves them to weekly/monthly | pricing, card, owner TODO |
| `room_type` × location vs `room_type_id`, and available units per type | Vida View types showing "belum tersedia": remap by unit name in 0003 (`backfill_v3()`), or accept; whether to deactivate a "1 Bedroom" type | Hero (H1), CP-B |
| `promo_badge` distinct values and lengths | Null out `\d+%` badges in 0003, or ignore them at render; legacy-tolerant zod for existing values | D3, card |
| Settings key presence and nulls (`about_*`, `contact_email`, `office_hours`, `hero_image`, `site_logo`) | Typed defaults | D1, U4 |
| Locations: `hero_image` (Unsplash?), `gmaps_url`, lat/lng, `short_name`, `sort_order` | Local fallback photos; map text-query embed; default hero apartment | 3.0, U1, U4 |
| `main_image`/`gallery_images` prefixes; HEAD on one public URL | `lib/media` normalisation, `remotePatterns` | B (P1, adjust) |
| Facility, amenity and landmark icons; `about_reasons` icons | Registry aliases and landmark keyword fallback (or 0003 backfill) | B, U4 |
| `facilities.sort_order` exists (error 42703 if not) | Whether 0003 is applied | 6.0 |
| Emoji or `*markdown*` in FAQ, settings and description text | Strip at render; admin cleanup list | H2, U1 |
| `is_promo_active` with null or 0 promo price | No strike-through price shown | card |
| anon `select` on `leads` and anon RPC `backfill_v2` | Must be denied (security baseline) | Phase 7 |
| Near-duplicate amenities | Admin cleanup list | Owner TODO |

**Other risks**
- **Build needs Supabase from phase 2.** Prerendering under `'use cache'` hits Supabase during `next build`, so every gate build needs env and network (a paused free-tier project breaks builds). Before that point, keep env access lazy.
- **Type drift.** Hand-written types may differ from production. Get `supabase login` done at CP-A so types are generated before D1/D2 start, and regenerate after 0003.
- **Cache testing.** "Price change shows immediately" and Lighthouse only count on `next build` + `next start`, never dev. Stop `next start` before rebuilding. Next 16 keeps dev output in `.next/dev`; if a build still collides with the dev server, stop dev too.
- **Production test data.**
  - The rate limits are 5 leads per number per hour and 30 per minute globally; check `TOO_MANY_REQUESTS` with mocks, not live.
  - Test leads skew `unit_popularity`, and the admin UI has no lead delete, so the owner deletes "UJI QA" rows in the Table Editor.
  - Every test entity created in phases 5–6 is removed in the same gate.
- **Go-live re-migration.** It (SETUP §7B) re-imports data, so 0003's data fixes must be idempotent functions (`backfill_v3()`) re-run after `backfill_v2()`. Add this to the go-live list.
- **Unpinned versions from tooling.** create-next-app and shadcn pull latest versions; re-pin and check with `npm ls`. The `cmdk` pin (1.1.1) is not in the brief's list.
- **Parallel-edit hazards.** Prevented by the ownership audit, no barrels, stub-first contracts and `--incremental false`. Vitest cache writes are a low risk.
- **Next 16 traps.** Admin layouts read cookies, so they need Suspense under `cacheComponents`. `updateTag` works only in Server Actions (the CSV route doesn't mutate anything). `next lint` is gone. `images.qualities` defaults to `[75]`.
- **Windows.**
  - PowerShell 5.1 has no `&&`: use npm scripts or Git Bash.
  - Avoid PowerShell redirection for anything binary or UTF-8.
  - `npx` resolves to `D:\npx.ps1`, which works with the Bypass/RemoteSigned policy.
- **Lighthouse variance.** Local runs differ from Vercel's CDN: warm up, take the median of 3, and re-check on the Vercel preview before go-live.
- **Long-session context loss.** PROGRESS.md and `docs/audit/` are the recovery source after compaction.

## Corrections to the draft plan
1. Add this execution section, and §5's exact move, `.gitattributes` and `git init -b main`.
2. Replace the "Laravel ada di root" bullets with the post-move state. Add `storage-backupunits/` and `tools/` to the ignored list.
3. Item 9 (types): ask for `supabase login` at CP-A and generate types before phase 2. Hand-written types are a fallback only.
4. Item 8 (migration 0003): name and content are decided after 2.0. Make it idempotent and put data fixes in `backfill_v3()`. Server Actions always set `updated_at`; the trigger in 0003 is a bonus.
5. Dependencies:
   - install everything in phase 1;
   - add `@playwright/test@1.63.0` (Chrome channel), `vite@8.3.2` and `cmdk@1.1.1`;
   - no `vaul` (Sheet bottom) and no dnd-kit;
   - Lighthouse runs through `npx` and is not a dependency;
   - engines ≥22.12, with Vercel on Node 22.x or 24.x.
6. Item 3 (`/sewa`): filters use `router.push`; only "Muat lebih banyak" uses `replace`.
7. Add the dev-preview policy, the production test-data consent and cleanup, and the rule that cache and Lighthouse tests run only on `next start`.
8. "Checkpoint per fase" means a non-blocking report. The orchestrator blocks only at A, B and C.

### Critical files for implementation
- D:\website-vidaliday\.gitignore
- D:\website-vidaliday\docs\PROGRESS.md
- D:\website-vidaliday\web\package.json
- D:\website-vidaliday\web\src\types\domain.ts
- D:\website-vidaliday\supabase\migrations\20261015000300_v2_perbaikan.sql
