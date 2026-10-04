'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function LoginButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function go() {
    setBusy(true); setErr('');
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) { setErr(error.message); setBusy(false); }
  }
  return (
    <>
      <button className="btn gbtn" onClick={go} disabled={busy}><b>G</b>{busy ? 'Mengarahkan ke Google…' : 'Lanjut dengan Google'}</button>
      {err && <p className="err">{err}</p>}
    </>
  );
}
