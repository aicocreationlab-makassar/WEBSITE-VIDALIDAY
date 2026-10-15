> Laporan desain Fase 0 (15 Okt 2026). Path Laravel di laporan ini relatif ke root lama; sekarang semuanya ada di `legacy-laravel/`.

**Bottom line:** keep `cacheComponents` + `'use cache'` as the draft has it, with the corrections below. All doc citations are from the docs shipped inside `next@16.3.8` (`https://unpkg.com/next@16.3.8/dist/docs/...`) or the `v16.3.8` tag on GitHub (`raw.githubusercontent.com/vercel/next.js/v16.3.8/docs/...`). nextjs.org already shows 16.4, which differs on one point (see `partialPrefetching` in 1a).

## 1. Cache Components

**a. Config key.** It is top-level `cacheComponents: true`; 16.0 moved it out of `experimental`.
- `.../05-config/01-next-config-js/cacheComponents.mdx`: the flag enables `use cache`, `cacheLife` and `cacheTag`, makes Partial Prerendering the default, and requires the Node.js runtime.
- The 16.3.8 copy of that page does not mention `partialPrefetching`. That option was added in 16.3.0 and defaults to `false`; it requires `cacheComponents`.
- Live nextjs.org (16.4) says leaving `partialPrefetching` unset logs a warning. That does not apply to 16.3.8, so leave it unset. If a warning does appear, set `partialPrefetching: false`.
- Custom `cacheLife` profiles also go at the top level (`.../next-config-js/cacheLife.md`: defined next to `cacheComponents`; built-in names can be overridden).

**b. How `use cache`, `cacheTag` and `cacheLife` work.**
- `/docs/app/api-reference/directives/use-cache`: the cache key is the build ID, a hash of the function, and its serialized arguments. Variables captured from an enclosing function become part of the key.
- The default handler is an in-memory LRU. On serverless, entries "typically don't persist across requests". No entry survives a new deploy.
- `cacheTag(...tags)` (`.../functions/cacheTag.mdx`): one or more strings, up to 128 tags, each up to 256 characters.
- `cacheLife('max')` is valid (`.../functions/cacheLife.mdx`). It means stale 5 min, revalidate 30 days, expire 1 year.
  - Only the `seconds` profile becomes a dynamic hole (`expire` under 5 min).
  - When the outer function sets `cacheLife` explicitly, its lifetime wins over nested caches.
  - **Consequence:** `getPopularity()` with `'hours'` called inside a `'max'` function would stay frozen. Compose it at the call site; never nest it.

**c. Constraints.**
- **Runtime data needs Suspense.** Awaiting `params`/`searchParams`, or calling `cookies()`, `headers()`, `connection()`, or any uncached fetch outside `<Suspense>`, fails with "Uncached data was accessed outside of `<Suspense>`" (`/docs/messages/blocking-route`).
  - Exception: with `generateStaticParams`, you "can await params directly without Suspense".
  - A `loading.js` file also counts as the boundary.
- **Route segment configs are forbidden.** `dynamic`, `revalidate`, `fetchCache` and `dynamicParams` all error at build (`.../02-guides/migrating-to-cache-components.mdx`). Replace them with `cacheLife`.
- **`generateStaticParams` must return at least one entry.** "Empty arrays cause a build error" (`.../functions/generate-static-params.mdx`).
- **Time and randomness.** `new Date()`, `Date.now()`, `Math.random()` and `crypto.randomUUID()` in Server Components during prerender error at build (`/docs/messages/next-prerender-current-time`).
  - They are allowed inside `'use cache'`, or after `await connection()` inside Suspense.
  - Client Components that read the time while rendering need a Suspense boundary above them.
- **Client navigation hooks.** `usePathname`, `useParams`, `useSearchParams` and `useSelectedLayoutSegment(s)` in a Client Component outside Suspense trigger `blocking-prerender-client-hook` (`/docs/messages/blocking-prerender-client-hook`).
  - `useSearchParams` triggers it on any prerendered route; the other hooks only on per-request dynamic routes.
