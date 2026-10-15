# VIDALIDAY v2 — paket awal

Paket dokumen dan skema untuk membangun ulang https://vidaliday.com dari Laravel ke Next.js 16 + Supabase + Vercel, dikerjakan oleh Claude Code.

## Isi

| File | Untuk siapa | Isi |
|---|---|---|
| `docs/SETUP.md` | kamu | langkah manual: folder, Supabase, env, Vercel, domain, go-live |
| `PROMPT.md` | kamu → Claude Code | prompt siap tempel, dibagi per fase |
| `CLAUDE.md` | Claude Code | aturan kerja, struktur folder, stack (dibaca otomatis) |
| `docs/PRD.md` | keduanya | fitur dan kriteria terima |
| `docs/DESIGN.md` | Claude Code | token desain, komponen, ikon |
| `docs/PROGRESS.md` | Claude Code | status pengerjaan antar sesi |
| `supabase/migrations/` | kamu | skema awal (sudah jalan) + fitur v2 (jalankan sekali) |
| `docs/referensi/` | Claude Code | tangkapan layar pola kotak pencarian |

## Mulai

1. Ikuti `docs/SETUP.md` langkah 1–3.
2. Buka Claude Code di folder kerja, tempel prompt pembuka dari `PROMPT.md` dengan Fase 0.
3. Lanjut fase demi fase. Isi `web/.env.local` setelah Fase 1 (SETUP.md §4).
