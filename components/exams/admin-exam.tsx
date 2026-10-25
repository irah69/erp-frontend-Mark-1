"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import {
  getSchedulingGrades,
  getSchedulingSections,
  getSchedulingStaff,
  getSchedulingSubjects,
  type GradeOption,
  type SectionOption,
  type StaffOption,
  type SubjectOption,
} from "../../lib/api";
import {
  addExamSubject,
  correctExamMark,
  createExam,
  deleteExam,
  deleteExamSubject,
  getExamProgress,
  getExamResults,
  listExams,
  listExamSubjects,
  overridePublishExam,
  publishExam,
  scheduleExam,
  syncExamRoster,
  updateExam,
  updateExamSubject,
  type ExamRecord,
  type ExamResultStudent,
  type ExamStatus,
  type ExamSubject,
} from "../../lib/examApi";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const panel = "rounded-lg border border-slate-200 bg-white";

type ExamForm = {
  name: string;
  academic_year: string;
  grade_id: string;
  description: string;
  start_date: string;
  end_date: string;
};

type SubjectForm = {
  subject_id: string;
  max_marks: string;
  pass_marks: string;
  exam_date: string;
  evaluator_staff_id: string;
};

const emptyExamForm: ExamForm = {
  name: "",
  academic_year: "",
  grade_id: "",
  description: "",
  start_date: "",
  end_date: "",
};
const emptySubjectForm: SubjectForm = {
  subject_id: "",
  max_marks: "100",
  pass_marks: "35",
  exam_date: "",
  evaluator_staff_id: "",
};

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function statusClass(status: string) {
  if (status === "published" || status === "completed") return "bg-green-50 text-green-700";
  if (status === "scheduled" || status === "in_progress") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default function AdminExam() {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [subjectsOptions, setSubjectsOptions] = useState<SubjectOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [selected, setSelected] = useState<ExamRecord | null>(null);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [results, setResults] = useState<ExamResultStudent[]>([]);
  const [reviewSubjectId, setReviewSubjectId] = useState("");
  const [form, setForm] = useState<ExamForm>(emptyExamForm);
  const [subjectForm, setSubjectForm] = useState<SubjectForm>(emptySubjectForm);
  const [subjectDrafts, setSubjectDrafts] = useState<Record<number, SubjectForm>>({});
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadExams() {
    const data = await listExams({ limit: 100 });
    setExams(data);
  }

  async function loadDetail(exam: ExamRecord) {
    setSelected(exam);
    setError("");
    setNotice("");
    try {
      const [subjectRows, resultRows] = await Promise.all([
        listExamSubjects(exam.id),
        getExamResults(exam.id),
      ]);
      setSubjects(subjectRows);
      setResults(resultRows.students ?? []);
      setReviewSubjectId("");
      setSubjectDrafts(Object.fromEntries(subjectRows.map((subject) => [
        subject.id,
        {
          subject_id: String(subject.subject_id),
          max_marks: String(subject.max_marks),
          pass_marks: String(subject.pass_marks),
          exam_date: subject.exam_date ?? "",
          evaluator_staff_id: String(subject.evaluator_staff_id),
        },
      ])));
    } catch (loadError) {
      setSubjects([]);
      setResults([]);
      setError(messageOf(loadError, "Unable to load examination details."));
    }
  }

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [gradeRows, sectionRows, subjectRows, staffRows] = await Promise.all([
        getSchedulingGrades(),
        getSchedulingSections(),
        getSchedulingSubjects(),
        getSchedulingStaff(),
      ]);
      setGrades(gradeRows);
      setSections(sectionRows);
      setSubjectsOptions(subjectRows);
      setStaff(staffRows);
      await loadExams();
      if (selected) {
        const updated = exams.find((exam) => exam.id === selected.id) ?? selected;
        await loadDetail(updated);
      }
    } catch (loadError) {
      setError(messageOf(loadError, "Unable to load exams."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function initialLoad() {
      try {
        const [gradeRows, sectionRows, subjectRows, staffRows, examRows] = await Promise.all([
          getSchedulingGrades(),
          getSchedulingSections(),
          getSchedulingSubjects(),
          getSchedulingStaff(),
          listExams({ limit: 100 }),
        ]);
        if (cancelled) return;
        setGrades(gradeRows);
        setSections(sectionRows);
        setSubjectsOptions(subjectRows);
        setStaff(staffRows);
        setExams(examRows);
      } catch (loadError) {
        if (!cancelled) setError(messageOf(loadError, "Unable to load exams."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void initialLoad();
    return () => { cancelled = true; };
  }, []);

  const years = [...new Set(exams.map((exam) => exam.academic_year))].sort().reverse();
  const visibleExams = useMemo(() => exams.filter((exam) => {
    const query = search.trim().toLowerCase();
    return (!query || `${exam.name} ${exam.grade} ${exam.section}`.toLowerCase().includes(query)) &&
      (!yearFilter || exam.academic_year === yearFilter) &&
      (!sectionFilter || String(exam.grade_id) === sectionFilter) &&
      (!statusFilter || exam.status === statusFilter);
  }), [exams, search, yearFilter, sectionFilter, statusFilter]);

  function startCreate() {
    setForm(emptyExamForm);
    setCreating(true);
    setEditing(false);
    setSelected(null);
  }

  function startEdit(exam: ExamRecord) {
    setForm({
      name: exam.name,
      academic_year: exam.academic_year,
      grade_id: String(exam.grade_id),
      description: exam.description ?? "",
      start_date: exam.start_date.slice(0, 10),
      end_date: exam.end_date.slice(0, 10),
    });
    setEditing(true);
    setCreating(false);
  }

  async function submitExam(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.academic_year.trim() || !form.grade_id) {
      setError("Enter an exam name and year, and select a class.");
      return;
    }
    if (!form.start_date || !form.end_date || form.end_date < form.start_date) {
      setError("Enter a valid date range.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (creating) {
        const created = await createExam({
          name: form.name.trim(),
          academic_year: form.academic_year.trim(),
          grade_id: Number(form.grade_id),
          description: form.description.trim() || null,
          start_date: form.start_date,
          end_date: form.end_date,
        });
        await loadExams();
        setNotice("Draft examination created. Add subjects before scheduling.");
        setCreating(false);
        await loadDetail(created);
      } else if (selected) {
        const updated = await updateExam(selected.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          start_date: form.start_date,
          end_date: form.end_date,
        });
        await loadExams();
        await loadDetail(updated);
        setEditing(false);
        setNotice("Examination updated.");
      }
    } catch (saveError) {
      setError(messageOf(saveError, "Unable to save the examination."));
    } finally {
      setBusy(false);
    }
  }

  async function addSubject(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const max = Number(subjectForm.max_marks);
    const pass = Number(subjectForm.pass_marks);
    if (!subjectForm.subject_id || !activeStaff.some((member) => String(member.id) === subjectForm.evaluator_staff_id) || !Number.isFinite(max) || max <= 0 || pass < 0 || pass > max) {
      setError("Select a subject and evaluator, and ensure passing marks are between zero and maximum marks.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await addExamSubject(selected.id, {
        subject_id: Number(subjectForm.subject_id),
        max_marks: max,
        pass_marks: pass,
        exam_date: subjectForm.exam_date || null,
        evaluator_staff_id: Number(subjectForm.evaluator_staff_id),
      });
      await loadDetail(selected);
      setSubjectForm(emptySubjectForm);
      setNotice("Subject added to the examination.");
    } catch (saveError) {
      setError(messageOf(saveError, "Unable to add the subject."));
    } finally {
      setBusy(false);
    }
  }

  async function saveSubject(subject: ExamSubject) {
    if (!selected) return;
    const draft = subjectDrafts[subject.id];
    const max = Number(draft.max_marks);
    const pass = Number(draft.pass_marks);
    if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(pass) || pass < 0 || pass > max) {
      setError(`Check marks limits for ${subject.subject_name}.`);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await updateExamSubject(
        selected.id,
        subject.id,
        selected.status === "scheduled"
          ? { evaluator_staff_id: Number(draft.evaluator_staff_id) }
          : {
              max_marks: max,
              pass_marks: pass,
              exam_date: draft.exam_date || null,
              evaluator_staff_id: Number(draft.evaluator_staff_id),
            }
      );
      await loadDetail(selected);
      setNotice(`Settings saved for ${subject.subject_name}.`);
    } catch (saveError) {
      const message = messageOf(saveError, "Unable to update subject settings.");
      const selectedStaff = staff.find((member) => member.id === Number(draft.evaluator_staff_id));
      setError(
        message.toLowerCase().includes("active evaluating staff member")
          ? `${message} Ensure ${selectedStaff?.name ?? "the selected staff member"} is active and has an active Staff user account linked to their staff profile.`
          : message
      );
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: () => Promise<unknown>, success: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await loadExams();
      if (selected) {
        const refreshed = await listExams({ limit: 100 });
        setExams(refreshed);
        const current = refreshed.find((exam) => exam.id === selected.id);
        if (current) await loadDetail(current);
      }
      setNotice(success);
    } catch (actionError) {
      setError(messageOf(actionError, "The examination action failed."));
    } finally {
      setBusy(false);
    }
  }

  function updateSubjectDraft(id: number, field: keyof SubjectForm, value: string) {
    setSubjectDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  }

  const selectedGrade = grades.find((grade) => String(grade.id) === form.grade_id);
  const activeStaff = staff.filter((member) => member.status?.toLowerCase() === "active");
  const reviewSubjects = reviewSubjectId
    ? subjects.filter((subject) => String(subject.subject_id) === reviewSubjectId)
    : subjects;
  const sectionLabel = (exam: ExamRecord) =>
    sections.find((section) => section.id === exam.section_id)?.section ?? exam.section;

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Admin workspace</p>
            <h1 className="text-2xl font-semibold">Examinations & marks</h1>
            <p className="mt-1 text-sm text-slate-600">Create exams, configure evaluation, review progress, and publish results.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className={secondaryButton} onClick={() => void refresh()} disabled={busy}>
              <RefreshCw size={15} /> Refresh
            </button>
            <button type="button" className={primaryButton} onClick={startCreate}>
              <Plus size={16} /> Create exam
            </button>
          </div>
        </header>

        {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        {notice && <p className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700" role="status">{notice}</p>}

        {(creating || editing) && (
          <form onSubmit={(event) => void submitExam(event)} className={`${panel} mt-5 p-4 sm:p-5`}>
            <h2 className="text-lg font-semibold">{creating ? "Create draft examination" : "Edit draft examination"}</h2>
            <p className="mt-1 text-xs text-slate-500">Status is controlled by the backend lifecycle (draft → scheduled → completed → published).</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-medium">Exam name<input className={`${inputClass} mt-1`} maxLength={150} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label className="text-sm font-medium">Academic year<input className={`${inputClass} mt-1`} required maxLength={20} placeholder="2026-2027" disabled={!creating} value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} /></label>
              <label className="text-sm font-medium">Class & section
                <select className={`${inputClass} mt-1`} required disabled={!creating} value={form.grade_id} onChange={(e) => {
                  const grade = grades.find((item) => String(item.id) === e.target.value);
                  setForm({ ...form, grade_id: e.target.value, academic_year: grade?.academic_year ?? form.academic_year });
                }}>
                  <option value="">Choose class</option>
                  {grades.filter((grade) => grade.status?.toLowerCase() === "active").map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      Grade {grade.grade} · {sections.find((section) => section.id === grade.section_id)?.section ?? "Section"} · {grade.academic_year}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">Start date<input type="date" className={`${inputClass} mt-1`} required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></label>
              <label className="text-sm font-medium">End date<input type="date" className={`${inputClass} mt-1`} required min={form.start_date || undefined} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></label>
              <label className="text-sm font-medium sm:col-span-2 lg:col-span-3">Description<textarea className={`${inputClass} mt-1`} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            </div>
            {selectedGrade && <p className="mt-2 text-xs text-slate-500">Backend class: Grade {selectedGrade.grade}, section {sections.find((s) => s.id === selectedGrade.section_id)?.section ?? "—"}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={secondaryButton} onClick={() => { setCreating(false); setEditing(false); }}>Cancel</button>
              <button className={primaryButton} disabled={busy}>{busy ? "Saving…" : "Save exam"}</button>
            </div>
          </form>
        )}

        {!selected ? (
          <section className={`${panel} mt-5`}>
            <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="relative"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input className={`${inputClass} pl-9`} placeholder="Search exam name or class" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
              <select className={inputClass} value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}><option value="">All academic years</option>{years.map((year) => <option key={year}>{year}</option>)}</select>
              <select className={inputClass} value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}><option value="">All sections</option>{grades.map((grade) => <option key={grade.id} value={grade.id}>Grade {grade.grade} · {sections.find((section) => section.id === grade.section_id)?.section ?? "—"} · {grade.academic_year}</option>)}</select>
              <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All statuses</option>{(["draft", "scheduled", "completed", "published"] as ExamStatus[]).map((status) => <option key={status}>{status}</option>)}</select>
            </div>
            {loading ? <p className="p-10 text-center text-sm text-slate-500">Loading examinations…</p> : visibleExams.length === 0 ? (
              <p className="p-10 text-center text-sm text-slate-500">No examinations match your filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">Exam</th><th className="px-3 py-3">Academic year</th><th className="px-3 py-3">Class / section</th><th className="px-3 py-3">Exam dates</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Subjects</th><th className="px-3 py-3">Evaluation progress</th><th className="px-3 py-3">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-200">
                    {visibleExams.map((exam) => (
                      <tr key={exam.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3"><button className="font-semibold text-indigo-700 hover:underline" onClick={() => void loadDetail(exam)}>{exam.name}</button></td>
                        <td className="px-3 py-3">{exam.academic_year}</td>
                        <td className="px-3 py-3">Grade {exam.grade} · {sectionLabel(exam)}</td>
                        <td className="px-3 py-3">{exam.start_date} – {exam.end_date}</td>
                        <td className="px-3 py-3"><span className={`rounded px-2 py-1 text-xs font-medium ${statusClass(exam.status)}`}>{exam.status}</span></td>
                        <td className="px-3 py-3"><button className="text-indigo-700 underline" onClick={() => void loadDetail(exam)}>Open details</button></td>
                        <td className="px-3 py-3">Open exam to review</td>
                        <td className="px-3 py-3"><div className="flex gap-2"><button className="text-indigo-700 underline" onClick={() => void loadDetail(exam)}>Manage</button>{exam.status === "draft" && <button className="text-red-700 underline" onClick={() => void runAction(() => deleteExam(exam.id), "Draft examination deleted.", "Delete this draft examination? Exams with marks cannot be deleted.")}>Delete</button>}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <div className="mt-5 space-y-4">
            <div className={`${panel} flex flex-wrap items-start justify-between gap-3 p-4`}>
              <div>
                <button className="mb-2 inline-flex items-center gap-1 text-sm text-indigo-700" onClick={() => { setSelected(null); setError(""); setNotice(""); }}><ArrowLeft size={15} /> All exams</button>
                <h2 className="text-xl font-semibold">{selected.name}</h2>
                <p className="mt-1 text-sm text-slate-600">Grade {selected.grade} · Section {sectionLabel(selected)} · {selected.academic_year} · {selected.start_date} – {selected.end_date}</p>
                <span className={`mt-2 inline-block rounded px-2 py-1 text-xs font-medium ${statusClass(selected.status)}`}>{selected.status}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.status === "draft" && <button className={secondaryButton} onClick={() => startEdit(selected)}>Edit exam</button>}
                {selected.status === "draft" && <button className={secondaryButton} disabled={busy} onClick={() => void runAction(() => syncExamRoster(selected.id), "Draft roster synchronized.")}><RefreshCw size={15} /> Sync roster</button>}
                {selected.status === "draft" && <button className={primaryButton} disabled={busy || subjects.length === 0} onClick={() => void runAction(() => scheduleExam(selected.id), "Examination scheduled.", "Schedule this exam? Its configuration will be locked.")}>Schedule exam</button>}
                {selected.status === "completed" && <button className={primaryButton} disabled={busy} onClick={() => void runAction(() => publishExam(selected.id), "Results published.", "Publish these results for students?")}>Publish results</button>}
                {selected.status === "scheduled" && <button className={primaryButton} disabled={busy || !subjects.some((subject) => subject.marked_count > 0)} onClick={() => void runAction(() => overridePublishExam(selected.id), "Entered marks published early.", "Publish entered marks now, before the exam schedule is complete? Students will see marks already entered; missing marks will remain unavailable, and staff evaluation will be locked.")}>Publish marks now</button>}
              </div>
            </div>

            <section className={`${panel} overflow-hidden`}>
              <div className="border-b border-slate-200 p-4">
                <h3 className="font-semibold">Subjects and evaluator progress</h3>
                <p className="mt-1 text-xs text-slate-500">Assign an evaluator separately for each subject. Choose an active staff member on each row and save that subject’s assignment. Evaluators also need an active Staff user account linked to their profile.</p>
              </div>
              {subjects.length === 0 ? <p className="p-6 text-sm text-slate-500">No subjects configured yet.</p> : <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">Subject</th><th className="px-3 py-3">Exam date</th><th className="px-3 py-3">Maximum</th><th className="px-3 py-3">Passing</th><th className="px-3 py-3">Evaluator</th><th className="px-3 py-3">Progress</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Action</th></tr></thead>
                  <tbody className="divide-y divide-slate-200">{subjects.map((subject) => {
                    const draft = subjectDrafts[subject.id] ?? emptySubjectForm;
                    const editable = selected.status === "draft" || (selected.status === "scheduled" && subject.evaluation_status !== "completed");
                    const evaluatorOnly = selected.status === "scheduled";
                    return <tr key={subject.id}>
                      <td className="px-4 py-3 font-medium">{subject.subject_name}<span className="ml-1 text-xs text-slate-500">{subject.subject_code}</span></td>
                      <td className="px-3 py-2"><input type="date" className={inputClass} disabled={!editable || evaluatorOnly} value={draft.exam_date} onChange={(e) => updateSubjectDraft(subject.id, "exam_date", e.target.value)} /></td>
                      <td className="px-3 py-2"><input type="number" min="0.01" step="0.01" className={`${inputClass} w-24`} disabled={!editable || evaluatorOnly} value={draft.max_marks} onChange={(e) => updateSubjectDraft(subject.id, "max_marks", e.target.value)} /></td>
                      <td className="px-3 py-2"><input type="number" min="0" step="0.01" className={`${inputClass} w-24`} disabled={!editable || evaluatorOnly} value={draft.pass_marks} onChange={(e) => updateSubjectDraft(subject.id, "pass_marks", e.target.value)} /></td>
                      <td className="px-3 py-2"><select className={`${inputClass} min-w-44`} disabled={!editable} value={draft.evaluator_staff_id} onChange={(e) => updateSubjectDraft(subject.id, "evaluator_staff_id", e.target.value)}>{[...activeStaff, ...staff.filter((member) => String(member.id) === draft.evaluator_staff_id && member.status?.toLowerCase() !== "active")].map((member) => <option key={member.id} value={member.id}>{member.name}{member.status?.toLowerCase() === "active" ? "" : " (inactive — choose active staff)"}</option>)}</select><small className="block text-xs text-slate-500">{subject.evaluator_name}</small></td>
                      <td className="px-3 py-3">{subject.marked_count}/{subject.student_count} students</td>
                      <td className="px-3 py-3"><span className={`rounded px-2 py-1 text-xs ${statusClass(subject.evaluation_status)}`}>{subject.evaluation_status}</span></td>
                      <td className="px-3 py-2"><div className="flex gap-2"><button aria-label={`Save assignment for ${subject.subject_name}`} className="text-indigo-700 underline disabled:text-slate-400" disabled={!editable || busy} onClick={() => void saveSubject(subject)}>{selected.status === "scheduled" ? "Save assignment" : "Save subject"}</button>{selected.status === "draft" && <button aria-label={`Delete ${subject.subject_name}`} className="text-red-700" onClick={() => void runAction(() => deleteExamSubject(selected.id, subject.id), "Subject removed.", `Remove ${subject.subject_name}?`)}><Trash2 size={15} /></button>}</div></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>}
              {selected.status === "draft" && (
                <form onSubmit={(event) => void addSubject(event)} className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-6">
                  <label className="text-xs font-medium text-slate-600 lg:col-span-2">Subject<select className={`${inputClass} mt-1`} required value={subjectForm.subject_id} onChange={(e) => setSubjectForm({ ...subjectForm, subject_id: e.target.value })}><option value="">Select subject</option>{subjectsOptions.filter((item) => item.status?.toLowerCase() === "active" && !subjects.some((existing) => existing.subject_id === item.id)).map((item) => <option key={item.id} value={item.id}>{item.name ?? item.subject ?? item.code}</option>)}</select></label>
                  <label className="text-xs font-medium text-slate-600">Max marks<input className={`${inputClass} mt-1`} type="number" min="0.01" step="0.01" value={subjectForm.max_marks} onChange={(e) => setSubjectForm({ ...subjectForm, max_marks: e.target.value })} /></label>
                  <label className="text-xs font-medium text-slate-600">Pass marks<input className={`${inputClass} mt-1`} type="number" min="0" step="0.01" value={subjectForm.pass_marks} onChange={(e) => setSubjectForm({ ...subjectForm, pass_marks: e.target.value })} /></label>
                  <label className="text-xs font-medium text-slate-600">Exam date<input className={`${inputClass} mt-1`} type="date" min={selected.start_date} max={selected.end_date} value={subjectForm.exam_date} onChange={(e) => setSubjectForm({ ...subjectForm, exam_date: e.target.value })} /></label>
                  <label className="text-xs font-medium text-slate-600">Evaluator<select className={`${inputClass} mt-1`} required value={subjectForm.evaluator_staff_id} onChange={(e) => setSubjectForm({ ...subjectForm, evaluator_staff_id: e.target.value })}><option value="">Select active staff</option>{activeStaff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
                  <div className="sm:col-span-2 lg:col-span-6"><button className={primaryButton} disabled={busy}><Plus size={15} /> Add subject</button></div>
                </form>
              )}
            </section>

            <section className={`${panel} overflow-hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-4">
                <div><h3 className="font-semibold">Marks review</h3><p className="mt-1 text-xs text-slate-500">Review student marks; corrections are audited with a reason.</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    Subject
                    <select
                      aria-label="Filter marks by subject"
                      className={inputClass}
                      value={reviewSubjectId}
                      onChange={(event) => setReviewSubjectId(event.target.value)}
                    >
                      <option value="">All subjects</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.subject_id}>{subject.subject_name}</option>
                      ))}
                    </select>
                  </label>
                  <button className={secondaryButton} onClick={() => void runAction(() => getExamProgress(selected.id), "Progress refreshed.")}><RefreshCw size={15} /> Refresh progress</button>
                </div>
              </div>
              {results.length === 0 ? <p className="p-6 text-sm text-slate-500">No marks are available for review yet.</p> : <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">Student</th><th className="px-3 py-3">Roll number</th>{reviewSubjects.map((subject) => <th key={subject.id} className="px-3 py-3">{subject.subject_name}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-200">{results.map((student) => <tr key={student.student_id}>
                    <td className="px-4 py-3 font-medium">{student.student_name}</td><td className="px-3 py-3">{student.roll_number}</td>
                    {reviewSubjects.map((subject) => {
                      const mark = student.subjects.find((item) => item.subject_id === subject.subject_id);
                      return <td key={subject.id} className="px-3 py-3">{mark ? <div className="flex items-center gap-2"><span>{mark.is_absent ? "Absent" : `${mark.marks_obtained ?? "—"} / ${mark.max_marks}`}{mark.remarks && <small className="block max-w-48 truncate text-xs text-slate-500" title={mark.remarks}>{mark.remarks}</small>}</span>{selected.status !== "draft" && <button className="text-xs text-indigo-700 underline" onClick={() => {
                        const value = window.prompt("Enter correction reason (required):");
                        if (!value?.trim()) return;
                        const markText = window.prompt("Corrected marks (leave blank if absent):", mark.marks_obtained == null ? "" : String(mark.marks_obtained));
                        if (markText === null) return;
                        const isAbsent = markText.trim() === "";
                        const numeric = isAbsent ? null : Number(markText);
                        if (!isAbsent && (!Number.isFinite(numeric) || numeric! < 0 || numeric! > Number(mark.max_marks))) {
                          setError(`Marks must be between 0 and ${mark.max_marks}.`);
                          return;
                        }
                        void runAction(() => correctExamMark(subject.id, student.student_id, {
                          marks_obtained: numeric,
                          is_absent: isAbsent,
                          remarks: mark.remarks,
                          reason: value.trim(),
                        }), "Mark corrected.");
                      }}>Correct</button>}</div> : <span className="text-slate-400">Not entered</span>}</td>;
                    })}
                  </tr>)}</tbody>
                </table>
              </div>}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
