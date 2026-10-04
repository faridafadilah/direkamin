// RAG: potong transkrip -> embedding (Gemini) -> simpan di pgvector -> cari potongan paling mirip.
const EMB = process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
export const CHUNK_SECONDS = Number(process.env.RAG_CHUNK_SECONDS || 45); // panjang tiap potongan
export const TOP_K = Number(process.env.RAG_TOP_K || 5); // jumlah potongan yang diambil

const norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
const toSec = (s) => s.split(':').reduce((a, x) => a * 60 + Number(x), 0);

export async function embed(texts, taskType) {
  const out = [];
  for (let i = 0; i < texts.length; i += 100) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMB}:batchEmbedContents?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: texts.slice(i, i + 100).map((t) => ({
            model: `models/${EMB}`, content: { parts: [{ text: t }] }, taskType, outputDimensionality: 768,
          })),
        }),
      }
    );
    const j = await res.json();
    if (!res.ok) throw new Error(j.error?.message || 'Embedding gagal');
    out.push(...j.embeddings.map((e) => norm(e.values)));
  }
  return out;
}

export function chunkTranscript(transcript, win = CHUNK_SECONDS) {
  const chunks = []; let cur = null;
  for (const line of transcript.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const m = line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.*)$/);
    const t = m ? toSec(m[1]) : null, text = m ? m[2] : line;
    const full = cur && ((t != null && cur.t0 != null && t - cur.t0 >= win) || (t == null && cur.n >= 6));
    if (!cur || full) { cur = { start: m ? m[1] : null, t0: t, n: 0, parts: [] }; chunks.push(cur); }
    cur.parts.push(text); cur.n++;
  }
  return chunks.map((c) => ({ start_time: c.start, content: c.parts.join(' ') }));
}

export async function indexLecture(sb, id, transcript, win) {
  const chunks = chunkTranscript(transcript, win);
  if (!chunks.length) return 0;
  const vecs = await embed(chunks.map((c) => c.content), 'RETRIEVAL_DOCUMENT');
  await sb.from('chunks').delete().eq('lecture_id', id);
  const rows = chunks.map((c, i) => ({ lecture_id: id, ...c, embedding: JSON.stringify(vecs[i]) }));
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await sb.from('chunks').insert(rows.slice(i, i + 50));
    if (error) throw new Error(error.message);
  }
  return rows.length;
}
