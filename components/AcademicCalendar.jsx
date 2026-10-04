"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const WEEK_HEADERS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function timeLabel(time) {
  return time?.slice(0, 5) || "";
}

function dateLabel(date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function keyDate(key) {
  return new Date(`${key}T12:00:00`);
}

function sixMonthDate(key) {
  if (!key) return "";
  const date = keyDate(key);
  const month = date.getMonth() + 6;
  const lastDay = new Date(date.getFullYear(), month + 1, 0).getDate();
  return dateKey(
    new Date(date.getFullYear(), month, Math.min(date.getDate(), lastDay)),
  );
}

function periodLabel(schedule) {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${formatter.format(keyDate(schedule.start_date))}–${formatter.format(keyDate(schedule.end_date))}`;
}

export default function AcademicCalendar({
  initialSchedules,
  initialDate,
  loadError,
}) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [semesterFilter, setSemesterFilter] = useState("1");
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(sixMonthDate(initialDate));
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [view, setView] = useState("month");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = keyDate(selectedDate);
  const visibleSchedules = schedules.filter(
    (schedule) =>
      semesterFilter === "all" || schedule.semester === Number(semesterFilter),
  );
  const selectedDaySchedules = visibleSchedules
    .filter(
      (schedule) =>
        schedule.day_of_week === selected.getDay() &&
        schedule.start_date <= selectedDate &&
        schedule.end_date >= selectedDate,
    )
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const monthDays = useMemo(() => {
    const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(
      selected.getFullYear(),
      selected.getMonth() + 1,
      0,
    ).getDate();
    return [
      ...Array(offset).fill(null),
      ...Array.from({ length: count }, (_, index) => index + 1),
    ];
  }, [selectedDate]);

  function moveMonth(amount) {
    const next = new Date(
      selected.getFullYear(),
      selected.getMonth() + amount,
      1,
    );
    setSelectedDate(dateKey(next));
  }

  function selectCalendarDay(day) {
    if (!day) return;
    setSelectedDate(
      dateKey(new Date(selected.getFullYear(), selected.getMonth(), day)),
    );
    setView("day");
  }

  function editSchedule(schedule) {
    setEditingScheduleId(schedule.id);
    setStartDate(schedule.start_date);
    setEndDate(schedule.end_date);
    setError("");
    setNotice(`Mengedit ${schedule.course}.`);
  }

  function cancelEdit() {
    setEditingScheduleId(null);
    setStartDate(initialDate);
    setEndDate(sixMonthDate(initialDate));
    setError("");
    setNotice("");
  }

  async function addSchedule(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    setNotice("");
    const form = new FormData(formElement);
    const schedule = {
      course: form.get("course").toString().trim(),
      lecturer: form.get("lecturer").toString().trim(),
      room: form.get("room").toString().trim() || null,
      day_of_week: Number(form.get("day_of_week")),
      semester: Number(form.get("semester")),
      start_time: form.get("start_time"),
      end_time: form.get("end_time"),
      start_date: form.get("start_date"),
      end_date: form.get("end_date"),
    };

    if (
      schedule.end_date < schedule.start_date ||
      schedule.end_date > sixMonthDate(schedule.start_date)
    ) {
      setError(
        "Tanggal selesai harus setelah tanggal mulai dan maksimal 6 bulan.",
      );
      return;
    }

    if (schedule.start_time >= schedule.end_time) {
      setError("Jam selesai harus setelah jam mulai.");
      return;
    }

    const conflict = schedules.find(
      (existing) =>
        existing.id !== editingScheduleId &&
        existing.day_of_week === schedule.day_of_week &&
        existing.start_date <= schedule.end_date &&
        existing.end_date >= schedule.start_date &&
        schedule.start_time < timeLabel(existing.end_time) &&
        schedule.end_time > timeLabel(existing.start_time),
    );
    if (conflict) {
      setError(
        `Bentrok dengan ${conflict.course} (${timeLabel(conflict.start_time)}–${timeLabel(conflict.end_time)}).`,
      );
      return;
    }

    setBusy(true);
    const client = supabaseBrowser();
    const query = editingScheduleId
      ? client
          .from("class_schedules")
          .update(schedule)
          .eq("id", editingScheduleId)
      : client.from("class_schedules").insert(schedule);
    const { data, error: saveError } = await query
      .select(
        "id,course,lecturer,room,day_of_week,semester,start_time,end_time,start_date,end_date",
      )
      .single();
    setBusy(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }

    setSchedules((current) =>
      editingScheduleId
        ? current.map((item) => (item.id === editingScheduleId ? data : item))
        : [...current, data],
    );
    const wasEditing = Boolean(editingScheduleId);
    setEditingScheduleId(null);
    formElement.reset();
    setStartDate(initialDate);
    setEndDate(sixMonthDate(initialDate));
    setNotice(
      wasEditing
        ? "Perubahan jadwal disimpan."
        : "Jadwal berhasil ditambahkan.",
    );
  }

  async function removeSchedule(id) {
    setError("");
    setNotice("");
    const { error: deleteError } = await supabaseBrowser()
      .from("class_schedules")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setSchedules((current) => current.filter((schedule) => schedule.id !== id));
    setNotice("Jadwal dihapus.");
  }

  return (
    <div className="calendar-page">
      <section className="calendar-schedule">
        <h2>
          {editingScheduleId ? "Edit jadwal kuliah" : "Tambah jadwal mingguan"}
        </h2>
        <form
          key={editingScheduleId || "new-schedule"}
          className="schedule-form"
          onSubmit={addSchedule}
        >
          <div className="grid2">
            <label>
              Mata kuliah
              <input
                name="course"
                placeholder="Contoh: Jaringan Komputer"
                defaultValue={
                  schedules.find(
                    (schedule) => schedule.id === editingScheduleId,
                  )?.course || ""
                }
                required
              />
            </label>
            <label>
              Dosen
              <input
                name="lecturer"
                placeholder="Nama dosen"
                defaultValue={
                  schedules.find(
                    (schedule) => schedule.id === editingScheduleId,
                  )?.lecturer || ""
                }
                required
              />
            </label>
          </div>
          <div className="grid2">
            <label>
              Hari
              <select
                name="day_of_week"
                defaultValue={
                  schedules.find(
                    (schedule) => schedule.id === editingScheduleId,
                  )?.day_of_week ?? 1
                }
              >
                {DAY_ORDER.map((day) => (
                  <option key={day} value={day}>
                    {DAY_NAMES[day]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Semester
              <select
                name="semester"
                defaultValue={
                  schedules.find(
                    (schedule) => schedule.id === editingScheduleId,
                  )?.semester ?? 1
                }
              >
                {Array.from({ length: 14 }, (_, index) => index + 1).map(
                  (semester) => (
                    <option key={semester} value={semester}>
                      Semester {semester}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
          <div className="grid2">
            <label>
              Jam mulai
              <input
                name="start_time"
                type="time"
                defaultValue={timeLabel(
                  schedules.find(
                    (schedule) => schedule.id === editingScheduleId,
                  )?.start_time,
                )}
                required
              />
            </label>
            <label>
              Jam selesai
              <input
                name="end_time"
                type="time"
                defaultValue={timeLabel(
                  schedules.find(
                    (schedule) => schedule.id === editingScheduleId,
                  )?.end_time,
                )}
                required
              />
            </label>
          </div>
          <label>
            Ruang <span className="muted">(opsional)</span>
            <input
              name="room"
              placeholder="Contoh: Lab 2"
              defaultValue={
                schedules.find((schedule) => schedule.id === editingScheduleId)
                  ?.room || ""
              }
            />
          </label>
          <div className="grid2">
            <label>
              Tanggal mulai
              <input
                name="start_date"
                type="date"
                value={startDate}
                required
                onChange={(event) => {
                  const value = event.target.value;
                  setStartDate(value);
                  setEndDate(sixMonthDate(value));
                }}
              />
            </label>
            <label>
              Tanggal selesai <span className="muted">(maksimal 6 bulan)</span>
              <input
                name="end_date"
                type="date"
                value={endDate}
                min={startDate}
                max={sixMonthDate(startDate)}
                required
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
          </div>
          {loadError && (
            <p className="err" role="alert">
              Tabel jadwal belum tersedia. Jalankan supabase/calendar.sql di
              Supabase, lalu muat ulang halaman. ({loadError})
            </p>
          )}
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="calendar-notice" role="status">
              {notice}
            </p>
          )}
          <div className="schedule-form-actions">
            <button className="btn" disabled={busy || Boolean(loadError)}>
              {busy
                ? "Menyimpan..."
                : editingScheduleId
                  ? "Simpan perubahan"
                  : "Tambah ke kalender"}
            </button>
            {editingScheduleId && (
              <button
                type="button"
                className="schedule-delete"
                onClick={cancelEdit}
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="calendar-section" aria-label="Jadwal kuliah">
        <div className="calendar-toolbar">
          <div className="seg" role="group" aria-label="Tampilan kalender">
            <button
              type="button"
              className={view === "day" ? "on" : ""}
              aria-pressed={view === "day"}
              onClick={() => setView("day")}
            >
              Agenda
            </button>
            <button
              type="button"
              className={view === "month" ? "on" : ""}
              aria-pressed={view === "month"}
              onClick={() => setView("month")}
            >
              Bulan
            </button>
            <button
              type="button"
              className={view === "week" ? "on" : ""}
              aria-pressed={view === "week"}
              onClick={() => setView("week")}
            >
              Mingguan
            </button>
          </div>
          <label className="semester-filter">
            Semester
            <select
              value={semesterFilter}
              onChange={(event) => setSemesterFilter(event.target.value)}
            >
              <option value="all">Semua</option>
              {Array.from({ length: 14 }, (_, index) => index + 1).map(
                (semester) => (
                  <option key={semester} value={semester}>
                    {semester}
                  </option>
                ),
              )}
            </select>
          </label>
          {view === "month" && (
            <div className="month-nav">
              <button
                type="button"
                aria-label="Bulan sebelumnya"
                onClick={() => moveMonth(-1)}
              >
                ‹
              </button>
              <strong>
                {new Intl.DateTimeFormat("id-ID", {
                  month: "long",
                  year: "numeric",
                }).format(selected)}
              </strong>
              <button
                type="button"
                aria-label="Bulan berikutnya"
                onClick={() => moveMonth(1)}
              >
                ›
              </button>
            </div>
          )}
        </div>

        {view === "month" ? (
          <div className="month-grid">
            {WEEK_HEADERS.map((day) => (
              <div className="month-weekday" key={day}>
                {day}
              </div>
            ))}
            {monthDays.map((day, index) => {
              const date = day
                ? new Date(selected.getFullYear(), selected.getMonth(), day)
                : null;
              const dayKey = date ? dateKey(date) : "";
              const daySchedules = date
                ? visibleSchedules.filter(
                    (schedule) =>
                      schedule.day_of_week === date.getDay() &&
                      schedule.start_date <= dayKey &&
                      schedule.end_date >= dayKey,
                  )
                : [];
              const isSelected = day === Number(selectedDate.slice(8, 10));
              return day ? (
                <button
                  type="button"
                  key={`${day}-${index}`}
                  className={`month-day${isSelected ? " selected" : ""}${daySchedules.length ? " has-classes" : ""}`}
                  aria-label={`${day} ${new Intl.DateTimeFormat("id-ID", { month: "long" }).format(selected)}${daySchedules.length ? `, ${daySchedules.length} kelas` : ""}`}
                  aria-pressed={isSelected}
                  onClick={() => selectCalendarDay(day)}
                >
                  <span className="month-day-number">{day}</span>
                  {daySchedules.length > 0 && (
                    <span className="month-day-classes">
                      {daySchedules.slice(0, 2).map((schedule) => (
                        <span key={schedule.id}>{schedule.course}</span>
                      ))}
                      {daySchedules.length > 2 && (
                        <small>+{daySchedules.length - 2}</small>
                      )}
                    </span>
                  )}
                  {daySchedules.length > 0 && (
                    <span className="month-day-dots" aria-hidden="true">
                      {daySchedules.slice(0, 3).map((schedule) => (
                        <i key={schedule.id} />
                      ))}
                    </span>
                  )}
                </button>
              ) : (
                <span className="month-empty" key={`empty-${index}`} />
              );
            })}
          </div>
        ) : view === "day" ? (
          <div className="day-agenda">
            <label className="agenda-date">
              Tanggal
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </label>
            <h2>{dateLabel(selected)}</h2>
            {selectedDaySchedules.length === 0 ? (
              <p className="muted">Tidak ada jadwal kuliah pada hari ini.</p>
            ) : (
              <div className="agenda-list">
                {selectedDaySchedules.map((schedule) => (
                  <article className="agenda-item" key={schedule.id}>
                    <time>
                      {timeLabel(schedule.start_time)}–
                      {timeLabel(schedule.end_time)}
                    </time>
                    <div>
                      <strong>{schedule.course}</strong>
                      <span>{schedule.lecturer}</span>
                      {schedule.room && <span>{schedule.room}</span>}
                      <span>Periode {periodLabel(schedule)}</span>
                    </div>
                    <div className="schedule-actions">
                      <button
                        type="button"
                        className="schedule-edit"
                        aria-label={`Edit jadwal ${schedule.course}`}
                        title="Edit jadwal"
                        onClick={() => editSchedule(schedule)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="schedule-delete"
                        aria-label={`Hapus jadwal ${schedule.course}`}
                        title="Hapus jadwal"
                        onClick={() => removeSchedule(schedule.id)}
                      >
                        Hapus
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className="week-agenda"
            aria-label="Jadwal mingguan Senin sampai Minggu"
          >
            {DAY_ORDER.map((day) => {
              const daySchedules = visibleSchedules
                .filter((schedule) => schedule.day_of_week === day)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));

              return (
                <section className="week-day" key={day}>
                  <h2>
                    {DAY_NAMES[day]}
                    <span className="muted">
                      {daySchedules.length} mata kuliah
                    </span>
                  </h2>
                  {daySchedules.length === 0 ? (
                    <p className="muted week-empty">Tidak ada jadwal.</p>
                  ) : (
                    <div className="agenda-list">
                      {daySchedules.map((schedule) => (
                        <article className="agenda-item" key={schedule.id}>
                          <time>
                            {timeLabel(schedule.start_time)}–
                            {timeLabel(schedule.end_time)}
                          </time>
                          <div>
                            <strong>{schedule.course}</strong>
                            <span>{schedule.lecturer}</span>
                            {schedule.room && <span>{schedule.room}</span>}
                            <span>Periode {periodLabel(schedule)}</span>
                          </div>
                          <div className="schedule-actions">
                            <button
                              type="button"
                              className="schedule-edit"
                              aria-label={`Edit jadwal ${schedule.course}`}
                              title="Edit jadwal"
                              onClick={() => editSchedule(schedule)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="schedule-delete"
                              aria-label={`Hapus jadwal ${schedule.course}`}
                              title="Hapus jadwal"
                              onClick={() => removeSchedule(schedule.id)}
                            >
                              Hapus
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
