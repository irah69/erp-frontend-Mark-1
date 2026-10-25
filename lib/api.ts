const configuredBackendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim();
const fallbackBackendUrl = process.env.NODE_ENV === "development"
  ? "http://127.0.0.1:8000"
  : "https://erp-backend-1-y2er.onrender.com";

function isPrivateNetworkUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "::1" ||
      /^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  } catch {
    return false;
  }
}

const selectedBackendUrl = configuredBackendUrl &&
  !(process.env.NODE_ENV === "production" && isPrivateNetworkUrl(configuredBackendUrl))
  ? configuredBackendUrl
  : fallbackBackendUrl;

export const API_BASE_URL = selectedBackendUrl.replace(/\/+$/, "");


export type ApiRequestError = Error & {
  status?: number;
};

/* =========================================================
   AUTH
   ========================================================= */

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
  const response = await fetch(
    `${API_BASE_URL}/api/auth/refresh`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    return false;
  }

  const data = await response.json();

  if (!data?.access_token) {
    return false;
  }

  localStorage.setItem(
    "access_token",
    data.access_token
  );

  return true;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  hasRetried = false
): Promise<T> {
  return apiRequestWithResponse<T>(path, options, "json", hasRetried);
}

export function apiRequestBlob(
  path: string,
  options: RequestInit = {},
  hasRetried = false
): Promise<Blob> {
  return apiRequestWithResponse<Blob>(path, options, "blob", hasRetried);
}

async function apiRequestWithResponse<T>(
  path: string,
  options: RequestInit,
  responseType: "json" | "blob",
  hasRetried: boolean
): Promise<T> {
  const token = getAccessToken();

  const headers = new Headers(
    options.headers
  );

  headers.set(
    "Accept",
    responseType === "blob" ? "image/*" : "application/json"
  );

  if (
    typeof FormData !== "undefined" &&
    options.body instanceof FormData
  ) {
    headers.delete("Content-Type");
  } else if (options.body) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers,
      credentials: "include",
    }
  );

  /* =======================================================
     ACCESS TOKEN REFRESH
     ======================================================= */

  if (
    response.status === 401 &&
    !hasRetried &&
    typeof window !== "undefined" &&
    path !== "/api/auth/refresh"
  ) {
    const refreshed =
      await refreshAccessToken();

    if (refreshed) {
      return apiRequestWithResponse<T>(
        path,
        options,
        responseType,
        true
      );
    }

    clearSession();
  }

  /* =======================================================
     ERROR
     ======================================================= */

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    let message =
      "Request failed";

    if (
      typeof data?.detail ===
      "string"
    ) {
      message = data.detail;
    } else if (
      Array.isArray(data?.detail)
    ) {
      message =
        data.detail
          .map(
            (item: {
              msg?: string;
            }) => item.msg
          )
          .filter(Boolean)
          .join(", ") ||
        message;
    }

    const error =
      new Error(
        message
      ) as ApiRequestError;

    error.status =
      response.status;

    throw error;
  }

  return (responseType === "blob"
    ? await response.blob()
    : await response.json().catch(() => ({}))) as T;
}

/* =========================================================
   AUTH / CURRENT USER
   ========================================================= */

export type CurrentUserResponse = {
  id: number;
  email: string;
  username: string;
  person_id: number | null;
  role_id: number;
  is_active: boolean;
};

export function getCurrentUser() {
  return apiRequest<CurrentUserResponse>(
    "/api/auth/me"
  );
}

