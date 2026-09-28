"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AttendanceRecord,
  AttendanceStatus,
  ClassSessionRecord,
  SectionOption,
  StaffOption,
  StudentRecord,
  SubjectOption,
  TimetableRecord,
  getAttendanceRecords,
  getClassSessions,
  getSchedulingSections,
  getSchedulingStaff,
  getSchedulingStudents,
  getSchedulingSubjects,
  getTimetables,
  saveBulkAttendance,
  updateAttendanceRecord,
} from "../../lib/api";

const statusOptions: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatSubject(subject: SubjectOption | undefined, id: number) {
  return subject?.name ?? subject?.subject ?? subject?.code ?? `Subject ${id}`;
}

export default function AttendancePage() {
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [timetables, setTimetables] = useState<TimetableRecord[]>([]);
  const [sessions, setSessions] = useState<ClassSessionRecord[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [statusChanges, setStatusChanges] = useState<Record<number, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sessionOptions = useMemo(
    () => sessions.filter((session) => session.session_date.slice(0, 10) === selectedDate),
    [selectedDate, sessions]
  );
  const selectedSession = sessionOptions.find((session) => String(session.id) === selectedSessionId) ?? null;
  const selectedTimetable = selectedSession
    ? timetables.find((timetable) => timetable.id === selectedSession.timetable_id) ?? null
    : null;
  const selectedSection = selectedTimetable
    ? sections.find((section) => section.id === selectedTimetable.section_id) ?? null
    : null;

  const classStudents = useMemo(() => {
    if (!selectedTimetable || !selectedSection) return [];
    return students.filter((student) => {
      if (student.section_id !== undefined && student.section_id !== null) {
        return student.section_id === selectedSection.id;
      }
      return (student.section ?? "").trim().toLowerCase() === selectedSection.section.trim().toLowerCase();
    });
  }, [selectedSection, selectedTimetable, students]);

  const currentRecords = useMemo(() => {
    if (!selectedSession) return new Map<number, AttendanceRecord>();
    return new Map(
      records
        .filter((record) => record.session_id === selectedSession.id)
        .map((record) => [record.student_id, record])
    );
  }, [records, selectedSession]);

  const counts = useMemo(() => {
    const result: Record<AttendanceStatus, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    for (const student of classStudents) {
      const status = statusChanges[student.id] ?? currentRecords.get(student.id)?.status ?? "ABSENT";
      result[status] += 1;
    }
    return result;
  }, [classStudents, currentRecords, statusChanges]);

  async function loadAttendanceData() {
    setLoading(true);
    setError("");
    try {
      const [sectionData, staffData, subjectData, studentData, timetableData, sessionData, attendanceData] = await Promise.all([
        getSchedulingSections(),
        getSchedulingStaff(),
        getSchedulingSubjects(),
        getSchedulingStudents(),
        getTimetables(),
        getClassSessions(),
        getAttendanceRecords(),
      ]);
      setSections(sectionData);
      setStaff(staffData);
      setSubjects(subjectData);
      setStudents(Array.isArray(studentData) ? studentData : studentData.students ?? []);
      setTimetables(timetableData);
      setSessions(sessionData);
      setRecords(attendanceData);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Unable to load attendance data."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAttendanceData(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function saveAttendance() {
    if (!selectedSession) {
      setError("Select a class session before saving attendance.");
      return;
    }
    if (classStudents.length === 0) {
      setError("No students are assigned to this session's section.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const newRecords = classStudents.filter((student) => !currentRecords.has(student.id));
      const changedRecords = classStudents.filter((student) => {
        const existing = currentRecords.get(student.id);
        return existing && statusChanges[student.id] && statusChanges[student.id] !== existing.status;
      });

      if (newRecords.length > 0) {
        const created = await saveBulkAttendance({
          session_id: selectedSession.id,
          records: newRecords.map((student) => ({
            student_id: student.id,
            status: statusChanges[student.id] ?? "ABSENT",
            remarks: null,
          })),
        });
        setRecords((current) => [...current, ...created.records]);
      }

      await Promise.all(changedRecords.map((student) => {
        const existing = currentRecords.get(student.id)!;
        return updateAttendanceRecord(existing.id, { status: statusChanges[student.id] });
      }));

      setRecords(await getAttendanceRecords());
      setStatusChanges({});
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Unable to save attendance."));
    } finally {
      setSaving(false);
    }
  }

  function formatSession(session: ClassSessionRecord) {
    const timetable = timetables.find((item) => item.id === session.timetable_id);
    if (!timetable) return `Session ${session.id} · timetable ${session.timetable_id}`;
    const section = sections.find((item) => item.id === timetable.section_id)?.section ?? `Section ${timetable.section_id}`;
    const subject = formatSubject(subjects.find((item) => item.id === timetable.subject_id), timetable.subject_id);
    const teacher = staff.find((item) => item.id === timetable.staff_id)?.name ?? `Staff ${timetable.staff_id}`;
    return `${section} · ${subject} · ${teacher} · ${timetable.start_time.slice(0, 5)}`;
  }

  return (
    <section className="page-section admin-page">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Class records</p>
          <h1>Attendance</h1>
          <p>Mark or update attendance for a scheduled class session.</p>
        </div>
      </div>

      {error && <div className="alert error" role="alert">{error}</div>}

      <div className="data-panel" style={{ marginTop: 0 }}>
        <div className="form-grid">
          <label>Session date<input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setSelectedSessionId(""); setStatusChanges({}); }} /></label>
          <label>Class session<select value={selectedSessionId} onChange={(event) => { setSelectedSessionId(event.target.value); setStatusChanges({}); }}><option value="">Select class session</option>{sessionOptions.map((session) => <option key={session.id} value={session.id}>{formatSession(session)}</option>)}</select></label>
          {selectedSection && <label>Section<input readOnly value={selectedSection.section} /></label>}
        </div>

        {loading ? <p className="state-text">Loading attendance data...</p> : !selectedSession ? (
          <p className="state-text">No class session selected for this date.</p>
        ) : classStudents.length === 0 ? (
          <p className="state-text">No students are assigned to {selectedSection?.section ?? "this section"}.</p>
        ) : (
          <>
            <div className="toolbar" style={{ flexWrap: "wrap" }}>
              <h2>Class roster <span>{classStudents.length}</span></h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {statusOptions.map((status) => <span key={status} className="status-pill">{status}: {counts[status]}</span>)}
              </div>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Student</th><th>Roll number</th><th>Attendance status</th></tr></thead>
                <tbody>{classStudents.map((student) => {
                  const record = currentRecords.get(student.id);
                  const status = statusChanges[student.id] ?? record?.status ?? "ABSENT";
                  return <tr key={student.id}>
                    <td>{student.name}</td>
                    <td>{student.roll_number}</td>
                    <td><select aria-label={`Attendance for ${student.name}`} value={status} onChange={(event) => setStatusChanges((current) => ({ ...current, [student.id]: event.target.value as AttendanceStatus }))}>{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <button className="action-button primary" type="button" disabled={saving} onClick={() => void saveAttendance()}>{saving ? "Saving..." : "Save attendance"}</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}