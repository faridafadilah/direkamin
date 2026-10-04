"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewLecture() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [engine, setEngine] = useState("whisper");
  const [progress, setProgress] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setProgress("");
    try {
      const form = new FormData(e.currentTarget);
      const audio = form.get("audio");
      if (
        audio instanceof File &&
        audio.size > 25 * 1024 * 1024 &&
        !form.get("transcript")?.toString().trim()
      ) {
        setProgress("Membagi audio di perangkat ini…");
        const { splitAudio } = await import("@/lib/split-audio");
        const parts = await splitAudio(audio, (ratio) => {
          setProgress(
            `Membagi audio di perangkat ini… ${Math.round(ratio * 100)}%`,
          );
        });
        let transcript = "";
        for (const [index, part] of parts.entries()) {
          setProgress(`Mentranskrip bagian ${index + 1} dari ${parts.length}…`);
          const chunk = new FormData();
          chunk.append("audio", part.file);
          chunk.append("offset", String(part.offset));
          chunk.append("engine", engine);
          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: chunk,
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(
              result.error || `Bagian ${index + 1} gagal ditranskrip.`,
            );
          transcript += `${transcript ? "\n" : ""}${result.transcript || ""}`;
        }
        form.delete("audio");
        form.set("transcript", transcript.trim());
      }
      setProgress("Menyusun catatan kuliah…");
      const res = await fetch("/api/process", { method: "POST", body: form });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      router.push(`/lecture/${j.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <form className="card new" onSubmit={submit}>
      <h2>Kuliah baru</h2>
      <div className="grid2">
        <label>
          Judul
          <input name="title" placeholder="Pertemuan 5: Ethernet" required />
        </label>
        <label>
          Mata kuliah
          <input name="course" placeholder="Jaringan Komputer" />
        </label>
      </div>
      <div className="seg" role="radiogroup" aria-label="Mesin transkripsi">
        {[
          ["whisper", "Whisper"],
          ["gemini", "Gemini"],
        ].map(([k, n]) => (
          <button
            type="button"
            key={k}
            role="radio"
            aria-checked={engine === k}
            className={engine === k ? "on" : ""}
            onClick={() => setEngine(k)}
          >
            {n}
          </button>
        ))}
      </div>
      <input type="hidden" name="engine" value={engine} />
      <label className="drop">
        <input
          type="file"
          name="audio"
          accept="audio/*"
          onChange={(e) => setFileName(e.target.files[0]?.name || "")}
        />
        <span>{fileName || "Pilih rekaman audio (mp3, m4a, wav)"}</span>
      </label>
      <label>
        Atau tempel transkrip
        <textarea
          name="transcript"
          rows={4}
          placeholder="[00:12] Hari ini kita bahas Ethernet..."
        />
      </label>
      {progress && (
        <p className="muted small" role="status">
          {progress}
        </p>
      )}
      {error && <p className="err">{error}</p>}
      <button className="btn" disabled={busy}>
        {busy
          ? "Direkamin sedang menyimak… (bisa 1 menit)"
          : "Rangkum kuliah ini"}
      </button>
    </form>
  );
}
