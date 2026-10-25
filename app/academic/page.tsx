"use client";

import { FormEvent, ReactNode, useEffect, useId, useState } from "react";
import { AlertCircle, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { apiRequest } from "../../lib/api";
import Loader from "../../components/ui/loader";

/* =========================
   TYPES
========================= */

type Grade = {
  id: number;
  academic_year: string;
  grade: string;
  section_id: number | null;
  staff_id: number | null;
  status: string;
};

type Section = {
  id: number;
  section: string;
};

type StaffOption = {
  id: number;
  name: string;
  number: string;
  status: string;
};

type GradeForm = {
  academic_year: string;
  grade: string;
  section_id: string;
  staff_id: string;
  status: string;
};

type SectionForm = {
  section: string;
};

type PendingDelete = {
  kind: "grade" | "section";
  id: number;
  name: string;
};

const emptyGradeForm: GradeForm = {
  academic_year: "",
  grade: "",
  section_id: "",
  staff_id: "",
  status: "active",
};

const emptySectionForm: SectionForm = {
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

const iconButton = `-mr-1.5 -mt-1 shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ${focusRing}`;

const linkButton = `rounded text-left font-medium text-slate-900 hover:text-indigo-600 ${focusRing}`;

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm";

/* panels: accent panels carry the left border, list panels stay plain */
const plainPanel = "rounded-lg border border-slate-200 bg-white";
const accentPanel = `${plainPanel} border-l-4 border-l-indigo-600 p-4 sm:p-5`;

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
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
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
        className="max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-lg border border-slate-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-lg sm:pb-5"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="min-w-0 truncate text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className={iconButton}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SearchInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} pl-9`}
      />
    </div>
  );
}

/* =========================
   COMPONENT
========================= */