export type UserProfileFields = {
  full_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  mother_tongue: string | null;
  religion: string | null;
  caste_category: string | null;
  aadhaar_number: string | null;
  identification_mark_1: string | null;
  identification_mark_2: string | null;
  mobile_number: string | null;
  alternate_mobile_number: string | null;
  email_address: string | null;
  father_name: string | null;
  father_mobile_number: string | null;
  father_occupation: string | null;
  mother_name: string | null;
  mother_mobile_number: string | null;
  mother_occupation: string | null;
  spouse_guardian_name: string | null;
  spouse_guardian_mobile_number: string | null;
  annual_family_income: string | null;
  present_house_flat_number: string | null;
  present_street_locality: string | null;
  present_village_town_city: string | null;
  present_mandal_sub_district: string | null;
  present_district: string | null;
  present_state: string | null;
  present_pin_code: string | null;
  present_country: string | null;
  same_as_present_address: boolean;
  permanent_house_flat_number: string | null;
  permanent_street_locality: string | null;
  permanent_village_town_city: string | null;
  permanent_mandal_sub_district: string | null;
  permanent_district: string | null;
  permanent_state: string | null;
  permanent_pin_code: string | null;
  permanent_country: string | null;
};

export type UserProfile = UserProfileFields & {
  user_id: number;
  image_id: number | null;
  updated_at: string | null;
};

export type UserProfileUpdate = Partial<
  Omit<UserProfileFields, "annual_family_income"> & {
    annual_family_income: string | number | null;
  }
>;

export function getMyUserProfile() {
  return apiRequest<UserProfile>("/api/user-details/me", {
    cache: "no-store",
  });
}

