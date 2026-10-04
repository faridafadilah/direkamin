import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function PATCH(req) {
  const { id, index, done } = await req.json();
  const c = db();
  const { data } = await c.from('lectures').select('questions').eq('id', id).single();
  const q = data?.questions || [];
  if (q[index]) q[index].done = done;
  await c.from('lectures').update({ questions: q }).eq('id', id);
  return NextResponse.json({ ok: true });
}
