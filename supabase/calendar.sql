create table if not exists class_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course text not null,
  lecturer text not null,
  room text,
  semester smallint not null default 1 check (semester between 1 and 14),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  start_date date not null default current_date,
  end_date date not null default ((current_date + interval '6 months')::date),
  created_at timestamptz not null default now(),
  constraint class_schedules_valid_time check (end_time > start_time),
  constraint class_schedules_valid_dates check (end_date >= start_date)
);

alter table class_schedules
  add column if not exists semester smallint not null default 1;
alter table class_schedules
  add column if not exists start_date date;
alter table class_schedules
  add column if not exists end_date date;

update class_schedules
set start_date = current_date
where start_date is null;
update class_schedules
set end_date = (start_date + interval '6 months')::date
where end_date is null;

alter table class_schedules
  alter column start_date set default current_date,
  alter column start_date set not null,
  alter column end_date set default ((current_date + interval '6 months')::date),
  alter column end_date set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'class_schedules_valid_dates'
  ) then
    alter table class_schedules
      add constraint class_schedules_valid_dates check (end_date >= start_date);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'class_schedules_valid_semester'
  ) then
    alter table class_schedules
      add constraint class_schedules_valid_semester check (semester between 1 and 14);
  end if;
end $$;

alter table class_schedules enable row level security;

drop policy if exists "lihat jadwal sendiri" on class_schedules;
drop policy if exists "tambah jadwal sendiri" on class_schedules;
drop policy if exists "ubah jadwal sendiri" on class_schedules;
drop policy if exists "hapus jadwal sendiri" on class_schedules;

create policy "lihat jadwal sendiri" on class_schedules
  for select using (user_id = auth.uid());
create policy "tambah jadwal sendiri" on class_schedules
  for insert with check (user_id = auth.uid());
create policy "ubah jadwal sendiri" on class_schedules
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "hapus jadwal sendiri" on class_schedules
  for delete using (user_id = auth.uid());