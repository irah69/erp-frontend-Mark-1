"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

type Grade = {
  id: number;
  academic_year: string;
  grade: string;
  status: string;
};

type Section = {
  id: number;
  section: string;
  staff_id: number | null;
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
  const [selectedSection, setSelectedSection] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingClass, setLoadingClass] = useState(false);
  const [error, setError] = useState("");
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

  function openClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!selectedGrade || !selectedSection) {
      setError("Please choose both a grade and a section.");
      return;
    }

    setLoadingClass(true);

    try {
      const matchingSection = sections.find(
        (section) => section.section.toLowerCase() === selectedSection.toLowerCase()
      );

      const assignedStaff = matchingSection && matchingSection.staff_id !== null
        ? staffMembers.find((staff) => staff.id === matchingSection.staff_id) ?? null
        : null;

      const classStudents = students.filter(
        (student) =>
          (student.grade ?? "").toLowerCase() === selectedGrade.toLowerCase() &&
          (student.section ?? "").toLowerCase() === selectedSection.toLowerCase()
      );

      setResult({
        grade: selectedGrade,
        section: selectedSection,
        staff: assignedStaff,
        students: classStudents,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load class details.");
    } finally {
      setLoadingClass(false);
    }
  }

  const selectedGradeLabel = grades.find((grade) => grade.grade === selectedGrade)?.academic_year ?? selectedGrade;

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
              {grades.map((grade) => (
                <option key={grade.id} value={grade.grade}>
                  {grade.academic_year} - {grade.grade}
                </option>
              ))}
            </select>
          </label>

          <label>
            Section
            <select value={selectedSection} onChange={(event) => setSelectedSection(event.target.value)}>
              <option value="">Select a section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.section}>
                  {section.section}
                </option>
              ))}
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
              <strong>{result.section}</strong>
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

      <div className="data-panel">
        <div className="toolbar">
          <h2>
            Students <span>{result ? result.students.length : 0}</span>
          </h2>
        </div>

        {loading ? (
          <p className="state-text">Loading class data...</p>
        ) : result ? (
          result.students.length === 0 ? (
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
                  </tr>
                </thead>
                <tbody>
                  {result.students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.name}</td>
                      <td>{student.roll_number}</td>
                      <td>{student.grade ?? "—"}</td>
                      <td>{student.section ?? "—"}</td>
                      <td>
                        <span className="status-pill">{student.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <p className="state-text">Choose a grade and section to view the class roster.</p>
        )}
      </div>
    </section>
  );
}
