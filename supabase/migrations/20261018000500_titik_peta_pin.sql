-- =====================================================================
--  VIDALIDAY v2 — titik peta apartemen = pin Google Maps (18 Okt 2026)
--  Jalankan di Supabase SQL Editor setelah 20261018000400_v2_batch2.sql. Idempoten.
--
--  Koordinat lama diambil dari bagian "@lat,lng" link Google Maps, yaitu titik TENGAH
--  tampilan peta saat link disalin, bukan lokasi tempatnya. Untuk Delft CPI titik itu jatuh
--  di laut (juga titik dari migrasi 0004). Pin tempat yang benar ada di bagian "!3d<lat>!4d<lng>"
--  link yang sama:
--    Delft CPI  (APARTEMEN DELFT BY VIDALIDAY): -5.1499287, 119.3944552  (sebelumnya ±590 m, di laut)
--    Vida View: -5.1547578, 119.4416827                                  (sebelumnya ±140 m, di Jl. Topaz Raya)
--  Link Delft diganti dengan link yang dikirim pemilik 18 Okt (tempat yang sama, tanpa tanggal
--  pencarian dan parameter pelacak).
-- =====================================================================

update public.locations
   set gmaps_url = 'https://www.google.com/maps/place/APARTEMEN+DELFT+BY+VIDALIDAY/@-5.1578796,119.3608516,14.04z/data=!4m7!3m6!1s0x2dbf1dfd239b8747:0x8aaa8d0a5b125293!8m2!3d-5.1499287!4d119.3944552!15sCglWSURBTElEQVmSARhob2xpZGF5X2FwYXJ0bWVudF9yZW50YWzgAQA!16s%2Fg%2F11zykmx8hx',
       updated_at = now()
 where slug = 'delft-cpi'
   and gmaps_url is distinct from 'https://www.google.com/maps/place/APARTEMEN+DELFT+BY+VIDALIDAY/@-5.1578796,119.3608516,14.04z/data=!4m7!3m6!1s0x2dbf1dfd239b8747:0x8aaa8d0a5b125293!8m2!3d-5.1499287!4d119.3944552!15sCglWSURBTElEQVmSARhob2xpZGF5X2FwYXJ0bWVudF9yZW50YWzgAQA!16s%2Fg%2F11zykmx8hx';

update public.locations
   set latitude = -5.1499287,
       longitude = 119.3944552,
       updated_at = now()
 where slug = 'delft-cpi'
   and (latitude is distinct from -5.1499287 or longitude is distinct from 119.3944552);

update public.locations
   set latitude = -5.1547578,
       longitude = 119.4416827,
       updated_at = now()
 where slug = 'vida-view'
   and (latitude is distinct from -5.1547578 or longitude is distinct from 119.4416827);


-- ---------------------------------------------------------------------
--  Ringkasan (hanya baca): koordinat harus sama dengan pin di link ("cocok" = true).
-- ---------------------------------------------------------------------
select slug,
       latitude || ', ' || longitude as titik,
       (regexp_match(gmaps_url, '!3d(-?[0-9.]+)!4d(-?[0-9.]+)'))[1] || ', ' ||
       (regexp_match(gmaps_url, '!3d(-?[0-9.]+)!4d(-?[0-9.]+)'))[2] as pin_di_link,
       latitude = (regexp_match(gmaps_url, '!3d(-?[0-9.]+)!4d(-?[0-9.]+)'))[1]::double precision
         and longitude = (regexp_match(gmaps_url, '!3d(-?[0-9.]+)!4d(-?[0-9.]+)'))[2]::double precision as cocok
  from public.locations
 order by sort_order, id;
