# VIDALIDAY web (Next.js 16 + Supabase)

Aplikasi situs sewa apartemen VIDALIDAY (https://vidaliday.com): situs tamu dan panel admin.
Spesifikasi ada di `../docs/PRD.md` dan `../docs/DESIGN.md`; status pengerjaan di `../docs/PROGRESS.md`.

## Prasyarat

- Node.js **22.12 atau lebih baru** (disarankan 24.x). `@supabase/supabase-js` dan vitest membutuhkannya.
- Project Supabase yang sudah berisi data hasil migrasi dan migrasi `../supabase/migrations/*.sql`.

## Menjalankan di komputer

```bash
cd web
npm install
cp .env.example .env.local   # lalu isi tiga variabelnya
npm run dev                  # http://localhost:3000
```

Isi `web/.env.local` (hanya tiga variabel, **tanpa secret key**):

| Variabel | Isi |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` (produksi: `https://vidaliday.com`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) |

Nomor WhatsApp, template pesan, teks beranda, dan lain-lain diatur dari **Admin → Pengaturan**, bukan env.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` / `npm run start` | Build dan jalankan produksi (build butuh env + koneksi Supabase) |
| `npm run lint` | ESLint (build tidak lagi menjalankan lint di Next 16) |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run test` | Unit test (vitest) untuk `src/lib` dan model komponen |
| `npm run e2e -- e2e/fase-N.spec.ts` | Uji Playwright (Chrome lokal) terhadap `next start -p 3100` |
| `npm run check:emoji` | Gagal kalau ada emoji di kode/SQL |
| `npm run check:secrets` | Gagal kalau bundle klien berisi secret |
| `npm run verify` | Semua gate di atas sekaligus |
| `node --env-file=.env.local scripts/data-audit.mjs` | Audit data produksi (hanya baca, agregat) |

Generate tipe database (setelah `npx supabase login`; jalankan di Git Bash, bukan PowerShell 5.1):

```bash
npx supabase gen types typescript --project-id <ref> > src/types/database.ts
```

## Arsitektur singkat

- **Halaman publik** di `src/app/(public)`; data dibaca lewat `src/lib/data/*` dengan `"use cache"` + `cacheTag`
  (publishable key, tanpa cookie). Halaman statis/partial prerender, diperbarui langsung saat admin menyimpan
  (`updateTag` di setiap Server Action admin).
- **Admin** di `src/app/admin`; `proxy.ts` mengalihkan ke login, lalu layout, setiap halaman, dan setiap
  Server Action memanggil `requireAdmin()` / `guardAdmin()` (klaim JWT + tabel `admins`). RLS di database
  adalah lapis terakhir. Test `guard-coverage.test.ts` memastikan tidak ada action yang lupa dicek.
- **Foto** diunggah langsung dari browser ke Storage `media/<folder>/<uuid>.webp` setelah dikompres
  (sisi terpanjang 2000px, kualitas 0,8, bar hitam tangkapan layar video dipotong).
- **Form sewa** menyimpan permintaan lewat RPC `submit_lead`, lalu membuka WhatsApp admin dengan pesan
  dari template. WhatsApp tetap terbuka walaupun penyimpanan gagal.

## Deploy ke Vercel

1. Import repo, **Root Directory: `web`**, framework Next.js.
2. Environment Variables (Production & Preview): tiga variabel di atas (`NEXT_PUBLIC_SITE_URL` produksi =
   `https://vidaliday.com`).
3. Node.js version 24.x (atau 22.x). Functions region `sin1` (dekat Supabase Singapura).
4. Domain dan go-live: ikuti `../docs/SETUP.md` §6–8 dan checklist di `../docs/PROGRESS.md`.

## Aturan penting

- Jangan memakai secret key Supabase di aplikasi atau di Vercel.
- Jangan mengubah `../legacy-laravel/`; itu hanya referensi.
- Perubahan skema = file migrasi baru di `../supabase/migrations/`, dijalankan pemilik di SQL Editor.
