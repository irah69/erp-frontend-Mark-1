export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type ApiRequestError = Error & { status?: number };

export function getAccessToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem("access_token")
    : null;
}

export function clearSession() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
}

async function refreshAccessToken() {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) return false;

  const data = await response.json();

  localStorage.setItem("access_token", data.access_token);

  return true;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  hasRetried = false
) {
  const token = getAccessToken();

  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));

  if (
    response.status === 401 &&
    !hasRetried &&
    typeof window !== "undefined" &&
    path !== "/api/auth/refresh"
  ) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      return apiRequest<T>(path, options, true);
    }

    clearSession();
  }

  if (!response.ok) {
    const error = new Error(
      data.detail ?? "Request failed"
    ) as ApiRequestError;

    error.status = response.status;

    throw error;
  }

  return data as T;
}

/* =========================================================
   OPTIONS / BASIC RECORDS
   ========================================================= */

export type SectionOption = {
  id: number;
  section: string;
  status?: string;
};

export type StaffOption = {
  id: number;
  name: string;
  number?: string;
  status?: string;
};

export type SubjectOption = {
  id: number;
  code?: string;
  name?: string;
  subject?: string;
  status?: string;
};

export type StudentRecord = {
  id: number;
  name: string;
  roll_number: string;
  section_id?: number | null;
  grade?: string | null;
  section?: string | null;
  status?: string;
};

// Row from GET /api/grades. One row = one class in one academic year,
// paired with its section (section_id may be null if none is assigned).
export type GradeOption = {
  id: number;
  academic_year: string;
  grade: string;
  section_id?: number | null;
  staff_id?: number | null;
  status?: string;
};

/* =========================================================
   TIMETABLE
   One row = one weekly slot (day + period) for a class + section.
   Opening a timetable creates a 6 x 6 grid of these rows.
   default_subject_id / default_staff_id are the weekly assignment;
   dated ClassSession rows are generated from them.
   ========================================================= */

export type TimetableRecord = {
  id: number;
  section_id: number;
  grade_id?: number | null;
  day_of_week: number;
  period_number?: number | null;
  start_time: string;
  end_time: string;
  room?: string | null;
  status: string;
  default_subject_id?: number | null;
  default_staff_id?: number | null;
  valid_from?: string | null;
  valid_to?: string | null;
};

/* =========================================================
   CLASS SESSION
   Subject and staff are now stored here.
   ========================================================= */

export type ClassSessionRecord = {
  id: number;
  timetable_id: number;
  subject_id: number;
  staff_id: number;
  session_date: string;
  is_conducted: boolean;
  remarks?: string | null;
};

/* =========================================================
   ATTENDANCE
   ========================================================= */

export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "EXCUSED";

export type AttendanceRecord = {
  id: number;
  session_id: number;
  student_id: number;
  status: AttendanceStatus;
  remarks?: string | null;
};

/* =========================================================
   INPUT TYPES
   ========================================================= */

export type TimetableInput = Omit<TimetableRecord, "id">;

export type TimetableOpenInput = {
  grade_id: number;
  section_id: number;
  valid_from: string;
  valid_to: string;
};

export type TimetableAssignmentInput = {
  subject_id: number | null;
  staff_id: number | null;
};

export type SessionGenerateInput = {
  grade_id: number;
  section_id: number;
  start_date?: string | null;
  end_date?: string | null;
  skip_dates?: string[];
};

export type SessionGenerateResult = {
  success: boolean;
  message: string;
  created: number;
  assigned_slots: number;
  unassigned_slots: number;
  start_date: string;
  end_date: string;
};

export type ClassSessionInput = Omit<ClassSessionRecord, "id">;

export type BulkAttendanceInput = {
  session_id: number;
  records: Array<
    Pick<AttendanceRecord, "student_id" | "status"> & {
      remarks?: string | null;
    }
  >;
};

/* =========================================================
   HELPER
   ========================================================= */

