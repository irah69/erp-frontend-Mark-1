"use client";

import { FormEvent, ReactNode, useEffect, useId, useState } from "react";
import { AlertCircle, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { apiRequest } from "../../lib/api";

type Student = {
  id: number;
  name: string;
  roll_number: string;
  admission_date: string;
  parent_name?: string | null;
  mobile_number?: string | null;
  grade?: string | null;
  section?: string | null;
  status: string;
  created_at: string;
};

type GradeOption = { id: number; academic_year: string; grade: string; status: string };
type SectionOption = { id: number; section: string };

type StudentForm = {
  name: string;
  roll_number: string;
  admission_date: string;
  parent_name: string;
  mobile_number: string;
  grade: string;
  section: string;
};

const emptyForm: StudentForm = {
  name: "",
  roll_number: "",
  admission_date: "",
  parent_name: "",
  mobile_number: "",
  grade: "",
  section: "",
};

/* ---------- shared style tokens ---------- */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1";

const buttonBase = `inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const buttonPrimary = `${buttonBase} border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800`;
const buttonSecondary = `${buttonBase} border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100`;
const buttonDanger = `${buttonBase} border-red-600 bg-red-600 text-white hover:bg-red-700 active:bg-red-800`;
const buttonDangerOutline = `${buttonBase} border-slate-300 bg-white text-red-600 hover:bg-red-50 active:bg-red-100`;

const rowButton = `inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 ${focusRing}`;
const rowButtonDanger = `inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 ${focusRing}`;

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm";

const statusClass = (status: string) =>
  status.toLowerCase() === "active"
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-slate-200 bg-slate-50 text-slate-600";

/* ---------- small pieces ---------- */

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-xs font-medium capitalize ${statusClass(status)}`}>
      {status}
    </span>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function Dialog({
  open,
  onClose,
  title,
  children,
  width = "sm:max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-lg border border-slate-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-lg sm:pb-5 ${width}`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="min-w-0 truncate text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className={`-mr-1.5 -mt-1 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [availableGrades, setAvailableGrades] = useState<GradeOption[]>([]);
  const [availableSections, setAvailableSections] = useState<SectionOption[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [toDelete, setToDelete] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function loadStudents() {
    setLoading(true);
    try {
      const data = await apiRequest<{ students: Student[] }>("/api/students");
      setStudents(data.students ?? []);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load students.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAcademicOptions() {
    try {
      const [gradeData, sectionData] = await Promise.all([
        apiRequest<GradeOption[]>("/api/grades"),
        apiRequest<SectionOption[]>("/api/sections"),
      ]);
      setAvailableGrades(gradeData);
      setAvailableSections(sectionData);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to load available grade and section options.",
      );
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStudents();
      void loadAcademicOptions();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function viewStudent(id: number) {
    try {
      const data = await apiRequest<{ student: Student }>(`/api/students/${id}`);
      setSelected(data.student);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load student.");
    }
  }

  function closeForm() {
    setEditingId(null);
    setFormOpen(false);
    setForm(emptyForm);
  }

  function openCreate() {
    setEditingId(null);
    setFormOpen(true);
    setForm(emptyForm);
    setError("");
  }

  function openEdit(student: Student) {
    setSelected(null);
    setEditingId(student.id);
    setFormOpen(true);
    setForm({
      name: student.name,
      roll_number: student.roll_number,
      admission_date: student.admission_date ?? "",
      parent_name: student.parent_name ?? "",
      mobile_number: student.mobile_number ?? "",
      grade: student.grade ?? "",
      section: student.section ?? "",
    });
    setError("");
  }

  async function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name: form.name,
      roll_number: form.roll_number,
      admission_date: form.admission_date,
      parent_name: form.parent_name || undefined,
      mobile_number: form.mobile_number || undefined,
      grade: form.grade || undefined,
      section: form.section || undefined,
    };

    try {
      if (editingId) {
        await apiRequest(`/api/students/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiRequest("/api/students", { method: "POST", body: JSON.stringify(payload) });
      }

      closeForm();
      await loadStudents();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save student.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/students/${toDelete.id}`, { method: "DELETE" });
      setToDelete(null);
      setSelected(null);
      await loadStudents();
    } catch (requestError) {
      setToDelete(null);
      setError(requestError instanceof Error ? requestError.message : "Unable to delete student.");
    } finally {
      setDeleting(false);
    }
  }

  const filteredStudents = students.filter((student) =>
    `${student.name} ${student.roll_number}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="min-h-dvh bg-slate-50 font-[family-name:var(--font-charis-sil)] text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Students</h1>
            <p className="mt-1 text-sm text-slate-600">Manage student profiles and their contact details.</p>
          </div>
          <button type="button" onClick={openCreate} className={`${buttonPrimary} w-full sm:w-auto`}>
            <Plus size={16} aria-hidden="true" /> Add student
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 break-words">{error}</p>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
              className={`rounded p-0.5 hover:bg-red-100 ${focusRing}`}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Data panel */}
        <div className="mt-6 rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold">
              All students <span className="font-normal text-slate-500">({students.length})</span>
            </h2>
            <div className="relative w-full sm:max-w-xs">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                aria-label="Search students"
                placeholder="Search name or roll number"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          {loading ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">Loading students...</p>
          ) : filteredStudents.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">No students found.</p>
          ) : (
            <>
              {/* Mobile: stacked rows */}
              <ul className="divide-y divide-slate-200 md:hidden">
                {filteredStudents.map((student) => (
                  <li key={student.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => viewStudent(student.id)}
                          className={`block max-w-full truncate text-left font-semibold text-slate-900 hover:text-indigo-600 ${focusRing} rounded`}
                        >
                          {student.name}
                        </button>
                        <p className="text-sm text-slate-500">Roll {student.roll_number}</p>
                      </div>
                      <StatusBadge status={student.status} />
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500">Grade</dt>
                        <dd>
                          {student.grade || "—"}
                          {student.section ? ` · ${student.section}` : ""}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Mobile</dt>
                        <dd className="truncate">{student.mobile_number || "—"}</dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex gap-2">
                      <button type="button" className={rowButton} onClick={() => openEdit(student)}>
                        <Pencil size={13} aria-hidden="true" /> Edit
                      </button>
                      <button type="button" className={rowButtonDanger} onClick={() => setToDelete(student)}>
                        <Trash2 size={13} aria-hidden="true" /> Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* md+: table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-2.5">Student</th>
                      <th className="px-3 py-2.5">Roll number</th>
                      <th className="px-3 py-2.5">Grade</th>
                      <th className="px-3 py-2.5">Section</th>
                      <th className="hidden px-3 py-2.5 lg:table-cell">Admission date</th>
                      <th className="hidden px-3 py-2.5 lg:table-cell">Parent</th>
                      <th className="hidden px-3 py-2.5 xl:table-cell">Mobile</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => viewStudent(student.id)}
                            className={`max-w-[14rem] truncate text-left font-medium text-slate-900 hover:text-indigo-600 ${focusRing} rounded`}
                          >
                            {student.name}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{student.roll_number}</td>
                        <td className="px-3 py-3 text-slate-600">{student.grade || "—"}</td>
                        <td className="px-3 py-3 text-slate-600">{student.section || "—"}</td>
                        <td className="hidden px-3 py-3 text-slate-600 lg:table-cell">{student.admission_date || "—"}</td>
                        <td className="hidden px-3 py-3 text-slate-600 lg:table-cell">{student.parent_name || "—"}</td>
                        <td className="hidden px-3 py-3 text-slate-600 xl:table-cell">{student.mobile_number || "—"}</td>
                        <td className="px-3 py-3">
                          <StatusBadge status={student.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button type="button" className={rowButton} onClick={() => openEdit(student)}>
                              Edit
                            </button>
                            <button type="button" className={rowButtonDanger} onClick={() => setToDelete(student)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create / edit */}
      <Dialog open={formOpen} onClose={closeForm} title={editingId ? "Edit student" : "Add student"}>
        <form onSubmit={saveStudent}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input required className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </Field>
            <Field label="Roll number">
              <input required className={inputClass} value={form.roll_number} onChange={(event) => setForm({ ...form, roll_number: event.target.value })} />
            </Field>
            <Field label="Admission date">
              <input required type="date" className={inputClass} value={form.admission_date} onChange={(event) => setForm({ ...form, admission_date: event.target.value })} />
            </Field>
            <Field label="Grade">
              <select className={inputClass} value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })}>
                <option value="">Select a grade</option>
                {availableGrades.map((grade) => (
                  <option key={grade.id} value={grade.grade}>
                    {grade.academic_year} - {grade.grade}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Section">
              <select className={inputClass} value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })}>
                <option value="">Select a section</option>
                {availableSections.map((section) => (
                  <option key={section.id} value={section.section}>
                    {section.section}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Parent name">
              <input className={inputClass} value={form.parent_name} onChange={(event) => setForm({ ...form, parent_name: event.target.value })} />
            </Field>
            <Field label="Mobile number">
              <input type="tel" inputMode="tel" className={inputClass} value={form.mobile_number} onChange={(event) => setForm({ ...form, mobile_number: event.target.value })} />
            </Field>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeForm} className={`${buttonSecondary} w-full sm:w-auto`}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={`${buttonPrimary} w-full sm:w-auto`}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Create student"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Details */}
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name ?? "Student"}>
        {selected && (
          <>
            <p className="-mt-3 mb-4 text-sm text-slate-500">Student #{selected.id}</p>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {[
                ["Roll number", selected.roll_number],
                ["Grade", selected.grade || "—"],
                ["Section", selected.section || "—"],
                ["Admission date", selected.admission_date || "—"],
                ["Parent name", selected.parent_name || "—"],
                ["Mobile number", selected.mobile_number || "—"],
                ["Status", selected.status],
                ["Created", new Date(selected.created_at).toLocaleDateString()],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-slate-100 pb-3">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setToDelete(selected)} className={`${buttonDangerOutline} w-full sm:w-auto`}>
                <Trash2 size={16} aria-hidden="true" /> Delete
              </button>
              <button type="button" onClick={() => openEdit(selected)} className={`${buttonPrimary} w-full sm:w-auto`}>
                <Pencil size={16} aria-hidden="true" /> Edit student
              </button>
            </div>
          </>
        )}
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Delete this student?" width="sm:max-w-md">
        {toDelete && (
          <>
            <p className="text-sm text-slate-600">
              <strong className="font-semibold text-slate-900">{toDelete.name}</strong> will be permanently removed. This can&apos;t be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setToDelete(null)} className={`${buttonSecondary} w-full sm:w-auto`}>
                Cancel
              </button>
              <button type="button" disabled={deleting} onClick={confirmDelete} className={`${buttonDanger} w-full sm:w-auto`}>
                {deleting ? "Deleting..." : "Delete student"}
              </button>
            </div>
          </>
        )}
      </Dialog>
    </section>
  );
}