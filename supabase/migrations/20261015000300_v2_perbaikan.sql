-- =====================================================================
--  VIDALIDAY v2 — Migrasi 0003: perbaikan setelah audit
--
--  Prasyarat : 20261015000100 dan 20261015000200 sudah dijalankan.
--  Cara pakai: Supabase Dashboard → SQL Editor → paste semua → Run.
--  Aman dijalankan ulang (idempotent). Data lama TIDAK dihapus.
--
--  Isi:
--   1. Fasilitas gedung: kolom urutan + aktif, policy publik hanya yang aktif
--   2. Trigger updated_at di semua tabel konten
--   3. Indeks kecil untuk admin (pencarian lead, filter check-in)
--   4. Apartemen nonaktif: unitnya tidak terbaca publik dan tidak bisa disewa
--   5. backfill_v3: perapian data lewat supabase/data-fixes/backfill_v3.sql (lihat bagian 5)
-- =====================================================================


-- ---------------------------------------------------------------------
--  1. Fasilitas gedung (PRD 7.7): urutan + switch aktif
-- ---------------------------------------------------------------------
alter table public.facilities
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_active  boolean not null default true;

create index if not exists facilities_location_sort_idx on public.facilities (location_id, sort_order);

drop policy if exists "public read" on public.facilities;
create policy "public read" on public.facilities
  for select to anon, authenticated using (is_active or public.is_admin());


-- ---------------------------------------------------------------------
--  2. updated_at otomatis (aplikasi juga mengisinya secara eksplisit)
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['locations', 'room_types', 'units', 'amenities', 'facilities',
                           'landmarks', 'faqs', 'settings', 'leads'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end
$$;


-- ---------------------------------------------------------------------
--  3. Indeks admin
-- ---------------------------------------------------------------------
create index if not exists leads_check_in_idx on public.leads (check_in);
create index if not exists units_updated_idx  on public.units (updated_at desc);


-- ---------------------------------------------------------------------
--  4. Apartemen nonaktif menyembunyikan unitnya (PRD 7.6)
--     Sebelumnya unit published milik apartemen nonaktif tetap terbaca anon
--     dan tetap bisa dikirimi permintaan sewa lewat RPC.
-- ---------------------------------------------------------------------
drop policy if exists "public read" on public.units;
create policy "public read" on public.units
  for select to anon, authenticated using (
    (
      is_published
      and exists (
        select 1 from public.locations l
         where l.id = units.location_id and l.is_active
      )
    )
    or public.is_admin()
  );

-- Sama persis dengan versi 0002, ditambah syarat `l.is_active` saat mencari unit.
create or replace function public.submit_lead(
  p_unit_id     bigint,
  p_full_name   text,
  p_whatsapp    text,
  p_check_in    date,
  p_check_out   date,
  p_guests      integer,
  p_purpose     text default null,
  p_notes       text default null,
  p_source_path text default null
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
     or length(coalesce(p_source_path, '')) > 300 then
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
    check_in, check_out, guests, purpose, notes, estimated_total, source_path
  ) values (
    v_code, v_unit.id, v_unit.name, v_unit.location_name, v_unit.effective_price, v_name, v_phone,
    p_check_in, p_check_out, p_guests, nullif(btrim(coalesce(p_purpose, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''), v_total, p_source_path
  );

  return jsonb_build_object('code', v_code, 'estimated_total', v_total, 'nights', v_nights);
end;
$$;

revoke all on function public.submit_lead(bigint, text, text, date, date, integer, text, text, text) from public;
grant execute on function public.submit_lead(bigint, text, text, date, date, integer, text, text, text)
  to anon, authenticated, service_role;


-- ---------------------------------------------------------------------
--  5. backfill_v3: bukan fungsi di migrasi ini. Perapian data dibuat dari data asli
--     oleh web/scripts/make-backfill-v3.mjs menjadi supabase/data-fixes/backfill_v3.sql
--     (UPDATE per baris yang dijaga nilai lamanya) + pratinjau_backfill_v3.sql.
-- ---------------------------------------------------------------------
