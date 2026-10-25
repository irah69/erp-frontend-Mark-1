import { apiRequest } from "./api";

export type ExamStatus = "draft" | "scheduled" | "completed" | "published";
export type EvaluationStatus = "pending" | "in_progress" | "completed";

export type ExamRecord = {
  id: number;
  name: string;
  academic_year: string;
  grade_id: number;
  grade: string;
  section_id: number;
  section: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: ExamStatus;
  created_by: number;
  created_at: string;
  updated_at: string;
};

export type ExamSubject = {
  id: number;
  exam_id: number;
  subject_id: number;
  subject_code: string;
  subject_name: string;
  max_marks: number | string;
  pass_marks: number | string;
  exam_date: string | null;
  evaluator_staff_id: number;
  evaluator_name: string;
  evaluation_status: EvaluationStatus;
  student_count: number;
  marked_count: number;
  created_at: string;
  updated_at: string;
};

export type AssignedExamSubject = ExamSubject & {
  exam_name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  exam_status: ExamStatus;
  grade_id: number;
  grade: string;
  section: string;
};

export type ExamRosterStudent = {
  student_id: number;
  name: string;
  roll_number: string;
  marks_obtained: number | string | null;
  is_absent: boolean;
  remarks: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ExamRosterResponse = {
  exam_subject: AssignedExamSubject;
  students: ExamRosterStudent[];
};

export type ExamProgress = {
  exam_subject_id: number;
  exam_id: number;
  evaluation_status: EvaluationStatus;
  total_students: number;
  marked_students: number;
  pending_students: number;
};

export type ExamResultSubject = {
  subject_id: number;
  subject_name: string;
  max_marks: number | string;
  pass_marks: number | string;
  marks_obtained: number | string | null;
  is_absent: boolean;
  remarks: string | null;
};

export type ExamResultStudent = {
  student_id: number;
  student_name: string;
  roll_number: string;
  subjects: ExamResultSubject[];
};

export type ExamResultsResponse = {
  exam_id: number;
  exam_name: string;
  academic_year: string;
  status: ExamStatus;
  students: ExamResultStudent[];
};

function queryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
}

export function listExams(params: {
  academic_year?: string;
  grade_id?: number;
  status?: ExamStatus;
  limit?: number;
  offset?: number;
} = {}) {
  const query = queryString(params);
  return apiRequest<ExamRecord[]>(`/api/exams${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });
}

export function createExam(payload: {
  name: string;
  academic_year: string;
  grade_id: number;
  description: string | null;
  start_date: string;
  end_date: string;
}) {
  return apiRequest<ExamRecord>("/api/exams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateExam(
  examId: number,
  payload: Partial<Pick<ExamRecord, "name" | "description" | "start_date" | "end_date">>
) {
  return apiRequest<ExamRecord>(`/api/exams/${examId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteExam(examId: number) {
  return apiRequest<{ success: boolean; message: string }>(`/api/exams/${examId}`, {
    method: "DELETE",
  });
}

export function syncExamRoster(examId: number) {
  return apiRequest<{ exam_id: number; added_students: number; total_students: number }>(
    `/api/exams/${examId}/roster/sync`,
    { method: "POST" }
  );
}

export function listExamSubjects(examId: number) {
  return apiRequest<ExamSubject[]>(`/api/exams/${examId}/subjects`, {
    cache: "no-store",
  });
}

export function addExamSubject(
  examId: number,
  payload: {
    subject_id: number;
    max_marks: number;
    pass_marks: number;
    exam_date: string | null;
    evaluator_staff_id: number;
  }
) {
  return apiRequest<ExamSubject>(`/api/exams/${examId}/subjects`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateExamSubject(
  examId: number,
  examSubjectId: number,
  payload: Partial<Pick<ExamSubject, "max_marks" | "pass_marks" | "exam_date" | "evaluator_staff_id">>
) {
  return apiRequest<ExamSubject>(`/api/exams/${examId}/subjects/${examSubjectId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteExamSubject(examId: number, examSubjectId: number) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/exams/${examId}/subjects/${examSubjectId}`,
    { method: "DELETE" }
  );
}

export function scheduleExam(examId: number) {
  return apiRequest<ExamRecord>(`/api/exams/${examId}/schedule`, {
    method: "POST",
  });
}

export function publishExam(examId: number) {
  return apiRequest<ExamRecord>(`/api/exams/${examId}/publish`, {
    method: "POST",
  });
}

export function getExamProgress(examId: number) {
  return apiRequest<ExamSubject[]>(`/api/exams/${examId}/progress`, {
    cache: "no-store",
  });
}

export function listAssignedExamSubjects(offset = 0, limit = 100) {
  const query = queryString({ limit, offset });
  return apiRequest<AssignedExamSubject[]>(`/api/exams/assigned?${query}`, {
    cache: "no-store",
  });
}

export function getAssignedExamRoster(examSubjectId: number, offset = 0, limit = 500) {
  const query = queryString({ limit, offset });
  return apiRequest<ExamRosterResponse>(
    `/api/exams/assigned/subjects/${examSubjectId}/roster?${query}`,
    { cache: "no-store" }
  );
}

export function getAssignedExamProgress(examSubjectId: number) {
  return apiRequest<ExamProgress>(
    `/api/exams/assigned/subjects/${examSubjectId}/progress`,
    { cache: "no-store" }
  );
}

export function saveAssignedStudentMark(
  examSubjectId: number,
  studentId: number,
  payload: { marks_obtained: number | null; is_absent: boolean; remarks: string | null }
) {
  return apiRequest<ExamRosterStudent>(
    `/api/exams/assigned/subjects/${examSubjectId}/marks/${studentId}`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
}

export function completeAssignedEvaluation(examSubjectId: number) {
  return apiRequest<ExamProgress>(
    `/api/exams/assigned/subjects/${examSubjectId}/complete`,
    { method: "POST" }
  );
}

export function getExamResults(examId: number, offset = 0, limit = 500) {
  const query = queryString({ limit, offset });
  return apiRequest<ExamResultsResponse>(`/api/exams/results/${examId}?${query}`, {
    cache: "no-store",
  });
}

export function correctExamMark(
  examSubjectId: number,
  studentId: number,
  payload: { marks_obtained: number | null; is_absent: boolean; remarks: string | null; reason: string }
) {
  return apiRequest<ExamRosterStudent>(
    `/api/exams/exam-subjects/${examSubjectId}/marks/${studentId}/correction`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
}
