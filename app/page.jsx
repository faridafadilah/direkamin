import Link from "next/link";
import { db } from "@/lib/supabase";
import SignOut from "@/components/SignOut";
import NewLecture from "@/components/NewLecture";
export const dynamic = "force-dynamic";

export default async function Home() {
  let lectures = [],
    err = null;
  const {
    data: { user },
  } = await db().auth.getUser();
  try {
    const { data, error } = await db()
      .from("lectures")
      .select("id,title,course,created_at,tasks")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    lectures = data;
  } catch (e) {
    err = e.message;
  }

  return (
    <>
      <div className="topbar">
        <span className="muted small">{user?.email}</span>
        <span style={{ display: "flex", gap: 16 }}>
          <Link href="/kalender" className="linkbtn">
            Kalender
          </Link>
          <Link href="/evaluasi" className="linkbtn">
            Evaluasi
          </Link>
          <SignOut />
        </span>
      </div>
      <header className="hero">
        <p className="brand">Direkamin</p>
        <h1>
          Ngantuk boleh,
          <br />
          materi jangan lewat.
        </h1>
        <p className="lead">
          Rekam kuliahmu. Direkamin merangkum, menjawab pertanyaan dengan menit
          rujukannya, dan mengingatkan tugas dari dosen.
        </p>
      </header>
      <div className="ctas">
        <Link href="/rekam" className="btn ghost wide">
          Rekam langsung
        </Link>
        <Link href="/tanya" className="btn ghost wide">
          Tanya semua kuliah
        </Link>
      </div>
      <NewLecture />
      <section className="list">
        <h2>Kuliah kamu</h2>
        {err && (
          <p className="err">
            Database belum tersambung: {err}. Cek file .env dan jalankan
            supabase/schema.sql.
          </p>
        )}
        {!err && lectures.length === 0 && (
          <p className="muted">
            Belum ada kuliah. Unggah rekaman pertamamu di atas.
          </p>
        )}
        {lectures.map((l) => (
          <Link key={l.id} href={`/lecture/${l.id}`} className="row">
            <div>
              <strong>{l.title}</strong>
              <span className="muted">
                {l.course || "Tanpa mata kuliah"} ·{" "}
                {new Date(l.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                })}
              </span>
            </div>
            {l.tasks?.length > 0 && (
              <span className="pill">{l.tasks.length} tugas</span>
            )}
          </Link>
        ))}
      </section>
    </>
  );
}
