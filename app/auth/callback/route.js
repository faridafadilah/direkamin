import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  if (code) await db().auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL('/', url.origin));
}
