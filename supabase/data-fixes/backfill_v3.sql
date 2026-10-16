-- =====================================================================
--  VIDALIDAY v2: backfill_v3 (perapian data hasil migrasi)
--  Dibuat 2026-10-16 oleh web/scripts/make-backfill-v3.mjs dari data asli.
--  Jangan diedit tangan: ubah skripnya lalu jalankan ulang.
-- =====================================================================
--  Cara pakai: tinjau pratinjau_backfill_v3.sql dulu, lalu SQL Editor -> paste -> Run.
--  Aman diulang: setiap UPDATE dijaga nilai lamanya.
--  Setelah selesai: Admin -> Pengaturan -> Segarkan data situs (atau redeploy).

begin;

-- 1. Ikon fasilitas gedung (hanya yang kosong)
update public.facilities set icon = 'trees' where id = 117 and (icon is null or btrim(icon) = ''); -- Taman
update public.facilities set icon = 'dumbbell' where id = 118 and (icon is null or btrim(icon) = ''); -- Gym
update public.facilities set icon = 'waves' where id = 121 and (icon is null or btrim(icon) = ''); -- Kolam Renang Dewasa
update public.facilities set icon = 'waves' where id = 123 and (icon is null or btrim(icon) = ''); -- Kolam Renang Anak
update public.facilities set icon = 'door-open' where id = 124 and (icon is null or btrim(icon) = ''); -- Lobby Ashton
update public.facilities set icon = 'door-open' where id = 125 and (icon is null or btrim(icon) = ''); -- Lobby Brensville
update public.facilities set icon = 'trees' where id = 126 and (icon is null or btrim(icon) = ''); -- Taman Bermain
update public.facilities set icon = 'dumbbell' where id = 127 and (icon is null or btrim(icon) = ''); -- Gym
update public.facilities set icon = 'waves' where id = 128 and (icon is null or btrim(icon) = ''); -- Kolam Renang
update public.facilities set icon = 'baby' where id = 129 and (icon is null or btrim(icon) = ''); -- Kids Area & Relax
update public.facilities set icon = 'laptop' where id = 130 and (icon is null or btrim(icon) = ''); -- Working Space & Relax Area

-- 2. Ikon landmark (hanya yang kosong)
update public.landmarks set icon = 'tree-palm' where id = 125 and (icon is null or btrim(icon) = ''); -- Pantai Losari & Kuliner Pisang Epe
update public.landmarks set icon = 'shopping-bag' where id = 126 and (icon is null or btrim(icon) = ''); -- Phinisi Point Mall (PIPO)
update public.landmarks set icon = 'shopping-bag' where id = 131 and (icon is null or btrim(icon) = ''); -- Trans Studio Mall Makassar
update public.landmarks set icon = 'shopping-bag' where id = 132 and (icon is null or btrim(icon) = ''); -- Mall Panakkukang
update public.landmarks set icon = 'route' where id = 133 and (icon is null or btrim(icon) = ''); -- A.P Pettarrani Toll Road Southern End
update public.landmarks set icon = 'graduation-cap' where id = 134 and (icon is null or btrim(icon) = ''); -- Universitas Muhammadiyah Makassar (Unismuh Makassar)
update public.landmarks set icon = 'graduation-cap' where id = 135 and (icon is null or btrim(icon) = ''); -- Universitas Muslim Indonesia
update public.landmarks set icon = 'hospital' where id = 136 and (icon is null or btrim(icon) = ''); -- Primaya Hospital Makassar
update public.landmarks set icon = 'hospital' where id = 137 and (icon is null or btrim(icon) = ''); -- Hermina Hospital
update public.landmarks set icon = 'graduation-cap' where id = 138 and (icon is null or btrim(icon) = ''); -- Universitas Negeri Makassar (UNM)
update public.landmarks set icon = 'utensils-crossed' where id = 139 and (icon is null or btrim(icon) = ''); -- Pusat Kuliner Cafe di Jl. Pengayoman
update public.landmarks set icon = 'graduation-cap' where id = 140 and (icon is null or btrim(icon) = ''); -- UC Makassar | Ciputra School of Business, CitraLand City CPI
update public.landmarks set icon = 'landmark' where id = 141 and (icon is null or btrim(icon) = ''); -- Masjid Kubah 99
update public.landmarks set icon = 'hospital' where id = 143 and (icon is null or btrim(icon) = ''); -- RSUP Kemenkes Makassar
update public.landmarks set icon = 'utensils-crossed' where id = 144 and (icon is null or btrim(icon) = ''); -- Kini Kuliner
update public.landmarks set icon = 'music' where id = 145 and (icon is null or btrim(icon) = ''); -- Onyx Club Makassar
update public.landmarks set icon = 'music' where id = 146 and (icon is null or btrim(icon) = ''); -- Elite Bar Makassar
update public.landmarks set icon = 'music' where id = 147 and (icon is null or btrim(icon) = ''); -- HW Hellens's Live Bar & Singsing Makassar
update public.landmarks set icon = 'utensils-crossed' where id = 148 and (icon is null or btrim(icon) = ''); -- Pallubasa Serigala
update public.landmarks set icon = 'utensils-crossed' where id = 149 and (icon is null or btrim(icon) = ''); -- Mie Titi Boulevard
update public.landmarks set icon = 'utensils-crossed' where id = 150 and (icon is null or btrim(icon) = ''); -- Coto Daeng Sirua

-- 3. Ikon fasilitas kamar yang masih check/kosong
update public.amenities set icon = 'clapperboard' where id = 24 and icon = 'check'; -- Smart TV 43 Netflix

-- 4. Ejaan tower (keputusan pemilik)
update public.units set tower = 'Brentsville' where tower = 'Brensville'; -- 27 unit
update public.units set description = replace(replace(description, 'Brensville', 'Brentsville'), 'BRENSVILLE', 'BRENTSVILLE') where description ilike '%Brensville%'; -- deskripsi 27 unit
update public.facilities set name = replace(replace(name, 'Brensville', 'Brentsville'), 'BRENSVILLE', 'BRENTSVILLE') where id = 125 and name = 'Lobby Brensville'; -- Lobby Brensville

-- 5. Tower mengikuti kode di nama unit (AT = Ashton, BV = Brentsville)
update public.units set tower = 'Ashton' where id = 436 and (tower is null or tower in ('Brensville', 'Brentsville')); -- Studio AT 17S: Brensville

-- 6. View yang terpotong
update public.units set view_type = 'Kolam, Taman, dan Kota' where id = 478 and view_type = 'Kolam, Taman, dan Kota di'; -- STUDIO PLUS AT 33U

-- 7. Kapasitas disamakan dengan unit sejenis (keputusan pemilik)
update public.units set max_guests = 7 where id = 461 and max_guests = 1; -- 2BR CORNER BV 19V: 1 -> 7
update public.units set max_guests = 5 where id = 482 and max_guests = 2; -- 2BR BV 29Q: 2 -> 5

-- 8. Label promo generik dikosongkan (55 unit); situs menampilkan "Hemat X%" otomatis
update public.units set promo_badge = null where promo_badge in ('Promo Spesial');

-- 9. Urutan fasilitas gedung mengikuti id (hanya apartemen yang semua urutannya 0)
update public.facilities f set sort_order = s.rn
  from (select id, row_number() over (partition by location_id order by id) as rn from public.facilities) s
 where f.id = s.id
   and not exists (select 1 from public.facilities x where x.location_id = f.location_id and x.sort_order <> 0);

commit;
