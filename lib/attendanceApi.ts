import { apiRequest, type AttendanceStatus } from "./api";

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
  academic_year?: string | null;
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
  academic_year?: string | null;
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

  const queryString = query.toString();
  return apiRequest<T>(
    `${path}${queryString ? `?${queryString}` : ""}`,
    { cache: "no-store" }
  );
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
  session_id: number;
  timetable_id: number;
  session_date: string;
  grade_id: number;
  section_id: number;
  grade?: string | null;
  section?: string | null;
  subject_id: number | null;
  subject_name?: string | null;
  period_number: number | null;
  start_time: string;
  end_time: string;
  room?: string | null;
  is_conducted?: boolean;
  staff_id?: number | null;
  academic_year?: string | null;
  day_of_week?: number;
  ready?: boolean;
};

export type StaffClassSessionsResponse = {
  session_date: string;
  classes: StaffClassSession[];
};

export function getStaffClassSessions(sessionDate: string) {
  return getJson<StaffClassSessionsResponse>(
    "/api/attendance/teacher/classes",
    {
      session_date: sessionDate,
    }
  );
}

export type TeacherAttendanceStudent = {
  id: number;
  name: string | null;
  roll_number: string | null;
  attendance_id: number | null;
  status: AttendanceStatus | null;
  remarks: string | null;
};

export type TeacherAttendanceRoster = {
  session_id: number;
  session_date: string;
  grade_id: number;
  section_id: number;
  grade: string | null;
  section: string | null;
  total_students: number;
  marked_students: number;
  students: TeacherAttendanceStudent[];
};

export function getTeacherAttendanceRoster(sessionId: number) {
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    throw new Error(`Invalid class session ID: ${sessionId}`);
  }

  return apiRequest<TeacherAttendanceRoster>(
    `/api/attendance/teacher/sessions/${sessionId}/roster`,
    { cache: "no-store" }
  );
}

export function saveTeacherAttendance(
  sessionId: number,
  records: Array<{
    student_id: number;
    status: AttendanceStatus;
    remarks: string | null;
  }>
) {
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    throw new Error(`Invalid class session ID: ${sessionId}`);
  }

  return apiRequest<{
    success: boolean;
    message: string;
    count: number;
  }>(`/api/attendance/teacher/sessions/${sessionId}/attendance`, {
    method: "PUT",
    body: JSON.stringify({ records }),
  });
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
  academic_year?: string | null;
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
  academic_year: string;
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

export function getMyAttendanceReport(academicYear?: string) {
  return getJson<StudentAttendanceReport>("/api/attendance/me", {
    academic_year: academicYear,
  });
}

export function getStudentReport(args: {
  rollNumber: string;
  gradeId?: number;
  sectionId?: number;
  academicYear?: string;
}) {
  return getJson<StudentAttendanceReport>(
    "/api/attendance/student-report",
    {
      roll_number: args.rollNumber,
      grade_id: args.gradeId,
      section_id: args.sectionId,
      academic_year: args.academicYear,
    }
  );
}