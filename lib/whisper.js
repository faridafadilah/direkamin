// Whisper large-v3 lewat Groq (tingkat gratis: upload maks 25 MB, sekitar 8 jam audio per hari).
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export async function whisper(file, offset = 0) {
  if (file.size > 25 * 1024 * 1024) throw new Error('File lebih dari 25 MB. Kecilkan dulu (mis. ubah ke mono 16 kHz) atau potong per bagian.');
  const fd = new FormData();
  fd.append('file', file, file.name || 'audio.mp3');
  fd.append('model', process.env.WHISPER_MODEL || 'whisper-large-v3');
  fd.append('response_format', 'verbose_json');
  fd.append('language', 'id');
  fd.append('temperature', '0');
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Whisper gagal memproses audio');
  // buang segmen hening (Whisper suka berhalusinasi saat sunyi)
  const segs = (data.segments || []).filter((s) => (s.no_speech_prob ?? 0) < 0.6 && s.text.trim());
  return segs.map((s) => `[${mmss(s.start + offset)}] ${s.text.trim()}`).join('\n');
}
