export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type ApiRequestError = Error & { status?: number };

export function getAccessToken() {
  return typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
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
    headers: { Accept: "application/json" },
  });

  if (!response.ok) return false;

  const data = await response.json();
  localStorage.setItem("access_token", data.access_token);
  return true;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, hasRetried = false) {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && !hasRetried && typeof window !== "undefined" && path !== "/api/auth/refresh") {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest<T>(path, options, true);
    clearSession();
  }

  if (!response.ok) {
    const error = new Error(data.detail ?? "Request failed") as ApiRequestError;
    error.status = response.status;
    throw error;
  }
  return data as T;
}

export type SectionOption = { id: number; section: string; status?: string };
export type StaffOption = { id: number; name: string; number?: string; status?: string };
export type SubjectOption = { id: number; code?: string; name?: string; subject?: string; status?: string };
export type StudentRecord = {
  id: number;
  name: string;
  roll_number: string;
  section_id?: number | null;
  grade?: string | null;
  section?: string | null;
  status?: string;
};
export type TimetableRecord = {
  id: number;
  section_id: number;
  subject_id: number;
  staff_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string | null;
  status: string;
};
export type ClassSessionRecord = {
  id: number;
  timetable_id: number;
  session_date: string;
  is_conducted: boolean;
  remarks?: string | null;
};
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export type AttendanceRecord = {
  id: number;
  session_id: number;
  student_id: number;
  status: AttendanceStatus;
  remarks?: string | null;
};
export type TimetableInput = Omit<TimetableRecord, "id">;
export type ClassSessionInput = Omit<ClassSessionRecord, "id">;
export type BulkAttendanceInput = {
  session_id: number;
  records: Array<Pick<AttendanceRecord, "student_id" | "status"> & { remarks?: string | null }>;
};

function sendJson<T>(path: string, method: string, body: unknown) {
  return apiRequest<T>(path, { method, body: JSON.stringify(body) });
}

// Scheduling and attendance endpoints
export function getSchedulingSections() {
  return apiRequest<SectionOption[]>("/api/sections");
}

export function getSchedulingStaff() {
  return apiRequest<StaffOption[]>("/api/staff");
}

export function getSchedulingSubjects() {
  return apiRequest<SubjectOption[]>("/api/subjects/");
}

export function getSchedulingStudents() {
  return apiRequest<{ students?: StudentRecord[] } | StudentRecord[]>("/api/students");
}

export function getTimetables() {
  return apiRequest<TimetableRecord[]>("/api/scheduling/timetables");
}

export function createTimetable(payload: TimetableInput) {
  return sendJson<TimetableRecord>("/api/scheduling/timetables", "POST", payload);
}

export function updateTimetable(id: number, payload: Partial<TimetableInput>) {
  return sendJson<TimetableRecord>(`/api/scheduling/timetables/${id}`, "PUT", payload);
}

export function removeTimetable(id: number) {
  return apiRequest<{ success: boolean; message: string; id: number }>(`/api/scheduling/timetables/${id}`, { method: "DELETE" });
}

export function getClassSessions() {
  return apiRequest<ClassSessionRecord[]>("/api/scheduling/sessions");
}

export function createClassSession(payload: ClassSessionInput) {
  return sendJson<ClassSessionRecord>("/api/scheduling/sessions", "POST", payload);
}

export function updateClassSession(id: number, payload: Partial<ClassSessionInput>) {
  return sendJson<ClassSessionRecord>(`/api/scheduling/sessions/${id}`, "PUT", payload);
}

export function removeClassSession(id: number) {
  return apiRequest<{ success: boolean; message: string; id: number }>(`/api/scheduling/sessions/${id}`, { method: "DELETE" });
}

export function getAttendanceRecords() {
  return apiRequest<AttendanceRecord[]>("/api/attendance");
}

export function updateAttendanceRecord(id: number, payload: Partial<Pick<AttendanceRecord, "status" | "remarks">>) {
  return sendJson<AttendanceRecord>(`/api/attendance/${id}`, "PUT", payload);
}

export function saveBulkAttendance(payload: BulkAttendanceInput) {
  return sendJson<{ success: boolean; message: string; count: number; records: AttendanceRecord[] }>(
    "/api/attendance/bulk",
    "POST",
    payload
  );
}
