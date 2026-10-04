import { NextResponse } from "next/server";
import { gemini } from "@/lib/gemini";
import { embed, TOP_K } from "@/lib/rag";
import { db } from "@/lib/supabase";
export const maxDuration = 60;

const SYSTEM =
  'Jawab singkat dalam bahasa Indonesia hanya dari potongan transkrip yang diberikan. Tulis teks biasa tanpa tanda bintang atau Markdown. Sebut sumber tiap poin sebagai (Judul, [mm:ss]). Jika potongan tidak memuat jawabannya, jawab "Bagian ini tidak ditemukan di kuliah yang tersimpan." dan kosongkan "used". Balas JSON: {"answer":"...","used":[nomor potongan yang benar-benar kamu pakai]}.';

export async function POST(req) {
  try {
    const { id, question, scope, topK } = await req.json();
    const all = scope === "all";
    const sb = db();
    const [qv] = await embed([question], "RETRIEVAL_QUERY");
    const { data: hits, error } = await sb.rpc("match_chunks", {
      query_embedding: JSON.stringify(qv),
      match_count: Number(topK) || TOP_K,
      filter_lecture: all ? null : id,
    });
    if (error) throw new Error(error.message);
    if (!hits?.length)
      return NextResponse.json({
        answer: all
          ? "Belum ada kuliah yang terindeks."
          : "Kuliah ini belum terindeks. Tekan “Indeks ulang”, lalu coba lagi.",
        sources: [],
      });

    const ctx = hits
      .map(
        (h, i) =>
          `[${i + 1}] (${h.title} | ${h.start_time || "-"}) ${h.content}`,
      )
      .join("\n\n");
    const raw = await gemini(
      [
        {
          text: `Potongan transkrip:\n${ctx}\n\nPertanyaan mahasiswa: ${question}`,
        },
      ],
      { json: true, system: SYSTEM },
    );

    let answer = raw,
      used = null;
    try {
      const out = JSON.parse(raw.replace(/```json|```/g, "").trim());
      answer = out.answer;
      used = (out.used || []).map((n) => Number(n) - 1).filter((i) => hits[i]);
    } catch {}

    const shown = used
      ? used.map((i) => hits[i])
      : hits.filter((h) => h.similarity >= hits[0].similarity - 0.08);

    return NextResponse.json({
      answer,
      sources: shown.map((h) => ({
        lecture_id: h.lecture_id,
        title: h.title,
        time: h.start_time,
        score: Math.round(h.similarity * 100) / 100,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
