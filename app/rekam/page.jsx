import Link from 'next/link';
import LiveRecorder from '@/components/LiveRecorder';

export default function Rekam() {
  return (
    <>
      <Link href="/" className="back">Semua kuliah</Link>
      <h1 className="title">Rekam langsung</h1>
      <p className="muted">Transkrip muncul tiap 30 detik. Tekan “Bingung” kapan saja, dan Direkamin mencatat hal yang perlu kamu tanyakan.</p>
      <LiveRecorder />
    </>
  );
}
