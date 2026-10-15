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
--   4. backfill_v3(): perapian data hasil migrasi (lihat bagian 4)
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
--  4. backfill_v3(): DIFINALKAN SETELAH AUDIT DATA (Fase 2.0)
-- ---------------------------------------------------------------------
