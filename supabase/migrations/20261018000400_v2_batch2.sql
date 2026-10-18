-- =====================================================================
--  VIDALIDAY v2 — Migrasi 0004: batch 2 (kota asal, Delft tanpa tower, titik peta)
--
--  Prasyarat : 20261015000100 sampai 20261015000300 sudah dijalankan.
--  Cara pakai: Supabase Dashboard → SQL Editor → paste semua → Run.
--  Aman dijalankan ulang (idempotent). Data lama TIDAK dihapus.
--  Jalankan SEBELUM aplikasi versi batch 2 di-deploy: form sewa versi baru memanggil
--  submit_lead dengan 10 argumen; tanpa migrasi ini RPC gagal dan permintaan tidak tersimpan.
--
--  Isi:
--   1. leads.origin_city + submit_lead menerima p_origin_city (kota asal tamu, wajib di form)
--   2. locations.has_towers: Delft CPI hanya satu tower, tower unitnya dikosongkan
--   3. Template WhatsApp: baris "Kota asal: {kota}" setelah nama
--   4. Titik peta Delft CPI dan ejaan tower Vida View
-- =====================================================================


-- ---------------------------------------------------------------------
--  1. Kota asal tamu
-- ---------------------------------------------------------------------
alter table public.leads
  add column if not exists origin_city text;

-- PostgREST menolak panggilan kalau ada dua overload dengan parameter default yang tumpang tindih,
-- jadi versi 9 argumen dibuang dulu.
drop function if exists public.submit_lead(bigint, text, text, date, date, integer, text, text, text);

