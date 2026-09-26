"use client";

import { FormEvent, useEffect, useState } from "react";
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

type GradeOption = {
  id: number;
  academic_year: string;
  grade: string;
  status: string;
};

type SectionOption = {
  id: number;
  section: string;
  staff_id: number | null;
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

const emptyForm: StudentForm = {
  name: "",
  roll_number: "",
  admission_date: "",
  parent_name: "",
  mobile_number: "",
  grade: "",
  section: "",
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [availableGrades, setAvailableGrades] = useState<GradeOption[]>([]);
  const [availableSections, setAvailableSections] = useState<SectionOption[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      setError(requestError instanceof Error ? requestError.message : "Unable to load available grade and section options.");
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

  function openCreate() {
    setEditingId(null);
    setFormOpen(true);
    setForm(emptyForm);
    setError("");
  }

  function openEdit(student: Student) {
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

      setEditingId(null);
      setFormOpen(false);
      setForm(emptyForm);
      await loadStudents();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save student.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent(id: number) {
    if (!window.confirm("Delete this student?")) return;
    try {
      await apiRequest(`/api/students/${id}`, { method: "DELETE" });
      setSelected(null);
      await loadStudents();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete student.");
    }
  }

  const filteredStudents = students.filter((student) => `${student.name} ${student.roll_number}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <section className="page-section admin-page">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Directory</p>
          <h1>Students</h1>
          <p>Manage student profiles and their contact details.</p>
        </div>
        <button className="action-button primary" type="button" onClick={openCreate}>+ Add student</button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {formOpen && (
        <form className="editor-panel" onSubmit={saveStudent}>
          <div className="panel-title">
            <div>
              <p className="eyebrow">{editingId ? "Update record" : "New record"}</p>
              <h2>{editingId ? "Edit student" : "Add student"}</h2>
            </div>
            <button
              className="close-button"
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormOpen(false);
                setForm(emptyForm);
              }}
            >
              ×
            </button>
          </div>

          <div className="form-grid">
            <label>
              Name
              <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>

            <label>
              Roll number
              <input required value={form.roll_number} onChange={(event) => setForm({ ...form, roll_number: event.target.value })} />
            </label>

            <label>
              Admission date
              <input required type="date" value={form.admission_date} onChange={(event) => setForm({ ...form, admission_date: event.target.value })} />
            </label>
          
<label>
 Grade
              <select value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })}>
                <option value="">Select a grade</option>
                {availableGrades.map((grade) => (
                  <option key={grade.id} value={grade.grade}>
                    {grade.academic_year} - {grade.grade}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Section
              <select value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })}>
                <option value="">Select a section</option>
                {availableSections.map((section) => (
                  <option key={section.id} value={section.section}>
                    {section.section}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Parent name
              <input value={form.parent_name} onChange={(event) => setForm({ ...form, parent_name: event.target.value })} />
            </label>

            <label>
              Mobile number
              <input type="tel" value={form.mobile_number} onChange={(event) => setForm({ ...form, mobile_number: event.target.value })} />
            </label>
          </div>

          <button className="action-button primary" disabled={saving} type="submit">
            {saving ? "Saving..." : editingId ? "Save changes" : "Create student"}
          </button>
        </form>
      )}

      <div className="data-panel">
        <div className="toolbar">
          <h2>
            All students <span>{students.length}</span>
          </h2>
          <input aria-label="Search students" placeholder="Search name or roll number" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        {loading ? (
          <p className="state-text">Loading students...</p>
        ) : filteredStudents.length === 0 ? (
          <p className="state-text">No students found.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll number</th>
                  <th>Grade</th>
                  <th>Section</th>
                  <th>Admission date</th>
                  <th>Parent</th>
                  <th>Mobile</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <button className="table-link" type="button" onClick={() => viewStudent(student.id)}>
                        {student.name}
                      </button>
                    </td>
                    <td>{student.roll_number}</td>
                    <td>{student.grade || "—"}</td>
                    <td>{student.section || "—"}</td>
                    <td>{student.admission_date || "—"}</td>
                    <td>{student.parent_name || "—"}</td>
                    <td>{student.mobile_number || "—"}</td>
                    <td>
                      <span className="status-pill">{student.status}</span>
                    </td>
                    <td>
                      <button className="small-button" type="button" onClick={() => openEdit(student)}>
                        Edit
                      </button>
                      <button className="small-button danger" type="button" onClick={() => deleteStudent(student.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="detail-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Student #{selected.id}</p>
              <h2>{selected.name}</h2>
            </div>
            <button className="close-button" type="button" onClick={() => setSelected(null)}>
              ×
            </button>
          </div>

          <div className="detail-grid">
            <span>
              Roll number
              <strong>{selected.roll_number}</strong>
            </span>
            <span>
              Grade
              <strong>{selected.grade || "—"}</strong>
            </span>
            <span>
              Section
              <strong>{selected.section || "—"}</strong>
            </span>
            <span>
              Admission date
              <strong>{selected.admission_date || "—"}</strong>
            </span>
            <span>
              Parent name
              <strong>{selected.parent_name || "—"}</strong>
            </span>
            <span>
              Mobile number
              <strong>{selected.mobile_number || "—"}</strong>
            </span>
            <span>
              Created
              <strong>{new Date(selected.created_at).toLocaleDateString()}</strong>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
