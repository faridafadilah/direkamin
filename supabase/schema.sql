create table if not exists lectures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  course text,
  transcript text not null,
  summary jsonb,
  tasks jsonb default '[]'::jsonb,
  questions jsonb default '[]'::jsonb,
  engine text,
  created_at timestamptz default now()
);

-- Tiap user hanya bisa mengakses kuliahnya sendiri.
alter table lectures enable row level security;
create policy "lihat milik sendiri" on lectures for select using (user_id = auth.uid());
create policy "tambah milik sendiri" on lectures for insert with check (user_id = auth.uid());
create policy "ubah milik sendiri" on lectures for update using (user_id = auth.uid());
create policy "hapus milik sendiri" on lectures for delete using (user_id = auth.uid());

-- Jika tabel `lectures` sudah dibuat versi sebelumnya (tanpa user_id), hapus dulu:
-- drop table lectures;  lalu jalankan ulang file ini.
