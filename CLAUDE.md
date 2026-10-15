# CLAUDE.md — VIDALIDAY v2

Membangun ulang situs sewa apartemen **VIDALIDAY** (https://vidaliday.com) dari Laravel ke **Next.js 16 + Supabase + Vercel**, dengan alur seperti aplikasi booking dan identitas visual situs lama.

Baca sebelum mengerjakan apa pun:

- `docs/PRD.md` — fitur dan kriteria terima (sumber kebenaran fitur)
- `docs/DESIGN.md` — token, komponen, ikon (sumber kebenaran tampilan)
- `docs/SETUP.md` — langkah manual pemilik proyek (env, Supabase, Vercel, domain)
- `PROMPT.md` — urutan fase; kerjakan **satu fase per sesi**
- `docs/PROGRESS.md` — status terakhir; perbarui di akhir setiap fase

---

## Struktur folder

```
/                         ← root (buka Claude Code di sini)
├── CLAUDE.md, PROMPT.md, README.md
├── docs/                 PRD, DESIGN, SETUP, PROGRESS, referensi/
├── supabase/migrations/  SQL skema (0001 awal, 0002 fitur v2)
├── legacy-laravel/       kode Laravel lama — HANYA DIBACA, referensi UI/CSS
├── tools/                (opsional) paket vidaliday-migrasi-supabase
└── web/                  aplikasi Next.js (Root Directory di Vercel)
    └── src/
        ├── app/
        │   ├── (public)/         beranda, sewa, unit/[slug], apartemen/[slug], about, kebijakan-privasi
        │   ├── admin/login/
        │   ├── admin/(panel)/    dashboard, units, leads, locations, amenities, facilities, landmarks, faqs, about, settings
        │   ├── sitemap.ts, robots.ts, not-found.tsx, layout.tsx, globals.css
        ├── components/ui/        primitif (shadcn/ui, disesuaikan token)
        ├── components/public/    komponen situs tamu
        ├── components/admin/     komponen admin
        ├── lib/supabase/         public.ts (tanpa cookie), server.ts (cookie), browser.ts
        ├── lib/data/             fungsi query (dipanggil dari Server Components)
        ├── lib/actions/          Server Actions (admin/*, booking.ts)
        ├── lib/validation/       skema zod (dipakai klien & server)
        ├── lib/format.ts, pricing.ts, whatsapp.ts, media.ts, recommend.ts, icons.tsx
        ├── types/database.ts     hasil `supabase gen types`
        └── proxy.ts              Next 16: pengganti middleware.ts
```

## Perintah

```bash
cd web
npm run dev          # http://localhost:3000
npm run lint
npm run typecheck    # tsc --noEmit (buat script ini di fase 1)
npm run build
npm run test         # vitest untuk lib/ (format, pricing, whatsapp, recommend)
npx supabase gen types typescript --project-id <ref> > src/types/database.ts
```

## Stack

- Next.js 16 App Router, React 19, TypeScript `strict`, Tailwind CSS v4 (token di `globals.css` `@theme`), ESLint.
- `@supabase/supabase-js` + `@supabase/ssr`, `zod`, `react-hook-form` + `@hookform/resolvers`, `lucide-react`, `sonner`, `embla-carousel-react`, `browser-image-compression`, shadcn/ui (Radix), `clsx` + `tailwind-merge`, `vitest`.
- Pin versi persis di `package.json`. Utamakan versi yang sudah rilis minimal 14 hari. Jangan tambah dependensi lain tanpa alasan yang ditulis di PROGRESS.md.
- Node.js ≥ 20.9.

## Aturan wajib

**Jangan pernah:**

- Mengubah apa pun di `legacy-laravel/` atau `tools/`.
- Menaruh secret di kode klien, di variabel `NEXT_PUBLIC_*`, atau meng-commit file `.env*`. Aplikasi **tidak memakai** secret key Supabase sama sekali.
- Mematikan RLS, membuat policy `using (true)` untuk tulis, atau memberi anon akses ke tabel `leads`.
- Menjalankan perintah yang mengubah database produksi (`supabase db push`, SQL tulis, reset) tanpa izin eksplisit. Perubahan skema = file migrasi baru di `supabase/migrations/` lalu minta pemilik menjalankannya.
- Memakai emoji di UI, teks default, data seed, atau komentar yang tampil ke user.
- Menyalin aset, logo, teks, atau warna jendela360.com. Yang diambil hanya polanya.
- Menebak kunci API atau mengisi `.env.local` dengan nilai karangan; minta ke pemilik.

**Selalu:**

- Server Components sebagai default; `"use client"` hanya untuk interaksi (sheet, carousel, form, filter).
- Data publik dibaca lewat `lib/supabase/public.ts` (publishable key, **tanpa cookie**) supaya halaman bisa di-cache. Data admin lewat `lib/supabase/server.ts` (sesi cookie).
- Setiap Server Action admin memverifikasi user di server (`getClaims()`/`getUser()`, bukan `getSession()`) **dan** cek baris di `admins` sebelum menulis. `proxy.ts` saja tidak cukup.
- Validasi input dengan zod di klien dan di server (skema yang sama dari `lib/validation`).
- Setelah mutasi admin, invalidasi cache halaman publik terkait (tag per entitas: `units`, `unit:<slug>`, `locations`, `settings`, `faqs`, `landmarks`, `facilities`, `amenities`). Next 16: `revalidateTag(tag, profile)` / `updateTag(tag)` — cek dokumentasi versi terpasang.
- Pakai API Next.js 16 yang benar: `proxy.ts` (bukan `middleware.ts`), `params`/`searchParams`/`cookies()`/`headers()` di-`await`, `images.remotePatterns` (bukan `domains`). Kalau ragu, baca dokumentasi resmi versi terpasang, jangan mengandalkan ingatan.
- Teks UI Bahasa Indonesia, kalimat biasa, sapaan "kamu", istilah sesuai PRD §10. Kode, nama variabel, dan nama file dalam Bahasa Inggris.
- Format lewat `lib/format.ts`: Rupiah `id-ID` tanpa desimal, tanggal & jam zona `Asia/Makassar` (WITA), nomor WA dinormalisasi ke `628…`.
- Ikon hanya `lucide-react` lewat registry `lib/icons.tsx` (nama kebab-case dari DB → komponen).
- Gambar lewat `next/image` dengan `sizes`; path Storage dibentuk `lib/media.ts` (`media` bucket, URL penuh dipakai apa adanya).
- Rumus estimasi harga di `lib/pricing.ts` harus sama dengan fungsi DB `submit_lead` (PRD §6.5).
- Pengalihan ke WhatsApp tidak boleh gagal karena DB gagal (PRD §6.5 langkah 5).
- Mobile dulu: cek setiap halaman di lebar 390px dan 1280px. Kalau Playwright tersedia, ambil screenshot dan periksa sendiri sebelum melaporkan selesai.

## Database (ringkas)

Lihat PRD §8 dan file di `supabase/migrations/`. Tabel: `locations`, `room_types`, `units`, `amenities`, `unit_amenities`, `facilities`, `landmarks`, `faqs`, `settings`, `leads`, `admins`. Bucket Storage: `media`. RPC publik: `submit_lead`, `unit_popularity`. Kolom lama `room_type`, `facilities_list`, `rental_period` hanya untuk kompatibilitas; baca dari `room_type_id`, `unit_amenities`, `weekly_price`/`monthly_price`.

## Cara kerja per sesi

1. Baca `docs/PROGRESS.md` untuk tahu posisi terakhir.
2. Kerjakan hanya fase yang diminta dari `PROMPT.md`.
3. Kalau ada hal ambigu yang memengaruhi data atau tampilan, tanya dulu (maksimal 5 pertanyaan sekaligus). Hal kecil: ambil keputusan masuk akal dan catat di PROGRESS.md bagian "Keputusan".
4. Sebelum melapor selesai: `lint`, `typecheck`, `test`, `build` lulus; cek tampilan mobile & desktop; tidak ada emoji; tidak ada secret di klien.
5. Commit kecil dan jelas (`feat:`, `fix:`, `chore:`, `docs:`).
6. Perbarui `docs/PROGRESS.md`: centang tugas, catat keputusan, dan tulis "Yang perlu dilakukan pemilik" (mis. isi env, jalankan SQL).
