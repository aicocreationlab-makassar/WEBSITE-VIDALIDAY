> Laporan audit Fase 0 (15 Okt 2026). Path Laravel di laporan ini relatif ke root lama; sekarang semuanya ada di `legacy-laravel/`.

Results from read-only `npm view` queries. The cutoff for "chosen" is 2026-10-01 23:59 UTC. Only stable `x.y.z` versions were considered, and "chosen" is the highest one published on or before the cutoff.

| package | latest | chosen (>=14 days old) | publish date | notes |
|---|---|---|---|---|
| next | 16.4.1 (2026-10-14) | **16.3.8** | 2026-09-30 | engines `node >=20.9.0`; peer react/react-dom `^18.2.0 \|\| ^19.0.0` |
| react | 19.3.1 (2026-10-14) | **19.3.0** | 2026-09-09 | |
| react-dom | 19.3.1 (2026-10-14) | **19.3.0** | 2026-09-09 | |
| typescript | 7.0.2 (2026-07-08) | 7.0.2 -> **use 6.0.3** | 2026-04-16 | 7.0.2 is old enough but breaks lint: typescript-eslint 8.71.x needs `typescript >=4.8.4 <6.1.0`, and eslint-config-next 16.3.8 depends on `typescript-eslint ^8.46.0`. Fallback is 5.9.3 (2025-09-30). |
| tailwindcss | 4.3.3 | **4.3.3** | 2026-07-16 | |
| @tailwindcss/postcss | 4.3.3 | **4.3.3** | 2026-07-16 | |
| eslint | 10.12.0 (2026-10-02) | 10.11.0 -> **use 9.39.5** | 2026-07-10 | ESLint 10 conflicts with dependencies of eslint-config-next: eslint-plugin-react 7.37.5 allows up to `^9.7`, eslint-plugin-import 2.32.0 and eslint-plugin-jsx-a11y 6.10.2 allow up to `^9` |
| eslint-config-next | 16.4.1 (2026-10-14) | **16.3.8** | 2026-09-30 | same version as next (see peer deps below) |
| @supabase/supabase-js | 2.118.0 (2026-10-15) | **2.117.2** | 2026-09-25 | engines `node >=22.0.0`, so set Vercel to Node 22.x or 24.x |
| @supabase/ssr | 0.12.7 | **0.12.7** | 2026-09-08 | peer `@supabase/supabase-js ^2.114.0`; depends on `cookie ^1.0.2` |
| supabase (CLI) | 2.121.0 (2026-10-14) | **2.119.0** | 2026-09-30 | devDependency |
| zod | 4.6.7 (2026-10-12) | **4.6.5** | 2026-09-13 | v4 |
| react-hook-form | 7.90.0 (2026-10-11) | **7.89.0** | 2026-09-26 | peer react `^16.8 \|\| ^17 \|\| ^18 \|\| ^19` |
| @hookform/resolvers | 5.9.1 | **5.9.1** | 2026-08-17 | supports zod v4 (details below) |
| lucide-react | 1.57.0 (2026-10-14) | **1.49.0** | 2026-09-29 | peer react `^16.5.1 … \|\| ^19.0.0`; icon export check skipped |
| sonner | 2.0.8 | **2.0.8** | 2026-08-09 | peer react `^18 \|\| ^19` |
| embla-carousel-react | 8.6.0 | **8.6.0** | 2025-04-04 | peer react `… \|\| ^19.0.0` |
| browser-image-compression | 2.0.2 | **2.0.2** | 2023-03-06 | |
| clsx | 2.1.1 | **2.1.1** | 2024-04-23 | |
| tailwind-merge | 3.7.0 | **3.7.0** | 2026-09-12 | no peer deps |
| vitest | 5.0.4 (2026-10-12) | **5.0.3** | 2026-09-30 | engines `node ^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`; peer `vite ^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0` (install vite too); peer `@types/node ^22.0.0 \|\| >=24.0.0` |
| @vercel/analytics | 2.0.1 | **2.0.1** | 2026-03-12 | |
| @vercel/speed-insights | 2.0.0 | **2.0.0** | 2026-03-10 | |
| shadcn | 4.21.5 (2026-10-14) | **4.21.1** | 2026-10-01 | CLI, published on the cutoff day |
| radix-ui | 1.8.1 (2026-10-12) | **1.6.7** | 2026-07-24 | 1.7.0 (2026-10-05), 1.8.0 and 1.8.1 (2026-10-12) are after the cutoff |
| class-variance-authority | 0.7.1 | **0.7.1** | 2024-11-26 | |
| tw-animate-css | 1.4.0 | **1.4.0** | 2025-09-24 | |
| @types/react | 19.3.0 | **19.3.0** | 2026-09-09 | |
| @types/react-dom | 19.3.0 | **19.3.0** | 2026-09-09 | |
| @types/node | 26.6.5 (2026-10-09) | 26.6.4 (2026-10-01) -> **use 22.20.5** (2026-10-01) or **24.19.1** (2026-10-01) | 2026-10-01 | match the Vercel Node runtime (22 or 24) rather than 26 |
| server-only | 0.0.1 | **0.0.1** | 2022-09-03 | |
| @dnd-kit/core | 6.3.1 | **6.3.1** | 2024-12-05 | peer react `>=16.8.0` |
| @dnd-kit/sortable | 10.0.0 | **10.0.0** | 2024-12-04 | peer `@dnd-kit/core ^6.3.0`, react `>=16.8.0` |
| vaul | 1.1.2 | **1.1.2** | 2024-12-14 | peer react `… \|\| ^19.0.0` |

