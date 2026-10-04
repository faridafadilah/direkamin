import Link from "next/link";
import { db } from "@/lib/supabase";
import AcademicCalendar from "@/components/AcademicCalendar";

export const dynamic = "force-dynamic";

export default async function Kalender() {
  const { data, error } = await db()
    .from("class_schedules")
    .select(
      "id,course,lecturer,room,day_of_week,semester,start_time,end_time,start_date,end_date",
    )
    .order("day_of_week")
    .order("start_time");
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <>
      <Link href="/" className="back">
        Semua kuliah
      </Link>
      <h1 className="title">Kalender akademik</h1>
      <p className="muted">
        Jadwal berulang setiap minggu. Pilih tanggal untuk melihat kelas hari
        itu.
      </p>
      <AcademicCalendar
        initialSchedules={data || []}
        initialDate={dateParts}
        loadError={error?.message || ""}
      />
    </>
  );
}
