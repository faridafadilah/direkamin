import { NextResponse } from "next/server";
import { gemini } from "@/lib/gemini";
import { whisper } from "@/lib/whisper";
import { indexLecture } from "@/lib/rag";
import { db } from "@/lib/supabase";
export const maxDuration = 60;

const SYSTEM =
  "Kamu asisten belajar untuk mahasiswa pekerja. Jawab dalam bahasa Indonesia. Istilah teknis Inggris tetap ditulis Inggris. Hanya gunakan isi transkrip, jangan mengarang.";

export async function POST(req) {
  try {
    const f = await req.formData();
    const title = (f.get("title") || "Kuliah tanpa judul").toString();
    const course = (f.get("course") || "").toString();
    let transcript = (f.get("transcript") || "").toString().trim();
    const audio = f.get("audio");
    const source = f.get("source");
    const marks = JSON.parse((f.get("marks") || "[]").toString());
    const flags = JSON.parse((f.get("flags") || "[]").toString());
    const engine = f.get("engine") === "gemini" ? "gemini" : "whisper";

    if (!transcript && audio && audio.size > 0) {
      if (engine === "whisper") transcript = await whisper(audio);
      else {
        const data = Buffer.from(await audio.arrayBuffer()).toString("base64");
        transcript = await gemini([
          { inlineData: { mimeType: audio.type || "audio/mpeg", data } },
          {
            text: "Transkripkan rekaman kuliah ini apa adanya. Format tiap baris: [mm:ss] kalimat. Tanpa komentar tambahan.",
          },
        ]);
      }
    }
    if (!transcript)
      return NextResponse.json(
        { error: "Unggah audio atau tempel transkrip dulu." },
        { status: 400 },
      );

    const raw = await gemini(
      [
        {
          text: `Transkrip kuliah:\n${transcript}\n\nBalas JSON dengan bentuk:
{"one_min":["3-5 poin inti"],"five_min":"ringkasan per topik, paragraf pendek","full":"catatan belajar lengkap dalam Markdown: judul/subjudul per topik, penjelasan ringkas, dan poin penting; tanpa timestamp atau rujukan menit",
"questions":[{"time":"mm:ss","question":"pertanyaan sopan ke dosen untuk tiap titik bingung"}],
"tasks":[{"title":"","due":"tenggat persis seperti diucapkan atau null","quote":"kalimat dosen","time":"mm:ss","ambiguous":true}]}
"ambiguous" true jika tanggal tidak jelas (mis. "minggu depan"). Jika tidak ada tugas, tasks = [].
Titik bingung mahasiswa: ${marks.map((m) => `${m.time} (${m.context})`).join("; ") || "tidak ada"}.`,
        },
      ],
      { json: true, system: SYSTEM },
    );
    const out = JSON.parse(raw.replace(/```json|```/g, "").trim());

    const questions = [
      ...(out.questions || []).map((q) => ({
        time: q.time,
        text: q.question,
        kind: "bingung",
        done: false,
      })),
      ...flags.map((x) => ({
        time: x.time,
        text: x.note,
        quote: x.quote,
        kind: "ambigu",
        done: false,
      })),
    ];
    const sb = db();
    const { data, error } = await sb
      .from("lectures")
      .insert({
        title,
        course,
        transcript,
        questions,
        engine:
          source === "live"
            ? "whisper (rekam langsung)"
            : transcript === (f.get("transcript") || "").toString().trim()
              ? "manual"
              : engine,
        summary: {
          one_min: out.one_min,
          five_min: out.five_min,
          full: out.full,
        },
        tasks: out.tasks || [],
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    let indexed = true;
    try {
      await indexLecture(sb, data.id, transcript); // gagal indeks tidak membatalkan kuliah
    } catch {
      indexed = false;
    }
    return NextResponse.json({ id: data.id, indexed });
  } catch (e) {
    if (/high demand|temporar|resource_exhausted|rate limit/i.test(e.message))
      return NextResponse.json(
        {
          error:
            "Gemini sedang penuh. Coba lagi beberapa menit. Jika yang gagal transkripsi audio, pilih Whisper; pembuatan ringkasan tetap memerlukan Gemini.",
        },
        { status: 503 },
      );
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
