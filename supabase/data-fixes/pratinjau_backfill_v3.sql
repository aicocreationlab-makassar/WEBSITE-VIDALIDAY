-- =====================================================================
--  VIDALIDAY v2: pratinjau backfill_v3 (HANYA SELECT)
--  Dibuat 2026-10-16 oleh web/scripts/make-backfill-v3.mjs dari data asli.
--  Jangan diedit tangan: ubah skripnya lalu jalankan ulang.
-- =====================================================================
--  Menampilkan nilai sekarang untuk baris yang akan diubah backfill_v3.sql.

-- 1. Ikon fasilitas gedung (hanya yang kosong)
select id, name, icon as sekarang from public.facilities where id in (117, 118, 121, 123, 124, 125, 126, 127, 128, 129, 130) order by id;

-- 2. Ikon landmark (hanya yang kosong)
select id, name, icon as sekarang from public.landmarks where id in (125, 126, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 143, 144, 145, 146, 147, 148, 149, 150) order by id;

-- 3. Ikon fasilitas kamar yang masih check/kosong
select id, name, icon as sekarang from public.amenities where id in (24) order by id;

-- 4. Ejaan tower (keputusan pemilik)
select tower, count(*) from public.units group by tower order by tower;

-- 5. Tower mengikuti kode di nama unit (AT = Ashton, BV = Brentsville)
select id, name, tower as sekarang from public.units where id in (436) order by id;

-- 6. View yang terpotong
select id, name, view_type as sekarang from public.units where id in (478) order by id;

-- 7. Kapasitas disamakan dengan unit sejenis (keputusan pemilik)
select id, name, max_guests as sekarang from public.units where id in (461, 482) order by id;

-- 8. Label promo generik dikosongkan (55 unit); situs menampilkan "Hemat X%" otomatis
select promo_badge, count(*) from public.units group by promo_badge;

-- 9. Urutan fasilitas gedung mengikuti id (hanya apartemen yang semua urutannya 0)
select location_id, id, name, sort_order as sekarang from public.facilities order by location_id, id;
