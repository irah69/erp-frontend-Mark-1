"use client";

import { useEffect, useState } from "react";
import type { CurrentUser } from "../../lib/auth";
import {
  getAttendanceRecords,
  getClassSessions,
  type AttendanceRecord,
  type ClassSessionRecord,
  type AttendanceStatus,
} from "../../lib/api";

const statusClasses: Record<AttendanceStatus, string> = {
  PRESENT: "border-green-200 bg-green-50 text-green-700",
  ABSENT: "border-red-200 bg-red-50 text-red-700",
  LATE: "border-amber-200 bg-amber-50 text-amber-700",
  EXCUSED: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function StudentAttendance({ user }: { user: CurrentUser }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sessions, setSessions] = useState<ClassSessionRecord[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadAttendance() {
      try {
        if (user.person_id === null) {
          throw new Error("Student account is not linked to a student record.");
        }
        const [attendanceRows, classSessions] = await Promise.all([
          getAttendanceRecords(selectedYear || undefined),
          getClassSessions(),
        ]);
        if (!cancelled) {
          const ownRecords = attendanceRows.filter(
            (record) => Number(record.student_id) === Number(user.person_id)
          );
          if (!selectedYear) {
            const years = [...new Set(
              ownRecords.map((record) => record.academic_year).filter((year): year is string => Boolean(year))
            )].sort((a, b) => b.localeCompare(a));
            setAcademicYears(years);
            if (years.length > 0) {
              setLoading(true);
              setSelectedYear(years[0]);
            } else {
              setRecords(ownRecords);
              setSessions(classSessions);
            }
          } else {
            setRecords(ownRecords);
            setSessions(classSessions);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your attendance."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAttendance();
    return () => {
      cancelled = true;
    };
  }, [user.person_id, selectedYear]);

  if (loading) {
    return (
      <section className="min-h-dvh bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        Loading your attendance...
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-dvh bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold text-slate-900">My attendance</h1>
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        </div>
      </section>
    );
  }

  const sessionsById = new Map<number, ClassSessionRecord>(
    sessions.map((session) => [session.id, session])
  );
  const orderedRecords = [...records].sort((a, b) => {
    const dateA = sessionsById.get(a.session_id)?.session_date ?? "";
    const dateB = sessionsById.get(b.session_id)?.session_date ?? "";
    return dateB.localeCompare(dateA) || b.id - a.id;
  });
  const present = records.filter((record) => record.status === "PRESENT").length;
  const absent = records.filter((record) => record.status === "ABSENT").length;
  const late = records.filter((record) => record.status === "LATE").length;
  const excused = records.filter((record) => record.status === "EXCUSED").length;
  const stats = [
    ["Total classes", records.length],
    ["Attended", present + late],
    ["Present", present],
    ["Absent", absent],
    ["Late", late],
    ["Excused", excused],
  ] as const;

  return (
    <section className="min-h-dvh bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header>
          <h1 className="text-2xl font-semibold">My attendance</h1>
          <p className="mt-1 text-sm text-slate-600">
            {user.username} · Student ID: {user.person_id}
          </p>
        </header>

        <label className="mt-4 flex max-w-xs flex-col gap-1.5 text-sm font-medium text-slate-700">
          Academic year
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
            value={selectedYear}
            onChange={(event) => {
              setLoading(true);
              setSelectedYear(event.target.value);
            }}
          >
            {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>

        <section
          aria-label="Attendance summary"
          className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7"
        >
          {stats.map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-slate-200 border-l-4 border-l-indigo-600 bg-white p-4"
            >
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
          <div className="rounded-lg border border-slate-200 border-l-4 border-l-indigo-600 bg-white p-4">
            <p className="text-xs text-slate-500">Attendance</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {records.length ? `${Math.round(((present + late) / records.length) * 1000) / 10}%` : "0%"}
            </p>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-base font-semibold">Attendance history</h2>
          </div>
          {orderedRecords.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              No attendance records are available yet.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-slate-200 md:hidden">
                {orderedRecords.map((record) => {
                  const session = sessionsById.get(record.session_id);
                  return <li key={record.id} className="space-y-1 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">
                        {session ? formatDate(session.session_date) : `Session ${record.session_id}`}
                      </p>
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium ${statusClasses[record.status]}`}>
                        {record.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Academic year {record.academic_year || "—"}
                    </p>
                  </li>;
                })}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-3 py-3">Academic year</th>
                      <th className="px-3 py-3">Session</th>
                      <th className="px-3 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {orderedRecords.map((record) => {
                      const session = sessionsById.get(record.session_id);
                      return <tr key={record.id}>
                        <td className="px-4 py-3 font-medium">
                          {session ? formatDate(session.session_date) : `Session ${record.session_id}`}
                        </td>
                        <td className="px-3 py-3 text-slate-600">{record.academic_year || "—"}</td>
                        <td className="px-3 py-3 text-slate-600">{record.session_id}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded border px-2 py-0.5 text-xs font-medium ${statusClasses[record.status]}`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
