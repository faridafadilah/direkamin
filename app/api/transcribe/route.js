import { NextResponse } from "next/server";
import { gemini } from "@/lib/gemini";
import { whisper } from "@/lib/whisper";

export const maxDuration = 60;

const mmss = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export async function POST(req) {
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    const engine = form.get("engine") === "gemini" ? "gemini" : "whisper";
    const offset = Number(form.get("offset") || 0);
    if (!audio || audio.size === 0)
      return NextResponse.json(
        { error: "Segmen audio kosong." },
        { status: 400 },
      );
    if (engine === "whisper")
      return NextResponse.json({ transcript: await whisper(audio, offset) });

    const data = Buffer.from(await audio.arrayBuffer()).toString("base64");
    const transcript = await gemini([
      { inlineData: { mimeType: audio.type || "audio/wav", data } },
      {
        text: `Transkripkan potongan rekaman kuliah ini apa adanya. Potongan ini dimulai pada menit ${mmss(offset)}. Gunakan timestamp absolut, bukan timestamp relatif dari awal potongan. Format tiap baris: [mm:ss] kalimat. Tanpa komentar tambahan.`,
      },
    ]);
    return NextResponse.json({ transcript });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
