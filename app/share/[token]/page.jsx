import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Catatan kuliah bersama",
  robots: { index: false, follow: false },
};

export default async function SharedLecture({ params }) {
  const { data, error } = await db().rpc("get_shared_lecture", {
    share_token: params.token,
  });
  const lecture = data?.[0];
  if (error || !lecture) notFound();
  const summary = lecture.summary || {};

  return (
    <>
      <Link href="/login" className="back">
        Direkamin
      </Link>
      <p className="brand">Catatan kuliah bersama</p>
      <h1 className="title">{lecture.title}</h1>
      <p className="muted">
        {lecture.course || "Tanpa mata kuliah"} · {lecture.engine || "manual"}
      </p>
      {summary.one_min?.length > 0 && (
        <section className="card">
          <h2>Inti kuliah</h2>
          <ul className="points">
            {summary.one_min.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </section>
      )}
      {summary.five_min && (
        <section className="card">
          <h2>Ringkasan</h2>
          <p className="prose">{summary.five_min}</p>
        </section>
      )}
      {summary.full && (
        <section className="card">
          <h2>Catatan lengkap</h2>
          <div className="shared-note">{summary.full}</div>
        </section>
      )}
      {(lecture.tasks || []).length > 0 && (
        <section className="stack">
          <h2>Tugas</h2>
          {lecture.tasks.map((task, index) => (
            <article className="card task" key={index}>
              <strong>{task.title}</strong>
              <p className="due">Tenggat: {task.due || "tidak disebut"}</p>
              <blockquote>
                {task.quote} <span className="chip">{task.time}</span>
              </blockquote>
            </article>
          ))}
        </section>
      )}
      <details className="card shared-transcript">
        <summary>Transkrip lengkap</summary>
        <div className="transcript">
          {(lecture.transcript || "")
            .split("\n")
            .filter(Boolean)
            .map((line, index) => {
              const match = line.match(
                /^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.*)$/,
              );
              return (
                <p key={index}>
                  {match ? (
                    <>
                      <span className="chip">{match[1]}</span>
                      {match[2]}
                    </>
                  ) : (
                    line
                  )}
                </p>
              );
            })}
        </div>
      </details>
    </>
  );
}
