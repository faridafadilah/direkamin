import Link from 'next/link';
import AskPanel from '@/components/AskPanel';

export default function Tanya() {
  return (
    <>
      <Link href="/" className="back">Semua kuliah</Link>
      <h1 className="title">Tanya semua kuliah</h1>
      <p className="muted">Pencarian lintas pertemuan dan mata kuliah. Jawaban menyebut kuliah dan menit sumbernya.</p>
      <div style={{ marginTop: 22 }}><AskPanel /></div>
    </>
  );
}