- **A `use cache` function that throws is not documented.**
  - From the source: the default in-memory handler (`packages/next/src/server/lib/cache-handlers/default.ts@v16.3.8`) writes the entry only after reading the whole stream, so an errored result is never stored.
  - During `next build`, the throw becomes a prerender error and the build fails.
  - Fill timeout is 50 s, after which you get "Filling a cache during prerender timed out" (use-cache docs, "Build Hangs").
- **Serialization.**
  - Arguments: primitives, plain objects, arrays, Date, Map, Set, TypedArray.
  - Return values: the same, plus JSX.
  - Not allowed: class instances, functions (except pass-through), Symbols, URL objects (use-cache docs, "Serialization").
- **Supabase client inside `'use cache'`: yes**, as long as it reads no cookies or headers. Rules:
  - Create it inside the cached function. Never pass it as an argument or return it, because it is a class instance.
  - Return only plain rows.
  - Calling `cookies()` or `headers()` anywhere down the call stack throws `next-request-in-use-cache`.
- **Untouched by your Suspense boundaries:** `notFound()` inside streamed content returns **200 + `noindex`** instead of 404 (`.../file-conventions/not-found.md`: "200 for streamed responses, 404 for non-streamed"; `loading.md` says the same).
- **Navigation keeps routes mounted (React Activity)** (`.../02-guides/preserving-ui-state.md`):
  - Dialog and sheet open state survives back navigation.
  - Hidden `<iframe>` media keeps playing.
  - Form state persists.
  - Playwright can match hidden duplicate elements; use `getByRole`.

## 2. `revalidateTag` and `updateTag`

- **`revalidateTag(tag: string, profile: string | { expire?: number })`** (`.../functions/revalidateTag.mdx`).
  - The one-argument form is deprecated and is a TypeScript error.
  - `'max'` means stale-while-revalidate.
  - `{ expire: 0 }` means the next request is a blocking miss.
  - Usable in Server Functions and Route Handlers.
- **`updateTag(tag: string)`** (`.../functions/updateTag.mdx`).
  - Server Actions only; a Route Handler throws.
  - Expires the tag immediately, and the next request "waits to fetch fresh data".
