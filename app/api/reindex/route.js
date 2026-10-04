import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { indexLecture } from '@/lib/rag';
export const maxDuration = 60;

// Bangun ulang indeks satu kuliah (bisa dengan ukuran potongan berbeda untuk eksperimen).
export async function POST(req) {
  try {
    const { id, chunkSeconds } = await req.json();
    const sb = db();
    const { data } = await sb.from('lectures').select('transcript').eq('id', id).single();
    if (!data) return NextResponse.json({ error: 'Kuliah tidak ditemukan.' }, { status: 404 });
    const chunks = await indexLecture(sb, id, data.transcript, chunkSeconds);
    return NextResponse.json({ chunks });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