Extra lint-related versions, same cutoff:
- typescript-eslint: 8.71.0 (2026-09-28); latest is 8.71.2. Its peer deps are `eslint ^8.57.0 || ^9.0.0 || ^10.0.0` and `typescript >=4.8.4 <6.1.0`.
- @eslint/eslintrc: 3.3.7 (2026-09-01).

**next@16.3.8**
- engines: `{ "node": ">=20.9.0" }`
- Optional peers: `sass ^1.3.0`, `@playwright/test ^1.51.1`, `@opentelemetry/api ^1.1.0`, `babel-plugin-react-compiler *`.

**@hookform/resolvers@5.9.1**
- Peer `zod: "^3.25.0 || ^4.0.0"`, so zod v4 is supported.
- Peer `react-hook-form: "^7.55.0"`.
- Peer `@standard-schema/spec: "^1.0.0"`.
- Dependency `@standard-schema/utils ^0.3.0`.

**eslint-config-next@16.3.8**
- peerDependencies: `{ "eslint": ">=9.0.0", "typescript": ">=3.3.1" }`.
- dependencies:
  - `@next/eslint-plugin-next 16.3.8`
  - `typescript-eslint ^8.46.0`
  - `eslint-plugin-react ^7.37.0`
  - `eslint-plugin-react-hooks ^7.0.0`
  - `eslint-plugin-import ^2.32.0`
  - `eslint-plugin-jsx-a11y ^6.10.0`
  - `eslint-import-resolver-node ^0.3.6`
  - `eslint-import-resolver-typescript ^3.5.2`
  - `globals 16.4.0`
- Exports: `.`, `./parser`, `./typescript`, `./core-web-vitals`. These are flat-config entry points, so you can import `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` directly in `eslint.config.mjs`.

**Pins to use:**
- `next@16.3.8`, `eslint-config-next@16.3.8`, `react` / `react-dom@19.3.0`
- `typescript@6.0.3`, not 7.x
- `eslint@9.39.5`, not 10.x
- `@types/node@22.20.5` with Vercel Node 22.x (or `24.19.1` with Node 24.x)
- `zod@4.6.5` with `@hookform/resolvers@5.9.1`
- `radix-ui@1.6.7`
- `vitest@5.0.3`, plus a compatible `vite` (6.4+, 7 or 8)

Node needs to be at least 22: supabase-js requires `>=22.0.0` and vitest requires `^22.12.0` or later.