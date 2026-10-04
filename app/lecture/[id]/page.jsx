import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase';
import LectureView from '@/components/LectureView';
export const dynamic = 'force-dynamic';

export default async function Lecture({ params }) {
  const { data } = await db().from('lectures').select('*').eq('id', params.id).single();
  if (!data) notFound();
  return (
    <>
      <Link href="/" className="back">Semua kuliah</Link>
      <h1 className="title">{data.title}</h1>
      <p className="muted">{data.course || 'Tanpa mata kuliah'} · transkrip: {data.engine || 'manual'}</p>
      <LectureView l={data} />
    </>
  );
}