export default function AcademicPage() {
  /* -------------------------
     Grade state
  ------------------------- */

  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [gradeForm, setGradeForm] = useState<GradeForm>(emptyGradeForm);
  const [editingGradeId, setEditingGradeId] = useState<number | null>(null);
  const [gradeFormOpen, setGradeFormOpen] = useState(false);
  const [gradeSearch, setGradeSearch] = useState("");

  /* -------------------------
     Section state
  ------------------------- */

  const [sections, setSections] = useState<Section[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffOption[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionForm>(emptySectionForm);
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [sectionSearch, setSectionSearch] = useState("");

  /* -------------------------
     Common state
  ------------------------- */

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [error, setError] = useState("");

  /* =====================================================
     LOAD DATA
  ===================================================== */

  async function loadAcademicData() {
    setLoading(true);

    try {
      const [gradeData, sectionData, staffData] = await Promise.all([
        apiRequest<Grade[]>("/api/grades"),
        apiRequest<Section[]>("/api/sections"),
        apiRequest<StaffOption[]>("/api/staff"),
      ]);

      setGrades(gradeData);
      setSections(sectionData);
      setStaffMembers(staffData);

      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load grades and sections.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAcademicData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  /* =====================================================
     GRADE FUNCTIONS
  ===================================================== */

  async function viewGrade(id: number) {
    try {
      const data = await apiRequest<Grade>(`/api/grades/${id}`);

      setSelectedGrade(data);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load grade.");
    }
  }

  function openCreateGrade() {
    setEditingGradeId(null);
    setGradeForm(emptyGradeForm);
    setGradeFormOpen(true);
    setSelectedGrade(null);
    setError("");
  }

  function openEditGrade(grade: Grade) {
    setEditingGradeId(grade.id);

    setGradeForm({
      academic_year: grade.academic_year,
      grade: grade.grade,
      section_id: grade.section_id !== null ? String(grade.section_id) : "",
      staff_id: grade.staff_id !== null ? String(grade.staff_id) : "",
      status: grade.status,
    });

    setGradeFormOpen(true);
    setSelectedGrade(null);
    setError("");
  }

  function closeGradeForm() {
    setEditingGradeId(null);
    setGradeFormOpen(false);
    setGradeForm(emptyGradeForm);
  }

  async function saveGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const payload = {
      academic_year: gradeForm.academic_year,
      grade: gradeForm.grade,
      section_id: gradeForm.section_id ? Number(gradeForm.section_id) : null,
      staff_id: gradeForm.staff_id ? Number(gradeForm.staff_id) : null,
      status: gradeForm.status,
    };

    try {
      if (editingGradeId !== null) {
        await apiRequest(`/api/grades/${editingGradeId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/grades", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeGradeForm();
      await loadAcademicData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save grade.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteGrade(id: number) {
    try {
      await apiRequest(`/api/grades/${id}`, {
        method: "DELETE",
      });

      setSelectedGrade(null);
      await loadAcademicData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete grade.");
    }
  }

  /* =====================================================
     SECTION FUNCTIONS
  ===================================================== */

  async function viewSection(id: number) {
    try {
      const data = await apiRequest<Section>(`/api/sections/${id}`);

      setSelectedSection(data);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load section.");
    }
  }

  function openCreateSection() {
    setEditingSectionId(null);
    setSectionForm(emptySectionForm);
    setSectionFormOpen(true);
    setSelectedSection(null);
    setError("");
  }

  function openEditSection(section: Section) {
    setEditingSectionId(section.id);

    setSectionForm({
      section: section.section,
    });

    setSectionFormOpen(true);
    setSelectedSection(null);
    setError("");
  }

  function closeSectionForm() {
    setEditingSectionId(null);
    setSectionFormOpen(false);
    setSectionForm(emptySectionForm);
  }

  async function saveSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const payload = {
      section: sectionForm.section,
    };

    try {
      if (editingSectionId !== null) {
        await apiRequest(`/api/sections/${editingSectionId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/sections", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeSectionForm();
      await loadAcademicData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save section.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSection(id: number) {
    try {
      await apiRequest(`/api/sections/${id}`, {
        method: "DELETE",
      });

      setSelectedSection(null);
      await loadAcademicData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete section.");
    }
  }

  /* =====================================================
     DELETE CONFIRMATION
  ===================================================== */

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);

    if (pendingDelete.kind === "grade") {
      await deleteGrade(pendingDelete.id);
    } else {
      await deleteSection(pendingDelete.id);
    }

    setPendingDelete(null);
    setDeleting(false);
  }

  /* =====================================================
     FILTERING
  ===================================================== */

  const sectionLookup = new Map(sections.map((section) => [section.id, section]));

  const sectionNameFor = (sectionId: number | null) => sectionLookup.get(sectionId ?? -1)?.section ?? "—";
  const staffNameFor = (staffId: number | null) => staffMembers.find((staff) => staff.id === staffId)?.name ?? "—";

  const filteredGrades = grades.filter((grade) => {
    const sectionName = sectionLookup.get(grade.section_id ?? -1)?.section ?? "";
    const staffName = staffMembers.find((staff) => staff.id === grade.staff_id)?.name ?? "";

    return `${grade.academic_year} ${grade.grade} ${sectionName} ${staffName} ${grade.status}`
      .toLowerCase()
      .includes(gradeSearch.toLowerCase());
  });

  const filteredSections = sections.filter((section) =>
    `${section.section}`.toLowerCase().includes(sectionSearch.toLowerCase())
  );

  /* =====================================================
     UI
  ===================================================== */

  return (
    <section className="min-h-dvh bg-slate-50 font-sans text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-semibold">Grades &amp; Sections</h1>
          <p className="mt-1 text-sm text-slate-600">Manage academic grades and classroom sections.</p>
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

        <div className="mt-6 space-y-8">
          {/* =================================================
              GRADES
          ================================================= */}
          <div className="space-y-4">
            {gradeFormOpen && (
              <form className={accentPanel} onSubmit={saveGrade}>
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-base font-semibold">{editingGradeId !== null ? "Edit grade" : "Add grade"}</h2>
                  <button type="button" aria-label="Close form" onClick={closeGradeForm} className={iconButton}>
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Academic year">
                    <input
                      required
                      type="text"
                      placeholder="2026-2027"
                      className={inputClass}
                      value={gradeForm.academic_year}
                      onChange={(event) => setGradeForm({ ...gradeForm, academic_year: event.target.value })}
                    />
                  </Field>

                  <Field label="Grade">
                    <input
                      required
                      type="text"
                      placeholder="10"
                      className={inputClass}
                      value={gradeForm.grade}
                      onChange={(event) => setGradeForm({ ...gradeForm, grade: event.target.value })}
                    />
                  </Field>

                  <Field label="Section">
                    <select
                      className={inputClass}
                      value={gradeForm.section_id}
                      onChange={(event) => setGradeForm({ ...gradeForm, section_id: event.target.value })}
                    >
                      <option value="">Select a section</option>
                      {sections.map((section) => (
                        <option key={section.id} value={String(section.id)}>
                          {section.section}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Staff">
                    <select
                      className={inputClass}
                      value={gradeForm.staff_id}
                      onChange={(event) => setGradeForm({ ...gradeForm, staff_id: event.target.value })}
                    >
                      <option value="">Select a staff member</option>
                      {staffMembers.map((staff) => (
                        <option key={staff.id} value={String(staff.id)}>
                          {staff.name} (ID: {staff.id})
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Status">
                    <select
                      className={inputClass}
                      value={gradeForm.status}
                      onChange={(event) => setGradeForm({ ...gradeForm, status: event.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </Field>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button type="submit" disabled={saving} className={`${buttonPrimary} w-full sm:w-auto`}>
                    {saving ? "Saving..." : editingGradeId !== null ? "Save changes" : "Create grade"}
                  </button>
                  <button type="button" onClick={closeGradeForm} className={`${buttonSecondary} w-full sm:w-auto`}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {selectedGrade && (
              <div className={accentPanel}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-500">Grade #{selectedGrade.id}</p>
                    <h2 className="truncate text-base font-semibold">Grade {selectedGrade.grade}</h2>
                  </div>
                  <button
                    type="button"
                    aria-label="Close details"
                    onClick={() => setSelectedGrade(null)}
                    className={iconButton}
                  >
                    <X size={18} />
                  </button>
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <dt className="text-xs text-slate-500">Academic year</dt>
                    <dd className="mt-0.5 break-words text-sm font-medium">{selectedGrade.academic_year}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Grade</dt>
                    <dd className="mt-0.5 break-words text-sm font-medium">{selectedGrade.grade}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Section</dt>
                    <dd className="mt-0.5 text-sm font-medium">{sectionNameFor(selectedGrade.section_id)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Staff</dt>
                    <dd className="mt-0.5 break-words text-sm font-medium">{staffNameFor(selectedGrade.staff_id)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Status</dt>
                    <dd className="mt-0.5 text-sm">
                      <StatusBadge status={selectedGrade.status} />
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => openEditGrade(selectedGrade)}
                    className={`${buttonPrimary} w-full sm:w-auto`}
                  >
                    <Pencil size={16} aria-hidden="true" /> Edit grade
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDelete({ kind: "grade", id: selectedGrade.id, name: `Grade ${selectedGrade.grade}` })
                    }
                    className={`${buttonDangerOutline} w-full sm:w-auto`}
                  >
                    <Trash2 size={16} aria-hidden="true" /> Delete
                  </button>
                </div>
              </div>
            )}

            <div className={plainPanel}>
              <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-base font-semibold">
                  Grades <span className="font-normal text-slate-500">({grades.length})</span>
                </h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <SearchInput
                    label="Search grades"
                    placeholder="Search grades..."
                    value={gradeSearch}
                    onChange={setGradeSearch}
                  />
                  <button type="button" onClick={openCreateGrade} className={`${buttonPrimary} w-full sm:w-auto`}>
                    <Plus size={16} aria-hidden="true" /> Add grade
                  </button>
                </div>
              </div>

              {loading ? (
                <Loader title="Loading grades..." subtitle="Retrieving academic records" size="sm" />
              ) : filteredGrades.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-500">No grades found.</p>
              ) : (
                <>
                  {/* Mobile: stacked rows */}
                  <ul className="divide-y divide-slate-200 md:hidden">
                    {filteredGrades.map((grade) => (
                      <li key={grade.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => viewGrade(grade.id)}
                              className={`block max-w-full truncate font-semibold text-slate-900 hover:text-indigo-600 ${focusRing} rounded text-left`}
                            >
                              Grade {grade.grade}
                            </button>
                            <p className="text-sm text-slate-500">
                              {grade.academic_year} · ID {grade.id}
                            </p>
                          </div>
                          <StatusBadge status={grade.status} />
                        </div>

                        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <dt className="text-xs text-slate-500">Section</dt>
                            <dd>{sectionNameFor(grade.section_id)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-500">Staff</dt>
                            <dd className="truncate">{staffNameFor(grade.staff_id)}</dd>
                          </div>
                        </dl>

                        <div className="mt-3 flex gap-2">
                          <button type="button" className={rowButton} onClick={() => openEditGrade(grade)}>
                            <Pencil size={13} aria-hidden="true" /> Edit
                          </button>
                          <button
                            type="button"
                            className={rowButtonDanger}
                            onClick={() => setPendingDelete({ kind: "grade", id: grade.id, name: `Grade ${grade.grade}` })}
                          >
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
                          <th className="hidden px-4 py-2.5 lg:table-cell">ID</th>
                          <th className="px-4 py-2.5 lg:px-3">Academic year</th>
                          <th className="px-3 py-2.5">Grade</th>
                          <th className="px-3 py-2.5">Section</th>
                          <th className="px-3 py-2.5">Staff</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-4 py-2.5">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredGrades.map((grade) => (
                          <tr key={grade.id} className="hover:bg-slate-50">
                            <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{grade.id}</td>
                            <td className="px-4 py-3 text-slate-600 lg:px-3">{grade.academic_year}</td>
                            <td className="px-3 py-3">
                              <button type="button" onClick={() => viewGrade(grade.id)} className={linkButton}>
                                {grade.grade}
                              </button>
                            </td>
                            <td className="px-3 py-3 text-slate-600">{sectionNameFor(grade.section_id)}</td>
                            <td className="px-3 py-3 text-slate-600">{staffNameFor(grade.staff_id)}</td>
                            <td className="px-3 py-3">
                              <StatusBadge status={grade.status} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button type="button" className={rowButton} onClick={() => openEditGrade(grade)}>
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className={rowButtonDanger}
                                  onClick={() =>
                                    setPendingDelete({ kind: "grade", id: grade.id, name: `Grade ${grade.grade}` })
                                  }
                                >
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

          {/* =================================================
              SECTIONS
          ================================================= */}
          <div className="space-y-4">
            {sectionFormOpen && (
              <form className={accentPanel} onSubmit={saveSection}>
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-base font-semibold">
                    {editingSectionId !== null ? "Edit section" : "Add section"}
                  </h2>
                  <button type="button" aria-label="Close form" onClick={closeSectionForm} className={iconButton}>
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-4 max-w-sm">
                  <Field label="Section">
                    <input
                      required
                      type="text"
                      placeholder="A"
                      className={inputClass}
                      value={sectionForm.section}
                      onChange={(event) => setSectionForm({ ...sectionForm, section: event.target.value })}
                    />
                  </Field>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button type="submit" disabled={saving} className={`${buttonPrimary} w-full sm:w-auto`}>
                    {saving ? "Saving..." : editingSectionId !== null ? "Save changes" : "Create section"}
                  </button>
                  <button type="button" onClick={closeSectionForm} className={`${buttonSecondary} w-full sm:w-auto`}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {selectedSection && (
              <div className={accentPanel}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-500">Section #{selectedSection.id}</p>
                    <h2 className="truncate text-base font-semibold">Section {selectedSection.section}</h2>
                  </div>
                  <button
                    type="button"
                    aria-label="Close details"
                    onClick={() => setSelectedSection(null)}
                    className={iconButton}
                  >
                    <X size={18} />
                  </button>
                </div>

                <dl className="mt-4">
                  <div>
                    <dt className="text-xs text-slate-500">Section</dt>
                    <dd className="mt-0.5 break-words text-sm font-medium">{selectedSection.section}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => openEditSection(selectedSection)}
                    className={`${buttonPrimary} w-full sm:w-auto`}
                  >
                    <Pencil size={16} aria-hidden="true" /> Edit section
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDelete({
                        kind: "section",
                        id: selectedSection.id,
                        name: `Section ${selectedSection.section}`,
                      })
                    }
                    className={`${buttonDangerOutline} w-full sm:w-auto`}
                  >
                    <Trash2 size={16} aria-hidden="true" /> Delete
                  </button>
                </div>
              </div>
            )}

            <div className={plainPanel}>
              <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-base font-semibold">
                  Sections <span className="font-normal text-slate-500">({sections.length})</span>
                </h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <SearchInput
                    label="Search sections"
                    placeholder="Search sections..."
                    value={sectionSearch}
                    onChange={setSectionSearch}
                  />
                  <button type="button" onClick={openCreateSection} className={`${buttonPrimary} w-full sm:w-auto`}>
                    <Plus size={16} aria-hidden="true" /> Add section
                  </button>
                </div>
              </div>

              {loading ? (
                <Loader title="Loading sections..." subtitle="Retrieving academic records" size="sm" />
              ) : filteredSections.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-500">No sections found.</p>
              ) : (
                <>
                  {/* Mobile: stacked rows */}
                  <ul className="divide-y divide-slate-200 md:hidden">
                    {filteredSections.map((section) => (
                      <li key={section.id} className="p-4">
                        <button
                          type="button"
                          onClick={() => viewSection(section.id)}
                          className={`block max-w-full truncate font-semibold text-slate-900 hover:text-indigo-600 ${focusRing} rounded text-left`}
                        >
                          {section.section}
                        </button>
                        <p className="text-sm text-slate-500">ID {section.id}</p>

                        <div className="mt-3 flex gap-2">
                          <button type="button" className={rowButton} onClick={() => openEditSection(section)}>
                            <Pencil size={13} aria-hidden="true" /> Edit
                          </button>
                          <button
                            type="button"
                            className={rowButtonDanger}
                            onClick={() =>
                              setPendingDelete({ kind: "section", id: section.id, name: `Section ${section.section}` })
                            }
                          >
                            <Trash2 size={13} aria-hidden="true" /> Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* md+: table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[400px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                        <tr className="border-b border-slate-200">
                          <th className="px-4 py-2.5">ID</th>
                          <th className="px-3 py-2.5">Section</th>
                          <th className="px-4 py-2.5">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredSections.map((section) => (
                          <tr key={section.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-600">{section.id}</td>
                            <td className="px-3 py-3">
                              <button type="button" onClick={() => viewSection(section.id)} className={linkButton}>
                                {section.section}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button type="button" className={rowButton} onClick={() => openEditSection(section)}>
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className={rowButtonDanger}
                                  onClick={() =>
                                    setPendingDelete({
                                      kind: "section",
                                      id: section.id,
                                      name: `Section ${section.section}`,
                                    })
                                  }
                                >
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
        </div>
      </div>

      {/* Delete confirmation (grades and sections) */}
      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={pendingDelete?.kind === "grade" ? "Delete this grade?" : "Delete this section?"}
      >
        {pendingDelete && (
          <>
            <p className="text-sm text-slate-600">
              <strong className="font-semibold text-slate-900">{pendingDelete.name}</strong> will be permanently
              removed. This can&apos;t be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPendingDelete(null)} className={`${buttonSecondary} w-full sm:w-auto`}>
                Cancel
              </button>
              <button type="button" disabled={deleting} onClick={confirmDelete} className={`${buttonDanger} w-full sm:w-auto`}>
                {deleting ? "Deleting..." : pendingDelete.kind === "grade" ? "Delete grade" : "Delete section"}
              </button>
            </div>
          </>
        )}
      </Dialog>
    </section>
  );
}
