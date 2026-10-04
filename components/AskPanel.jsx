'use client';
import { useState } from 'react';
import Link from 'next/link';

// id ada = tanya satu kuliah; id kosong = tanya semua kuliah.
export default function AskPanel({ id }) {
  const all = !id;
  const [q, setQ] = useState('');
  const [chat, setChat] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  async function ask(e) {
    e.preventDefault();
    if (!q.trim()) return;
    const question = q; setQ(''); setBusy(true);
    setChat((c) => [...c, { role: 'me', text: question }]);
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, question, scope: all ? 'all' : 'lecture' }) });
      const j = await res.json();
      setChat((c) => [...c, { role: 'ai', text: res.ok ? j.answer : j.error, sources: j.sources || [] }]);
    } catch { setChat((c) => [...c, { role: 'ai', text: 'Koneksi terputus. Coba kirim lagi.' }]); }
    setBusy(false);
  }

  async function reindex() {
    setNote('Mengindeks…');
    const res = await fetch('/api/reindex', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const j = await res.json();
    setNote(res.ok ? `Selesai: ${j.chunks} potongan terindeks.` : j.error);
  }

  return (
    <section className="card">
      <div className="chat">
        {chat.length === 0 && <p className="muted">{all ? 'Tanya dari semua kuliahmu, mis. “kapan dosen bahas subnetting?”' : 'Tanya apa saja, mis. “tadi dosen jelasin Ethernet itu apa?”'}</p>}
        {chat.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.text}
            {m.sources?.length > 0 && (
              <div className="srcs">
                {m.sources.map((s, k) => all
                  ? <Link key={k} href={`/lecture/${s.lecture_id}`} className="chip">{s.title} · {s.time || '-'}</Link>
                  : <span key={k} className="chip">{s.time || '-'}</span>)}
              </div>
            )}
          </div>
        ))}
        {busy && <p className="bubble ai muted">Mencari potongan yang relevan…</p>}
      </div>
      <form onSubmit={ask} className="askbar">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={all ? 'Tanya semua kuliah' : 'Tanya isi kuliah ini'} aria-label="Pertanyaan" />
        <button className="btn" disabled={busy}>Tanya</button>
      </form>
      {!all && <p className="muted small">Jawaban belum muncul? <button className="linkbtn" onClick={reindex}>Indeks ulang kuliah ini</button> {note}</p>}
    </section>
  );
}
