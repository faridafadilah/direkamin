"use client";
import { useEffect, useState } from "react";

export default function ShareLecture({ id, initialToken }) {
  const [token, setToken] = useState(initialToken || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [origin, setOrigin] = useState("");
  const url = token && origin ? `${origin}/share/${token}` : "";

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => setToken(initialToken || ""), [id, initialToken]);

  async function updateShare(method) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/share", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || "Tautan tidak dapat diperbarui.");
      setToken(result.token || "");
      if (result.token) {
        const shareUrl = `${window.location.origin}/share/${result.token}`;
        await navigator.clipboard.writeText(shareUrl);
        setMessage(
          "Link baca disalin. Siapa pun yang punya link dapat melihat catatan ini.",
        );
      } else {
        setMessage("Link berbagi sudah dicabut.");
      }
    } catch (error) {
      setMessage(error.message || "Link diperbarui, tetapi gagal disalin.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage(
        "Link disalin. Siapa pun yang punya link dapat melihat catatan ini.",
      );
    } catch {
      setMessage(
        "Tidak dapat menyalin otomatis. Pilih dan salin link di atas.",
      );
    }
  }

  return (
    <section className="share-panel" aria-label="Bagikan catatan kuliah">
      <div>
        <strong>Bagikan catatan</strong>
        <p className="muted small">
          Link memberi akses baca ke ringkasan dan transkrip kuliah ini.
        </p>
      </div>
      {token ? (
        <>
          <div className="share-link">
            <input
              aria-label="Link berbagi"
              readOnly
              value={url}
              onFocus={(event) => event.target.select()}
            />
            <button
              type="button"
              className="btn ghost"
              disabled={!url || busy}
              onClick={copyLink}
            >
              Salin link
            </button>
          </div>
          <button
            type="button"
            className="linkbtn"
            disabled={busy}
            onClick={() => updateShare("DELETE")}
          >
            Cabut link
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn ghost"
          disabled={busy}
          onClick={() => updateShare("POST")}
        >
          {busy ? "Membuat link…" : "Buat link baca"}
        </button>
      )}
      {message && (
        <p className="muted small" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
