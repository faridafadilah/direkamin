import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Klien atas nama user yang sedang login. RLS di Supabase membatasi data per user.
export const db = () => {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {} },
    },
  });
};
