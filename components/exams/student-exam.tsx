"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { CurrentUser } from "../../lib/auth";
import Loader from "../ui/loader";
import {
  getExamResults,
  listStudentExams,
  listStudentExamSubjects,
  type ExamRecord,
  type ExamResultSubject,
  type ExamResultsResponse,
  type ExamResultStudent,
  type StudentExamSubject,
} from "../../lib/examApi";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

type MarkStatus = "Pass" | "Fail" | "Absent" | "Pending";

function subjectMarkStatus(subject: Pick<ExamResultSubject, "marks_obtained" | "is_absent" | "pass_marks">): MarkStatus {
  if (subject.is_absent) return "Absent";
  if (subject.marks_obtained == null) return "Pending";
  return Number(subject.marks_obtained) >= Number(subject.pass_marks) ? "Pass" : "Fail";
}

function statusClass(status: MarkStatus) {
  if (status === "Pass") return "bg-green-50 text-green-700";
  if (status === "Fail" || status === "Absent") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-800";
}

function gradeForPercentage(percentage: number) {
  if (percentage >= 95) return "O";
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "P";
  return "F";
}

function getOverallResult(subjects: ExamResultSubject[]) {
  const complete = subjects.length > 0 &&
    subjects.every((subject) => subject.is_absent || subject.marks_obtained != null);
  if (!complete) {
    return { status: "Pending" as const, total: null, maxTotal: null, percentage: null, grade: null };
  }

  const total = subjects.reduce(
    (sum, subject) => sum + (subject.is_absent ? 0 : Number(subject.marks_obtained)),
    0
  );
  const maxTotal = subjects.reduce((sum, subject) => sum + Number(subject.max_marks), 0);
  if (maxTotal <= 0) {
    return { status: "Pending" as const, total: null, maxTotal: null, percentage: null, grade: null };
  }
  const percentage = (total / maxTotal) * 100;
  const passed = subjects.every(
    (subject) => !subject.is_absent &&
      subject.marks_obtained != null &&
      Number(subject.marks_obtained) >= Number(subject.pass_marks)
  );

  return {
    status: passed ? "Pass" as const : "Fail" as const,
    total,
    maxTotal,
    percentage,
    grade: gradeForPercentage(percentage),
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function formatExamDate(value: string) {
  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
}

function examDateRange(startDate: string, endDate: string) {
  const start = formatExamDate(startDate);
  return startDate.slice(0, 10) === endDate.slice(0, 10)
    ? start
    : `${start} – ${formatExamDate(endDate)}`;
}

function saveResultAsPdf(result: ExamResultsResponse, student: ExamResultStudent, exam: ExamRecord) {
  const overall = getOverallResult(student.subjects);
  const subjects = student.subjects.map((subject) => `
    <tr>
      <td>${escapeHtml(subject.subject_name)}</td>
      <td>${subject.is_absent ? "Absent" : escapeHtml(String(subject.marks_obtained ?? "—"))}</td>
      <td>${escapeHtml(String(subject.max_marks))}</td>
      <td>${escapeHtml(String(subject.pass_marks))}</td>
      <td>${subjectMarkStatus(subject)}</td>
    </tr>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(result.exam_name)} Result</title>
    <style>
      body{font:14px Arial,sans-serif;color:#0f172a;margin:36px}h1{font-size:24px;margin:0 0 6px}
      .meta{color:#475569;margin:5px 0 22px}.summary{border:1px solid #cbd5e1;padding:14px;margin:16px 0}
      table{border-collapse:collapse;width:100%;margin-top:16px}th,td{border:1px solid #cbd5e1;padding:10px;text-align:left}
      th{background:#f1f5f9}.totals{margin-top:18px;font-weight:bold}
      @media print{body{margin:15mm}}
    </style></head><body>
    <h1>${escapeHtml(result.exam_name)} — Result</h1>
    <p class="meta">Academic year: ${escapeHtml(result.academic_year)} · Status: Published</p>
    <div class="summary"><strong>Student:</strong> ${escapeHtml(student.student_name)}<br>
      <strong>Roll number:</strong> ${escapeHtml(student.roll_number)}<br>
      <strong>Class / section:</strong> Grade ${escapeHtml(String(exam.grade))} · Section ${escapeHtml(String(exam.section))}<br>
      <strong>Exam dates:</strong> ${escapeHtml(examDateRange(exam.start_date, exam.end_date))}<br>
      ${overall.total !== null && overall.maxTotal !== null && overall.percentage !== null && overall.grade !== null
        ? `<strong>Overall result:</strong> ${overall.status} · Grade ${overall.grade} · ${overall.total} / ${overall.maxTotal} (${overall.percentage.toFixed(1)}%)`
        : "<strong>Overall result:</strong> Pending — one or more subject marks are not available."}</div>
    <table><thead><tr><th>Subject</th><th>Marks obtained</th><th>Maximum</th><th>Passing marks</th><th>Status</th></tr></thead>
      <tbody>${subjects}</tbody></table>
    </body></html>`;
  const printWindow = window.open("", "_blank");
  if (!printWindow) throw new Error("Allow pop-ups to print or save your result as a PDF.");
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export default function StudentExam({ user }: { user: CurrentUser }) {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">("upcoming");
  const [selectedExam, setSelectedExam] = useState<ExamRecord | null>(null);
  const [examSubjects, setExamSubjects] = useState<StudentExamSubject[]>([]);
  const [result, setResult] = useState<ExamResultsResponse | null>(null);
  const [student, setStudent] = useState<ExamResultStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingExamId, setLoadingExamId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadExams() {
      setLoading(true);
      setError("");
      try {
        const rows = await listStudentExams();
        if (!cancelled) setExams(rows);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load your examinations.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadExams();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openExam(exam: ExamRecord) {
    setLoadingExamId(exam.id);
    setError("");
    setSelectedExam(null);
    setExamSubjects([]);
    setResult(null);
    setStudent(null);
    try {
      const subjects = await listStudentExamSubjects(exam.id);
      setSelectedExam(exam);
      setExamSubjects(subjects);
      if (exam.status === "published") {
        const response = await getExamResults(exam.id);
        if (response.status !== "published") {
          throw new Error("Results for this examination have not been published.");
        }
        const ownResult = response.students.find(
          (entry) => Number(entry.student_id) === Number(user.person_id)
        );
        if (!ownResult) {
          throw new Error("No published result was returned for your student account.");
        }
        setResult(response);
        setStudent(ownResult);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your examination result.");
    } finally {
      setLoadingExamId(null);
    }
  }

  const upcomingExams = useMemo(
    () => exams.filter((exam) => exam.status === "scheduled"),
    [exams]
  );
  const completedExams = useMemo(
    () => exams.filter((exam) => exam.status === "completed" || exam.status === "published"),
    [exams]
  );
  const visibleExams = activeTab === "upcoming" ? upcomingExams : completedExams;

  const overallResult = student ? getOverallResult(student.subjects) : null;

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Student workspace</p>
          <h1 className="text-2xl font-semibold">Examinations & results</h1>
          <p className="mt-1 text-sm text-slate-600">See your scheduled exams and completed exams. Published results are available here.</p>
        </header>

        {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

        <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3" role="group" aria-label="Filter exams by status">
            <button
              type="button"
              aria-pressed={activeTab === "upcoming"}
              className={activeTab === "upcoming" ? buttonClass : secondaryButtonClass}
              onClick={() => setActiveTab("upcoming")}
            >
              Upcoming <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{upcomingExams.length}</span>
            </button>
            <button
              type="button"
              aria-pressed={activeTab === "completed"}
              className={activeTab === "completed" ? buttonClass : secondaryButtonClass}
              onClick={() => setActiveTab("completed")}
            >
              Completed <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{completedExams.length}</span>
            </button>
          </div>
          {loading ? (
            <Loader title="Loading your exams…" subtitle="Retrieving your examination results" size="sm" />
          ) : visibleExams.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              {activeTab === "upcoming" ? "You have no scheduled exams." : "You have no completed exams yet."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {visibleExams.map((exam) => (
                <li key={exam.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <h2 className="font-semibold">{exam.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Grade {exam.grade} · Section {exam.section} · {exam.academic_year}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Exam dates: {examDateRange(exam.start_date, exam.end_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded px-2 py-1 text-xs font-medium ${exam.status === "published" ? "bg-green-50 text-green-700" : exam.status === "scheduled" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
                      {exam.status === "published" ? "Results published" : exam.status === "completed" ? "Completed · results pending" : "Scheduled"}
                    </span>
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      disabled={loadingExamId !== null}
                      onClick={() => void openExam(exam)}
                    >
                      {loadingExamId === exam.id ? "Loading…" : exam.status === "published" ? "View marks" : "View exam"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {selectedExam && (
          <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
              <div>
                <button
                  type="button"
                  className="mb-2 text-sm text-indigo-700 underline"
                  onClick={() => {
                    setSelectedExam(null);
                    setResult(null);
                    setStudent(null);
                  }}
                >
                  Back to exams
                </button>
                <span className={`rounded px-2 py-1 text-xs font-medium ${selectedExam.status === "published" ? "bg-green-50 text-green-700" : selectedExam.status === "scheduled" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
                  {selectedExam.status === "published" ? "Results published" : selectedExam.status === "completed" ? "Completed · results pending" : "Scheduled"}
                </span>
                <h2 className="mt-2 text-xl font-semibold">{selectedExam.name}</h2>
                <p className="mt-1 text-sm text-slate-600">Grade {selectedExam.grade} · Section {selectedExam.section} · {selectedExam.academic_year}</p>
                <p className="mt-1 text-sm text-slate-600">Exam dates: {examDateRange(selectedExam.start_date, selectedExam.end_date)}</p>
              </div>
              {result && student && (
                <button className={buttonClass} onClick={() => {
                  try {
                    saveResultAsPdf(result, student, selectedExam);
                  } catch (downloadError) {
                    setError(downloadError instanceof Error ? downloadError.message : "Unable to prepare the result for download.");
                  }
                }}><Download size={16} /> Download Result</button>
              )}
            </div>
            {student && overallResult && (
              <div className="border-b border-slate-200 bg-slate-50 p-4">
                <h3 className="font-semibold">Overall examination result</h3>
                {overallResult.total !== null && overallResult.maxTotal !== null && overallResult.percentage !== null && overallResult.grade !== null ? (
                  <>
                    <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                      <div><dt className="text-slate-500">Status</dt><dd><span className={`mt-1 inline-block rounded px-2 py-1 text-xs font-semibold ${statusClass(overallResult.status)}`}>{overallResult.status}</span></dd></div>
                      <div><dt className="text-slate-500">Grade</dt><dd className="font-semibold">{overallResult.grade}</dd></div>
                      <div><dt className="text-slate-500">Total</dt><dd className="font-semibold">{overallResult.total} / {overallResult.maxTotal}</dd></div>
                      <div><dt className="text-slate-500">Percentage</dt><dd className="font-semibold">{overallResult.percentage.toFixed(1)}%</dd></div>
                    </dl>
                    <p className="mt-3 text-xs text-slate-500">Grade scale: O 95–100, A+ 90–94, A 80–89, B+ 70–79, B 60–69, C 50–59, P 40–49, F below 40. Overall Pass requires passing every subject; an absent subject counts as a fail.</p>
                  </>
                ) : <p className="mt-2 text-sm text-amber-800">Overall status: Pending — one or more subject marks are not available yet.</p>}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">Subject</th><th className="px-3 py-3">Exam date</th><th className="px-3 py-3">Maximum marks</th><th className="px-3 py-3">Passing marks</th>{selectedExam.status === "published" && <><th className="px-3 py-3">Your marks</th><th className="px-3 py-3">Status</th></>}</tr></thead>
                <tbody className="divide-y divide-slate-200">{examSubjects.map((subject) => {
                  const mark = student?.subjects.find((item) => item.subject_id === subject.subject_id);
                  return (
                  <tr key={subject.subject_id}>
                    <td className="px-4 py-3 font-medium">{subject.subject_name}</td>
                    <td className="px-3 py-3">{subject.exam_date ? formatExamDate(subject.exam_date) : examDateRange(selectedExam.start_date, selectedExam.end_date)}</td>
                    <td className="px-3 py-3">{subject.max_marks}</td>
                    <td className="px-3 py-3">{subject.pass_marks}</td>
                    {selectedExam.status === "published" && (
                      <>
                        <td className="px-3 py-3">{mark ? (mark.is_absent ? "Absent" : mark.marks_obtained ?? "—") : "—"}</td>
                        <td className="px-3 py-3">
                          {mark ? (
                            <span className={`rounded px-2 py-1 text-xs font-medium ${statusClass(subjectMarkStatus(mark))}`}>
                              {subjectMarkStatus(mark)}
                            </span>
                          ) : (
                            <span className={`rounded px-2 py-1 text-xs font-medium ${statusClass("Pending")}`}>Pending</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );})}</tbody>
              </table>
            </div>
            {selectedExam.status !== "published" && (
              <p className="border-t border-slate-200 p-4 text-sm text-slate-500">Your subject allocations are shown above. Marks obtained will be available after results are published.</p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
