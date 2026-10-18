-- =====================================================================
--  VIDALIDAY v2 — perbaiki "\n" harfiah di template pesan WhatsApp (18 Okt 2026)
--  Jalankan di Supabase SQL Editor (setelah 0004). Idempoten.
--
--  Migrasi 0004 menyisipkan baris "Kota asal: {kota}" lewat regexp_replace. Di teks pengganti
--  regexp_replace, "\n" tidak menjadi ganti baris, sehingga template tersimpan sebagai
--  "Nama: {nama}\nKota asal: {kota}" (garis miring + huruf n) dan pesan tamu menampilkan "\n".
--  Aplikasi versi ini sudah menganggap "\n" harfiah sebagai ganti baris; data dibetulkan di sini.
--  '\n' (string biasa) = garis miring + n; E'\n' = karakter ganti baris.
-- =====================================================================

update public.settings
   set value = replace(value, '\n', E'\n'),
       updated_at = now()
 where key = 'booking_whatsapp_template'
   and strpos(value, '\n') > 0;


-- ---------------------------------------------------------------------
--  Ringkasan (hanya baca): keduanya harus true.
-- ---------------------------------------------------------------------
select strpos(value, '\n') = 0 as tanpa_garis_miring_n,
       value ~ E'\nKota asal: \\{kota\\}' as kota_di_baris_sendiri
  from public.settings
 where key = 'booking_whatsapp_template';
