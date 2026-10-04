"use client";
import { useState } from "react";
import { tokens, wer, prf, csv, download } from "@/lib/eval";

const f = (x) => x.toFixed(1);
const Pick = ({ lectures, value, onChange }) => (
  <label>
    Kuliah
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {lectures.map((l) => (
        <option key={l.id} value={l.id}>
          {l.title} ({l.engine || "-"})
        </option>
      ))}
    </select>
  </label>
);

export default function EvalPanel({ lectures }) {
  const [tab, setTab] = useState("WER");
  if (!lectures.length)
    return <p className="muted">Belum ada kuliah untuk dievaluasi.</p>;
  return (
    <>
      <nav className="tabs">
        {["WER", "Tanya jawab", "Tugas"].map((t) => (
          <button
            key={t}
            className={tab === t ? "on" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      {tab === "WER" && <Wer lectures={lectures} />}
      {tab === "Tanya jawab" && <Qa lectures={lectures} />}
      {tab === "Tugas" && <Tasks lectures={lectures} />}
    </>
  );
}

function Wer({ lectures }) {
  const [id, setId] = useState(lectures[0].id);
  const [ref, setRef] = useState("");
  const [opt, setOpt] = useState({ lower: true, punct: true, stamp: true });
  const [rows, setRows] = useState([]);
  const l = lectures.find((x) => x.id === id);
  const add = () =>
    ref.trim() &&
    setRows([
      ...rows,
      {
        title: l.title,
        engine: l.engine || "-",
        ...wer(tokens(ref, opt), tokens(l.transcript, opt)),
      },
    ]);
  const avg = {};
  rows.forEach((r) => {
    (avg[r.engine] ||= []).push(r.wer);
  });
  return (
    <section className="card">
      <Pick lectures={lectures} value={id} onChange={setId} />
      <label>
        Transkrip acuan (hasil ketikan manual)
        <textarea
          rows={6}
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="Tempel transkrip yang sudah kamu koreksi manual"
        />
      </label>
      <div className="opts">
        {[
          ["lower", "Huruf kecil"],
          ["punct", "Hapus tanda baca"],
          ["stamp", "Hapus timestamp"],
        ].map(([k, n]) => (
          <label key={k}>
            <input
              type="checkbox"
              checked={opt[k]}
              onChange={() => setOpt({ ...opt, [k]: !opt[k] })}
            />
            {n}
          </label>
        ))}
      </div>
      <button className="btn" onClick={add}>
        Hitung WER
      </button>
      {rows.length > 0 && (
        <div className="tight">
          <table className="ev">
            <thead>
              <tr>
                <th>Kuliah</th>
                <th>Mesin</th>
                <th>N</th>
                <th>S</th>
                <th>D</th>
                <th>I</th>
                <th>WER %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.title}</td>
                  <td>{r.engine}</td>
                  <td>{r.N}</td>
                  <td>{r.S}</td>
                  <td>{r.D}</td>
                  <td>{r.I}</td>
                  <td>{f(r.wer)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">
            Rata-rata:{" "}
            {Object.entries(avg)
              .map(
                ([e, v]) =>
                  `${e} ${f(v.reduce((a, b) => a + b, 0) / v.length)}%`,
              )
              .join(" · ")}
          </p>
          <button
            className="btn ghost"
            onClick={() =>
              download(
                "wer.csv",
                csv([
                  ["Kuliah", "Mesin", "N", "S", "D", "I", "WER"],
                  ...rows.map((r) => [
                    r.title,
                    r.engine,
                    r.N,
                    r.S,
                    r.D,
                    r.I,
                    f(r.wer),
                  ]),
                ]),
              )
            }
          >
            Unduh CSV
          </button>
        </div>
      )}
    </section>
  );
}

function Qa({ lectures }) {
  const [id, setId] = useState(lectures[0].id);
  const [text, setText] = useState("");
  const [k, setK] = useState(5);
  const [chunk, setChunk] = useState(45);
  const [res, setRes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const post = (url, body) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());

  async function reindex() {
    setNote("Mengindeks…");
    const j = await post("/api/reindex", { id, chunkSeconds: Number(chunk) });
    setNote(j.error || `Selesai: ${j.chunks} potongan (${chunk} detik).`);
  }
  async function run() {
    const items = text
      .split("\n")
      .map((s) => s.split("||").map((x) => x.trim()))
      .filter((a) => a[0]);
    setBusy(true);
    setRes([]);
    for (const [q, key = ""] of items) {
      const j = await post("/api/ask", {
        id,
        question: q,
        scope: "lecture",
        topK: Number(k),
      });
      setRes((r) => [
        ...r,
        { q, key, answer: j.answer || j.error, ok: null, src: null },
      ]);
    }
    setBusy(false);
  }
  const set = (i, p) =>
    setRes(res.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const judged = res.filter((r) => r.ok !== null);
  const acc = judged.length
    ? (judged.filter((r) => r.ok).length / judged.length) * 100
    : 0;
  const srcJ = res.filter((r) => r.src !== null);
  const srcAcc = srcJ.length
    ? (srcJ.filter((r) => r.src).length / srcJ.length) * 100
    : 0;

  return (
    <section className="card">
      <Pick lectures={lectures} value={id} onChange={setId} />
      <div className="grid2">
        <label>
          Ukuran potongan (detik)
          <input
            type="number"
            value={chunk}
            onChange={(e) => setChunk(e.target.value)}
          />
        </label>
        <label>
          Jumlah potongan (top-K)
          <input
            type="number"
            value={k}
            onChange={(e) => setK(e.target.value)}
          />
        </label>
      </div>
      <button className="btn ghost" onClick={reindex}>
        Indeks ulang dengan ukuran ini
      </button>
      {note && <p className="muted small">{note}</p>}
      <label style={{ marginTop: 14 }}>
        Pertanyaan uji, satu per baris: pertanyaan || kunci jawaban
        <textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            "Apa fungsi switch? || Meneruskan frame berdasarkan alamat MAC"
          }
        />
      </label>
      <button className="btn" disabled={busy} onClick={run}>
        {busy ? `Menjalankan… (${res.length})` : "Jalankan pertanyaan"}
      </button>
      {res.length > 0 && (
        <div className="tight">
          <table className="ev">
            <thead>
              <tr>
                <th>Pertanyaan</th>
                <th>Kunci</th>
                <th>Jawaban sistem</th>
                <th>Benar?</th>
                <th>Sumber tepat?</th>
              </tr>
            </thead>
            <tbody>
              {res.map((r, i) => (
                <tr key={i}>
                  <td>{r.q}</td>
                  <td>{r.key}</td>
                  <td>{r.answer}</td>
                  <td>
                    <button
                      className={`chip ${r.ok === true ? "on" : ""}`}
                      onClick={() => set(i, { ok: true })}
                    >
                      Ya
                    </button>
                    <button
                      className={`chip ${r.ok === false ? "on" : ""}`}
                      onClick={() => set(i, { ok: false })}
                    >
                      Tidak
                    </button>
                  </td>
                  <td>
                    <button
                      className={`chip ${r.src === true ? "on" : ""}`}
                      onClick={() => set(i, { src: true })}
                    >
                      Ya
                    </button>
                    <button
                      className={`chip ${r.src === false ? "on" : ""}`}
                      onClick={() => set(i, { src: false })}
                    >
                      Tidak
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Akurasi jawaban <span className="metric">{f(acc)}%</span> (
            {judged.length}/{res.length} dinilai) · Akurasi sumber{" "}
            <span className="metric">{f(srcAcc)}%</span>
          </p>
          <button
            className="btn ghost"
            onClick={() =>
              download(
                "tanya-jawab.csv",
                csv([
                  [
                    "Pertanyaan",
                    "Kunci",
                    "Jawaban",
                    "Benar",
                    "Sumber tepat",
                    "TopK",
                    "Chunk(detik)",
                  ],
                  ...res.map((r) => [
                    r.q,
                    r.key,
                    r.answer,
                    r.ok,
                    r.src,
                    k,
                    chunk,
                  ]),
                ]),
              )
            }
          >
            Unduh CSV
          </button>
        </div>
      )}
    </section>
  );
}

function Tasks({ lectures }) {
  const [id, setId] = useState(lectures[0].id);
  const [mark, setMark] = useState({});
  const [fn, setFn] = useState(0);
  const [rows, setRows] = useState([]);
  const l = lectures.find((x) => x.id === id);
  const tasks = l.tasks || [];
  const tp = tasks.filter((_, i) => mark[i] === "tp").length;
  const fp = tasks.filter((_, i) => mark[i] === "fp").length;
  const m = prf(tp, fp, Number(fn));
  const pick = (v) => {
    setId(v);
    setMark({});
    setFn(0);
  };
  return (
    <section className="card">
      <Pick lectures={lectures} value={id} onChange={pick} />
      {tasks.length === 0 && (
        <p className="muted">
          Sistem tidak menemukan tugas di kuliah ini. Isi “tugas terlewat” di
          bawah jika dosen menyebut tugas.
        </p>
      )}
      {tasks.map((t, i) => (
        <p key={i} className="q">
          <span className="chip">{t.time}</span>
          {t.title} <em className="muted">· “{t.quote}”</em>{" "}
          <button
            className={`chip ${mark[i] === "tp" ? "on" : ""}`}
            onClick={() => setMark({ ...mark, [i]: "tp" })}
          >
            Benar
          </button>
          <button
            className={`chip ${mark[i] === "fp" ? "on" : ""}`}
            onClick={() => setMark({ ...mark, [i]: "fp" })}
          >
            Salah tangkap
          </button>
        </p>
      ))}
      <label>
        Tugas yang disebut dosen tapi terlewat sistem (FN)
        <input
          type="number"
          min="0"
          value={fn}
          onChange={(e) => setFn(e.target.value)}
        />
      </label>
      <p>
        Precision <span className="metric">{f(m.p)}%</span> · Recall{" "}
        <span className="metric">{f(m.r)}%</span> · F1{" "}
        <span className="metric">{f(m.f1)}%</span>
      </p>
      <button
        className="btn"
        onClick={() =>
          setRows([...rows, { title: l.title, tp, fp, fn: Number(fn), ...m }])
        }
      >
        Simpan ke tabel
      </button>
      {rows.length > 0 && (
        <div className="tight">
          <table className="ev">
            <thead>
              <tr>
                <th>Kuliah</th>
                <th>TP</th>
                <th>FP</th>
                <th>FN</th>
                <th>P %</th>
                <th>R %</th>
                <th>F1 %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.title}</td>
                  <td>{r.tp}</td>
                  <td>{r.fp}</td>
                  <td>{r.fn}</td>
                  <td>{f(r.p)}</td>
                  <td>{f(r.r)}</td>
                  <td>{f(r.f1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            className="btn ghost"
            onClick={() =>
              download(
                "tugas.csv",
                csv([
                  ["Kuliah", "TP", "FP", "FN", "Precision", "Recall", "F1"],
                  ...rows.map((r) => [
                    r.title,
                    r.tp,
                    r.fp,
                    r.fn,
                    f(r.p),
                    f(r.r),
                    f(r.f1),
                  ]),
                ]),
              )
            }
          >
            Unduh CSV
          </button>
        </div>
      )}
    </section>
  );
}
