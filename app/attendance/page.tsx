"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { AlertCircle, X } from "lucide-react";
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

/* ---------- shared style tokens ---------- */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1";

const buttonBase = `inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const buttonPrimary = `${buttonBase} border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800`;
const buttonSecondary = `${buttonBase} border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100`;

const inputClass =
  "w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:text-sm";

/* panels: accent panels carry the left border, list panels stay plain */
const plainPanel = "rounded-lg border border-slate-200 bg-white";
const accentPanel = `${plainPanel} border-l-4 border-l-indigo-600 p-4 sm:p-5`;

const statusTone: Record<AttendanceStatus, string> = {
  PRESENT: "border-green-200 bg-green-50 text-green-700",
  ABSENT: "border-red-200 bg-red-50 text-red-700",
  LATE: "border-amber-200 bg-amber-50 text-amber-700",
  EXCUSED: "border-slate-200 bg-slate-50 text-slate-600",
};

/* ---------- small pieces ---------- */

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function StatusCounts({ counts }: { counts: Record<AttendanceStatus, number> }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {statusOptions.map((status) => (
        <li key={status} className={`rounded border px-2 py-0.5 text-xs font-medium ${statusTone[status]}`}>
          {status}: {counts[status]}
        </li>
      ))}
    </ul>
  );
}

function StatusSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
}) {
  return (
    <select
      aria-label={label}
      className={inputClass}
      value={value}
      onChange={(event) => onChange(event.target.value as AttendanceStatus)}
    >
      {statusOptions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

const modeButton = (active: boolean) =>
  `flex-1 rounded px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${focusRing} ${
    active ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-100"
  }`;

const presetButton = (active: boolean) =>
  `rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${focusRing} ${
    active
      ? "border-indigo-600 bg-indigo-600 text-white"
      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
  }`;

const stickySaveBar =
  "sticky bottom-0 flex rounded-b-lg border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-end";

/* ---------- page ---------- */

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

  function setStudentStatus(studentId: number, status: AttendanceStatus) {
    setStatusChanges((current) => ({ ...current, [studentId]: status }));
  }

  function setRecordStatus(attendanceId: number, status: AttendanceStatus) {
    setReportChanges((current) => ({ ...current, [attendanceId]: status }));
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
    <Field label="Grade">
      <select
        className={inputClass}
        value={selectedClassKey}
        onChange={(event) => {
          setSelectedClassKey(event.target.value);
          setSelectedGradeRowId("");
          setSelectedSessionId("");
          setStatusChanges({});
        }}
      >
        <option value="">{mode === "view" ? "Any grade" : "Select grade"}</option>
        {classOptions.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );

  const sectionSelect = (
    <Field label="Section">
      <select
        className={inputClass}
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
    </Field>
  );

  return (
    <section className="min-h-dvh bg-slate-50 font-sans text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-semibold">Attendance</h1>
          <p className="mt-1 text-sm text-slate-600">Mark or update attendance for a scheduled class session.</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 break-words">{error}</p>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
              className={`rounded p-0.5 hover:bg-red-100 ${focusRing}`}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Mode switch */}
        <div
          role="group"
          aria-label="Attendance mode"
          className="mt-6 flex w-full rounded-md border border-slate-300 bg-white p-0.5 sm:inline-flex sm:w-auto"
        >
          <button type="button" className={modeButton(mode === "mark")} aria-pressed={mode === "mark"} onClick={() => switchMode("mark")}>
            Mark attendance
          </button>
          <button type="button" className={modeButton(mode === "view")} aria-pressed={mode === "view"} onClick={() => switchMode("view")}>
            Get attendance
          </button>
        </div>

        {mode === "mark" ? (
          <div className="mt-4 space-y-4">
            {/* Filters */}
            <div className={accentPanel}>
              <h2 className="text-base font-semibold">Select class session</h2>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field
                  label={
                    <>
                      Session date
                      {weekdayLabel && <span className="font-normal text-slate-500"> ({weekdayLabel})</span>}
                    </>
                  }
                >
                  <input
                    type="date"
                    className={inputClass}
                    value={selectedDate}
                    onChange={(event) => {
                      setSelectedDate(event.target.value);
                      setSelectedSessionId("");
                      setStatusChanges({});
                    }}
                  />
                </Field>

                {gradeSelect}

                {sectionSelect}

                <Field
                  label={
                    <>
                      Class session
                      {daySessions.length > 0 && (
                        <span className="font-normal text-slate-500">
                          {" "}
                          ({readyCount} of {daySessions.length} periods ready)
                        </span>
                      )}
                    </>
                  }
                >
                  <select
                    className={inputClass}
                    value={selectedSessionId}
                    disabled={daySessions.length === 0}
                    onChange={(event) => {
                      setSelectedSessionId(event.target.value);
                      setStatusChanges({});
                    }}
                  >
                    <option value="">Select class session</option>
                    {daySessions.map((item) =>
                      item.ready && item.session_id !== null ? (
                        <option key={item.timetable_id} value={item.session_id}>
                          {formatPeriod(item)}
                        </option>
                      ) : (
                        <option key={item.timetable_id} value="" disabled>
                          {formatPeriod(item)}
                        </option>
                      )
                    )}
                  </select>
                </Field>
              </div>
            </div>

            {/* Roster */}
            <div className={plainPanel}>
              {emptyState ? (
                <p className="px-4 py-10 text-center text-sm text-slate-500">{emptyState}</p>
              ) : students.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-500">
                  No students are assigned to {sectionName || "this section"}.
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <h2 className="text-base font-semibold">
                      Class roster <span className="font-normal text-slate-500">({students.length})</span>
                    </h2>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                      <StatusCounts counts={counts} />
                      <button type="button" onClick={markAllPresent} className={`${buttonSecondary} w-full sm:w-auto`}>
                        Mark all present
                      </button>
                    </div>
                  </div>

                  {/* Mobile: stacked rows */}
                  <ul className="divide-y divide-slate-200 md:hidden">
                    {students.map((student) => {
                      const status = statusChanges[student.id] ?? student.status ?? "ABSENT";
                      return (
                        <li key={student.id} className="p-4">
                          <p className="font-semibold">{student.name}</p>
                          <p className="text-sm text-slate-500">Roll {student.roll_number}</p>
                          <div className="mt-3">
                            <StatusSelect
                              label={`Attendance for ${student.name}`}
                              value={status}
                              onChange={(next) => setStudentStatus(student.id, next)}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {/* md+: table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                        <tr className="border-b border-slate-200">
                          <th className="px-4 py-2.5">Student</th>
                          <th className="px-3 py-2.5">Roll number</th>
                          <th className="px-3 py-2.5">Attendance status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {students.map((student) => {
                          const status = statusChanges[student.id] ?? student.status ?? "ABSENT";
                          return (
                            <tr key={student.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium">{student.name}</td>
                              <td className="px-3 py-3 text-slate-600">{student.roll_number}</td>
                              <td className="px-3 py-2">
                                <div className="w-44">
                                  <StatusSelect
                                    label={`Attendance for ${student.name}`}
                                    value={status}
                                    onChange={(next) => setStudentStatus(student.id, next)}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className={stickySaveBar}>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveAttendance()}
                      className={`${buttonPrimary} w-full sm:w-auto`}
                    >
                      {saving ? "Saving..." : "Save attendance"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Student lookup */}
            <div className={accentPanel}>
              <h2 className="text-base font-semibold">Find student attendance</h2>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                <Field label="Roll number">
                  <input
                    className={inputClass}
                    value={rollNumber}
                    placeholder="Enter roll number"
                    onChange={(event) => setRollNumber(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void searchReport();
                    }}
                  />
                </Field>

                {gradeSelect}

                {sectionSelect}

                <button
                  type="button"
                  disabled={reportLoading}
                  onClick={() => void searchReport()}
                  className={`${buttonPrimary} w-full sm:col-span-2 lg:col-span-1`}
                >
                  {reportLoading ? "Searching..." : "Get attendance"}
                </button>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                Grade and section are optional. Use them only if the same roll number exists in more than one class.
              </p>
            </div>

            {reportLoading ? (
              <div className={plainPanel}>
                <p className="px-4 py-10 text-center text-sm text-slate-500">Loading attendance...</p>
              </div>
            ) : !report ? (
              <div className={plainPanel}>
                <p className="px-4 py-10 text-center text-sm text-slate-500">
                  Enter a roll number to see that student&apos;s attendance.
                </p>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className={accentPanel}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">{report.student.name ?? "Student"}</h2>
                      <p className="text-sm text-slate-500">
                        Roll {report.student.roll_number}
                        {[
                          report.student.grade && `Class ${report.student.grade}`,
                          report.student.section && `Section ${report.student.section}`,
                        ]
                          .filter(Boolean)
                          .map((part) => ` · ${part}`)
                          .join("")}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-3xl font-semibold tabular-nums">{report.percentage}%</p>
                      <p className="text-sm text-slate-600">
                        {report.attended_classes} / {report.total_classes} classes attended
                      </p>
                    </div>
                  </div>

                  <div
                    className="mt-4 h-2 overflow-hidden rounded bg-slate-200"
                    role="img"
                    aria-label={`${report.percentage}% attendance`}
                  >
                    <div className="h-full bg-indigo-600" style={{ width: `${Math.min(100, report.percentage)}%` }} />
                  </div>

                  <div className="mt-4">
                    <StatusCounts
                      counts={{
                        PRESENT: report.present,
                        ABSENT: report.absent,
                        LATE: report.late,
                        EXCUSED: report.excused,
                      }}
                    />
                  </div>
                </div>

                {/* Classes */}
                <div className={plainPanel}>
                  <div className="border-b border-slate-200 p-4">
                    <h2 className="text-base font-semibold">
                      Classes{" "}
                      <span className="font-normal text-slate-500">
                        ({dateFilterActive ? `${filteredRecords.length} of ${report.records.length}` : report.records.length})
                      </span>
                    </h2>
                  </div>

                  {report.records.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-500">
                      No attendance has been recorded for this student yet.
                    </p>
                  ) : (
                    <>
                      {/* Date filter */}
                      <div
                        className="space-y-3 border-b border-slate-200 p-4"
                        role="group"
                        aria-label="Filter sessions by date"
                      >
                        <div className="flex flex-wrap gap-2">
                          {datePresets.map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              className={presetButton(isPresetActive(key))}
                              aria-pressed={isPresetActive(key)}
                              onClick={() => applyPreset(key)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                          <Field label="From">
                            <input
                              type="date"
                              className={inputClass}
                              value={dateFrom}
                              max={dateTo || undefined}
                              onChange={(event) => setDateFrom(event.target.value)}
                            />
                          </Field>
                          <Field label="To">
                            <input
                              type="date"
                              className={inputClass}
                              value={dateTo}
                              min={dateFrom || undefined}
                              onChange={(event) => setDateTo(event.target.value)}
                            />
                          </Field>
                        </div>

                        {dateFilterActive && <StatusCounts counts={filteredCounts} />}
                      </div>

                      {filteredRecords.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                          <p className="text-sm text-slate-500">No sessions found for the selected dates.</p>
                          <button type="button" className={buttonSecondary} onClick={() => applyPreset("all")}>
                            Clear date filter
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Mobile: stacked rows */}
                          <ul className="divide-y divide-slate-200 md:hidden">
                            {filteredRecords.map((record) => {
                              const status = reportChanges[record.attendance_id] ?? record.status;
                              return (
                                <li key={record.attendance_id} className="p-4">
                                  <p className="font-semibold">{formatDisplayDate(record.session_date)}</p>
                                  <p className="text-sm text-slate-500">
                                    {record.period_number ? `P${record.period_number} · ` : ""}
                                    {record.start_time.slice(0, 5)}–{record.end_time.slice(0, 5)}
                                  </p>
                                  <p className="mt-2 text-sm text-slate-700">
                                    {formatSubject(subjects.find((entry) => entry.id === record.subject_id), record.subject_id)}
                                    {" · "}
                                    {staff.find((entry) => entry.id === record.staff_id)?.name ?? `Staff ${record.staff_id}`}
                                  </p>
                                  <div className="mt-3">
                                    <StatusSelect
                                      label={`Attendance on ${record.session_date}`}
                                      value={status}
                                      onChange={(next) => setRecordStatus(record.attendance_id, next)}
                                    />
                                  </div>
                                </li>
                              );
                            })}
                          </ul>

                          {/* md+: table */}
                          <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                                <tr className="border-b border-slate-200">
                                  <th className="px-4 py-2.5">Date</th>
                                  <th className="px-3 py-2.5">Period</th>
                                  <th className="px-3 py-2.5">Subject</th>
                                  <th className="px-3 py-2.5">Teacher</th>
                                  <th className="px-3 py-2.5">Attendance status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {filteredRecords.map((record) => {
                                  const status = reportChanges[record.attendance_id] ?? record.status;
                                  return (
                                    <tr key={record.attendance_id} className="hover:bg-slate-50">
                                      <td className="px-4 py-3 font-medium">{formatDisplayDate(record.session_date)}</td>
                                      <td className="px-3 py-3 text-slate-600">
                                        {record.period_number ? `P${record.period_number} · ` : ""}
                                        {record.start_time.slice(0, 5)}–{record.end_time.slice(0, 5)}
                                      </td>
                                      <td className="px-3 py-3 text-slate-600">
                                        {formatSubject(subjects.find((entry) => entry.id === record.subject_id), record.subject_id)}
                                      </td>
                                      <td className="px-3 py-3 text-slate-600">
                                        {staff.find((entry) => entry.id === record.staff_id)?.name ?? `Staff ${record.staff_id}`}
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="w-44">
                                          <StatusSelect
                                            label={`Attendance on ${record.session_date}`}
                                            value={status}
                                            onChange={(next) => setRecordStatus(record.attendance_id, next)}
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className={stickySaveBar}>
                            <button
                              type="button"
                              disabled={reportSaving || pendingReportEdits === 0}
                              onClick={() => void saveReportChanges()}
                              className={`${buttonPrimary} w-full sm:w-auto`}
                            >
                              {reportSaving
                                ? "Saving..."
                                : pendingReportEdits > 0
                                  ? `Save changes (${pendingReportEdits})`
                                  : "Save changes"}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}