create or replace function public.submit_lead(
  p_unit_id     bigint,
  p_full_name   text,
  p_whatsapp    text,
  p_check_in    date,
  p_check_out   date,
  p_guests      integer,
  p_purpose     text default null,
  p_notes       text default null,
  p_source_path text default null,
  p_origin_city text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_today  date := (now() at time zone 'Asia/Makassar')::date;
  v_phone  text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  v_name   text := btrim(coalesce(p_full_name, ''));
  v_city   text := nullif(btrim(coalesce(p_origin_city, '')), '');
  v_nights integer;
  v_unit   record;
  v_total  numeric;
  v_code   text;
begin
  if v_phone like '0%' then
    v_phone := '62' || substr(v_phone, 2);
  end if;
  if v_phone !~ '^628[0-9]{7,11}$' then
    raise exception 'INVALID_PHONE';
  end if;
  if length(v_name) < 2 or length(v_name) > 100 then
    raise exception 'INVALID_NAME';
  end if;
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'INVALID_DATES';
  end if;
  if p_check_in < v_today or p_check_in > v_today + 365 then
    raise exception 'INVALID_DATES';
  end if;
  v_nights := p_check_out - p_check_in;
  if v_nights > 365 then
    raise exception 'INVALID_DATES';
  end if;
  if p_guests is null or p_guests < 1 or p_guests > 30 then
    raise exception 'INVALID_GUESTS';
  end if;
  if length(coalesce(p_purpose, '')) > 50 or length(coalesce(p_notes, '')) > 500
     or length(coalesce(p_source_path, '')) > 300 or length(coalesce(v_city, '')) > 60 then
    raise exception 'TEXT_TOO_LONG';
  end if;

  -- Rate limit: maks 5 permintaan per nomor per jam, 30 per menit secara global
  if (select count(*) from public.leads
      where whatsapp = v_phone and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.leads
      where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'TOO_MANY_REQUESTS';
  end if;

  select u.id, u.name, u.effective_price, u.weekly_price, u.monthly_price,
         coalesce(l.short_name, l.name) as location_name
    into v_unit
    from public.units u
    join public.locations l on l.id = u.location_id
   where u.id = p_unit_id and u.is_published and l.is_active;
  if not found then
    raise exception 'UNIT_NOT_FOUND';
  end if;

  -- Estimasi (rumus sama dengan lib/pricing.ts di aplikasi)
  v_total := case
    when v_nights >= 30 and v_unit.monthly_price is not null
      then round(v_unit.monthly_price * v_nights / 30.0)
    when v_nights >= 7 and v_unit.weekly_price is not null
      then round(v_unit.weekly_price * v_nights / 7.0)
    else v_unit.effective_price * v_nights
  end;

  loop
    v_code := 'VDL-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.leads where code = v_code);
  end loop;

  insert into public.leads (
    code, unit_id, unit_name, location_name, nightly_price, full_name, whatsapp,
    check_in, check_out, guests, purpose, notes, estimated_total, source_path, origin_city
  ) values (
    v_code, v_unit.id, v_unit.name, v_unit.location_name, v_unit.effective_price, v_name, v_phone,
    p_check_in, p_check_out, p_guests, nullif(btrim(coalesce(p_purpose, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''), v_total, p_source_path, v_city
  );

  return jsonb_build_object('code', v_code, 'estimated_total', v_total, 'nights', v_nights);
end;
$$;

revoke all on function public.submit_lead(bigint, text, text, date, date, integer, text, text, text, text) from public;
grant execute on function public.submit_lead(bigint, text, text, date, date, integer, text, text, text, text)
  to anon, authenticated, service_role;


-- ---------------------------------------------------------------------
--  2. Apartemen tanpa tower (PRD 7.5): Delft CPI hanya satu gedung
-- ---------------------------------------------------------------------
alter table public.locations
  add column if not exists has_towers boolean not null default true;

update public.locations
   set has_towers = false
 where slug = 'delft-cpi' and has_towers;

-- Tower yang terlanjur diisi untuk Delft ("Utama") dikosongkan supaya situs tidak menulis "Tower Utama".
update public.units u
   set tower = null, updated_at = now()
  from public.locations l
 where l.id = u.location_id and l.slug = 'delft-cpi' and u.tower is not null;


-- ---------------------------------------------------------------------
--  3. Template WhatsApp: "Kota asal: {kota}" setelah "Nama: {nama}"
-- ---------------------------------------------------------------------
-- Baris "Kota Asal: " kosong (diisi manual sebelum placeholder ada) diganti baris ber-placeholder.
update public.settings
   -- Teks pengganti: E'\n' = ganti baris sungguhan ("\\n" di sini tertulis harfiah, lihat migrasi 0006).
   set value = regexp_replace(value, E'\\n[ \\t]*Kota [Aa]sal[ \\t]*:[ \\t]*(\\r?\\n)', E'\nKota asal: {kota}\\1'),
       updated_at = now()
 where key = 'booking_whatsapp_template'
   and value !~ '\{kota\}'
   and value ~ E'\\nKota [Aa]sal[ \\t]*:[ \\t]*\\r?\\n';

-- Template yang belum punya baris kota: sisipkan tepat setelah baris nama.
update public.settings
   set value = regexp_replace(value, E'(Nama:[^\\n]*\\n)', E'\\1Kota asal: {kota}\n'),
       updated_at = now()
 where key = 'booking_whatsapp_template'
   and value !~ '\{kota\}'
   and value ~ E'Nama:[^\\n]*\\n';


-- ---------------------------------------------------------------------
--  4. Titik peta Delft CPI (dari pemilik, 18 Okt 2026) dan ejaan tower Vida View
-- ---------------------------------------------------------------------
update public.locations
   set latitude = -5.144628657051978,
       longitude = 119.39411188027171,
       updated_at = now()
 where slug = 'delft-cpi'
   and (latitude is distinct from -5.144628657051978 or longitude is distinct from 119.39411188027171);

-- Keputusan CP-B (16 Okt 2026): ejaan tower Vida View adalah "Brentsville".
update public.units
   set tower = 'Brentsville', updated_at = now()
 where tower ilike 'brensville';


-- ---------------------------------------------------------------------
--  Ringkasan (hanya baca)
-- ---------------------------------------------------------------------
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'leads' and column_name = 'origin_city') as leads_origin_city,
  (select pg_get_function_identity_arguments(p.oid) from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'submit_lead' limit 1) as submit_lead_args,
  (select has_towers from public.locations where slug = 'delft-cpi') as delft_has_towers,
  (select count(*) from public.units u join public.locations l on l.id = u.location_id
    where l.slug = 'delft-cpi' and u.tower is not null) as delft_units_with_tower,
  (select latitude || ', ' || longitude from public.locations where slug = 'delft-cpi') as delft_point,
  (select value ~ '\{kota\}' from public.settings where key = 'booking_whatsapp_template') as template_has_kota,
  (select count(*) from public.units where tower ilike 'brensville') as brensville_left;
