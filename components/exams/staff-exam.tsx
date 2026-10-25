"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, RefreshCw, Search } from "lucide-react";
import {
  completeAssignedEvaluation,
  getAssignedExamProgress,
  getAssignedExamRoster,
  listAssignedExamSubjects,
  saveAssignedStudentMark,
  type AssignedExamSubject,
  type ExamProgress,
  type ExamRosterStudent,
} from "../../lib/examApi";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:bg-slate-100";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const panel = "rounded-lg border border-slate-200 bg-white";

type MarkDraft = {
  marks_obtained: string;
  is_absent: boolean;
  remarks: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed. Please try again.";
}

function markDraft(student: ExamRosterStudent): MarkDraft {
  return {
    marks_obtained: student.marks_obtained == null ? "" : String(student.marks_obtained),
    is_absent: student.is_absent,
    remarks: student.remarks ?? "",
  };
}

export default function StaffExam() {
  const [assignments, setAssignments] = useState<AssignedExamSubject[]>([]);
  const [selected, setSelected] = useState<AssignedExamSubject | null>(null);
  const [students, setStudents] = useState<ExamRosterStudent[]>([]);
  const [drafts, setDrafts] = useState<Record<number, MarkDraft>>({});
  const [progress, setProgress] = useState<ExamProgress | null>(null);
  const [search, setSearch] = useState("");
  const [examFilter, setExamFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadAssignments() {
    setLoading(true);
    setError("");
    try {
      const data = await listAssignedExamSubjects();
      setAssignments(data);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAssignments(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function openAssignment(assignment: AssignedExamSubject, pageOffset = 0) {
    setSelected(assignment);
    setOffset(pageOffset);
    setError("");
    setNotice("");
    setStudents([]);
    setProgress(null);
    try {
      const [roster, subjectProgress] = await Promise.all([
        getAssignedExamRoster(assignment.id, pageOffset, 100),
        getAssignedExamProgress(assignment.id),
      ]);
      setSelected(roster.exam_subject);
      setStudents(roster.students);
      setDrafts(Object.fromEntries(roster.students.map((student) => [student.student_id, markDraft(student)])));
      setHasNext(roster.students.length === 100);
      setProgress(subjectProgress);
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  }

  const filteredAssignments = useMemo(() => assignments.filter((item) => {
    const query = search.trim().toLowerCase();
    return (!query || `${item.exam_name} ${item.subject_name} ${item.grade} ${item.section}`.toLowerCase().includes(query)) &&
      (!examFilter || item.exam_name === examFilter) &&
      (!yearFilter || item.academic_year === yearFilter) &&
      (!sectionFilter || `${item.grade}|${item.section}` === sectionFilter) &&
      (!subjectFilter || item.subject_name === subjectFilter) &&
      (!statusFilter || item.evaluation_status === statusFilter);
  }), [assignments, search, examFilter, yearFilter, sectionFilter, subjectFilter, statusFilter]);

  function setDraft(studentId: number, field: keyof MarkDraft, value: string | boolean) {
    setDrafts((current) => ({
      ...current,
      [studentId]: { ...current[studentId], [field]: value },
    }));
  }

  async function saveStudent(student: ExamRosterStudent) {
    if (!selected) return;
    const draft = drafts[student.student_id] ?? markDraft(student);
    const mark = draft.is_absent ? null : Number(draft.marks_obtained);
    if (!draft.is_absent && (!draft.marks_obtained.trim() || !Number.isFinite(mark) || mark! < 0 || mark! > Number(selected.max_marks))) {
      setError(`Enter marks from 0 to ${selected.max_marks}, or mark the student absent.`);
      return;
    }
    setSaving(student.student_id);
    setError("");
    setNotice("");
    try {
      await saveAssignedStudentMark(selected.id, student.student_id, {
        marks_obtained: mark,
        is_absent: draft.is_absent,
        remarks: draft.remarks.trim() || null,
      });
      const updatedStudent = {
        ...student,
        marks_obtained: mark,
        is_absent: draft.is_absent,
        remarks: draft.remarks.trim() || null,
      };
      setStudents((current) => current.map((item) => item.student_id === student.student_id ? updatedStudent : item));
      setDrafts((current) => ({ ...current, [student.student_id]: markDraft(updatedStudent) }));
      setProgress(await getAssignedExamProgress(selected.id));
      setNotice(`Saved marks for ${student.name}.`);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(null);
    }
  }

  async function completeEvaluation() {
    if (!selected) return;
    if (!window.confirm("Complete this evaluation? Staff edits will be locked once completed.")) return;
    setBusy(true);
    setError("");
    try {
      const nextProgress = await completeAssignedEvaluation(selected.id);
      setProgress(nextProgress);
      await loadAssignments();
      setNotice("Evaluation completed.");
      const updated = assignments.find((item) => item.id === selected.id);
      if (updated) setSelected({ ...updated, evaluation_status: "completed" });
    } catch (completeError) {
      setError(errorMessage(completeError));
    } finally {
      setBusy(false);
    }
  }

  const years = [...new Set(assignments.map((item) => item.academic_year))];
  const exams = [...new Set(assignments.map((item) => item.exam_name))];
  const sections = [...new Set(assignments.map((item) => `${item.grade}|${item.section}`))];
  const subjectNames = [...new Set(assignments.map((item) => item.subject_name))];
  const editable = selected?.exam_status === "scheduled" && selected.evaluation_status !== "completed";
  const pendingCount = progress?.pending_students ?? selected?.student_count ?? 0;

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Staff workspace</p>
            <h1 className="text-2xl font-semibold">My exam evaluations</h1>
            <p className="mt-1 text-sm text-slate-600">Only examination subjects assigned to your staff profile are shown.</p>
          </div>
          <button className={secondaryButton} onClick={() => void loadAssignments()}><RefreshCw size={15} /> Refresh</button>
        </header>
        {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        {notice && <p className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700" role="status">{notice}</p>}

        {!selected ? (
          <section className={`${panel} mt-5`}>
            <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="relative"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input className={`${inputClass} pl-9`} placeholder="Search exam, subject, or class" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
              <select className={inputClass} value={examFilter} onChange={(event) => setExamFilter(event.target.value)}><option value="">All exams</option>{exams.map((name) => <option key={name}>{name}</option>)}</select>
              <select className={inputClass} value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}><option value="">All academic years</option>{years.map((year) => <option key={year}>{year}</option>)}</select>
              <select className={inputClass} value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}><option value="">All sections</option>{sections.map((value) => <option key={value} value={value}>Grade {value.split("|")[0]} · {value.split("|")[1]}</option>)}</select>
              <select className={inputClass} value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}><option value="">All subjects</option>{subjectNames.map((name) => <option key={name}>{name}</option>)}</select>
              <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All evaluation statuses</option>{["pending", "in_progress", "completed"].map((status) => <option key={status}>{status}</option>)}</select>
            </div>
            {loading ? <p className="p-10 text-center text-sm text-slate-500">Loading assigned exams…</p> : filteredAssignments.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">No assigned examination subjects match these filters.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">Exam / year</th><th className="px-3 py-3">Class / section</th><th className="px-3 py-3">Subject</th><th className="px-3 py-3">Exam date</th><th className="px-3 py-3">Marks</th><th className="px-3 py-3">Evaluation</th><th className="px-3 py-3">Progress</th><th className="px-3 py-3">Action</th></tr></thead>
                  <tbody className="divide-y divide-slate-200">{filteredAssignments.map((item) => <tr key={item.id}>
                    <td className="px-4 py-3"><strong>{item.exam_name}</strong><span className="block text-xs text-slate-500">{item.academic_year}</span></td>
                    <td className="px-3 py-3">Grade {item.grade} · {item.section}</td>
                    <td className="px-3 py-3 font-medium">{item.subject_name}</td><td className="px-3 py-3">{item.exam_date ?? "—"}</td>
                    <td className="px-3 py-3">{item.max_marks} max · {item.pass_marks} pass</td>
                    <td className="px-3 py-3">{item.evaluation_status}</td><td className="px-3 py-3">{item.marked_count}/{item.student_count}</td>
                    <td className="px-3 py-3"><button className="text-indigo-700 underline" onClick={() => void openAssignment(item)}>Open</button></td>
                  </tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className={`${panel} mt-5 overflow-hidden`}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <button className="mb-2 inline-flex items-center gap-1 text-sm text-indigo-700" onClick={() => setSelected(null)}><ArrowLeft size={15} /> Assigned exams</button>
                <h2 className="text-lg font-semibold">{selected.exam_name} · {selected.subject_name}</h2>
                <p className="mt-1 text-sm text-slate-600">Grade {selected.grade} · Section {selected.section} · {selected.academic_year} · {selected.exam_date ?? `${selected.start_date} – ${selected.end_date}`}</p>
                <p className="mt-1 text-xs text-slate-500">Maximum {selected.max_marks} · Passing {selected.pass_marks}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-1 text-xs">{progress?.evaluation_status ?? selected.evaluation_status}: {progress?.marked_students ?? selected.marked_count}/{progress?.total_students ?? selected.student_count}</span>
                {editable && <button className={primaryButton} disabled={busy || pendingCount > 0} onClick={() => void completeEvaluation()}><Check size={15} /> Complete evaluation</button>}
              </div>
            </div>
            {!editable && (
              <p className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
                {selected.exam_status !== "scheduled"
                  ? `Marks entry is unavailable while this exam is ${selected.exam_status}. Ask an administrator to schedule the exam before entering marks.`
                  : "This evaluation is completed and locked. Contact an administrator if a correction is needed."}
              </p>
            )}
            {students.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">No students were returned for this page.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">Student</th><th className="px-3 py-3">Roll number</th><th className="px-3 py-3">Marks / absent</th><th className="px-3 py-3">Remarks</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Action</th></tr></thead>
                  <tbody className="divide-y divide-slate-200">{students.map((student) => {
                    const draft = drafts[student.student_id] ?? markDraft(student);
                    const dirty = draft.marks_obtained !== (student.marks_obtained == null ? "" : String(student.marks_obtained)) || draft.is_absent !== student.is_absent || draft.remarks !== (student.remarks ?? "");
                    return <tr key={student.student_id}>
                      <td className="px-4 py-3 font-medium">{student.name}</td><td className="px-3 py-3">{student.roll_number}</td>
                      <td className="px-3 py-2"><div className="flex items-center gap-2"><input aria-label={`Marks for ${student.name}`} type="number" min="0" max={Number(selected.max_marks)} step="0.01" disabled={!editable} className={`${inputClass} w-28`} value={draft.marks_obtained} onChange={(event) => { setDraft(student.student_id, "marks_obtained", event.target.value); if (draft.is_absent) setDraft(student.student_id, "is_absent", false); }} /><label className="flex items-center gap-1.5 whitespace-nowrap text-xs"><input type="checkbox" disabled={!editable} checked={draft.is_absent} onChange={(event) => { setDraft(student.student_id, "is_absent", event.target.checked); if (event.target.checked) setDraft(student.student_id, "marks_obtained", ""); }} />Absent</label></div></td>
                      <td className="px-3 py-2"><input aria-label={`Remarks for ${student.name}`} className={`${inputClass} min-w-40`} maxLength={2000} disabled={!editable} value={draft.remarks} onChange={(event) => setDraft(student.student_id, "remarks", event.target.value)} /></td>
                      <td className="px-3 py-3">{student.is_absent ? "Absent" : student.marks_obtained != null ? "Entered" : "Not entered"}</td>
                      <td className="px-3 py-3"><button className="text-indigo-700 underline disabled:text-slate-400" disabled={!editable || !dirty || saving === student.student_id} onClick={() => void saveStudent(student)}>{saving === student.student_id ? "Saving…" : "Save"}</button></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-200 p-4">
              <p className="text-xs text-slate-500">{editable ? "Unsaved changes are held in this page until you save each student." : "This evaluation is locked or the exam is not scheduled."}</p>
              <div className="flex gap-2">
                <button className={secondaryButton} disabled={offset === 0} onClick={() => void openAssignment(selected, Math.max(0, offset - 100))}>Previous</button>
                <span className="self-center text-xs text-slate-500">Rows {offset + 1}–{offset + students.length}</span>
                <button className={secondaryButton} disabled={!hasNext} onClick={() => void openAssignment(selected, offset + 100)}>Next</button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
