-- Jalankan di Supabase SQL Editor setelah schema.sql.
-- Link dapat dibuka siapa pun yang memilikinya dan hanya berlaku untuk satu kuliah.
alter table public.lectures add column if not exists share_token uuid unique;

create or replace function public.get_shared_lecture(share_token uuid)
returns table (
  id uuid,
  title text,
  course text,
  transcript text,
  summary jsonb,
  tasks jsonb,
  engine text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.title, l.course, l.transcript, l.summary, l.tasks, l.engine, l.created_at
  from public.lectures as l
  where l.share_token = $1
  limit 1;
$$;

revoke all on function public.get_shared_lecture(uuid) from public;
grant execute on function public.get_shared_lecture(uuid) to anon, authenticated;
