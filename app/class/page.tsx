"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Pencil, Search, X } from "lucide-react";
import { apiRequest, getClassStudents, type ClassRosterStudent } from "../../lib/api";
import Loader from "../../components/ui/loader";

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

type Staff = {
  id: number;
  name: string;
  number: string;
  status: string;
};

type Student = ClassRosterStudent;

type ClassResult = {
  grade: string;
  section: string;
  staff: Staff | null;
  students: Student[];
};

/* ---------- shared style tokens ---------- */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1";

const buttonBase = `inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const buttonPrimary = `${buttonBase} border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800`;

const rowButton = `inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 ${focusRing}`;

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm";

/* panels: accent panels carry the left border, the data panel stays plain */
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

/* ---------- page ---------- */

export default function ClassPage() {
  const router = useRouter();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingClass, setLoadingClass] = useState(false);
  const [error, setError] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [bulkTargetGrade, setBulkTargetGrade] = useState("");
  const [bulkStatus, setBulkStatus] = useState("active");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [result, setResult] = useState<ClassResult | null>(null);

  async function loadData() {
    setLoading(true);

    try {
      const [gradeData, sectionData, staffData] = await Promise.all([
        apiRequest<Grade[]>("/api/grades"),
        apiRequest<Section[]>("/api/sections"),
        apiRequest<Staff[]>("/api/staff"),
      ]);

      setGrades(
        gradeData.filter(
          (grade) =>
            grade.status.toLowerCase() === "active" &&
            grade.section_id !== null
        )
      );
      setSections(sectionData);
      setStaffMembers(staffData);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load academic and class data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function loadClassResult(gradeId: string): Promise<ClassResult> {
    const matchingGrade = grades.find((grade) => String(grade.id) === gradeId);

    if (!matchingGrade || matchingGrade.section_id === null) {
      throw new Error("Selected grade or section was not found.");
    }

    const gradeSection =
      sections.find((section) => section.id === matchingGrade.section_id) ?? null;
    if (!gradeSection) {
      throw new Error("The selected grade has no valid section.");
    }

    const assignedStaff =
      matchingGrade.staff_id !== null
        ? staffMembers.find((staff) => staff.id === matchingGrade.staff_id) ?? null
        : null;

    const roster = await getClassStudents({
      grade: matchingGrade.grade,
      section: gradeSection.section,
      academic_year: matchingGrade.academic_year,
    });

    return {
      grade: roster.grade,
      section: roster.section,
      staff: assignedStaff,
      students: roster.students,
    };
  }

  function openClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!selectedGrade) {
      setError("Please choose a grade.");
      return;
    }

    setLoadingClass(true);
    void loadClassResult(selectedGrade)
      .then((nextResult) => setResult(nextResult))
      .catch((requestError: unknown) => {
        setResult(null);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load class details."
        );
      })
      .finally(() => setLoadingClass(false));
  }

  const selectedGradeLabel = grades.find((grade) => String(grade.id) === selectedGrade)
    ? `${grades.find((grade) => String(grade.id) === selectedGrade)?.academic_year ?? ""} - ${grades.find((grade) => String(grade.id) === selectedGrade)?.grade ?? ""} - ${sections.find((section) => section.id === (grades.find((grade) => String(grade.id) === selectedGrade)?.section_id ?? -1))?.section ?? ""}`
    : selectedGrade;

  async function applyBulkStudentUpdate() {
    if (!result || result.students.length === 0) {
      setError("There are no students in the selected class.");
      return;
    }

    if (!bulkTargetGrade) {
      setError("Please select a grade for the class update.");
      return;
    }

    setBulkSaving(true);
    setError("");

    try {
      await Promise.all(
        result.students.map((student) =>
          apiRequest(`/api/students/${student.id}`, {
            method: "PUT",
            body: JSON.stringify({
              name: student.name,
              roll_number: student.roll_number,
              admission_date: student.admission_date ?? "",
              parent_name: student.parent_name ?? "",
              mobile_number: student.mobile_number ?? "",
              grade: bulkTargetGrade,
              section: student.section ?? result.section,
              status: bulkStatus,
            }),
          })
        )
      );

      const refreshedResult = await loadClassResult(selectedGrade);
      setResult(refreshedResult);
      setBulkTargetGrade(result.grade);
      setBulkStatus("active");
      setStudentSearch("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update all students in the class.");
    } finally {
      setBulkSaving(false);
    }
  }

  const filteredStudents = result
    ? result.students.filter((student) =>
        `${student.name} ${student.roll_number}`.toLowerCase().includes(studentSearch.toLowerCase())
      )
    : [];

  function openStudentProfile(student: Student) {
    if (student.user_id === null) {
      setError(`No student account is linked to ${student.name}; their profile cannot be opened.`);
      return;
    }
    router.push(`/users/${student.user_id}/profile`);
  }

  return (
    <section className="min-h-dvh bg-slate-50 font-sans text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Heading */}
        <div>
          <h1 className="break-words text-2xl font-semibold">
            {result
              ? `Grade ${result.grade} • Section ${result.section} — ${result.staff ? result.staff.name : "No staff assigned"}`
              : "Class overview"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">View the assigned staff member and the students in each class.</p>
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

        <div className="mt-6 space-y-4">
          {/* Find class */}
          <form className={accentPanel} onSubmit={openClass}>
            <h2 className="text-base font-semibold">Load class roster</h2>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="w-full sm:max-w-sm">
                <Field label="Grade">
                  <select
                    className={inputClass}
                    value={selectedGrade}
                    onChange={(event) => setSelectedGrade(event.target.value)}
                  >
                    <option value="">Select a grade</option>
                    {grades.map((grade) => {
                      const sectionName =
                        grade.section_id !== null
                          ? sections.find((section) => section.id === grade.section_id)?.section ?? "No section"
                          : "No section";

                      return (
                        <option key={grade.id} value={String(grade.id)}>
                          {grade.academic_year} - {grade.grade} - {sectionName}
                        </option>
                      );
                    })}
                  </select>
                </Field>
              </div>

              <button type="submit" disabled={loadingClass} className={`${buttonPrimary} w-full sm:w-auto`}>
                {loadingClass ? "Loading..." : "View class"}
              </button>
            </div>
          </form>

          {/* Assigned staff */}
          {result && (
            <div className={accentPanel}>
              <p className="text-sm text-slate-500">Assigned staff</p>
              <h2 className="text-base font-semibold">{result.staff ? result.staff.name : "No assigned staff"}</h2>

              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500">Grade</dt>
                  <dd className="mt-0.5 break-words text-sm font-medium">{selectedGradeLabel || result.grade}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Section</dt>
                  <dd className="mt-0.5 text-sm font-medium">{result.section || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Staff number</dt>
                  <dd className="mt-0.5 text-sm font-medium">{result.staff ? result.staff.number : "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Staff status</dt>
                  <dd className="mt-0.5 text-sm font-medium">
                    {result.staff ? <StatusBadge status={result.staff.status} /> : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Bulk update */}
          {result && (
            <div className={accentPanel}>
              <h2 className="text-base font-semibold">Bulk update students</h2>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:max-w-2xl sm:grid-cols-2">
                <Field label="Grade">
                  <select
                    className={inputClass}
                    value={bulkTargetGrade || result.grade}
                    onChange={(event) => setBulkTargetGrade(event.target.value)}
                  >
                    <option value="">Select a grade</option>
                    {[...new Set(grades.map((grade) => grade.grade))].map((gradeName) => (
                      <option key={gradeName} value={gradeName}>
                        {gradeName}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Student status">
                  <select className={inputClass} value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </div>

              <button
                type="button"
                disabled={bulkSaving}
                onClick={applyBulkStudentUpdate}
                className={`${buttonPrimary} mt-4 w-full sm:w-auto`}
              >
                {bulkSaving ? "Updating..." : "Apply to all class students"}
              </button>
            </div>
          )}

          {/* Students */}
          <div className={plainPanel}>
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold">
                Students <span className="font-normal text-slate-500">({result ? result.students.length : 0})</span>
              </h2>

              {result && (
                <div className="relative w-full sm:max-w-xs">
                  <Search
                    size={16}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    aria-label="Search students in class"
                    placeholder="Search students..."
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    className={`${inputClass} pl-9`}
                  />
                </div>
              )}
            </div>

            {loading ? (
              <Loader title="Loading class data..." subtitle="Retrieving the selected roster" size="sm" />
            ) : !result ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                Choose a grade and section to view the class roster.
              </p>
            ) : filteredStudents.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                No students found for this grade and section.
              </p>
            ) : (
              <>
                {/* Mobile: stacked rows */}
                <ul className="divide-y divide-slate-200 md:hidden">
                  {filteredStudents.map((student) => (
                    <li key={student.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{student.name}</p>
                          <p className="text-sm text-slate-500">Roll {student.roll_number}</p>
                        </div>
                        <StatusBadge status={student.status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {student.grade ?? "—"} · {student.section ?? "—"}
                      </p>
                      <div className="mt-3">
                        <button
                          type="button"
                          disabled={student.user_id === null}
                          className={rowButton}
                          onClick={() => openStudentProfile(student)}
                        >
                          <Pencil size={13} aria-hidden="true" /> Edit profile
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* md+: table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-2.5">Name</th>
                        <th className="px-3 py-2.5">Roll number</th>
                        <th className="px-3 py-2.5">Grade</th>
                        <th className="px-3 py-2.5">Section</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">{student.name}</td>
                          <td className="px-3 py-3 text-slate-600">{student.roll_number}</td>
                          <td className="px-3 py-3 text-slate-600">{student.grade ?? "—"}</td>
                          <td className="px-3 py-3 text-slate-600">{student.section ?? "—"}</td>
                          <td className="px-3 py-3">
                            <StatusBadge status={student.status} />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              disabled={student.user_id === null}
                              className={rowButton}
                              onClick={() => openStudentProfile(student)}
                            >
                              Edit profile
                            </button>
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

    </section>
  );
}
