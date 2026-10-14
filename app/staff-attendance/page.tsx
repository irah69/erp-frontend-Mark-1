"use client";

import Link from "next/link";
import { Charis_SIL } from "next/font/google";
import { useEffect, useMemo, useState } from "react";
import type { AttendanceStatus } from "../../lib/api";
import {
  getStaffClassSessions,
  getTeacherAttendanceRoster,
  saveTeacherAttendance,
  type StaffClassSession,
  type TeacherAttendanceRoster,
} from "../../lib/attendanceApi";

const charisSil = Charis_SIL({
  variable: "--font-charis-sil",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const attendanceStatuses: AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
];

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

function formatClassName(session: StaffClassSession) {
  return [
    session.grade ? `Class ${session.grade}` : `Class ${session.grade_id}`,
    session.section ? `Section ${session.section}` : null,
    session.subject_name ?? (session.subject_id ? `Subject ${session.subject_id}` : null),
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function StaffAttendancePage() {
  const [sessionDate, setSessionDate] = useState(() =>
    getLocalDateString(new Date())
  );
  const [classes, setClasses] = useState<StaffClassSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [roster, setRoster] = useState<TeacherAttendanceRoster | null>(null);
  const [statusChanges, setStatusChanges] = useState<
    Record<number, AttendanceStatus>
  >({});
  const [classesLoading, setClassesLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedClass = useMemo(
    () =>
      classes.find(
        (item) => String(item.session_id) === selectedSessionId
      ) ?? null,
    [classes, selectedSessionId]
  );

  const counts = useMemo(() => {
    const result: Record<AttendanceStatus, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
    };

    for (const student of roster?.students ?? []) {
      const status =
        statusChanges[student.id] ?? student.status ?? "ABSENT";
      result[status] += 1;
    }

    return result;
  }, [roster, statusChanges]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setClassesLoading(true);
      setClasses([]);
      setRoster(null);
      setError("");
      setSuccess("");

      try {
        const response = await getStaffClassSessions(sessionDate);
        if (cancelled) return;

        setClasses(response.classes);
        setSelectedSessionId((current) =>
          response.classes.some(
            (item) => String(item.session_id) === current
          )
            ? current
            : response.classes[0]
              ? String(response.classes[0].session_id)
              : ""
        );
      } catch (loadError) {
        if (!cancelled) {
          setClasses([]);
          setSelectedSessionId("");
          setError(
            getErrorMessage(loadError, "Unable to load your class sessions.")
          );
        }
      } finally {
        if (!cancelled) setClassesLoading(false);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sessionDate]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (!selectedSessionId) {
        setRoster(null);
        setStatusChanges({});
        setRosterLoading(false);
        return;
      }

      setRosterLoading(true);
      setRoster(null);
      setStatusChanges({});
      setError("");
      setSuccess("");

      try {
        const data = await getTeacherAttendanceRoster(
          Number(selectedSessionId)
        );
        if (!cancelled) setRoster(data);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            getErrorMessage(loadError, "Unable to load the class roster.")
          );
        }
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [selectedSessionId]);

  function updateStudentStatus(studentId: number, status: AttendanceStatus) {
    setStatusChanges((current) => ({ ...current, [studentId]: status }));
    setError("");
    setSuccess("");
  }

  function markAllPresent() {
    if (!roster) return;
    setStatusChanges(
      Object.fromEntries(
        roster.students.map((student) => [student.id, "PRESENT"])
      )
    );
    setError("");
    setSuccess("");
  }

  async function submitAttendance() {
    if (!roster || !selectedClass) {
      setError("Select one of your class sessions before saving attendance.");
      return;
    }
    if (roster.students.length === 0) {
      setError("There are no students in this class to mark.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const result = await saveTeacherAttendance(
        roster.session_id,
        roster.students.map((student) => ({
          student_id: student.id,
          status: statusChanges[student.id] ?? student.status ?? "ABSENT",
          remarks: student.remarks,
        }))
      );

      setStatusChanges({});
      setSuccess(result.message || "Attendance saved successfully.");

      try {
        setRoster(await getTeacherAttendanceRoster(roster.session_id));
      } catch (refreshError) {
        setError(
          `Attendance was saved, but the roster could not be refreshed: ${getErrorMessage(
            refreshError,
            "Please reload the session."
          )}`
        );
      }
    } catch (saveError) {
      setError(
        getErrorMessage(saveError, "Unable to save attendance for this session.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={`${charisSil.className} attendance`}>
      <div className="container">


        <header className="page-heading">
          <div>
            <h1>Class attendance</h1>
            <p>
              Choose one of your assigned sessions, mark each student, and save
              attendance for that class.
            </p>
          </div>
          <label className="field">
            Session date
            <input
              type="date"
              value={sessionDate}
              onChange={(event) => {
                setSessionDate(event.target.value);
                setSelectedSessionId("");
              }}
            />
          </label>
        </header>

        {error && (
          <p className="notice error-notice" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="notice success-notice" role="status">
            {success}
          </p>
        )}

        <section className="card accent" aria-labelledby="sessions-heading">
          <div className="card-heading">
            <h2 id="sessions-heading">Assigned sessions</h2>
            {!classesLoading && (
              <p className="muted">
                {classes.length} {classes.length === 1 ? "session" : "sessions"}
              </p>
            )}
          </div>

          {classesLoading ? (
            <p className="muted">Loading your sessions…</p>
          ) : classes.length === 0 ? (
            <p className="muted">
              No sessions are assigned to you for this date.
            </p>
          ) : (
            <ul className="session-list">
              {classes.map((item) => {
                const active = String(item.session_id) === selectedSessionId;
                return (
                  <li key={item.session_id}>
                    <button
                      className={`session-option${active ? " selected" : ""}`}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setSelectedSessionId(String(item.session_id))
                      }
                    >
                      <small>
                        {item.period_number
                          ? `Period ${item.period_number}`
                          : "Class session"}
                      </small>
                      <strong>{formatClassName(item)}</strong>
                      <small>
                        {formatTime(item.start_time)}–{formatTime(item.end_time)}
                        {item.room ? ` · Room ${item.room}` : ""}
                      </small>
                      {item.is_conducted && (
                        <small className="saved-note">Attendance saved</small>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {selectedClass && (
          <section className="card" aria-labelledby="roster-heading">
            <div className="card-heading stacked">
              <div>
                <h2 id="roster-heading">
                  Students{roster ? ` (${roster.students.length})` : ""}
                </h2>
                <p className="muted">{formatClassName(selectedClass)}</p>
              </div>
              {roster && (
                <ul className="status-counts" aria-label="Attendance totals">
                  {attendanceStatuses.map((status) => (
                    <li key={status}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}:{" "}
                      <strong>{counts[status]}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {rosterLoading ? (
              <p className="muted pad">Loading students…</p>
            ) : !roster ? (
              <p className="muted pad">The roster could not be displayed.</p>
            ) : roster.students.length === 0 ? (
              <p className="muted pad">
                No students are assigned to this session.
              </p>
            ) : (
              <>
                <div className="roster-actions">
                  <p className="muted">
                    {roster.marked_students} of {roster.total_students} students
                    already marked
                  </p>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={markAllPresent}
                    disabled={saving}
                  >
                    Mark all present
                  </button>
                </div>

                <table className="roster-table">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Roll number</th>
                      <th scope="col">Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.students.map((student) => {
                      const status =
                        statusChanges[student.id] ?? student.status ?? "ABSENT";
                      return (
                        <tr key={student.id}>
                          <td data-label="Name">
                            {student.name ?? "Unnamed student"}
                          </td>
                          <td data-label="Roll number">
                            {student.roll_number ?? "—"}
                          </td>
                          <td data-label="Attendance">
                            <select
                              aria-label={`Attendance for ${student.name ?? "student"}`}
                              value={status}
                              disabled={saving}
                              onChange={(event) =>
                                updateStudentStatus(
                                  student.id,
                                  event.target.value as AttendanceStatus
                                )
                              }
                            >
                              {attendanceStatuses.map((option) => (
                                <option key={option} value={option}>
                                  {option.charAt(0) +
                                    option.slice(1).toLowerCase()}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="save-row">
                  <button
                    className="button primary"
                    type="button"
                    disabled={saving || rosterLoading}
                    onClick={() => void submitAttendance()}
                  >
                    {saving ? "Saving attendance…" : "Save attendance"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </div>

      <style jsx>{`
        /* Mobile first: base styles target the smallest screens. */
        .attendance {
          min-height: 100vh;
          padding: 16px 12px 40px;
          color: #111827;
          background: #f8fafc;
          line-height: 1.5;
        }
        .container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }
        .back-link {
          display: inline-block;
          margin-bottom: 16px;
          color: #4f46e5;
          font-size: 14px;
          text-decoration: none;
        }
        .back-link:hover {
          text-decoration: underline;
        }

        .page-heading {
          display: grid;
          gap: 14px;
          margin-bottom: 16px;
        }
        h1 {
          margin: 0 0 4px;
          font-size: 22px;
          line-height: 1.25;
        }
        h2 {
          margin: 0;
          font-size: 16px;
        }
        .page-heading p {
          margin: 0;
          color: #475569;
          font-size: 14px;
        }
        .field {
          display: grid;
          gap: 6px;
          color: #374151;
          font-size: 14px;
        }

        input,
        select {
          width: 100%;
          min-height: 42px;
          padding: 8px 12px;
          color: #111827;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font: inherit;
          font-size: 14px;
        }
        input:focus-visible,
        select:focus-visible,
        button:focus-visible,
        a:focus-visible {
          outline: 2px solid #4f46e5;
          outline-offset: 2px;
        }

        .notice {
          margin: 0 0 12px;
          padding: 10px 12px;
          border: 1px solid;
          border-radius: 6px;
          font-size: 14px;
        }
        .error-notice {
          color: #991b1b;
          background: #fef2f2;
          border-color: #fecaca;
        }
        .success-notice {
          color: #166534;
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .card {
          margin-bottom: 12px;
          padding: 16px 14px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }
        .card.accent {
          border-left: 3px solid #4f46e5;
        }
        .card-heading {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .card-heading.stacked {
          flex-direction: column;
          align-items: stretch;
        }
        .muted {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }
        .pad {
          padding: 8px 0;
        }

        .session-list {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .session-option {
          display: grid;
          gap: 2px;
          width: 100%;
          height: 100%;
          padding: 12px;
          color: #111827;
          text-align: left;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font: inherit;
          cursor: pointer;
        }
        .session-option:hover {
          background: #f9fafb;
        }
        .session-option.selected {
          border-color: #4f46e5;
          background: #eef2ff;
        }
        .session-option strong {
          font-size: 14px;
        }
        .session-option small {
          color: #64748b;
          font-size: 12px;
        }
        .session-option small.saved-note {
          color: #15803d;
        }

        .status-counts {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px 12px;
          margin: 0;
          padding: 0;
          list-style: none;
          color: #475569;
          font-size: 13px;
        }

        .roster-actions {
          display: grid;
          gap: 10px;
          margin: 4px 0 12px;
        }

        .button {
          min-height: 42px;
          padding: 8px 16px;
          border-radius: 6px;
          font: inherit;
          font-size: 14px;
          cursor: pointer;
        }
        .button.primary {
          color: #fff;
          background: #4f46e5;
          border: 1px solid #4f46e5;
        }
        .button.primary:hover:not(:disabled) {
          background: #4338ca;
        }
        .button.secondary {
          color: #111827;
          background: #fff;
          border: 1px solid #d1d5db;
        }
        .button.secondary:hover:not(:disabled) {
          background: #f9fafb;
        }
        .button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Stacked rows on mobile */
        .roster-table {
          width: 100%;
          border-collapse: collapse;
        }
        .roster-table thead {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
          white-space: nowrap;
        }
        .roster-table,
        .roster-table tbody,
        .roster-table tr,
        .roster-table td {
          display: block;
          width: 100%;
        }
        .roster-table tr {
          margin-bottom: 8px;
          padding: 6px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }
        .roster-table td {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 6px 0;
          font-size: 14px;
        }
        .roster-table td::before {
          content: attr(data-label);
          color: #64748b;
          font-size: 13px;
        }
        .roster-table select {
          width: auto;
          min-width: 130px;
        }

        .save-row {
          margin-top: 12px;
        }
        .save-row .button {
          width: 100%;
        }

        /* Small tablets and up */
        @media (min-width: 600px) {
          .attendance {
            padding: 24px 20px 56px;
          }
          h1 {
            font-size: 26px;
          }
          h2 {
            font-size: 17px;
          }
          .page-heading {
            grid-template-columns: 1fr minmax(180px, 220px);
            align-items: end;
          }
          .card {
            padding: 20px;
          }
          .session-list {
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 10px;
          }
          .status-counts {
            display: flex;
            flex-wrap: wrap;
            gap: 4px 16px;
          }
          .roster-actions {
            grid-template-columns: 1fr auto;
            align-items: center;
          }
          .save-row {
            display: flex;
            justify-content: flex-end;
          }
          .save-row .button {
            width: auto;
          }
        }

        /* Desktop: real table */
        @media (min-width: 768px) {
          .card-heading.stacked {
            flex-direction: row;
            align-items: flex-end;
          }
          .roster-table {
            display: table;
          }
          .roster-table thead {
            position: static;
            width: auto;
            height: auto;
            overflow: visible;
            clip: auto;
            display: table-header-group;
          }
          .roster-table tbody {
            display: table-row-group;
          }
          .roster-table tr {
            display: table-row;
            margin: 0;
            padding: 0;
            border: 0;
            border-radius: 0;
          }
          .roster-table th,
          .roster-table td {
            display: table-cell;
            width: auto;
            padding: 12px 10px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          .roster-table th {
            color: #64748b;
            font-size: 13px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
          }
          .roster-table td::before {
            content: none;
          }
          .roster-table select {
            min-width: 150px;
          }
        }

        /* Large screens */
        @media (min-width: 1200px) {
          .attendance {
            padding: 32px 24px 72px;
          }
          h1 {
            font-size: 28px;
          }
        }
      `}</style>
    </main>
  );
}