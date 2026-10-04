-- Jalankan SETELAH schema.sql. Menambah RAG (embedding + pgvector).
create extension if not exists vector;

create table if not exists chunks (
  id bigint generated always as identity primary key,
  lecture_id uuid not null references lectures(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  start_time text,
  content text not null,
  embedding vector(768)
);
alter table chunks enable row level security;
create policy "chunks milik sendiri" on chunks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists chunks_embedding_idx on chunks using hnsw (embedding vector_cosine_ops);

-- Cari potongan paling mirip. filter_lecture null = cari di semua kuliah milik user (RLS tetap berlaku).
create or replace function match_chunks(query_embedding vector(768), match_count int default 5, filter_lecture uuid default null)
returns table (id bigint, lecture_id uuid, title text, start_time text, content text, similarity float)
language sql stable as $$
  select c.id, c.lecture_id, l.title, c.start_time, c.content, 1 - (c.embedding <=> query_embedding) as similarity
  from chunks c join lectures l on l.id = c.lecture_id
  where filter_lecture is null or c.lecture_id = filter_lecture
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