- **Use `updateTag` in every admin action.** This is the read-your-writes behaviour that "ubah harga langsung terlihat" needs.
- **Never use `revalidateTag(tag, 'max')` for admin edits.**
  - First, it serves the stale page to the next visitor.
  - Second, 16.3 has a reported bug on Vercel: stale-path background regeneration is not kept alive by `waitUntil` and gets cut off (GitHub vercel/next.js #99339, reported on 16.3.6; fix PR #99772 not merged).
- **Refreshing uncached admin views:** add `refresh()` from `next/cache` (Server Actions only, `.../functions/refresh.md`). `refresh()` "does not revalidate tagged data" (`07-mutating-data.md`), so it is not a substitute for `updateTag`.

## 3. `proxy.ts`

- **Location and export** (`.../file-conventions/proxy.mdx`):
  - File is `src/proxy.ts`. Export `proxy` (named) or a default export, with signature `(request: NextRequest, event?: NextFetchEvent)`.
  - `config.matcher` must be static constants.
  - Runtime is Node.js by default; setting `runtime` in proxy throws. Edge is not supported in proxy (upgrade guide).
  - Order: proxy runs after `next.config` `headers` and `redirects`, and before filesystem routes.
  - Server Actions are POSTs to the page route, so the matcher also scopes them. The docs say to always verify auth inside each Server Function.
- **Matcher: use `['/admin/:path*']`.** `:path*` also matches `/admin` itself.
  - Public pages never pass through proxy: no cookie writes, no extra latency.
  - `submitLead` posts to `/unit/*` and is not matched, which is correct because it needs no auth.
- **Supabase pattern** (`supabase.com/docs/guides/auth/server-side/nextjs`; Next's own `examples/with-supabase/proxy.ts@v16.3.8`):
  - Rules: put nothing between `createServerClient` and `getClaims()`; never trust `getSession()` on the server.
  - When returning a redirect, copy the cookies onto it.
  - `setAll` in `@supabase/ssr` 0.12.x receives `(cookiesToSet, headers)`. Apply those cache headers to the response so a CDN never caches a session (README of `@supabase/ssr@0.12.7`).

```ts
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(URL, KEY, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll(list, headers) {
      list.forEach(({ name, value }) => request.cookies.set(name, value))
      response = NextResponse.next({ request })
      list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v)
    } } })
  const { data } = await supabase.auth.getClaims()
  const isLogin = request.nextUrl.pathname === '/admin/login'
  if (!data?.claims && !isLogin) return redirectWithCookies(request, response, '/admin/login')
  return response
}
export const config = { matcher: ['/admin/:path*'] }
```

## 4. `next.config.ts` (16.3.8)

**Images** (`.../02-components/image.md`):
- `remotePatterns` accepts object form or `new URL('https://host/path/**')`.
- `qualities` defaults to `[75]`. Other values are coerced to the nearest allowed one (with a dev warning), and direct optimizer requests with them get a 400.
- `localPatterns` is needed only for local images with query strings.
- `minimumCacheTTL` defaults to 4 h. That is fine because uploads get new UUID paths.
- `priority` is deprecated; use `preload`, or `loading="eager"` plus `fetchPriority="high"` on the LCP image.

**Redirects** (`.../next-config-js/redirects.md`):
- `has: [{ type: 'host', value: ... }]` is supported. `permanent: true` gives 308. Query strings pass through.
- There is no www example in the docs; the rule below is my inference. Test it, or rely on the Vercel domain redirect (SETUP §6.3) as the primary and keep this as a fallback.

**Headers** (`.../next-config-js/headers.md`):
- When two entries set the same header key, the later entry wins.
- The docs note that `X-Frame-Options` is superseded by the CSP `frame-ancestors` directive.

**Server Actions body limit** (`.../next-config-js/serverActions.md`):
- In 16.3.8 it lives under `experimental.serverActions.bodySizeLimit`; the default is 1 MB.
- Keep the default. Uploads go browser → Storage, and actions receive only paths.

```ts
const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname // fail fast if missing
const nextConfig: NextConfig = {
  cacheComponents: true,
  turbopack: { root: path.join(__dirname) }, outputFileTracingRoot: path.join(__dirname),
  images: { remotePatterns: [
    { protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/media/**' },
    { protocol: 'https', hostname: 'images.unsplash.com' } ] },   // qualities stay [75]; never pass another quality
  async redirects() { return [
    { source: '/:path*', has: [{ type: 'host', value: 'www.vidaliday.com' }], destination: 'https://vidaliday.com/:path*', permanent: true },
    { source: '/preview-client', destination: '/', permanent: true },
    { source: '/login', destination: '/admin/login', permanent: true } ] },
  async headers() { return [
    { source: '/:path*', headers: [nosniff, referrerPolicy('strict-origin-when-cross-origin'), permissionsPolicy, hsts] },
    { source: '/admin/:path*', headers: [{ key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" }, { key: 'X-Robots-Tag', value: 'noindex' }] } ] },
}
```

## 5. ESLint

- `next lint` is removed, and "`next build` no longer runs linting" (`.../02-guides/upgrading/version-16.md`).
- Flat config (`.../05-config/03-eslint.md`):

```js
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
export default defineConfig([...nextVitals, ...nextTs,
  globalIgnores(['.next/**','out/**','build/**','next-env.d.ts','src/types/database.ts'])])
```

- Scripts:
  - `"lint": "eslint ."`
  - `"typecheck": "next typegen && tsc --noEmit"` (`.../06-cli/next.md`: without `typegen`, `tsc` alone doesn't validate route types; `PageProps<'/unit/[slug]'>` needs it).
- The definition of done must run lint separately, because build no longer does.

## 6. Other 16.x gotchas

- **`loading.tsx`.** It wraps the page in Suspense, so it satisfies the params/searchParams rule. It does not cover runtime data read in the same segment's `layout`.
  - **Do not put `loading.tsx`, or any Suspense around `{children}`, above `/unit/[slug]` or `/apartemen/[slug]`.** That would turn `notFound()` into 200 + `noindex`.
- **`not-found.tsx`.** `/_not-found` is always prerendered at build (blog sources; not in the official docs), so keep it static with no DB call. `global-not-found` is still experimental; don't use it.
- **`error.tsx`** catches runtime render errors only. Build-time throws fail the build, which is the intended fail-loud behaviour.
- **`opengraph-image.tsx`** (`.../01-metadata/opengraph-image.md`, `.../functions/image-response.md`):
  - Prerendered at build unless it reads request data. `params` is a Promise.
  - Output is PNG; 500 KB bundle limit; fonts must be ttf/otf/woff.
  - Input WebP is not documented as supported, and there are open "Unsupported image type" reports in vercel/satori (#311, #613). **Treat WebP as unsupported.**
  - Embed the unit photo only when the path ends in `.jpg` or `.png`; otherwise render a brand card. Load a TTF file of Plus Jakarta Sans from `src/assets/fonts/`.
- **`sitemap.ts` / `robots.ts`.** Cached by default unless they read request data. Feed the sitemap from the cached catalog so `updateTag('units')` refreshes it. Don't call `new Date()` outside `'use cache'`; use DB timestamps.
- **`generateMetadata`** follows the same rules (`.../functions/generate-metadata.mdx`).
  - On `/unit/[slug]`, awaiting params is fine because of `generateStaticParams`, and data comes from cached functions.
  - On `/sewa`, export static `metadata`; reading `searchParams` there would make metadata dynamic.
- **Async `params`/`searchParams`/`cookies()`/`headers()`.** Synchronous access is fully removed (upgrade guide).
- **Analytics and Speed Insights.** `@vercel/analytics/next` 2.0.1 uses `useSearchParams` but wraps itself in Suspense (verified in its `dist`). Wrap `<SpeedInsights/>` in `<Suspense fallback={null}>` defensively.
- **Scroll behaviour.** Next no longer overrides `scroll-behavior` during navigation; add `data-scroll-behavior="smooth"` on `<html>` if you use smooth scroll.

## Verdict: keep Cache Components, with the corrections below

Why not the alternative:
- `unstable_cache` is officially "replaced by use cache in Next.js 16" (`.../functions/unstable_cache.md`). Building a new app on a deprecated API is worse than following the Suspense rules.
- Build-time failure modes are the same in both models: prerendering `/` and `/unit/*` needs Supabase either way. A failed Vercel build keeps the previous deployment live, so fail-loud is correct.
- Admin costs one Suspense boundary in the panel layout.
- With 45 units, one catalog query per cache fill is trivial.

Residual risk you must test:
- Plain `'use cache'` is in-memory per instance (Vercel Runtime Cache doc; `cacheHandlers.md`: the default handler "only tracks tags locally").
- I could not confirm from official docs that an `updateTag` on one Vercel instance invalidates in-memory entries on other instances. This matters most for `/sewa`, whose results are rendered per request.
- **Gate for Phase 5:** on a Vercel Preview, edit a price, then reload `/`, `/sewa?...` and `/unit/x` several times, including from another browser.
- **If anything is stale:** change the directive in `lib/data/*` to `'use cache: remote'` (Vercel Runtime Cache, small cost), or make `/sewa`'s catalog read uncached. It is 45 rows from `sin1` to Supabase Singapore.

### File-level patterns

**`lib/supabase/public.ts`**
- `import 'server-only'`.
- Export a factory `createPublicClient()` with `auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }`.
- Wrap `global.fetch` with `AbortSignal.timeout(10_000)` so a sleeping DB cannot hit the 50 s fill timeout.
- Call it only inside `'use cache'` functions or inside `submitLead`. `submitLead` uses `.abortSignal(AbortSignal.timeout(4000))` on the RPC builder.

**`lib/cache-tags.ts`** holds the single invalidation map:

| What changed | Tags to expire |
|---|---|
| A unit | `units`, `unit:<oldSlug>`, `unit:<newSlug>` |
| A location or room type | `locations`, `units` |
| An amenity | `amenities`, `units` |
| Anything else | its own tag (`facilities`, `landmarks`, `faqs`, `settings`) |

`invalidate(kind, ctx)` calls `updateTag` for each tag.

**`lib/data/*.ts`**

```ts
import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
export async function getCatalog(): Promise<CatalogUnit[]> {
  'use cache'; cacheLife('max'); cacheTag('units', 'locations', 'amenities')
  const { data, error } = await createPublicClient().from('units').select(CATALOG_SELECT)/* published */
  if (error) throw new Error(`getCatalog: ${error.message}`)   // never cache empty
  return data.map(toPlain)
}
export async function getUnitBySlug(slug: string) {
  'use cache'; cacheLife('max'); cacheTag('units', `unit:${slug}`)   // tag before query so null results are tagged
  /* maybeSingle; throw on error; return row ?? null */
}
export async function getPopularity() { 'use cache'; cacheLife('hours'); cacheTag('popularity'); /* rpc unit_popularity(30) */ }
// settings.ts also returns copyrightYear computed inside 'use cache' (footer year must not call new Date() in render)
```

**Route groups**
- `app/layout.tsx`: font, `<html lang="id">`, Toaster, Analytics. No data.
- `app/(public)/layout.tsx`: header and footer from cached settings and locations. No `usePathname` in the shell; if an active-link state is needed, use a leaf `<Suspense>` around it.
- `app/(public)/(with-fab)/{page.tsx, sewa, apartemen/[slug], about}` share a layout that renders the floating WhatsApp button. This places it per PRD §6.1 without pathname checks.
- `unit/[slug]` and `kebijakan-privasi` sit outside `(with-fab)`.

**`/` (home):** fully static.
- `await Promise.all([getSettings(), getLocationsWithTypes(), getCatalog(), getFaqs()])`.
- `<HeroSearch>` receives props.
- `<RecentlyViewed>` reads localStorage in an effect.

**`/sewa`:**

```tsx
export const metadata = { title: 'Cari unit…', alternates: { canonical: '/sewa' } }
export default function Page({ searchParams }: PageProps<'/sewa'>) {
  return (<><SewaIntro /> {/* static shell */}
    <Suspense fallback={<SewaResultsSkeleton />}><SewaResults searchParams={searchParams} /></Suspense></>)
}
async function SewaResults({ searchParams }) {
  const filter = parseSewaFilter(await searchParams)               // zod safeParse, invalid params ignored
  const [catalog, pop, locs] = await Promise.all([getCatalog(), getPopularity(), getLocationsWithTypes()])
  return <SewaView result={searchUnits(catalog, filter, pop)} filter={filter} locations={locs} />  // client filter UI gets props, no useSearchParams
}
```

**`/unit/[slug]`** (no Suspense or `loading.tsx` above it, so a missing slug returns a real 404):

```tsx
export async function generateStaticParams() {
  const slugs = (await getCatalog()).map(u => ({ slug: u.slug }))
  return slugs.length ? slugs : [{ slug: '__none__' }]           // >=1 required
}
export async function generateMetadata({ params }: PageProps<'/unit/[slug]'>) { /* await params; getUnitBySlug */ }
export default async function Page({ params }: PageProps<'/unit/[slug]'>) {
  const { slug } = await params                                   // allowed: generateStaticParams present
  const unit = await getUnitBySlug(slug); if (!unit) notFound()
  /* similar units via lib/recommend over getCatalog(); faqs/landmarks/facilities cached */
}
```

Check: `curl -s -o NUL -w "%{http_code}" localhost:3000/unit/tidak-ada` must print `404`, on `next start` and on a Vercel Preview.

**Admin panel layout**

```tsx
// app/admin/(panel)/layout.tsx
export default function PanelLayout({ children }: LayoutProps<'/admin'>) {
  return <Suspense fallback={<AdminShellSkeleton />}><AdminFrame>{children}</AdminFrame></Suspense>
}
async function AdminFrame({ children }) {
  const admin = await requireAdmin()          // React.cache-wrapped: server client(cookies) -> getClaims -> admins row -> redirect()
  const newLeads = await countNewLeads()
  return <AdminShell email={admin.email} newLeads={newLeads}>{children}</AdminShell>  // client: sidebar collapse (localStorage), usePathname OK inside Suspense
}
```

- Every admin page and every Server Action calls `requireAdmin()` again; pages render in parallel with layouts.
- Admin reads are uncached.
- Each mutation action: `requireAdmin()` → zod → write (with explicit `updated_at`) → `invalidate(...)` → `refresh()`.
- Edit forms use `key={id + updated_at}` because of Activity.
- `/admin/login` holds no runtime reads. Proxy handles the redirect for already-signed-in users.

## Corrections to the draft plan

1. **Decision 1, config.**
   - Use `cacheComponents: true` only; do not set `partialPrefetching`.
   - `cacheLife('max')` is fine, but popularity (`'hours'`) must never be nested inside a `'max'` function.
   - Add the tag map file `lib/cache-tags.ts`, and `refresh()` after admin mutations.
   - Ban `revalidateTag(...,'max')` in admin actions (stale-while-revalidate plus bug #99339).
2. **Decision 1, Suspense rules.** Extend "wrap searchParams/cookies in Suspense" to also cover:
   - client hooks `usePathname` and `useSearchParams`;
   - `new Date()` / `Math.random()` in render (footer year, "hari ini" labels);
   - the `generateStaticParams` exemption for `params`.
3. **Decision 1, error handling.**
   - "Throw on Supabase error" is correct: errored entries are not cached, and the build fails loudly.
   - Add the 10 s fetch timeout.
   - Add `app/(public)/error.tsx` and `global-error.tsx`.
   - Keep `not-found.tsx` free of DB calls.
4. **Add `generateStaticParams` fallbacks** (at least one entry) for `/unit/[slug]` and `/apartemen/[slug]`, plus the curl 404 check in Phase 4.
5. **PROMPT Phase 3** says "skeleton (`loading.tsx`)". Use an explicit `<Suspense fallback>` inside `/sewa` instead, and no `loading.tsx` in `(public)` above detail pages.
6. **Decision 7 (admin).** `requireAdmin()` in the panel layout must run inside `<Suspense>`, otherwise the build fails. Wrap it in React `cache()`. Add `refresh()` after mutations and `key` on edit forms.
7. **Add the proxy matcher** `['/admin/:path*']` and the `setAll(cookies, headers)` handling shown in section 3.
8. **Activity side effects.**
   - The video-tour modal must unmount or clear the iframe `src` when the route is hidden (use a `useLayoutEffect` cleanup).
   - Filter and booking sheets should close on navigation.
   - Playwright checks use `getByRole`.
9. **OG images.** Generate PNG with `next/og`, never feed it WebP, and commit a TTF font file.
10. **Scripts.** `lint: eslint .` and `typecheck: next typegen && tsc --noEmit`. `npm run build` does not lint.
11. **Phase 5 acceptance gains a Vercel Preview freshness test**, with the documented fallback to `'use cache: remote'`.
12. **Supabase plan.** Heavy caching means few DB hits, which makes a Free-plan project more likely to be paused. Then the next on-demand regeneration or build fails. Supabase Pro is effectively required (SETUP §2 already recommends it).

### Critical Files for Implementation
- D:\website-vidaliday\web\next.config.ts
- D:\website-vidaliday\web\src\lib\data\catalog.ts (plus `settings.ts`, `locations.ts`, `content.ts`, `popularity.ts` in the same folder) and D:\website-vidaliday\web\src\lib\cache-tags.ts
- D:\website-vidaliday\web\src\proxy.ts and D:\website-vidaliday\web\src\lib\auth\require-admin.ts
- D:\website-vidaliday\web\src\app\(public)\unit\[slug]\page.tsx and D:\website-vidaliday\web\src\app\(public)\(with-fab)\sewa\page.tsx
- D:\website-vidaliday\web\src\app\admin\(panel)\layout.tsx
