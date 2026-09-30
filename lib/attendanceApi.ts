import type { AttendanceStatus } from "./api";

const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_API_URL ??
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

// ============================================================
// TYPES
// ============================================================

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

// ============================================================
// GENERIC GET
// ============================================================

async function getJson<T>(
  path: string,
  params: Record<string, string | number | undefined>
): Promise<T> {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  }

  const url = `${API_BASE}${path}?${query.toString()}`;

  console.log("API GET:", url);

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const body = await response.json();

      console.error("API ERROR:", {
        url,
        status: response.status,
        body,
      });

      if (typeof body?.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body?.detail)) {
        message =
          body.detail
            .map((item: { msg?: string; loc?: unknown; input?: unknown }) => {
              const location = Array.isArray(item.loc)
                ? ` [${item.loc.join(".")}]`
                : "";

              const input =
                item.input !== undefined
                  ? ` (input: ${JSON.stringify(item.input)})`
                  : "";

              return `${item.msg ?? "Validation error"}${location}${input}`;
            })
            .filter(Boolean)
            .join(", ") || message;
      }
    } catch {
      // Keep generic error message.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

// ============================================================
// CLASS SCHEDULE
// ============================================================

export function getClassDaySessions(args: {
  gradeId: number;
  sectionId: number;
  date: string;
}) {
  return getJson<ClassDaySessions>(
    "/api/scheduling/sessions/by-class",
    {
      grade_id: args.gradeId,
      section_id: args.sectionId,
      session_date: args.date,
    }
  );
}

// ============================================================
// STAFF SCHEDULE
// ============================================================

export type StaffClassSession = {
  timetable_id: number;
  grade_id: number;
  section_id: number;
  grade?: string | null;
  section?: string | null;
  academic_year?: string | null;
  period_number: number | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_id: number | null;
  staff_id: number | null;
  session_id: number | null;
  session_date?: string | null;
  is_conducted?: boolean;
  ready?: boolean;
};

export type StaffClassSessionsResponse = {
  staff_id: number;
  sessions: StaffClassSession[];
};

export function getStaffClassSessions(staffId: number) {
  const id = Number(staffId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid staff ID: ${staffId}`);
  }

  return getJson<StaffClassSessionsResponse>(
    "/api/scheduling/sessions/by-staff",
    {
      staff_id: id,
    }
  );
}

// ============================================================
// ATTENDANCE ROSTER
// ============================================================

export function getClassRoster(args: {
  gradeId: number;
  sectionId: number;
  date: string;
  sessionId?: number;
}) {
  return getJson<ClassRoster>(
    "/api/attendance/roster",
    {
      grade_id: args.gradeId,
      section_id: args.sectionId,
      session_date: args.date,
      session_id: args.sessionId,
    }
  );
}

// ============================================================
// STUDENT ATTENDANCE REPORT
// ============================================================

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
  attended_classes: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
  records: StudentAttendanceItem[];
};

export function getStudentReport(args: {
  rollNumber: string;
  gradeId?: number;
  sectionId?: number;
}) {
  return getJson<StudentAttendanceReport>(
    "/api/attendance/student-report",
    {
      roll_number: args.rollNumber,
      grade_id: args.gradeId,
      section_id: args.sectionId,
    }
  );
}