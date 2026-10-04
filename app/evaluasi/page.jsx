import Link from "next/link";
import { db } from "@/lib/supabase";
import EvalPanel from "@/components/EvalPanel";
export const dynamic = "force-dynamic";

export default async function Evaluasi() {
  const { data } = await db()
    .from("lectures")
    .select("id,title,engine,transcript,tasks")
    .order("created_at", { ascending: false });
  return (
    <>
      <Link href="/" className="back">
        Semua kuliah
      </Link>
      <h1 className="title">Evaluasi</h1>
      <p className="muted">
        Alat ukur untuk skripsi: WER, akurasi tanya jawab, dan precision/recall
        tugas. Semua hasil bisa diunduh sebagai CSV.
      </p>
      <EvalPanel lectures={data || []} />
    </>
  );
}
