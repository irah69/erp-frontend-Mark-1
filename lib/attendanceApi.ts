// Save as lib/attendanceApi.ts (next to lib/api).
// If lib/api already has a shared request helper / base URL, use it here instead of getJson().
import type { AttendanceStatus } from "./api";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

// One period of a class on a date. ready = false -> the slot has no subject/staff yet, so no session exists.
export type ClassDaySession = {
  timetable_id: number;
  period_number: number | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  default_subject_id: number | null;
  default_staff_id: number | null;
  session_id: number | null;
  subject_id: number | null;
  staff_id: number | null;
  is_conducted: boolean;
  ready: boolean;
};

export type ClassDaySessions = {
  grade_id: number;
  section_id: number;
  session_date: string;
  day_of_week: number;
  sessions: ClassDaySession[];
};

export type RosterStudent = {
  id: number;
  name: string | null;
  roll_number: string | null;
  attendance_id: number | null;
  status: AttendanceStatus | null;
  remarks: string | null;
};

export type ClassRoster = {
  grade_id: number;
  section_id: number;
  grade: string | null;
  section: string | null;
  session_date: string;
  session_id: number | null;
  total_students: number;
  marked_students: number;
  students: RosterStudent[];
};

async function getJson<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }

  const response = await fetch(`${API_BASE}${path}?${query.toString()}`, { cache: "no-store" });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body?.detail)) {
        message = body.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(", ") || message;
      }
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

// GET /api/scheduling/sessions/by-class  (creates any missing sessions for assigned slots)
export function getClassDaySessions(args: { gradeId: number; sectionId: number; date: string }) {
  return getJson<ClassDaySessions>("/api/scheduling/sessions/by-class", {
    grade_id: args.gradeId,
    section_id: args.sectionId,
    session_date: args.date,
  });
}

// GET /api/attendance/roster  (students of the class; attendance included when sessionId is given)
export function getClassRoster(args: { gradeId: number; sectionId: number; date: string; sessionId?: number }) {
  return getJson<ClassRoster>("/api/attendance/roster", {
    grade_id: args.gradeId,
    section_id: args.sectionId,
    session_date: args.date,
    session_id: args.sessionId,
  });
}

// ---- Student attendance report (roll number -> percentage + every class) ----

export type StudentAttendanceItem = {
  attendance_id: number;
  session_id: number;
  session_date: string;
  period_number: number | null;
  start_time: string;
  end_time: string;
  subject_id: number;
  staff_id: number;
  status: AttendanceStatus;
  remarks: string | null;
};

export type StudentAttendanceReport = {
  student: {
    id: number;
    name: string | null;
    roll_number: string | null;
    grade: string | null;
    section: string | null;
  };
  total_classes: number;
  attended_classes: number; // PRESENT + LATE
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
  records: StudentAttendanceItem[];
};

// GET /api/attendance/student-report
// Pass gradeId + sectionId together when the same roll number exists in more than one class.
export function getStudentReport(args: { rollNumber: string; gradeId?: number; sectionId?: number }) {
  return getJson<StudentAttendanceReport>("/api/attendance/student-report", {
    roll_number: args.rollNumber,
    grade_id: args.gradeId,
    section_id: args.sectionId,
  });
}