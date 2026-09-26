"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

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

type StudentForm = {
  name: string;
  roll_number: string;
  admission_date: string;
  parent_name: string;
  mobile_number: string;
  grade: string;
  section: string;
};

const emptyStudentForm: StudentForm = {
  name: "",
  roll_number: "",
  admission_date: "",
  parent_name: "",
  mobile_number: "",
  grade: "",
  section: "",
};

type ClassResult = {
  grade: string;
  section: string;
  staff: Staff | null;
  students: Student[];
};

export default function ClassPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingClass, setLoadingClass] = useState(false);
  const [error, setError] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentForm, setStudentForm] = useState<StudentForm>(emptyStudentForm);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [bulkTargetGrade, setBulkTargetGrade] = useState("");
  const [bulkStatus, setBulkStatus] = useState("active");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [result, setResult] = useState<ClassResult | null>(null);

  async function loadData() {
    setLoading(true);

    try {
      const [gradeData, sectionData, staffData, studentData] = await Promise.all([
        apiRequest<Grade[]>("/api/grades"),
        apiRequest<Section[]>("/api/sections"),
        apiRequest<Staff[]>("/api/staff"),
        apiRequest<{ students: Student[] }>("/api/students"),
      ]);

      setGrades(gradeData);
      setSections(sectionData);
      setStaffMembers(staffData);
      setStudents(studentData.students ?? []);
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

  function buildClassResultForGrade(gradeId: string): ClassResult | null {
    const matchingGrade = grades.find((grade) => String(grade.id) === gradeId);

    if (!matchingGrade) {
      return null;
    }

    const gradeSection =
      matchingGrade.section_id !== null
        ? sections.find((section) => section.id === matchingGrade.section_id) ?? null
        : null;

    const assignedStaff = matchingGrade.staff_id !== null
      ? staffMembers.find((staff) => staff.id === matchingGrade.staff_id) ?? null
      : null;

    const classStudents = students.filter(
      (student) =>
        (student.grade ?? "").toLowerCase() === matchingGrade.grade.toLowerCase() &&
        (student.section ?? "").toLowerCase() === (gradeSection?.section ?? "").toLowerCase()
    );

    return {
      grade: matchingGrade.grade,
      section: gradeSection?.section ?? "",
      staff: assignedStaff,
      students: classStudents,
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

    try {
      const nextResult = buildClassResultForGrade(selectedGrade);

      if (!nextResult) {
        setError("Selected grade was not found.");
        return;
      }

      setResult(nextResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load class details.");
    } finally {
      setLoadingClass(false);
    }
  }

  const selectedGradeLabel =
    grades.find((grade) => String(grade.id) === selectedGrade)
      ? `${grades.find((grade) => String(grade.id) === selectedGrade)?.academic_year ?? ""} - ${grades.find((grade) => String(grade.id) === selectedGrade)?.grade ?? ""} - ${sections.find((section) => section.id === (grades.find((grade) => String(grade.id) === selectedGrade)?.section_id ?? -1))?.section ?? ""}`
      : selectedGrade;

  function openEditStudent(student: Student) {
    setEditingStudentId(student.id);
    setStudentForm({
      name: student.name,
      roll_number: student.roll_number,
      admission_date: student.admission_date ?? "",
      parent_name: student.parent_name ?? "",
      mobile_number: student.mobile_number ?? "",
      grade: student.grade ?? "",
      section: student.section ?? "",
    });
    setStudentFormOpen(true);
    setError("");
  }

  function closeStudentForm() {
    setEditingStudentId(null);
    setStudentFormOpen(false);
    setStudentForm(emptyStudentForm);
  }

  async function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingClass(true);
    setError("");

    const payload = {
      name: studentForm.name,
      roll_number: studentForm.roll_number,
      admission_date: studentForm.admission_date,
      parent_name: studentForm.parent_name || undefined,
      mobile_number: studentForm.mobile_number || undefined,
      grade: studentForm.grade || undefined,
      section: studentForm.section || undefined,
    };

    try {
      if (editingStudentId === null) {
        return;
      }

      await apiRequest(`/api/students/${editingStudentId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      closeStudentForm();
      await loadData();
      if (result) {
        setStudentSearch("");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update student.");
    } finally {
      setLoadingClass(false);
    }
  }

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
              admission_date: student.admission_date,
              parent_name: student.parent_name ?? "",
              mobile_number: student.mobile_number ?? "",
              grade: bulkTargetGrade,
              section: student.section ?? result.section,
              status: bulkStatus,
            }),
          })
        )
      );

      await loadData();
      const refreshedResult = buildClassResultForGrade(selectedGrade);
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

  return (
    <section className="page-section admin-page">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Class directory</p>
          <h1>
            {result
              ? `Grade ${result.grade} • Section ${result.section} — ${result.staff ? result.staff.name : "No staff assigned"}`
              : "Class overview"}
          </h1>
          <p>View the assigned staff member and the students in each class.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <form className="editor-panel" onSubmit={openClass}>
        <div className="panel-title">
          <div>
            <p className="eyebrow">Find class</p>
            <h2>Load class roster</h2>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Grade
            <select value={selectedGrade} onChange={(event) => setSelectedGrade(event.target.value)}>
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
          </label>
        </div>

        <button className="action-button primary" type="submit" disabled={loadingClass}>
          {loadingClass ? "Loading..." : "View class"}
        </button>
      </form>

      {result && (
        <div className="detail-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Assigned staff</p>
              <h2>{result.staff ? result.staff.name : "No assigned staff"}</h2>
            </div>
          </div>

          <div className="detail-grid">
            <span>
              Grade
              <strong>{selectedGradeLabel || result.grade}</strong>
            </span>
            <span>
              Section
              <strong>{result.section || "—"}</strong>
            </span>
            <span>
              Staff number
              <strong>{result.staff ? result.staff.number : "—"}</strong>
            </span>
            <span>
              Staff status
              <strong>{result.staff ? result.staff.status : "—"}</strong>
            </span>
          </div>
        </div>
      )}

      {studentFormOpen && (
        <form className="editor-panel" onSubmit={saveStudent}>
          <div className="panel-title">
            <div>
              <p className="eyebrow">Update record</p>
              <h2>Edit student</h2>
            </div>
            <button className="close-button" type="button" onClick={closeStudentForm}>
              ×
            </button>
          </div>

          <div className="form-grid">
            <label>
              Name
              <input required value={studentForm.name} onChange={(event) => setStudentForm({ ...studentForm, name: event.target.value })} />
            </label>

            <label>
              Roll number
              <input required value={studentForm.roll_number} onChange={(event) => setStudentForm({ ...studentForm, roll_number: event.target.value })} />
            </label>

            <label>
              Admission date
              <input required type="date" value={studentForm.admission_date} onChange={(event) => setStudentForm({ ...studentForm, admission_date: event.target.value })} />
            </label>

            <label>
              Grade
              <input value={studentForm.grade} onChange={(event) => setStudentForm({ ...studentForm, grade: event.target.value })} />
            </label>

            <label>
              Section
              <input value={studentForm.section} onChange={(event) => setStudentForm({ ...studentForm, section: event.target.value })} />
            </label>

            <label>
              Parent name
              <input value={studentForm.parent_name} onChange={(event) => setStudentForm({ ...studentForm, parent_name: event.target.value })} />
            </label>

            <label>
              Mobile number
              <input type="tel" value={studentForm.mobile_number} onChange={(event) => setStudentForm({ ...studentForm, mobile_number: event.target.value })} />
            </label>
          </div>

          <button className="action-button primary" disabled={loadingClass} type="submit">
            {loadingClass ? "Saving..." : "Save changes"}
          </button>
        </form>
      )}

      {result && (
        <div className="editor-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Class actions</p>
              <h2>Bulk update students</h2>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Grade
              <select value={bulkTargetGrade || result.grade} onChange={(event) => setBulkTargetGrade(event.target.value)}>
                <option value="">Select a grade</option>
                {[...new Set(grades.map((grade) => grade.grade))].map((gradeName) => (
                  <option key={gradeName} value={gradeName}>
                    {gradeName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Student status
              <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <button className="action-button primary" type="button" disabled={bulkSaving} onClick={applyBulkStudentUpdate}>
            {bulkSaving ? "Updating..." : "Apply to all class students"}
          </button>
        </div>
      )}

      <div className="data-panel">
        <div className="toolbar">
          <h2>
            Students <span>{result ? result.students.length : 0}</span>
          </h2>

          {result && (
            <input
              aria-label="Search students in class"
              placeholder="Search students..."
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
            />
          )}
        </div>

        {loading ? (
          <p className="state-text">Loading class data...</p>
        ) : result ? (
          (() => {
            const filteredStudents = result.students.filter((student) =>
              `${student.name} ${student.roll_number}`
                .toLowerCase()
                .includes(studentSearch.toLowerCase())
            );

            return filteredStudents.length === 0 ? (
              <p className="state-text">No students found for this grade and section.</p>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Roll number</th>
                      <th>Grade</th>
                      <th>Section</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td>{student.name}</td>
                        <td>{student.roll_number}</td>
                        <td>{student.grade ?? "—"}</td>
                        <td>{student.section ?? "—"}</td>
                        <td>
                          <span className="status-pill">{student.status}</span>
                        </td>
                        <td>
                          <button className="small-button" type="button" onClick={() => openEditStudent(student)}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()
        ) : (
          <p className="state-text">Choose a grade and section to view the class roster.</p>
        )}
      </div>
    </section>
  );
}