export function updateMyUserProfile(update: UserProfileUpdate) {
  return apiRequest<UserProfile>("/api/user-details/me", {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}

export function getUserProfile(userId: number) {
  return apiRequest<UserProfile>(`/api/user-details/${userId}`, {
    cache: "no-store",
  });
}

export function updateUserProfile(userId: number, update: UserProfileUpdate) {
  return apiRequest<UserProfile>(`/api/user-details/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}

export function getUserProfileImage(imageId: number) {
  return apiRequestBlob(`/api/user-images/${imageId}`, {
    headers: {
      Accept: "image/*",
    },
    cache: "no-store",
  });
}

export function uploadUserProfileImage(userId: number, file: File) {
  const body = new FormData();
  body.append("file", file);

  return apiRequest<unknown>(`/api/user-images/users/${userId}`, {
    method: "PUT",
    body,
  });
}

export type ClassRosterStudent = {
  id: number;
  user_id: number | null;
  name: string;
  roll_number: string;
  admission_date: string | null;
  parent_name: string | null;
  mobile_number: string | null;
  grade: string | null;
  section: string | null;
  status: string;
  created_at: string | null;
};

export type ClassRoster = {
  academic_year: string;
  grade: string;
  section: string;
  count: number;
  students: ClassRosterStudent[];
};

export function getClassStudents(args: {
  grade: string;
  section: string;
  academic_year: string;
}) {
  const query = new URLSearchParams({
    grade: args.grade,
    section: args.section,
    academic_year: args.academic_year,
  });

  return apiRequest<ClassRoster>(
    `/api/classes/students?${query.toString()}`,
    { cache: "no-store" }
  );
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

/* =========================================================
   STUDENT
   ========================================================= */

export type StudentRecord = {
  id: number;

  name: string;

  roll_number: string;

  /*
   * These IDs are important for the student schedule.
   *
   * person_id from auth/me
   *        ↓
   * student.id
   *        ↓
   * grade_id + section_id
   *        ↓
   * student's timetable
   */
  grade_id?: number | null;

  section_id?: number | null;

  /*
   * Display values
   */
  grade?: string | null;

  section?: string | null;

  status?: string;
};

/* =========================================================
   GRADE
   One row = one class in one academic year.
   ========================================================= */

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
   One row = one weekly slot.
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
   Subject and staff are stored here.
   ========================================================= */

export type ClassSessionRecord = {
  id: number;

  timetable_id: number;

  subject_id: number;

  staff_id: number;

  session_date: string;

  academic_year?: string | null;

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

  academic_year?: string | null;

  status: AttendanceStatus;

  remarks?: string | null;
};

/* =========================================================
   INPUT TYPES
   ========================================================= */

export type TimetableInput =
  Omit<
    TimetableRecord,
    "id"
  >;

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

export type ClassSessionInput =
  Omit<
    ClassSessionRecord,
    "id"
  >;

export type BulkAttendanceInput = {
  session_id: number;

  records: Array<
    Pick<
      AttendanceRecord,
      "student_id" | "status"
    > & {
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
  return apiRequest<T>(
    path,
    {
      method,
      body: JSON.stringify(body),
    }
  );
}

/* =========================================================
   SCHEDULING ENDPOINTS
   ========================================================= */

export function getSchedulingSections() {
  return apiRequest<
    SectionOption[]
  >("/api/sections");
}

export function getSchedulingStaff() {
  return apiRequest<
    StaffOption[]
  >("/api/staff");
}

export function getSchedulingSubjects() {
  return apiRequest<
    SubjectOption[]
  >("/api/subjects");
}

export function getSchedulingGrades() {
  return apiRequest<
    GradeOption[]
  >("/api/grades");
}

export function getSchedulingStudents() {
  return apiRequest<
    | {
        students?: StudentRecord[];
      }
    | StudentRecord[]
  >("/api/students");
}

/* =========================================================
   TIMETABLE ENDPOINTS
   ========================================================= */

export function getTimetables() {
  return apiRequest<
    TimetableRecord[]
  >(
    "/api/scheduling/timetables"
  );
}

/* Create / re-open timetable */
export function openTimetable(
  payload: TimetableOpenInput
) {
  return sendJson<
    TimetableRecord[]
  >(
    "/api/scheduling/timetables/open",
    "POST",
    payload
  );
}

/* Assign subject + staff to timetable slot */
export function assignTimetableSlot(
  id: number,
  payload: TimetableAssignmentInput
) {
  return sendJson<
    TimetableRecord
  >(
    `/api/scheduling/timetables/${id}/assignment`,
    "PUT",
    payload
  );
}

export function createTimetable(
  payload: TimetableInput
) {
  return sendJson<
    TimetableRecord
  >(
    "/api/scheduling/timetables",
    "POST",
    payload
  );
}

export function updateTimetable(
  id: number,
  payload: Partial<TimetableInput>
) {
  return sendJson<
    TimetableRecord
  >(
    `/api/scheduling/timetables/${id}`,
    "PUT",
    payload
  );
}

export function removeTimetable(
  id: number
) {
  return apiRequest<{
    success: boolean;
    message: string;
    id: number;
  }>(
    `/api/scheduling/timetables/${id}`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   CLASS SESSION ENDPOINTS
   ========================================================= */

export function getClassSessions() {
  return apiRequest<
    ClassSessionRecord[]
  >(
    "/api/scheduling/sessions"
  );
}

/* Generate dated sessions */
export function generateClassSessions(
  payload: SessionGenerateInput
) {
  return sendJson<
    SessionGenerateResult
  >(
    "/api/scheduling/sessions/generate",
    "POST",
    payload
  );
}

export function createClassSession(
  payload: ClassSessionInput
) {
  return sendJson<
    ClassSessionRecord
  >(
    "/api/scheduling/sessions",
    "POST",
    payload
  );
}

export function updateClassSession(
  id: number,
  payload: Partial<ClassSessionInput>
) {
  return sendJson<
    ClassSessionRecord
  >(
    `/api/scheduling/sessions/${id}`,
    "PUT",
    payload
  );
}

export function removeClassSession(
  id: number
) {
  return apiRequest<{
    success: boolean;
    message: string;
    id: number;
  }>(
    `/api/scheduling/sessions/${id}`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   ATTENDANCE ENDPOINTS
   ========================================================= */

export function getAttendanceRecords(academicYear?: string) {
  const query = academicYear
    ? `?${new URLSearchParams({ academic_year: academicYear }).toString()}`
    : "";
  return apiRequest<
    AttendanceRecord[]
  >(`/api/attendance${query}`, { cache: "no-store" });
}

export function updateAttendanceRecord(
  id: number,
  payload: Partial<
    Pick<
      AttendanceRecord,
      "status" | "remarks"
    >
  >
) {
  return sendJson<
    AttendanceRecord
  >(
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
