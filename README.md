# Direkamin

Rekam atau unggah kuliah, dapatkan ringkasan 1/5 menit dan lengkap, kartu tugas, daftar pertanyaan untuk dosen, dan tanya jawab dengan menit rujukan.
Stack: Next.js 14, Supabase (database + login Google), Whisper via Groq (gratis), Gemini.

## Menjalankan

1. `npm install`
2. Salin `.env.example` ke `.env.local` dan isi kuncinya.
3. Supabase SQL Editor: jalankan `supabase/schema.sql`, lalu `supabase/sharing.sql` untuk link berbagi catatan.
4. Login Google:
   - Google Cloud Console, APIs & Services, Credentials: buat OAuth client ID (Web application).
     Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Supabase, Authentication, Providers, Google: aktifkan, isi Client ID dan Secret.
   - Supabase, Authentication, URL Configuration: tambahkan `http://localhost:3000/auth/callback` (dan URL deploy kamu) ke Redirect URLs.
5. `npm run dev`, buka http://localhost:3000

## Catatan

- Rekaman langsung mengirim potongan 30 detik. Unggahan lebih dari 25 MB otomatis dipotong di browser sebelum dikirim satu per satu untuk transkripsi; proses ini perlu memori perangkat dan koneksi internet untuk memuat FFmpeg WebAssembly.
- Link berbagi bersifat publik bagi siapa pun yang memilikinya, hanya mencakup satu kuliah, dan dapat dicabut pemiliknya dari tab **Bagikan**.
- Mikrofon hanya jalan di HTTPS atau localhost.
- Tanya jawab memasukkan seluruh transkrip ke Gemini; RAG (embedding + pgvector) belum dibuat.

## RAG (tanya jawab)

- Jalankan `supabase/rag.sql` di Supabase SQL Editor (setelah `schema.sql`) untuk mengaktifkan pgvector.
- Transkrip dipotong (`RAG_CHUNK_SECONDS`, default 45), diberi embedding Gemini (`EMBEDDING_MODEL`, default `gemini-embedding-001`), dicari lewat pgvector (`RAG_TOP_K`, default 5). Hasil dengan kemiripan di bawah `RAG_MIN_SIMILARITY` (default `0.4`) diabaikan.
- Dua mode: tab **Tanya AI** (satu kuliah) dan halaman `/tanya` (semua kuliah).
- Kuliah lama perlu tombol **Indeks ulang** di tab Tanya AI.
- Variabel `.env` opsional: `RAG_CHUNK_SECONDS`, `RAG_TOP_K`, `RAG_MIN_SIMILARITY`, `EMBEDDING_MODEL`.
