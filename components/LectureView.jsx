"use client";
import { useState } from "react";
import AskPanel from "@/components/AskPanel";
import ShareLecture from "@/components/ShareLecture";

const TABS = [
  "Ringkasan",
  "Tugas",
  "Tanya dosen",
  "Tanya AI",
  "Transkrip",
  "Bagikan",
];
const LEVELS = [
  ["one_min", "1 menit"],
  ["five_min", "5 menit"],
  ["full", "Lengkap"],
];

function summaryBlocks(text = "") {
  const blocks = [];
  let paragraph = [];
  let list = [];
  const flushParagraph = () => {
    if (paragraph.length)
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: "list", items: list });
    list = [];
  };
  const lines = text
    .replace(/\s*\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/g, " ")
    .split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
    } else if (/^#{1,3}\s/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: line.replace(/^#{1,3}\s+/, "") });
    } else if (/^(?:[-*]|\d+\.)\s+/.test(line)) {
      flushParagraph();
      list.push(line.replace(/^(?:[-*]|\d+\.)\s+/, ""));
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

export default function LectureView({ l }) {
  const [tab, setTab] = useState("Ringkasan");
  const [level, setLevel] = useState("one_min");
  const [copied, setCopied] = useState(false);
  const s = l.summary || {};
  const [qs, setQs] = useState(l.questions || []);
  const open = qs.filter((x) => !x.done).length;
  function toggle(i) {
    const done = !qs[i].done;
    setQs(qs.map((x, j) => (j === i ? { ...x, done } : x)));
    fetch("/api/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: l.id, index: i, done }),
    });
  }

  async function copyFullSummary() {
    const text = (s.full || "")
      .replace(/\s*\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/g, " ")
      .trim();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "on" : ""}
            onClick={() => setTab(t)}
          >
            {t}
            {t === "Tugas" && l.tasks?.length ? ` (${l.tasks.length})` : ""}
            {t === "Tanya dosen" && open ? ` (${open})` : ""}
          </button>
        ))}
      </nav>

      {tab === "Ringkasan" && (
        <section className="card">
          <div className="seg">
            {LEVELS.map(([k, n]) => (
              <button
                key={k}
                className={level === k ? "on" : ""}
                onClick={() => setLevel(k)}
              >
                {n}
              </button>
            ))}
          </div>
          {level === "one_min" ? (
            <ul className="points">
              {(s.one_min || []).map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          ) : level === "full" ? (
            <>
              <div className="note-actions">
                <button className="linkbtn" onClick={copyFullSummary}>
                  {copied ? "Tersalin" : "Salin catatan"}
                </button>
              </div>
              <div className="full-summary">
                {summaryBlocks(s.full).map((block, i) => {
                  if (block.type === "heading")
                    return <h3 key={i}>{block.text}</h3>;
                  if (block.type === "list")
                    return (
                      <ul key={i}>
                        {block.items.map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ul>
                    );
                  return <p key={i}>{block.text}</p>;
                })}
              </div>
            </>
          ) : (
            <p className="prose">{s[level]}</p>
          )}
        </section>
      )}

      {tab === "Tugas" && (
        <section className="stack">
          {(l.tasks || []).length === 0 && (
            <p className="muted">Dosen tidak menyebut tugas di kuliah ini.</p>
          )}
          {(l.tasks || []).map((t, i) => (
            <article className="card task" key={i}>
              <div className="between">
                <strong>{t.title}</strong>
                {t.ambiguous && (
                  <span className="pill warn">Perlu konfirmasi</span>
                )}
              </div>
              <p className="due">Tenggat: {t.due || "tidak disebut"}</p>
              <blockquote>
                {t.quote} <span className="chip">{t.time}</span>
              </blockquote>
            </article>
          ))}
        </section>
      )}

      {tab === "Tanya dosen" && (
        <section className="stack">
          {qs.length === 0 && (
            <p className="muted">
              Tidak ada yang perlu ditanyakan dari kuliah ini.
            </p>
          )}
          {qs.map((x, i) => (
            <label key={i} className={`card qrow ${x.done ? "done" : ""}`}>
              <input
                type="checkbox"
                checked={!!x.done}
                onChange={() => toggle(i)}
              />
              <span>
                <span className="chip">{x.time}</span>
                {x.text}
                {x.quote && <em className="muted"> · “{x.quote}”</em>}
                <span className={`pill ${x.kind === "ambigu" ? "warn" : ""}`}>
                  {x.kind === "ambigu" ? "Ambigu" : "Kamu bingung"}
                </span>
              </span>
            </label>
          ))}
        </section>
      )}

      {tab === "Tanya AI" && <AskPanel id={l.id} />}

      {tab === "Bagikan" && (
        <ShareLecture id={l.id} initialToken={l.share_token} />
      )}

      {tab === "Transkrip" && (
        <section className="card transcript">
          {l.transcript
            .split("\n")
            .filter(Boolean)
            .map((line, i) => {
              const m = line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.*)$/);
              return m ? (
                <p key={i}>
                  <span className="chip">{m[1]}</span>
                  {m[2]}
                </p>
              ) : (
                <p key={i}>{line}</p>
              );
            })}
        </section>
      )}
    </>
  );
}
