"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  UsersRound,
} from "lucide-react";
import type { AttendanceStatus } from "../../lib/api";
import { PageHeader } from "../ui/page-header";
import Loader from "../ui/loader";
import {
  getStaffClassSessions,
  getTeacherAttendanceRoster,
  type StaffClassSession,
  type TeacherAttendanceRoster,
} from "../../lib/attendanceApi";

type SessionAttendance = {
  session: StaffClassSession;
  roster: TeacherAttendanceRoster;
};

const statusStyles: Record<AttendanceStatus, string> = {
  PRESENT: "staff-status-present",
  ABSENT: "staff-status-absent",
  LATE: "staff-status-late",
  EXCUSED: "staff-status-excused",
};

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

function getSessionName(session: StaffClassSession) {
  const className = [
    session.grade ? `Class ${session.grade}` : null,
    session.section ? `Section ${session.section}` : null,
  ].filter(Boolean).join(" · ");
  return className || "Assigned class";
}

export default function StaffDashboard() {
  const [date, setDate] = useState(() => localDate(new Date()));
  const [sessions, setSessions] = useState<SessionAttendance[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      setSessions([]);
      setSelectedId(null);

      try {
        const response = await getStaffClassSessions(date);
        const availableSessions = response.classes.filter(
          (session) => Number.isInteger(session.session_id) && session.session_id > 0
        );
        const data = await Promise.all(
          availableSessions.map(async (session) => ({
            session,
            roster: await getTeacherAttendanceRoster(session.session_id),
          }))
        );

        if (!cancelled) {
          setSessions(data);
          setSelectedId(data[0]?.session.session_id ?? null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load attendance for your classes."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [date]);

  const selected = useMemo(
    () => sessions.find((item) => item.session.session_id === selectedId) ?? null,
    [sessions, selectedId]
  );
  const dailySummary = useMemo(() => {
    const studentIds = new Set<number>();
    const presentStudentIds = new Set<number>();
    let sessionsAwaitingAttendance = 0;

    for (const item of sessions) {
      if (item.roster.marked_students < item.roster.total_students) {
        sessionsAwaitingAttendance += 1;
      }

      for (const student of item.roster.students) {
        studentIds.add(student.id);
        if (student.status === "PRESENT") {
          presentStudentIds.add(student.id);
        }
      }
    }

    return {
      totalStudents: studentIds.size,
      presentStudents: presentStudentIds.size,
      sessionsAwaitingAttendance,
    };
  }, [sessions]);

  const currentCounts = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
    };
    for (const student of selected?.roster.students ?? []) {
      if (student.status) counts[student.status] += 1;
    }
    return counts;
  }, [selected]);

  return (
    <main className="staff-dashboard">
      <div className="staff-dashboard-container">
        <PageHeader
          title="Attendance"
          description="Classes assigned to you for the selected date."
          actions={<label className="staff-date-picker">
            <CalendarDays size={17} aria-hidden="true" />
            <span className="sr-only">Attendance date</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>}
        />

        <section className="staff-metrics" aria-label="Attendance summary">
          <article className="staff-metric">
            <span className="staff-metric-icon"><UsersRound size={20} /></span>
            <p>Students in sessions</p>
            <strong>{loading ? "—" : dailySummary.totalStudents}</strong>
            <span>Unique students across {sessions.length} sessions</span>
          </article>
          <article className="staff-metric">
            <span className="staff-metric-icon"><Check size={20} /></span>
            <p>Present today</p>
            <strong>{loading ? "—" : dailySummary.presentStudents}</strong>
            <span>Unique students marked present today</span>
          </article>
          <article className="staff-metric">
            <span className="staff-metric-icon"><Clock3 size={20} /></span>
            <p>Awaiting attendance</p>
            <strong>{loading ? "—" : dailySummary.sessionsAwaitingAttendance}</strong>
            <span>Sessions still needing attendance</span>
          </article>
        </section>

        <section className="staff-analytics">
          <div className="staff-analytics-heading">
            <div>
              <h2>Attendance insights</h2>
            </div>
            <Link href="/staff-attendance" className="staff-view-all">
              Mark attendance <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>

          {loading ? (
            <Loader title="Loading your class attendance…" subtitle="Retrieving today’s assigned sessions" size="sm" className="min-h-[14rem]" />
          ) : error ? (
            <div className="staff-message staff-message-error" role="alert">{error}</div>
          ) : sessions.length === 0 ? (
            <div className="staff-empty-state">
              <CalendarDays size={27} aria-hidden="true" />
              <h3>No classes found</h3>
              <p>No class sessions are scheduled for {formatDate(date)}.</p>
            </div>
          ) : (
            <div className="staff-analytics-grid">
              <div className="staff-session-list">
                <p className="staff-panel-label">Your sessions</p>
                {sessions.map(({ session, roster }) => {
                  const marked = roster.students.filter((student) => student.status).length;
                  const total = roster.total_students;
                  const present = roster.students.filter((student) => student.status === "PRESENT").length;
                  const rate = total ? Math.round((present / total) * 100) : 0;
                  const active = session.session_id === selectedId;
                  return (
                    <button
                      key={session.session_id}
                      type="button"
                      className={`staff-session-choice${active ? " staff-session-choice-active" : ""}`}
                      onClick={() => setSelectedId(session.session_id)}
                      aria-pressed={active}
                    >
                      <span className="staff-session-choice-top">
                        <strong>{getSessionName(session)}</strong>
                        <span>{formatTime(session.start_time)}</span>
                      </span>
                      <span className="staff-session-subject">
                        {session.subject_name ?? "Class session"}
                        {session.period_number ? ` · Period ${session.period_number}` : ""}
                      </span>
                      <span className="staff-progress-track" aria-hidden="true">
                        <span style={{ width: `${rate}%` }} />
                      </span>
                      <span className="staff-session-choice-bottom">
                        {marked} of {total} marked
                        <strong>{marked ? `${rate}% present` : "Not marked"}</strong>
                      </span>
                    </button>
                  );
                })}
              </div>

              {selected && (
                <div className="staff-session-detail">
                  <div className="staff-session-title">
                    <div>
                      <p className="staff-panel-label">Selected session</p>
                      <h3>{getSessionName(selected.session)}</h3>
                      <p>
                        {selected.session.subject_name ?? "Class session"}
                        {selected.session.period_number
                          ? ` · Period ${selected.session.period_number}`
                          : ""}
                        {" · "}{formatTime(selected.session.start_time)}–{formatTime(selected.session.end_time)}
                      </p>
                    </div>
                    <div className="staff-session-total">
                      <strong>{selected.roster.total_students}</strong>
                      <span>students</span>
                    </div>
                  </div>

                  <div className="staff-status-summary">
                    {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const).map((status) => (
                      <div className="staff-status-tile" key={status}>
                        <span className={`staff-status-dot ${statusStyles[status]}`} />
                        <span>{status[0] + status.slice(1).toLowerCase()}</span>
                        <strong>{currentCounts[status]}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="staff-roster-preview">
                    <div className="staff-roster-heading">
                      <span>Student</span>
                      <span>Status</span>
                    </div>
                    {selected.roster.students.slice(0, 6).map((student) => (
                      <div className="staff-roster-row" key={student.id}>
                        <span className="staff-student-name">
                          <span className="staff-student-avatar">
                            {(student.name || "S").slice(0, 1).toUpperCase()}
                          </span>
                          <span>
                            <strong>{student.name || "Student"}</strong>
                            <small>{student.roll_number || "No roll number"}</small>
                          </span>
                        </span>
                        {student.status ? (
                          <span className={`staff-roster-status ${statusStyles[student.status]}`}>
                            {student.status[0] + student.status.slice(1).toLowerCase()}
                          </span>
                        ) : (
                          <span className="staff-roster-unmarked">Not marked</span>
                        )}
                      </div>
                    ))}
                    {selected.roster.students.length > 6 && (
                      <p className="staff-roster-more">
                        +{selected.roster.students.length - 6} more students
                      </p>
                    )}
                    {selected.roster.students.length === 0 && (
                      <p className="staff-roster-more">No students are assigned to this session.</p>
                    )}
                  </div>

                  <Link href="/staff-attendance" className="staff-session-action">
                    Open attendance register <ArrowUpRight size={17} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .staff-dashboard {
          min-height: 100dvh;
          background: #f5f7fb;
          color: #18243a;
          padding: 40px 28px 64px;
        }
        .staff-dashboard-container { margin: 0 auto; max-width: 1240px; }
        .staff-dashboard-header {
          align-items: flex-end; display: flex; gap: 24px;
          justify-content: space-between; margin-bottom: 28px;
        }
        .staff-eyebrow {
          color: #718096; font-size: 11px; font-weight: 750;
          letter-spacing: .12em; margin: 0 0 8px; text-transform: uppercase;
        }
        .staff-dashboard-header h1 {
          color: #17243a; font-size: clamp(27px, 4vw, 38px);
          letter-spacing: -.045em; line-height: 1.1; margin: 0;
        }
        .staff-dashboard-header > div > p:last-child { color: #738198; margin: 10px 0 0; }
        .staff-date-picker {
          align-items: center; background: #fff; border: 1px solid #e3e8f0;
          border-radius: 8px; color: #62718a; display: flex; gap: 10px;
          padding: 10px 12px;
        }
        .staff-date-picker input {
          background: transparent; border: 0; color: #25334b;
          font: inherit; font-size: 13px; outline: 0;
        }
        .staff-metrics {
          display: grid; gap: 16px;
          grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 22px;
        }
        .staff-metric {
          background: #fff; border: 1px solid #e8edf4; border-radius: 12px;
          min-height: 155px; padding: 20px; position: relative;
        }
        .staff-metric-icon {
          align-items: center; border-radius: 8px; display: inline-flex;
          height: 38px; justify-content: center; width: 38px;
        }
        .staff-metric p { color: #66758b; font-size: 13px; margin: 15px 0 4px; }
        .staff-metric > strong { color: #1b2940; font-size: 28px; letter-spacing: -.04em; }
        .staff-metric > span:last-child { color: #94a0b1; display: block; font-size: 11px; margin-top: 4px; }
        .staff-analytics {
          background: #fff; border: 1px solid #e7ecf3;
          border-radius: 12px; overflow: hidden;
        }
        .staff-analytics-heading {
          align-items: center; border-bottom: 1px solid #edf0f5;
          display: flex; justify-content: space-between; padding: 22px 24px;
        }
        .staff-analytics-heading h2 { color: #1a2840; font-size: 20px; letter-spacing: -.03em; margin: 0; }
        .staff-analytics-heading .staff-eyebrow { margin-bottom: 5px; }
        .staff-view-all, .staff-session-action {
          align-items: center; color: var(--foreground); display: inline-flex;
          font-size: 13px; font-weight: 650; gap: 7px; text-decoration: none;
        }
        .staff-analytics-grid { display: grid; grid-template-columns: minmax(260px, .8fr) minmax(0, 1.6fr); }
        .staff-session-list { border-right: 1px solid #edf0f5; padding: 20px; }
        .staff-panel-label { color: #8591a3; font-size: 11px; font-weight: 700; letter-spacing: .08em; margin: 0 0 12px; text-transform: uppercase; }
        .staff-session-choice {
          background: transparent; border: 1px solid transparent; border-radius: 8px;
          color: inherit; cursor: pointer; display: block; margin-top: 7px;
          padding: 12px; text-align: left; transition: background .18s ease, border-color .18s ease;
          width: 100%;
        }
        .staff-session-choice:hover { background: color-mix(in srgb, var(--foreground) 4%, var(--surface)); }
        .staff-session-choice-active { background: color-mix(in srgb, var(--foreground) 6%, var(--surface)); border-color: var(--border); }
        .staff-session-choice-top, .staff-session-choice-bottom {
          align-items: center; display: flex; justify-content: space-between; gap: 8px;
        }
        .staff-session-choice-top strong { color: #263650; font-size: 13px; }
        .staff-session-choice-top > span { color: #64748b; font-size: 11px; }
        .staff-session-subject { color: #8a96a8; display: block; font-size: 11px; margin-top: 5px; }
        .staff-progress-track { background: #e9edf4; border-radius: 10px; display: block; height: 5px; margin: 12px 0 8px; overflow: hidden; }
        .staff-progress-track > span { background: #329c72; border-radius: inherit; display: block; height: 100%; transition: width .3s ease; }
        .staff-session-choice-bottom { color: #8995a6; font-size: 10px; }
        .staff-session-choice-bottom strong { color: #52647d; font-size: 10px; }
        .staff-session-detail { min-width: 0; padding: 22px 24px; }
        .staff-session-title { align-items: flex-start; display: flex; justify-content: space-between; gap: 12px; }
        .staff-session-title .staff-panel-label { margin-bottom: 6px; }
        .staff-session-title h3 { color: #22324b; font-size: 17px; margin: 0; }
        .staff-session-title p:last-child { color: #8591a3; font-size: 12px; margin: 6px 0 0; }
        .staff-session-total { background: #f5f7fb; border-radius: 12px; min-width: 70px; padding: 9px 12px; text-align: center; }
        .staff-session-total strong { color: #24334c; display: block; font-size: 20px; }
        .staff-session-total span { color: #8290a3; font-size: 10px; }
        .staff-status-summary { display: grid; gap: 8px; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 20px 0; }
        .staff-status-tile { align-items: center; background: #f8fafc; border: 1px solid #edf0f5; border-radius: 8px; display: flex; flex-wrap: wrap; gap: 7px; padding: 10px; }
        .staff-status-tile > span:nth-child(2) { color: #65748a; font-size: 10px; }
        .staff-status-tile strong { color: #25354e; font-size: 14px; margin-left: auto; }
        .staff-status-dot { border-radius: 50%; height: 7px; width: 7px; }
        .staff-status-present { background: #2ca36b; }
        .staff-status-absent { background: #dc6266; }
        .staff-status-late { background: #e0a137; }
        .staff-status-excused { background: #8493aa; }
        .staff-roster-preview { border: 1px solid #edf0f5; border-radius: 12px; overflow: hidden; }
        .staff-roster-heading, .staff-roster-row { align-items: center; display: flex; justify-content: space-between; }
        .staff-roster-heading { background: #f8fafc; color: #8a96a8; font-size: 10px; padding: 10px 13px; }
        .staff-roster-row { border-top: 1px solid #f0f2f6; min-height: 53px; padding: 7px 13px; }
        .staff-student-name { align-items: center; display: flex; gap: 9px; min-width: 0; }
        .staff-student-avatar { align-items: center; background: color-mix(in srgb, var(--foreground) 8%, var(--surface)); border-radius: 50%; color: var(--foreground); display: inline-flex; flex: 0 0 30px; font-size: 11px; height: 30px; justify-content: center; }
        .staff-student-name > span:last-child { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .staff-student-name strong { color: #36465f; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .staff-student-name small { color: #94a0af; font-size: 10px; }
        .staff-roster-status, .staff-roster-unmarked { border-radius: 8px; font-size: 10px; padding: 5px 8px; }
        .staff-roster-status.staff-status-present { background: #e8f8ef; color: #218756; }
        .staff-roster-status.staff-status-absent { background: #fff0f0; color: #c34e55; }
        .staff-roster-status.staff-status-late { background: #fff5e3; color: #a87219; }
        .staff-roster-status.staff-status-excused { background: #edf1f7; color: #66758b; }
        .staff-roster-unmarked { background: #f2f4f7; color: #78869a; }
        .staff-roster-more { color: #75839a; font-size: 11px; margin: 0; padding: 11px; text-align: center; }
        .staff-session-action { margin-top: 16px; }
        .staff-empty-state { align-items: center; color: #8a96a8; display: flex; flex-direction: column; min-height: 230px; justify-content: center; padding: 28px; text-align: center; }
        .staff-empty-state h3 { color: #37465e; font-size: 15px; margin: 12px 0 4px; }
        .staff-empty-state p { font-size: 13px; margin: 5px 0 0; }
        .staff-message { margin: 20px; padding: 14px; }
        .staff-message-error { background: #fff1f1; border-radius: 8px; color: #a83d42; font-size: 13px; }
        .sr-only { clip: rect(0, 0, 0, 0); clip-path: inset(50%); height: 1px; overflow: hidden; position: absolute; white-space: nowrap; width: 1px; }
        @media (max-width: 850px) {
          .staff-analytics-grid { grid-template-columns: 1fr; }
          .staff-session-list { border-bottom: 1px solid #edf0f5; border-right: 0; }
          .staff-session-list { display: grid; gap: 5px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .staff-panel-label { grid-column: 1 / -1; }
        }
        @media (max-width: 600px) {
          .staff-dashboard { padding: 26px 14px 42px; }
          .staff-dashboard-header { align-items: flex-start; flex-direction: column; }
          .staff-metrics { gap: 10px; grid-template-columns: 1fr; }
          .staff-metric { min-height: 130px; }
          .staff-analytics-heading { align-items: flex-start; flex-direction: column; gap: 13px; padding: 19px; }
          .staff-session-list { display: flex; flex-direction: column; padding: 14px; }
          .staff-session-detail { padding: 18px 14px; }
          .staff-status-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .staff-session-choice, .staff-progress-track > span { transition: none; }
        }
      `}</style>
    </main>
  );
}
