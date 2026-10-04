import { NextResponse } from 'next/server';
import { whisper } from '@/lib/whisper';
import { gemini } from '@/lib/gemini';
export const maxDuration = 60;

export async function POST(req) {
  try {
    const f = await req.formData();
    const text = await whisper(f.get('audio'), Number(f.get('offset') || 0));
    const lines = text.split('\n').filter(Boolean);
    let flags = [];
    if (text.length > 80) {
      try {
        const raw = await gemini(
          [{ text: `Potongan transkrip kuliah:\n${text}\n\nTemukan bagian yang perlu ditanyakan mahasiswa ke dosen: tugas/tenggat/pengumuman yang tanggal atau detailnya ambigu atau tidak lengkap (mis. "minggu depan"), atau kalimat yang tidak jelas. Balas JSON: {"flags":[{"time":"mm:ss","note":"pertanyaan singkat untuk dosen","quote":"kalimat dosen"}]}. Kosongkan jika tidak ada. Jangan mengarang.` }],
          { json: true }
        );
        flags = JSON.parse(raw.replace(/```json|```/g, '').trim()).flags || [];
      } catch {}
    }
    return NextResponse.json({ lines, flags });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
