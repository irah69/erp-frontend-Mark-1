"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

/* =========================
   TYPES
========================= */

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

type StaffOption = {
  id: number;
  name: string;
  number: string;
  status: string;
};

type GradeForm = {
  academic_year: string;
  grade: string;
  status: string;
};

type SectionForm = {
  section: string;
  staff_id: string;
};

const emptyGradeForm: GradeForm = {
  academic_year: "",
  grade: "",
  status: "active",
};

const emptySectionForm: SectionForm = {
  section: "",
  staff_id: "",
};

/* =========================
   COMPONENT
========================= */

export default function AcademicPage() {
  /* -------------------------
     Grade state
  ------------------------- */

  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);

  const [gradeForm, setGradeForm] =
    useState<GradeForm>(emptyGradeForm);

  const [editingGradeId, setEditingGradeId] =
    useState<number | null>(null);

  const [gradeFormOpen, setGradeFormOpen] = useState(false);

  const [gradeSearch, setGradeSearch] = useState("");

  /* -------------------------
     Section state
  ------------------------- */

  const [sections, setSections] = useState<Section[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffOption[]>([]);
  const [selectedSection, setSelectedSection] =
    useState<Section | null>(null);

  const [sectionForm, setSectionForm] =
    useState<SectionForm>(emptySectionForm);

  const [editingSectionId, setEditingSectionId] =
    useState<number | null>(null);

  const [sectionFormOpen, setSectionFormOpen] = useState(false);

  const [sectionSearch, setSectionSearch] = useState("");

  /* -------------------------
     Common state
  ------------------------- */

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load grades and sections."
      );
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
      const data = await apiRequest<Grade>(
        `/api/grades/${id}`
      );

      setSelectedGrade(data);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load grade."
      );
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

  async function saveGrade(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const payload = {
      academic_year: gradeForm.academic_year,
      grade: gradeForm.grade,
      status: gradeForm.status,
    };

    try {
      if (editingGradeId !== null) {
        await apiRequest(
          `/api/grades/${editingGradeId}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
      } else {
        await apiRequest("/api/grades", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeGradeForm();
      await loadAcademicData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save grade."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteGrade(id: number) {
    if (!window.confirm("Delete this grade?")) {
      return;
    }

    try {
      await apiRequest(`/api/grades/${id}`, {
        method: "DELETE",
      });

      setSelectedGrade(null);
      await loadAcademicData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete grade."
      );
    }
  }

  /* =====================================================
     SECTION FUNCTIONS
  ===================================================== */

  async function viewSection(id: number) {
    try {
      const data = await apiRequest<Section>(
        `/api/sections/${id}`
      );

      setSelectedSection(data);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load section."
      );
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
      staff_id:
        section.staff_id !== null
          ? String(section.staff_id)
          : "",
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

  async function saveSection(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const payload = {
      section: sectionForm.section,
      staff_id: sectionForm.staff_id
        ? Number(sectionForm.staff_id)
        : null,
    };

    try {
      if (editingSectionId !== null) {
        await apiRequest(
          `/api/sections/${editingSectionId}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
      } else {
        await apiRequest("/api/sections", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeSectionForm();
      await loadAcademicData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save section."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSection(id: number) {
    if (!window.confirm("Delete this section?")) {
      return;
    }

    try {
      await apiRequest(`/api/sections/${id}`, {
        method: "DELETE",
      });

      setSelectedSection(null);
      await loadAcademicData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete section."
      );
    }
  }

  /* =====================================================
     FILTERING
  ===================================================== */

  const filteredGrades = grades.filter((grade) =>
    `${grade.academic_year} ${grade.grade} ${grade.status}`
      .toLowerCase()
      .includes(gradeSearch.toLowerCase())
  );

  const filteredSections = sections.filter((section) =>
    `${section.section} ${section.staff_id ?? ""}`
      .toLowerCase()
      .includes(sectionSearch.toLowerCase())
  );

  /* =====================================================
     UI
  ===================================================== */

  return (
    <section className="page-section admin-page">

      {/* =========================
          PAGE HEADER
      ========================= */}

      <div className="admin-heading">
        <div>
          <p className="eyebrow">Academic management</p>

          <h1>Grades & Sections</h1>

          <p>
            Manage academic grades and classroom sections.
          </p>
        </div>
      </div>

      {/* =========================
          ERROR
      ========================= */}

      {error && (
        <div className="alert error">
          {error}
        </div>
      )}

      {/* =================================================
          GRADES
      ================================================= */}

      <div className="data-panel">

        <div className="toolbar">

          <div>
            <h2>
              Grades{" "}
              <span>{grades.length}</span>
            </h2>
          </div>

          <div className="toolbar-actions">

            <input
              aria-label="Search grades"
              placeholder="Search grades..."
              value={gradeSearch}
              onChange={(event) =>
                setGradeSearch(event.target.value)
              }
            />

            <button
              className="action-button primary"
              type="button"
              onClick={openCreateGrade}
            >
              + Add Grade
            </button>

          </div>

        </div>

        {/* -------------------------
            GRADE FORM
        ------------------------- */}

        {gradeFormOpen && (
          <form
            className="editor-panel"
            onSubmit={saveGrade}
          >

            <div className="panel-title">

              <div>
                <p className="eyebrow">
                  {editingGradeId
                    ? "Update grade"
                    : "New grade"}
                </p>

                <h2>
                  {editingGradeId
                    ? "Edit Grade"
                    : "Add Grade"}
                </h2>
              </div>

              <button
                className="close-button"
                type="button"
                onClick={closeGradeForm}
              >
                ×
              </button>

            </div>

            <div className="form-grid">

              <label>
                Academic Year

                <input
                  required
                  type="text"
                  placeholder="2026-2027"
                  value={gradeForm.academic_year}
                  onChange={(event) =>
                    setGradeForm({
                      ...gradeForm,
                      academic_year:
                        event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Grade

                <input
                  required
                  type="text"
                  placeholder="10"
                  value={gradeForm.grade}
                  onChange={(event) =>
                    setGradeForm({
                      ...gradeForm,
                      grade: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Status

                <select
                  value={gradeForm.status}
                  onChange={(event) =>
                    setGradeForm({
                      ...gradeForm,
                      status: event.target.value,
                    })
                  }
                >
                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>
                </select>
              </label>

            </div>

            <button
              className="action-button primary"
              disabled={saving}
              type="submit"
            >
              {saving
                ? "Saving..."
                : editingGradeId
                  ? "Save Changes"
                  : "Create Grade"}
            </button>

          </form>
        )}

        {/* -------------------------
            GRADE TABLE
        ------------------------- */}

        {loading ? (
          <p className="state-text">
            Loading grades...
          </p>
        ) : filteredGrades.length === 0 ? (
          <p className="state-text">
            No grades found.
          </p>
        ) : (
          <div className="table-scroll">

            <table className="data-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Academic Year</th>
                  <th>Grade</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredGrades.map((grade) => (
                  <tr key={grade.id}>

                    <td>{grade.id}</td>

                    <td>
                      {grade.academic_year}
                    </td>

                    <td>
                      <button
                        className="table-link"
                        type="button"
                        onClick={() =>
                          viewGrade(grade.id)
                        }
                      >
                        {grade.grade}
                      </button>
                    </td>

                    <td>
                      <span
                        className={`status-pill ${
                          grade.status !== "active"
                            ? "inactive"
                            : ""
                        }`}
                      >
                        {grade.status}
                      </span>
                    </td>

                    <td>

                      <button
                        className="small-button"
                        type="button"
                        onClick={() =>
                          openEditGrade(grade)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="small-button danger"
                        type="button"
                        onClick={() =>
                          deleteGrade(grade.id)
                        }
                      >
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

      {/* =========================
          SELECTED GRADE
      ========================= */}

      {selectedGrade && (
        <div className="detail-panel">

          <div className="panel-title">

            <div>
              <p className="eyebrow">
                Grade #{selectedGrade.id}
              </p>

              <h2>
                Grade {selectedGrade.grade}
              </h2>
            </div>

            <button
              className="close-button"
              type="button"
              onClick={() =>
                setSelectedGrade(null)
              }
            >
              ×
            </button>

          </div>

          <div className="detail-grid">

            <span>
              Academic Year
              <strong>
                {selectedGrade.academic_year}
              </strong>
            </span>

            <span>
              Grade
              <strong>
                {selectedGrade.grade}
              </strong>
            </span>

            <span>
              Status
              <strong>
                {selectedGrade.status}
              </strong>
            </span>

          </div>

        </div>
      )}

      {/* =================================================
          SECTIONS
      ================================================= */}

      <div className="data-panel">

        <div className="toolbar">

          <div>
            <h2>
              Sections{" "}
              <span>{sections.length}</span>
            </h2>
          </div>

          <div className="toolbar-actions">

            <input
              aria-label="Search sections"
              placeholder="Search sections..."
              value={sectionSearch}
              onChange={(event) =>
                setSectionSearch(event.target.value)
              }
            />

            <button
              className="action-button primary"
              type="button"
              onClick={openCreateSection}
            >
              + Add Section
            </button>

          </div>

        </div>

        {/* -------------------------
            SECTION FORM
        ------------------------- */}

        {sectionFormOpen && (
          <form
            className="editor-panel"
            onSubmit={saveSection}
          >

            <div className="panel-title">

              <div>
                <p className="eyebrow">
                  {editingSectionId
                    ? "Update section"
                    : "New section"}
                </p>

                <h2>
                  {editingSectionId
                    ? "Edit Section"
                    : "Add Section"}
                </h2>
              </div>

              <button
                className="close-button"
                type="button"
                onClick={closeSectionForm}
              >
                ×
              </button>

            </div>

            <div className="form-grid">

              <label>
                Section

                <input
                  required
                  type="text"
                  placeholder="A"
                  value={sectionForm.section}
                  onChange={(event) =>
                    setSectionForm({
                      ...sectionForm,
                      section:
                        event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Staff

                <select
                  value={sectionForm.staff_id}
                  onChange={(event) =>
                    setSectionForm({
                      ...sectionForm,
                      staff_id: event.target.value,
                    })
                  }
                >
                  <option value="">Select a staff member</option>
                  {staffMembers.map((staff) => (
                    <option key={staff.id} value={String(staff.id)}>
                      {staff.name} (ID: {staff.id})
                    </option>
                  ))}
                </select>
              </label>

            </div>

            <button
              className="action-button primary"
              disabled={saving}
              type="submit"
            >
              {saving
                ? "Saving..."
                : editingSectionId
                  ? "Save Changes"
                  : "Create Section"}
            </button>

          </form>
        )}

        {/* -------------------------
            SECTION TABLE
        ------------------------- */}

        {loading ? (
          <p className="state-text">
            Loading sections...
          </p>
        ) : filteredSections.length === 0 ? (
          <p className="state-text">
            No sections found.
          </p>
        ) : (
          <div className="table-scroll">

            <table className="data-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Section</th>
                  <th>Staff ID</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredSections.map((section) => (
                  <tr key={section.id}>

                    <td>{section.id}</td>

                    <td>
                      <button
                        className="table-link"
                        type="button"
                        onClick={() =>
                          viewSection(section.id)
                        }
                      >
                        {section.section}
                      </button>
                    </td>

                    <td>
                      {section.staff_id ?? "—"}
                    </td>

                    <td>

                      <button
                        className="small-button"
                        type="button"
                        onClick={() =>
                          openEditSection(section)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="small-button danger"
                        type="button"
                        onClick={() =>
                          deleteSection(section.id)
                        }
                      >
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

      {/* =========================
          SELECTED SECTION
      ========================= */}

      {selectedSection && (
        <div className="detail-panel">

          <div className="panel-title">

            <div>
              <p className="eyebrow">
                Section #{selectedSection.id}
              </p>

              <h2>
                Section {selectedSection.section}
              </h2>
            </div>

            <button
              className="close-button"
              type="button"
              onClick={() =>
                setSelectedSection(null)
              }
            >
              ×
            </button>

          </div>

          <div className="detail-grid">

            <span>
              Section
              <strong>
                {selectedSection.section}
              </strong>
            </span>

            <span>
              Staff ID
              <strong>
                {selectedSection.staff_id ?? "—"}
              </strong>
            </span>

          </div>

        </div>
      )}

    </section>
  );
}