function sendJson<T>(
  path: string,
  method: string,
  body: unknown
) {
  return apiRequest<T>(path, {
    method,
    body: JSON.stringify(body),
  });
}

/* =========================================================
   SCHEDULING ENDPOINTS
   ========================================================= */

export function getSchedulingSections() {
  return apiRequest<SectionOption[]>("/api/sections");
}

export function getSchedulingStaff() {
  return apiRequest<StaffOption[]>("/api/staff");
}

export function getSchedulingSubjects() {
  return apiRequest<SubjectOption[]>("/api/subjects/");
}

export function getSchedulingGrades() {
  return apiRequest<GradeOption[]>("/api/grades");
}

export function getSchedulingStudents() {
  return apiRequest<
    { students?: StudentRecord[] } | StudentRecord[]
  >("/api/students");
}

/* =========================================================
   TIMETABLE ENDPOINTS
   ========================================================= */

export function getTimetables() {
  return apiRequest<TimetableRecord[]>(
    "/api/scheduling/timetables"
  );
}

/** Create (or re-open) the 6 x 6 grid for one class + section. */
export function openTimetable(payload: TimetableOpenInput) {
  return sendJson<TimetableRecord[]>(
    "/api/scheduling/timetables/open",
    "POST",
    payload
  );
}

/** Set (or clear, with nulls) the weekly subject + staff for one slot. */
export function assignTimetableSlot(
  id: number,
  payload: TimetableAssignmentInput
) {
  return sendJson<TimetableRecord>(
    `/api/scheduling/timetables/${id}/assignment`,
    "PUT",
    payload
  );
}

export function createTimetable(payload: TimetableInput) {
  return sendJson<TimetableRecord>(
    "/api/scheduling/timetables",
    "POST",
    payload
  );
}

export function updateTimetable(
  id: number,
  payload: Partial<TimetableInput>
) {
  return sendJson<TimetableRecord>(
    `/api/scheduling/timetables/${id}`,
    "PUT",
    payload
  );
}

export function removeTimetable(id: number) {
  return apiRequest<{
    success: boolean;
    message: string;
    id: number;
  }>(`/api/scheduling/timetables/${id}`, {
    method: "DELETE",
  });
}

/* =========================================================
   CLASS SESSION ENDPOINTS
   ========================================================= */

export function getClassSessions() {
  return apiRequest<ClassSessionRecord[]>(
    "/api/scheduling/sessions"
  );
}

/** Generate dated sessions from a class + section's weekly grid. */
export function generateClassSessions(
  payload: SessionGenerateInput
) {
  return sendJson<SessionGenerateResult>(
    "/api/scheduling/sessions/generate",
    "POST",
    payload
  );
}

export function createClassSession(
  payload: ClassSessionInput
) {
  return sendJson<ClassSessionRecord>(
    "/api/scheduling/sessions",
    "POST",
    payload
  );
}

export function updateClassSession(
  id: number,
  payload: Partial<ClassSessionInput>
) {
  return sendJson<ClassSessionRecord>(
    `/api/scheduling/sessions/${id}`,
    "PUT",
    payload
  );
}

export function removeClassSession(id: number) {
  return apiRequest<{
    success: boolean;
    message: string;
    id: number;
  }>(`/api/scheduling/sessions/${id}`, {
    method: "DELETE",
  });
}

/* =========================================================
   ATTENDANCE ENDPOINTS
   ========================================================= */

export function getAttendanceRecords() {
  return apiRequest<AttendanceRecord[]>(
    "/api/attendance"
  );
}

export function updateAttendanceRecord(
  id: number,
  payload: Partial<
    Pick<AttendanceRecord, "status" | "remarks">
  >
) {
  return sendJson<AttendanceRecord>(
    `/api/attendance/${id}`,
    "PUT",
    payload
  );
}

export function saveBulkAttendance(
  payload: BulkAttendanceInput
) {
  return sendJson<{
    success: boolean;
    message: string;
    count: number;
    records: AttendanceRecord[];
  }>(
    "/api/attendance/bulk",
    "POST",
    payload
  );
}