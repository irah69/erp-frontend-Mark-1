"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AttendanceStatus } from "../../lib/api";
import {
  getStaffClassSessions,
  getTeacherAttendanceRoster,
  saveTeacherAttendance,
  type StaffClassSession,
  type TeacherAttendanceRoster,
} from "../../lib/attendanceApi";

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
      const result = await saveTeacherAttendance(roster.session_id, roster.students.map((student) => ({
        student_id: student.id,
        status: statusChanges[student.id] ?? student.status ?? "ABSENT",
        remarks: student.remarks,
      })));

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
    <section className="staff-attendance">
      <main className="staff-attendance-main">
        <div className="staff-attendance-container">
          <Link className="back-link" href="/dashboard">
            ← Back to staff dashboard
          </Link>

          <header className="page-heading">
            <div>
              <p className="eyebrow">Staff workspace</p>
              <h1>Class attendance</h1>
              <p>
                Choose one of your assigned sessions, mark each student, and
                save attendance for that class.
              </p>
            </div>
            <label className="date-field">
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
            <div className="notice error-notice" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="notice success-notice" role="status">
              {success}
            </div>
          )}

          <section className="session-panel" aria-labelledby="sessions-heading">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Your timetable</p>
                <h2 id="sessions-heading">Assigned sessions</h2>
              </div>
              {!classesLoading && (
                <span className="session-count">
                  {classes.length} {classes.length === 1 ? "session" : "sessions"}
                </span>
              )}
            </div>

            {classesLoading ? (
              <p className="state-message">Loading your sessions…</p>
            ) : classes.length === 0 ? (
              <p className="state-message">
                No sessions are assigned to you for this date.
              </p>
            ) : (
              <div className="session-list">
                {classes.map((item) => {
                  const active =
                    String(item.session_id) === selectedSessionId;
                  return (
                    <button
                      className={`session-option${active ? " selected" : ""}`}
                      key={item.session_id}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setSelectedSessionId(String(item.session_id))
                      }
                    >
                      <span className="period-label">
                        {item.period_number
                          ? `Period ${item.period_number}`
                          : "Class session"}
                      </span>
                      <strong>{formatClassName(item)}</strong>
                      <span className="session-time">
                        {formatTime(item.start_time)}–{formatTime(item.end_time)}
                        {item.room ? ` · Room ${item.room}` : ""}
                      </span>
                      {item.is_conducted && (
                        <span className="conducted-label">Attendance saved</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {selectedClass && (
            <section className="roster-panel" aria-labelledby="roster-heading">
              <div className="panel-heading roster-heading">
                <div>
                  <p className="eyebrow">{formatClassName(selectedClass)}</p>
                  <h2 id="roster-heading">Student roster</h2>
                </div>
                {roster && (
                  <div className="status-counts" aria-label="Attendance totals">
                    {attendanceStatuses.map((status) => (
                      <span className="status-count" key={status}>
                        {status}: {counts[status]}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {rosterLoading ? (
                <p className="state-message">Loading students…</p>
              ) : !roster ? (
                <p className="state-message">
                  The roster could not be displayed.
                </p>
              ) : roster.students.length === 0 ? (
                <p className="state-message">
                  No students are assigned to this session.
                </p>
              ) : (
                <>
                  <div className="roster-actions">
                    <p>
                      {roster.marked_students} of {roster.total_students}{" "}
                      students already marked
                    </p>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={markAllPresent}
                      disabled={saving}
                    >
                      Mark all present
                    </button>
                  </div>

                  <div className="roster-table-wrap">
                    <table className="roster-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Roll number</th>
                          <th>Attendance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roster.students.map((student) => {
                          const status =
                            statusChanges[student.id] ??
                            student.status ??
                            "ABSENT";
                          return (
                            <tr key={student.id}>
                              <td data-label="Student">
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
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="save-row">
                    <button
                      className="save-button"
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
      </main>

      <style jsx>{`
        .staff-attendance {
          min-height: 100vh;
          color: #0f172a;
          background:
            radial-gradient(circle at top left, rgba(59, 130, 246, 0.08), transparent 34%),
            #f8fafc;
        }
        .staff-attendance-main {
          padding: 32px 20px 56px;
        }
        .staff-attendance-container {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
        }
        .back-link {
          display: inline-block;
          margin-bottom: 24px;
          color: #2563eb;
          font-weight: 650;
          text-decoration: none;
        }
        .back-link:hover {
          text-decoration: underline;
        }
        .page-heading,
        .panel-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
        }
        .page-heading {
          margin-bottom: 24px;
        }
        .eyebrow {
          margin: 0 0 7px;
          color: #2563eb;
          font-size: 12px;
          font-weight: 750;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        h1,
        h2,
        p {
          margin-top: 0;
        }
        h1 {
          margin-bottom: 8px;
          font-size: clamp(28px, 4vw, 38px);
          letter-spacing: -0.04em;
        }
        .page-heading p:not(.eyebrow) {
          max-width: 660px;
          margin-bottom: 0;
          color: #64748b;
          line-height: 1.6;
        }
        .date-field {
          display: grid;
          flex: 0 0 210px;
          gap: 7px;
          color: #475569;
          font-size: 13px;
          font-weight: 650;
        }
        input,
        select {
          min-height: 42px;
          padding: 9px 12px;
          color: #0f172a;
          background: #fff;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          font: inherit;
        }
        input:focus,
        select:focus,
        button:focus-visible,
        a:focus-visible {
          outline: 3px solid rgba(37, 99, 235, 0.25);
          outline-offset: 2px;
        }
        .notice {
          margin: 0 0 16px;
          padding: 12px 15px;
          border: 1px solid;
          border-radius: 10px;
          line-height: 1.5;
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
        .session-panel,
        .roster-panel {
          margin-top: 18px;
          padding: 22px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }
        .panel-heading {
          align-items: center;
          margin-bottom: 18px;
        }
        .panel-heading h2 {
          margin-bottom: 0;
          font-size: 21px;
        }
        .session-count,
        .conducted-label {
          color: #64748b;
          font-size: 13px;
        }
        .session-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }
        .session-option {
          display: grid;
          gap: 7px;
          min-height: 130px;
          padding: 16px;
          color: #0f172a;
          text-align: left;
          background: #fff;
          border: 1px solid #dbe3ee;
          border-radius: 12px;
          cursor: pointer;
        }
        .session-option:hover {
          border-color: #93c5fd;
          background: #f8fbff;
        }
        .session-option.selected {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
        }
        .period-label {
          color: #2563eb;
          font-size: 12px;
          font-weight: 750;
          text-transform: uppercase;
        }
        .session-option strong {
          font-size: 15px;
        }
        .session-time {
          color: #64748b;
          font-size: 13px;
        }
        .conducted-label {
          color: #15803d;
          font-weight: 650;
        }
        .state-message {
          margin: 0;
          padding: 18px 0 4px;
          color: #64748b;
        }
        .roster-heading {
          align-items: flex-end;
        }
        .status-counts {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 7px;
        }
        .status-count {
          padding: 6px 9px;
          color: #475569;
          background: #f1f5f9;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 650;
          white-space: nowrap;
        }
        .roster-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .roster-actions p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }
        .secondary-button,
        .save-button {
          min-height: 42px;
          padding: 9px 15px;
          border-radius: 9px;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }
        .secondary-button {
          color: #1d4ed8;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
        }
        .save-button {
          color: #fff;
          background: #2563eb;
          border: 1px solid #2563eb;
        }
        .save-button:hover:not(:disabled) {
          background: #1d4ed8;
        }
        button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
        .roster-table-wrap {
          overflow-x: auto;
        }
        .roster-table {
          width: 100%;
          border-collapse: collapse;
        }
        .roster-table th,
        .roster-table td {
          padding: 12px 10px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }
        .roster-table th {
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .roster-table select {
          min-width: 145px;
        }
        .save-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 18px;
        }
        @media (max-width: 700px) {
          .staff-attendance-main {
            padding: 22px 14px 36px;
          }
          .page-heading,
          .panel-heading {
            align-items: stretch;
            flex-direction: column;
          }
          .date-field {
            flex-basis: auto;
          }
          .session-panel,
          .roster-panel {
            padding: 17px 14px;
          }
          .roster-heading {
            gap: 12px;
          }
          .status-counts {
            justify-content: flex-start;
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
            margin-bottom: 10px;
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
          }
          .roster-table td {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 7px 0;
            border: 0;
          }
          .roster-table td::before {
            content: attr(data-label);
            font-weight: 650;
          }
          .roster-table select {
            max-width: 60%;
          }
          .save-row .save-button {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
