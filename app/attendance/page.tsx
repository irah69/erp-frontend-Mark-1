"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AttendanceStatus,
  GradeOption,
  SectionOption,
  StaffOption,
  SubjectOption,
  getSchedulingGrades,
  getSchedulingSections,
  getSchedulingStaff,
  getSchedulingSubjects,
  saveBulkAttendance,
  updateAttendanceRecord,
} from "../../lib/api";
import {
  ClassDaySession,
  ClassRoster,
  StudentAttendanceReport,
  getClassDaySessions,
  getClassRoster,
  getStudentReport,
} from "../../lib/attendanceApi";

const statusOptions: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
const dayNames = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type DatePreset = "all" | "today" | "7" | "30";
const datePresets: ReadonlyArray<readonly [DatePreset, string]> = [
  ["all", "All"],
  ["today", "Today"],
  ["7", "Last 7 days"],
  ["30", "Last 30 days"],
];

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatSubject(subject: SubjectOption | undefined, id: number) {
  return subject?.name ?? subject?.subject ?? subject?.code ?? `Subject ${id}`;
}

// Local YYYY-MM-DD (toISOString() is UTC and can be a day off in the early morning in IST).
function toLocalDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Backend: 1 = Monday ... 7 = Sunday. JS getDay(): 0 = Sunday ... 6 = Saturday.
function getDayOfWeek(dateString: string): number {
  const [year, month, day] = dateString.split("-").map(Number);
  const jsDay = new Date(year, month - 1, day).getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function formatDisplayDate(dateString: string) {
  const [year, month, day] = dateString.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Start/end (local YYYY-MM-DD) for a quick date preset.
function presetRange(preset: Exclude<DatePreset, "all">) {
  const today = new Date();
  const start = new Date(today);
  if (preset !== "today") start.setDate(start.getDate() - (Number(preset) - 1));
  return { from: toLocalDateString(start), to: toLocalDateString(today) };
}

// A grades row is a class + academic year paired with one section.
function classKey(grade: GradeOption) {
  return `${grade.grade}|${grade.academic_year ?? ""}`;
}

function classLabel(grade: GradeOption) {
  return `Class ${grade.grade}${grade.academic_year ? ` · ${grade.academic_year}` : ""}`;
}

export default function AttendancePage() {
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const [mode, setMode] = useState<"mark" | "view">("mark");
  const [rollNumber, setRollNumber] = useState("");
  const [report, setReport] = useState<StudentAttendanceReport | null>(null);
  const [reportChanges, setReportChanges] = useState<Record<number, AttendanceStatus>>({});
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedDate, setSelectedDate] = useState(() => toLocalDateString(new Date()));
  const [selectedClassKey, setSelectedClassKey] = useState("");
  const [selectedGradeRowId, setSelectedGradeRowId] = useState(""); // the grades row = class + section
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const [daySessions, setDaySessions] = useState<ClassDaySession[]>([]);
  const [roster, setRoster] = useState<ClassRoster | null>(null);
  const [statusChanges, setStatusChanges] = useState<Record<number, AttendanceStatus>>({});

  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const classOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const grade of grades) {
      const key = classKey(grade);
      if (!seen.has(key)) seen.set(key, classLabel(grade));
    }
    return Array.from(seen, ([key, label]) => ({ key, label }));
  }, [grades]);

  // Sections available for the chosen class (each is its own grades row).
  const sectionRows = useMemo(
    () => grades.filter((grade) => classKey(grade) === selectedClassKey && grade.section_id),
    [grades, selectedClassKey]
  );

  const gradeRow = useMemo(
    () => grades.find((grade) => String(grade.id) === selectedGradeRowId) ?? null,
    [grades, selectedGradeRowId]
  );
  const gradeId = gradeRow?.id ?? null;
  const sectionId = gradeRow?.section_id ?? null;
  const sectionName = sections.find((section) => section.id === sectionId)?.section ?? "";

  const selectedPeriod = daySessions.find((item) => String(item.session_id) === selectedSessionId) ?? null;
  const readyCount = daySessions.filter((item) => item.ready).length;
  const students = roster?.students ?? [];

  const counts = useMemo(() => {
    const result: Record<AttendanceStatus, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    for (const student of students) {
      result[statusChanges[student.id] ?? student.status ?? "ABSENT"] += 1;
    }
    return result;
  }, [students, statusChanges]);

  // Reference data (loaded once).
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const [gradeData, sectionData, staffData, subjectData] = await Promise.all([
          getSchedulingGrades(),
          getSchedulingSections(),
          getSchedulingStaff(),
          getSchedulingSubjects(),
        ]);
        setGrades(gradeData);
        setSections(sectionData);
        setStaff(staffData);
        setSubjects(subjectData);
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Unable to load attendance data."));
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Every period of the chosen class on the chosen date (weekday is worked out by the API).
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (mode !== "mark" || gradeId === null || sectionId === null || !selectedDate) {
        setDaySessions([]);
        return;
      }
      setSessionsLoading(true);
      setError("");
      try {
        const data = await getClassDaySessions({ gradeId, sectionId, date: selectedDate });
        if (!cancelled) setDaySessions(data.sessions);
      } catch (loadError) {
        if (!cancelled) {
          setDaySessions([]);
          setError(getErrorMessage(loadError, "Unable to load class sessions."));
        }
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, gradeId, sectionId, selectedDate]);

  // Students of the class, with attendance already saved for the chosen session.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (mode !== "mark" || !selectedSessionId || gradeId === null || sectionId === null) {
        setRoster(null);
        return;
      }
      setRosterLoading(true);
      setError("");
      try {
        const data = await getClassRoster({
          gradeId,
          sectionId,
          date: selectedDate,
          sessionId: Number(selectedSessionId),
        });
        if (!cancelled) setRoster(data);
      } catch (loadError) {
        if (!cancelled) {
          setRoster(null);
          setError(getErrorMessage(loadError, "Unable to load students."));
        }
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, gradeId, sectionId, selectedDate, selectedSessionId]);

  async function saveAttendance() {
    if (!selectedPeriod?.session_id || !roster || gradeId === null || sectionId === null) {
      setError("Select a class session before saving attendance.");
      return;
    }
    const sessionId = selectedPeriod.session_id;

    setSaving(true);
    setError("");
    try {
      const newStudents = roster.students.filter((student) => student.attendance_id === null);
      const changedStudents = roster.students.filter(
        (student) =>
          student.attendance_id !== null &&
          statusChanges[student.id] &&
          statusChanges[student.id] !== student.status
      );

      if (newStudents.length > 0) {
        await saveBulkAttendance({
          session_id: sessionId,
          records: newStudents.map((student) => ({
            student_id: student.id,
            status: statusChanges[student.id] ?? "ABSENT",
            remarks: null,
          })),
        });
      }

      await Promise.all(
        changedStudents.map((student) =>
          updateAttendanceRecord(student.attendance_id as number, { status: statusChanges[student.id] })
        )
      );

      setRoster(await getClassRoster({ gradeId, sectionId, date: selectedDate, sessionId }));
      setStatusChanges({});
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Unable to save attendance."));
    } finally {
      setSaving(false);
    }
  }

  async function searchReport() {
    if (!rollNumber.trim()) {
      setError("Enter a roll number.");
      return;
    }
    setReportLoading(true);
    setError("");
    setReport(null);
    setReportChanges({});
    setDateFrom("");
    setDateTo("");
    try {
      setReport(
        await getStudentReport({
          rollNumber: rollNumber.trim(),
          gradeId: gradeId ?? undefined,
          sectionId: sectionId ?? undefined,
        })
      );
    } catch (reportError) {
      setError(getErrorMessage(reportError, "Unable to load attendance."));
    } finally {
      setReportLoading(false);
    }
  }

  async function saveReportChanges() {
    if (!report) return;
    const changed = report.records.filter(
      (record) => reportChanges[record.attendance_id] && reportChanges[record.attendance_id] !== record.status
    );
    if (changed.length === 0) return;

    setReportSaving(true);
    setError("");
    try {
      await Promise.all(
        changed.map((record) => updateAttendanceRecord(record.attendance_id, { status: reportChanges[record.attendance_id] }))
      );
      setReport(
        await getStudentReport({
          rollNumber: report.student.roll_number ?? rollNumber.trim(),
          gradeId: gradeId ?? undefined,
          sectionId: sectionId ?? undefined,
        })
      );
      setReportChanges({});
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Unable to update attendance."));
    } finally {
      setReportSaving(false);
    }
  }

  function switchMode(next: "mark" | "view") {
    if (next === mode) return;
    setMode(next);
    setError("");
  }

  function markAllPresent() {
    const next: Record<number, AttendanceStatus> = {};
    for (const student of students) next[student.id] = "PRESENT";
    setStatusChanges(next);
  }

  function formatPeriod(item: ClassDaySession) {
    const slot = `${item.period_number ? `P${item.period_number} ` : ""}${item.start_time.slice(0, 5)}–${item.end_time.slice(0, 5)}`;
    if (!item.ready) return `${slot} · needs subject & staff in Timetable`;
    // Subject and staff belong to the session, not the timetable slot.
    const subject = item.subject_id
      ? formatSubject(subjects.find((entry) => entry.id === item.subject_id), item.subject_id)
      : "No subject";
    const teacher = item.staff_id
      ? staff.find((entry) => entry.id === item.staff_id)?.name ?? `Staff ${item.staff_id}`
      : "No staff";
    return `${slot} · ${subject} · ${teacher}`;
  }

  // Edits are counted across all dates, including ones hidden by the date filter.
  const pendingReportEdits = report
    ? report.records.filter((record) => reportChanges[record.attendance_id] && reportChanges[record.attendance_id] !== record.status).length
    : 0;

  const filteredRecords = useMemo(() => {
    if (!report) return [];
    return report.records.filter((record) => {
      const day = record.session_date.slice(0, 10);
      return (!dateFrom || day >= dateFrom) && (!dateTo || day <= dateTo);
    });
  }, [report, dateFrom, dateTo]);

  const filteredCounts = useMemo(() => {
    const result: Record<AttendanceStatus, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    for (const record of filteredRecords) result[record.status] += 1;
    return result;
  }, [filteredRecords]);

  const dateFilterActive = Boolean(dateFrom || dateTo);

  function applyPreset(preset: DatePreset) {
    if (preset === "all") {
      setDateFrom("");
      setDateTo("");
      return;
    }
    const range = presetRange(preset);
    setDateFrom(range.from);
    setDateTo(range.to);
  }

  function isPresetActive(preset: DatePreset) {
    if (preset === "all") return !dateFrom && !dateTo;
    const range = presetRange(preset);
    return dateFrom === range.from && dateTo === range.to;
  }

  function renderEmptyState() {
    if (loading) return "Loading attendance data...";
    if (!selectedDate) return "Select a session date.";
    if (!selectedClassKey) return "Select a class to continue.";
    if (gradeId === null || sectionId === null) return "Select a section to see its class sessions.";
    if (sessionsLoading) return "Loading class sessions...";
    if (daySessions.length === 0) return "No timetable scheduled for this class on this date.";
    if (readyCount === 0) {
      return "This day has periods, but none has a subject and staff assigned yet. Assign them in Timetable.";
    }
    if (!selectedPeriod) return "Select a class session to mark attendance.";
    if (rosterLoading) return "Loading students...";
    return null;
  }

  const emptyState = renderEmptyState();
  const weekdayLabel = selectedDate ? dayNames[getDayOfWeek(selectedDate)] : "";

  const gradeSelect = (
    <label>
      Grade
      <select
        value={selectedClassKey}
        onChange={(event) => {
          setSelectedClassKey(event.target.value);
          setSelectedGradeRowId("");
          setSelectedSessionId("");
          setStatusChanges({});
        }}
      >
        <option value="">{mode === "view" ? "Any grade" : "Select grade"}</option>
        {classOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
      </select>
    </label>
  );

  const sectionSelect = (
    <label>
      Section
      <select
        value={selectedGradeRowId}
        disabled={!selectedClassKey}
        onChange={(event) => {
          setSelectedGradeRowId(event.target.value);
          setSelectedSessionId("");
          setStatusChanges({});
        }}
      >
        <option value="">{mode === "view" ? "Any section" : "Select section"}</option>
        {sectionRows.map((row) => (
          <option key={row.id} value={row.id}>
            {sections.find((section) => section.id === row.section_id)?.section ?? `Section ${row.section_id}`}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section className="page-section admin-page att-page">
      <style>{responsiveCss}</style>

      <div className="admin-heading">
        <div>
          <p className="eyebrow">Class records</p>
          <h1>Attendance</h1>
          <p>Mark or update attendance for a scheduled class session.</p>
        </div>
      </div>

      {error && <div className="alert error" role="alert">{error}</div>}

      <div className="att-mode" role="group" aria-label="Attendance mode">
        <button type="button" className={`action-button${mode === "mark" ? " primary" : ""}`} aria-pressed={mode === "mark"} onClick={() => switchMode("mark")}>Mark attendance</button>
        <button type="button" className={`action-button${mode === "view" ? " primary" : ""}`} aria-pressed={mode === "view"} onClick={() => switchMode("view")}>Get attendance</button>
      </div>

      {mode === "mark" ? (
        <div className="data-panel" style={{ marginTop: 0 }}>
          <div className="form-grid att-form-grid">
            <label>
              Session date{weekdayLabel && <span className="att-hint"> ({weekdayLabel})</span>}
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setSelectedSessionId("");
                  setStatusChanges({});
                }}
              />
            </label>

            {gradeSelect}

            {sectionSelect}

            <label>
              Class session{daySessions.length > 0 && <span className="att-hint"> ({readyCount} of {daySessions.length} periods ready)</span>}
              <select
                value={selectedSessionId}
                disabled={daySessions.length === 0}
                onChange={(event) => {
                  setSelectedSessionId(event.target.value);
                  setStatusChanges({});
                }}
              >
                <option value="">Select class session</option>
                {daySessions.map((item) => item.ready && item.session_id !== null
                  ? <option key={item.timetable_id} value={item.session_id}>{formatPeriod(item)}</option>
                  : <option key={item.timetable_id} value="" disabled>{formatPeriod(item)}</option>)}
              </select>
            </label>
          </div>

          {emptyState ? (
            <p className="state-text">{emptyState}</p>
          ) : students.length === 0 ? (
            <p className="state-text">No students are assigned to {sectionName || "this section"}.</p>
          ) : (
            <>
              <div className="toolbar att-toolbar">
                <h2>Class roster <span>{students.length}</span></h2>
                <div className="att-pills">
                  {statusOptions.map((status) => <span key={status} className="status-pill">{status}: {counts[status]}</span>)}
                  <button className="action-button" type="button" onClick={markAllPresent}>Mark all present</button>
                </div>
              </div>
              <div className="table-scroll">
                <table className="data-table att-table">
                  <thead><tr><th>Student</th><th>Roll number</th><th>Attendance status</th></tr></thead>
                  <tbody>{students.map((student) => {
                    const status = statusChanges[student.id] ?? student.status ?? "ABSENT";
                    return <tr key={student.id}>
                      <td data-label="Student">{student.name}</td>
                      <td data-label="Roll number">{student.roll_number}</td>
                      <td data-label="Attendance status"><select aria-label={`Attendance for ${student.name}`} value={status} onChange={(event) => setStatusChanges((current) => ({ ...current, [student.id]: event.target.value as AttendanceStatus }))}>{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
              <div className="att-savebar">
                <button className="action-button primary" type="button" disabled={saving} onClick={() => void saveAttendance()}>{saving ? "Saving..." : "Save attendance"}</button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="data-panel" style={{ marginTop: 0 }}>
          <div className="form-grid att-form-grid att-form-grid--view">
            <label>
              Roll number
              <input
                value={rollNumber}
                placeholder="Enter roll number"
                onChange={(event) => setRollNumber(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") void searchReport(); }}
              />
            </label>

            {gradeSelect}

            {sectionSelect}

            <div className="att-search">
              <button className="action-button primary" type="button" disabled={reportLoading} onClick={() => void searchReport()}>
                {reportLoading ? "Searching..." : "Get attendance"}
              </button>
            </div>
          </div>
          <p className="att-hint att-note">Grade and section are optional. Use them only if the same roll number exists in more than one class.</p>

          {reportLoading ? (
            <p className="state-text">Loading attendance...</p>
          ) : !report ? (
            <p className="state-text">Enter a roll number to see that student&apos;s attendance.</p>
          ) : (
            <>
              <div className="att-summary">
                <div>
                  <strong>{report.student.name ?? "Student"}</strong>
                  <div className="att-hint">
                    Roll {report.student.roll_number}
                    {[report.student.grade && `Class ${report.student.grade}`, report.student.section && `Section ${report.student.section}`].filter(Boolean).map((part) => ` · ${part}`).join("")}
                  </div>
                </div>
                <div className="att-score">
                  <span className="att-percent">{report.percentage}%</span>
                  <span>{report.attended_classes} / {report.total_classes} classes attended</span>
                </div>
                <div className="att-meter" role="img" aria-label={`${report.percentage}% attendance`}>
                  <span style={{ width: `${Math.min(100, report.percentage)}%` }} />
                </div>
                <div className="att-pills">
                  <span className="status-pill">PRESENT: {report.present}</span>
                  <span className="status-pill">ABSENT: {report.absent}</span>
                  <span className="status-pill">LATE: {report.late}</span>
                  <span className="status-pill">EXCUSED: {report.excused}</span>
                </div>
              </div>

              <div className="toolbar att-toolbar">
                <h2>Classes <span>{dateFilterActive ? `${filteredRecords.length} of ${report.records.length}` : report.records.length}</span></h2>
              </div>

              {report.records.length === 0 ? (
                <p className="state-text">No attendance has been recorded for this student yet.</p>
              ) : (
                <>
                  <div className="att-filter" role="group" aria-label="Filter sessions by date">
                    <div className="att-chips">
                      {datePresets.map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={`att-chip${isPresetActive(key) ? " is-active" : ""}`}
                          aria-pressed={isPresetActive(key)}
                          onClick={() => applyPreset(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="att-range">
                      <label>
                        From
                        <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} />
                      </label>
                      <label>
                        To
                        <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} />
                      </label>
                    </div>
                    {dateFilterActive && (
                      <div className="att-filter-summary">
                        {statusOptions.map((status) => <span key={status} className="status-pill">{status}: {filteredCounts[status]}</span>)}
                      </div>
                    )}
                  </div>

                  {filteredRecords.length === 0 ? (
                    <div className="att-empty">
                      <p className="state-text">No sessions found for the selected dates.</p>
                      <button type="button" className="action-button" onClick={() => applyPreset("all")}>Clear date filter</button>
                    </div>
                  ) : (
                    <>
                      <div className="table-scroll">
                        <table className="data-table att-table">
                          <thead><tr><th>Date</th><th>Period</th><th>Subject</th><th>Teacher</th><th>Attendance status</th></tr></thead>
                          <tbody>{filteredRecords.map((record) => {
                            const status = reportChanges[record.attendance_id] ?? record.status;
                            return <tr key={record.attendance_id}>
                              <td data-label="Date">{formatDisplayDate(record.session_date)}</td>
                              <td data-label="Period">{record.period_number ? `P${record.period_number} · ` : ""}{record.start_time.slice(0, 5)}–{record.end_time.slice(0, 5)}</td>
                              <td data-label="Subject">{formatSubject(subjects.find((entry) => entry.id === record.subject_id), record.subject_id)}</td>
                              <td data-label="Teacher">{staff.find((entry) => entry.id === record.staff_id)?.name ?? `Staff ${record.staff_id}`}</td>
                              <td data-label="Attendance status"><select aria-label={`Attendance on ${record.session_date}`} value={status} onChange={(event) => setReportChanges((current) => ({ ...current, [record.attendance_id]: event.target.value as AttendanceStatus }))}>{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></td>
                            </tr>;
                          })}</tbody>
                        </table>
                      </div>
                      <div className="att-savebar">
                        <button className="action-button primary" type="button" disabled={reportSaving || pendingReportEdits === 0} onClick={() => void saveReportChanges()}>
                          {reportSaving ? "Saving..." : pendingReportEdits > 0 ? `Save changes (${pendingReportEdits})` : "Save changes"}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

// Scoped, additive responsive rules. Existing global classes are kept as-is.
const responsiveCss = `
.att-page { width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; }
.att-page * { box-sizing: border-box; }
.att-page .admin-heading h1 { font-size: clamp(1.4rem, 1.1rem + 1.6vw, 2rem); overflow-wrap: anywhere; }

/* Filters: 1 column on phones, 2 on tablets, 4 on wide screens */
.att-page .form-grid.att-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 14px;
  align-items: end;
}
.att-page .att-form-grid label { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.att-page .att-form-grid input,
.att-page .att-form-grid select { width: 100%; min-width: 0; max-width: 100%; min-height: 44px; text-overflow: ellipsis; }
.att-page .att-hint { font-weight: 400; opacity: 0.7; }
@media (min-width: 1100px) {
  .att-page .form-grid.att-form-grid { grid-template-columns: 1fr 1fr 1fr 2fr; }
}

/* Roster header + status counts wrap cleanly */
.att-page .att-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; }
.att-page .att-pills { display: flex; flex-wrap: wrap; gap: 8px; }
.att-page .state-text { overflow-wrap: anywhere; }

.att-page .table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.att-page .att-table { width: 100%; }
.att-page .att-table select { min-height: 40px; }

.att-page .att-savebar { display: flex; justify-content: flex-end; margin-top: 18px; }

/* Phones: roster rows become stacked cards, save button is full width and stays reachable */
@media (max-width: 640px) {
  .att-page input, .att-page select { font-size: 16px; } /* avoids iOS zoom on focus */
  .att-page .att-toolbar { flex-direction: column; align-items: flex-start; }
  .att-page .att-table thead {
    position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
  }
  .att-page .att-table, .att-page .att-table tbody, .att-page .att-table tr, .att-page .att-table td { display: block; width: 100%; }
  .att-page .att-table tr {
    margin-bottom: 10px; padding: 10px 12px;
    border: 1px solid rgba(128, 128, 128, 0.3); border-radius: 10px;
  }
  .att-page .att-table td {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 6px 0; border: 0; text-align: right; overflow-wrap: anywhere;
  }
  .att-page .att-table td::before {
    content: attr(data-label); flex: 0 0 auto; font-weight: 600; text-align: left; opacity: 0.7;
  }
  .att-page .att-table td select { flex: 1 1 auto; max-width: 60%; min-height: 44px; }
  .att-page .att-savebar {
    position: sticky; bottom: 0; z-index: 5; margin-top: 12px; padding: 10px 0;
    background: color-mix(in srgb, Canvas 94%, transparent); backdrop-filter: blur(6px);
  }
  .att-page .att-savebar .action-button { width: 100%; min-height: 46px; }
}

/* Very small screens */
@media (max-width: 360px) {
  .att-page .att-table td { flex-direction: column; align-items: stretch; text-align: left; }
  .att-page .att-table td select { max-width: 100%; }
}

/* Mode toggle */
.att-page .att-mode { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.att-page .att-mode .action-button { min-height: 44px; }

/* Get-attendance view */
@media (min-width: 1100px) {
  .att-page .form-grid.att-form-grid.att-form-grid--view { grid-template-columns: 1.2fr 1fr 1fr auto; }
}
.att-page .att-search .action-button { width: 100%; min-height: 44px; }
.att-page .att-note { margin: 10px 0 0; }
.att-page .att-summary {
  display: grid; gap: 12px; margin-top: 18px; padding: 14px 16px;
  border: 1px solid rgba(128, 128, 128, 0.3); border-radius: 10px;
}
.att-page .att-score { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; }
.att-page .att-percent { font-size: clamp(1.8rem, 1.3rem + 2vw, 2.6rem); font-weight: 700; line-height: 1; }
.att-page .att-meter { height: 8px; border-radius: 999px; background: rgba(128, 128, 128, 0.25); overflow: hidden; }
.att-page .att-meter span { display: block; height: 100%; background: currentColor; border-radius: 999px; }

@media (max-width: 640px) {
  .att-page .att-mode .action-button { flex: 1 1 0; }
}

/* ---------- iOS glassmorphism ---------- */
.att-page {
  --glass-bg: rgba(255, 255, 255, 0.55);
  --glass-border: rgba(255, 255, 255, 0.7);
  --glass-shadow: 0 4px 16px rgba(20, 30, 60, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  --glass-ink: rgba(20, 30, 60, 0.9);
  --tint: 10, 132, 255; /* iOS system blue */
}
@media (prefers-color-scheme: dark) {
  .att-page {
    --glass-bg: rgba(255, 255, 255, 0.10);
    --glass-border: rgba(255, 255, 255, 0.22);
    --glass-shadow: 0 4px 18px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25);
    --glass-ink: rgba(255, 255, 255, 0.95);
  }
}

.att-page .action-button,
.att-page .att-chip {
  appearance: none;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 18px;
  font: inherit; font-weight: 600; letter-spacing: -0.01em; line-height: 1.2;
  color: var(--glass-ink);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  box-shadow: var(--glass-shadow);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  backdrop-filter: blur(18px) saturate(180%);
  cursor: pointer;
  transition: transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .2s ease, background .2s ease, opacity .2s ease;
  -webkit-tap-highlight-color: transparent;
}
.att-page .action-button:hover,
.att-page .att-chip:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(20, 30, 60, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.85); }
.att-page .action-button:active,
.att-page .att-chip:active { transform: scale(0.97); box-shadow: 0 2px 8px rgba(20, 30, 60, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6); }
.att-page .action-button:focus-visible,
.att-page .att-chip:focus-visible,
.att-page input:focus-visible,
.att-page select:focus-visible { outline: none; box-shadow: 0 0 0 4px rgba(var(--tint), 0.35); }
.att-page .action-button:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: var(--glass-shadow); }

/* Primary: tinted glass */
.att-page .action-button.primary,
.att-page .att-chip.is-active {
  color: #fff;
  background: linear-gradient(180deg, rgba(var(--tint), 0.92), rgba(var(--tint), 0.72));
  border-color: rgba(255, 255, 255, 0.45);
  box-shadow: 0 6px 18px rgba(var(--tint), 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.att-page .action-button.primary:hover,
.att-page .att-chip.is-active:hover { box-shadow: 0 10px 26px rgba(var(--tint), 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.6); }

/* Mode switch = segmented glass control */
.att-page .att-mode {
  display: inline-flex; gap: 4px; padding: 4px; margin-bottom: 16px;
  background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 18px;
  box-shadow: var(--glass-shadow);
  -webkit-backdrop-filter: blur(18px) saturate(180%); backdrop-filter: blur(18px) saturate(180%);
}
.att-page .att-mode .action-button { background: transparent; border-color: transparent; box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; border-radius: 14px; }
.att-page .att-mode .action-button.primary { background: linear-gradient(180deg, rgba(var(--tint), 0.92), rgba(var(--tint), 0.72)); box-shadow: 0 4px 14px rgba(var(--tint), 0.35), inset 0 1px 0 rgba(255,255,255,0.5); }

/* Inputs & selects */
.att-page input, .att-page select {
  font: inherit; color: inherit;
  padding: 10px 14px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: inset 0 1px 2px rgba(20, 30, 60, 0.06);
  transition: box-shadow .2s ease, border-color .2s ease;
}
.att-page input:focus, .att-page select:focus { border-color: rgba(var(--tint), 0.7); }

/* Status pills as glass chips */
.att-page .status-pill {
  padding: 6px 12px; border-radius: 999px; font-size: 0.85rem; font-weight: 600;
  background: var(--glass-bg); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow);
}

/* Date filter bar */
.att-page .att-filter {
  display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px 20px;
  margin: 4px 0 16px; padding: 14px 16px;
  background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 16px;
  box-shadow: var(--glass-shadow);
  -webkit-backdrop-filter: blur(18px) saturate(180%); backdrop-filter: blur(18px) saturate(180%);
}
.att-page .att-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.att-page .att-chip { padding: 8px 14px; font-size: 0.9rem; border-radius: 999px; }
.att-page .att-range { display: flex; flex-wrap: wrap; gap: 12px; }
.att-page .att-range label { display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; font-weight: 600; opacity: 0.85; }
.att-page .att-filter-summary { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
.att-page .att-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px 0 4px; }

@media (max-width: 640px) {
  .att-page .att-mode { display: flex; width: 100%; }
  .att-page .att-filter { flex-direction: column; align-items: stretch; }
  .att-page .att-range { display: grid; grid-template-columns: 1fr 1fr; }
  .att-page .att-chips { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
  .att-page .att-chip { flex: 0 0 auto; }
}
`;