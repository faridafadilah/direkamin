"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SEG = 30000; // panjang tiap potongan rekaman (ms)
const mmss = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function chooseMime(types) {
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export default function LiveRecorder() {
  const router = useRouter();
  const R = useRef({});
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [source, setSource] = useState("mic");
  const [phase, setPhase] = useState("idle");
  const [sec, setSec] = useState(0);
  const [lines, setLines] = useState([]);
  const [flags, setFlags] = useState([]);
  const [marks, setMarks] = useState([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  function toast(t) {
    setMsg(t);
    clearTimeout(R.current.mt);
    R.current.mt = setTimeout(() => setMsg(""), 4000);
  }

  async function start() {
    setError("");
    setVideoUrl("");
    try {
      const stream =
        source === "tab"
          ? await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true,
            })
          : await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = stream.getAudioTracks();
      if (!tracks.length) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error(
          "Tidak ada audio. Saat memilih tab, centang “Bagikan audio tab”.",
        );
      }

      const audioStream = new MediaStream(tracks);
      Object.assign(R.current, {
        stream,
        audio: audioStream,
        active: true,
        t0: Date.now(),
        queue: Promise.resolve(),
        lines: [],
        videoChunks: [],
        videoMime: "",
        videoRecorder: null,
      });

      if (source === "tab" && stream.getVideoTracks().length) {
        const mime = chooseMime([
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm",
        ]);
        R.current.videoMime = mime;
        const recorder = new MediaRecorder(
          stream,
          mime ? { mimeType: mime } : undefined,
        );
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0)
            R.current.videoChunks.push(event.data);
        };
        recorder.start(250);
        R.current.videoRecorder = recorder;
      }

      R.current.wake = await navigator.wakeLock
        ?.request("screen")
        .catch(() => null);
      segment();
      setSec(0);
      setPhase("recording");
    } catch (e) {
      setError(e.message);
    }
  }

  function segment() {
    const r = R.current;
    if (!r.active) return;
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/mp4";
    const rec = new MediaRecorder(r.audio, { mimeType: mime });
    const chunks = [],
      offset = Math.floor((Date.now() - r.t0) / 1000);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      r.queue = r.queue.then(() => upload(blob, offset, mime));
      if (r.active) segment();
      else r.resolve?.();
    };
    rec.start();
    r.rec = rec;
    r.timer = setTimeout(() => rec.stop(), SEG);
  }

  async function upload(blob, offset, mime) {
    if (blob.size < 2000) return;
    const fd = new FormData();
    fd.append("audio", blob, `seg.${mime.includes("mp4") ? "m4a" : "webm"}`);
    fd.append("offset", offset);
    try {
      const res = await fetch("/api/live", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      R.current.lines.push(...j.lines);
      setLines((l) => [...l, ...j.lines]);
      if (j.flags?.length) {
        setFlags((f) => [...f, ...j.flags]);
        toast(`Perlu ditanyakan: ${j.flags[0].note}`);
        navigator.vibrate?.(80);
      }
    } catch (e) {
      toast("Satu potongan gagal ditranskrip: " + e.message);
    }
  }

  function mark() {
    const t = mmss((Date.now() - R.current.t0) / 1000);
    setMarks((m) => [
      ...m,
      { time: t, context: R.current.lines.slice(-2).join(" ") },
    ]);
    toast(`Ditandai bingung di menit ${t}`);
    navigator.vibrate?.(40);
  }

  async function stop() {
    const r = R.current;
    r.active = false;
    clearTimeout(r.timer);
    setPhase("saving");
    const done = new Promise((res) => (r.resolve = res));
    if (r.rec && r.rec.state !== "inactive") r.rec.stop();
    else r.resolve();

    const finishVideo = () =>
      new Promise((resolve) => {
        if (!r.videoRecorder || r.videoRecorder.state === "inactive")
          return resolve();
        const original = r.videoRecorder.onstop;
        r.videoRecorder.onstop = () => {
          if (original) original();
          const blob = new Blob(r.videoChunks || [], {
            type: r.videoMime || "video/webm",
          });
          if (blob.size > 0) {
            const url = URL.createObjectURL(blob);
            setVideoUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return url;
            });
          }
          resolve();
        };
        r.videoRecorder.stop();
      });

    await Promise.all([done, finishVideo()]);
    await r.queue;
    r.audio.getTracks().forEach((t) => t.stop());
    r.stream.getTracks().forEach((t) => t.stop());
    r.wake?.release?.();
    if (!r.lines.length) {
      setError("Belum ada ucapan yang tertranskrip.");
      setPhase("idle");
      return;
    }
    const fd = new FormData();
    fd.append("title", title || "Kuliah langsung");
    fd.append("course", course);
    fd.append("transcript", r.lines.join("\n"));
    fd.append("source", "live");
    fd.append("marks", JSON.stringify(marks));
    fd.append("flags", JSON.stringify(flags));
    const res = await fetch("/api/process", { method: "POST", body: fd });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error);
      setPhase("idle");
      return;
    }
    router.push(`/lecture/${j.id}`);
  }

  if (phase === "idle")
    return (
      <section className="card new">
        <div className="grid2">
          <label>
            Judul
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pertemuan 5: Ethernet"
            />
          </label>
          <label>
            Mata kuliah
            <input
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="Jaringan Komputer"
            />
          </label>
        </div>
        <div className="seg" role="radiogroup" aria-label="Sumber audio">
          <button
            className={source === "mic" ? "on" : ""}
            onClick={() => setSource("mic")}
          >
            Mikrofon (kelas offline)
          </button>
          <button
            className={source === "tab" ? "on" : ""}
            onClick={() => setSource("tab")}
          >
            Meeting online (video + audio tab)
          </button>
        </div>
        {source === "tab" && (
          <p className="muted small">
            Khusus Chrome/Edge di komputer. Pilih tab Zoom/Meet, lalu centang
            “Bagikan tab dan audio”. App akan merekam video+audio dari tab untuk
            arsip lokal sambil tetap memproses transkrip dari audio.
          </p>
        )}
        {error && <p className="err">{error}</p>}
        {videoUrl && (
          <a
            className="btn ghost"
            href={videoUrl}
            download="meeting-recording.webm"
            target="_blank"
            rel="noreferrer"
          >
            Unduh rekaman meeting
          </a>
        )}
        <button className="btn" onClick={start}>
          Mulai merekam
        </button>
      </section>
    );

  return (
    <>
      <section className="card recbar">
        <div className="between">
          <span className="rec">
            <i />
            {phase === "saving" ? "Merangkum…" : "Merekam"} {mmss(sec)}
          </span>
          <div className="actions">
            <button
              className="btn ghost"
              onClick={mark}
              disabled={phase !== "recording"}
            >
              Bingung
            </button>
            <button
              className="btn stop"
              onClick={stop}
              disabled={phase !== "recording"}
            >
              Selesai
            </button>
          </div>
        </div>
        {error && <p className="err">{error}</p>}
      </section>
      {msg && (
        <div className="toast" role="status">
          {msg}
        </div>
      )}
      <section className="card">
        <h2>Perlu ditanyakan ({flags.length + marks.length})</h2>
        {flags.length + marks.length === 0 && (
          <p className="muted">
            Belum ada. Bagian yang ambigu akan muncul di sini.
          </p>
        )}
        {marks.map((m, i) => (
          <p key={"m" + i} className="q">
            <span className="chip">{m.time}</span>Kamu menandai bingung di sini
          </p>
        ))}
        {flags.map((f, i) => (
          <p key={"f" + i} className="q">
            <span className="chip">{f.time}</span>
            {f.note}
          </p>
        ))}
      </section>
      <section className="card transcript">
        <h2>Transkrip langsung</h2>
        {lines.length === 0 && (
          <p className="muted">
            Potongan pertama muncul sekitar 30 detik setelah mulai.
          </p>
        )}
        {lines.slice(-12).map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </section>
    </>
  );
}
