"use client";

import { FormEvent, useState } from "react";
import { Download, Search } from "lucide-react";
import type { CurrentUser } from "../../lib/auth";
import { getExamResults, type ExamResultsResponse, type ExamResultStudent } from "../../lib/examApi";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function saveResultAsPdf(result: ExamResultsResponse, student: ExamResultStudent) {
  const subjects = student.subjects.map((subject) => `
    <tr>
      <td>${escapeHtml(subject.subject_name)}</td>
      <td>${subject.is_absent ? "Absent" : escapeHtml(String(subject.marks_obtained ?? "—"))}</td>
      <td>${escapeHtml(String(subject.max_marks))}</td>
      <td>${escapeHtml(String(subject.pass_marks))}</td>
    </tr>`).join("");
  const allMarksPresent = student.subjects.length > 0 &&
    student.subjects.every((subject) => !subject.is_absent && subject.marks_obtained !== null);
  const total = allMarksPresent
    ? student.subjects.reduce((sum, subject) => sum + (subject.is_absent ? 0 : Number(subject.marks_obtained)), 0)
    : null;
  const maxTotal = allMarksPresent
    ? student.subjects.reduce((sum, subject) => sum + Number(subject.max_marks), 0)
    : null;
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
      <strong>Class / section:</strong> Not provided by the exam result API</div>
    <table><thead><tr><th>Subject</th><th>Marks obtained</th><th>Maximum</th><th>Passing marks</th></tr></thead>
      <tbody>${subjects}</tbody></table>
    ${total !== null && maxTotal !== null
      ? `<p class="totals">Total: ${total} / ${maxTotal} · Percentage: ${maxTotal > 0 ? (total / maxTotal * 100).toFixed(1) : "—"}%</p>`
      : "<p class=\"totals\">Totals are unavailable because one or more marks are incomplete.</p>"}
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
  const [examId, setExamId] = useState("");
  const [result, setResult] = useState<ExamResultsResponse | null>(null);
  const [student, setStudent] = useState<ExamResultStudent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function findResult(event: FormEvent) {
    event.preventDefault();
    const id = Number(examId);
    if (!Number.isInteger(id) || id < 1) {
      setError("Enter a valid examination ID.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setStudent(null);
    try {
      const response = await getExamResults(id);
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
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your examination result.");
    } finally {
      setLoading(false);
    }
  }

  const completeMarks = student?.subjects.every(
    (subject) => !subject.is_absent && subject.marks_obtained !== null
  ) ?? false;
  const totalMarks = student && completeMarks
    ? student.subjects.reduce((sum, subject) => sum + (subject.is_absent ? 0 : Number(subject.marks_obtained)), 0)
    : null;
  const maxMarks = student && completeMarks
    ? student.subjects.reduce((sum, subject) => sum + Number(subject.max_marks), 0)
    : null;

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Student workspace</p>
          <h1 className="text-2xl font-semibold">Examinations & results</h1>
          <p className="mt-1 text-sm text-slate-600">View your own result after it has been published.</p>
        </header>

        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="note">
          The current backend does not provide students with an exam-list endpoint. Enter an exam ID to check your result; unpublished results are rejected by the API.
        </div>

        <form onSubmit={(event) => void findResult(event)} className="mt-4 flex max-w-xl flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="student-exam-id">Examination ID</label>
          <input id="student-exam-id" className={inputClass} type="number" min="1" required placeholder="Examination ID" value={examId} onChange={(event) => setExamId(event.target.value)} />
          <button className={buttonClass} disabled={loading}><Search size={16} />{loading ? "Checking…" : "View result"}</button>
        </form>

        {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

        {result && student && (
          <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
              <div>
                <span className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700">Results published</span>
                <h2 className="mt-2 text-xl font-semibold">{result.exam_name}</h2>
                <p className="mt-1 text-sm text-slate-600">Academic year {result.academic_year}</p>
                <p className="mt-1 text-sm text-slate-600">{student.student_name} · Roll number {student.roll_number}</p>
              </div>
              <button className={buttonClass} onClick={() => {
                try {
                  saveResultAsPdf(result, student);
                } catch (downloadError) {
                  setError(downloadError instanceof Error ? downloadError.message : "Unable to prepare the result for download.");
                }
              }}><Download size={16} /> Download Result</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">Subject</th><th className="px-3 py-3">Marks obtained</th><th className="px-3 py-3">Maximum</th><th className="px-3 py-3">Passing marks</th><th className="px-3 py-3">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-200">{student.subjects.map((subject) => (
                  <tr key={subject.subject_id}>
                    <td className="px-4 py-3 font-medium">{subject.subject_name}</td>
                    <td className="px-3 py-3">{subject.is_absent ? "Absent" : subject.marks_obtained ?? "—"}</td>
                    <td className="px-3 py-3">{subject.max_marks}</td>
                    <td className="px-3 py-3">{subject.pass_marks}</td>
                    <td className="px-3 py-3">{subject.is_absent ? "Absent" : subject.marks_obtained == null ? "Not available" : "Published"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="border-t border-slate-200 p-4">
              {totalMarks !== null && maxMarks !== null && maxMarks > 0 ? (
                <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <div><dt className="text-slate-500">Total</dt><dd className="font-semibold">{totalMarks} / {maxMarks}</dd></div>
                  <div><dt className="text-slate-500">Percentage</dt><dd className="font-semibold">{(totalMarks / maxMarks * 100).toFixed(1)}%</dd></div>
                </dl>
              ) : <p className="text-sm text-slate-500">Totals are unavailable because one or more subject marks are incomplete.</p>}
              <p className="mt-2 text-xs text-slate-500">Class/section is not included in the current result response. Pass/fail is not calculated because the backend does not provide an overall result status.</p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
