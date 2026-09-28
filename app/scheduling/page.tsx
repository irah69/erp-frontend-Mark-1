"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ClassSessionRecord,
  SectionOption,
  StaffOption,
  SubjectOption,
  TimetableInput,
  TimetableRecord,
  ClassSessionInput,
  createClassSession,
  createTimetable,
  getClassSessions,
  getSchedulingSections,
  getSchedulingStaff,
  getSchedulingSubjects,
  getTimetables,
  removeClassSession,
  removeTimetable,
  updateClassSession,
  updateTimetable,
} from "../../lib/api";

type Tab = "timetable" | "sessions";

type TimetableForm = {
  section_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string;
  status: string;
};

type SessionForm = {
  timetable_id: string;
  subject_id: string;
  staff_id: string;
  session_date: string;
  is_conducted: string;
  remarks: string;
};

const emptyTimetableForm: TimetableForm = {
  section_id: "",
  day_of_week: "1",
  start_time: "09:00",
  end_time: "10:00",
  room: "",
  status: "active",
};

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const attendanceDate = () => new Date().toISOString().slice(0, 10);

function displaySubject(subject: SubjectOption | undefined, id: number) {
  return (
    subject?.name ??
    subject?.subject ??
    subject?.code ??
    `Subject ${id}`
  );
}

function displayTime(value: string) {
  return value.slice(0, 5);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function SchedulingPage() {
  const [tab, setTab] = useState<Tab>("timetable");

  const [sections, setSections] = useState<SectionOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  const [timetables, setTimetables] = useState<TimetableRecord[]>([]);
  const [sessions, setSessions] = useState<ClassSessionRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [timetableFormOpen, setTimetableFormOpen] = useState(false);
  const [sessionFormOpen, setSessionFormOpen] = useState(false);

  const [editingTimetableId, setEditingTimetableId] = useState<number | null>(
    null
  );
  const [editingSessionId, setEditingSessionId] = useState<number | null>(
    null
  );

  const [timetableForm, setTimetableForm] =
    useState<TimetableForm>(emptyTimetableForm);

  const [sessionForm, setSessionForm] = useState<SessionForm>({
    timetable_id: "",
    subject_id: "",
    staff_id: "",
    session_date: attendanceDate(),
    is_conducted: "false",
    remarks: "",
  });

  const sectionNames = useMemo(
    () => new Map(sections.map((section) => [section.id, section.section])),
    [sections]
  );

  const staffNames = useMemo(
    () => new Map(staff.map((member) => [member.id, member.name])),
    [staff]
  );

  const subjectNames = useMemo(
    () =>
      new Map(
        subjects.map((subject) => [
          subject.id,
          displaySubject(subject, subject.id),
        ])
      ),
    [subjects]
  );

  async function loadSchedulingData() {
    setLoading(true);
    setError("");

    try {
      const [
        sectionData,
        staffData,
        subjectData,
        timetableData,
        sessionData,
      ] = await Promise.all([
        getSchedulingSections(),
        getSchedulingStaff(),
        getSchedulingSubjects(),
        getTimetables(),
        getClassSessions(),
      ]);

      setSections(sectionData);
      setStaff(staffData);
      setSubjects(subjectData);
      setTimetables(timetableData);
      setSessions(sessionData);
    } catch (loadError) {
      setError(
        getErrorMessage(loadError, "Unable to load scheduling data.")
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(
      () => void loadSchedulingData(),
      0
    );

    return () => window.clearTimeout(timer);
  }, []);

  // =========================================================
  // TIMETABLE
  // =========================================================

  function openNewTimetable() {
    setEditingTimetableId(null);
    setTimetableForm(emptyTimetableForm);
    setTimetableFormOpen(true);
    setError("");
  }

  function openEditTimetable(item: TimetableRecord) {
    setEditingTimetableId(item.id);

    setTimetableForm({
      section_id: String(item.section_id),
      day_of_week: String(item.day_of_week),
      start_time: displayTime(item.start_time),
      end_time: displayTime(item.end_time),
      room: item.room ?? "",
      status: item.status,
    });

    setTimetableFormOpen(true);
    setError("");
  }

  function closeTimetableForm() {
    setTimetableFormOpen(false);
    setEditingTimetableId(null);
    setTimetableForm(emptyTimetableForm);
  }

  async function submitTimetable(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!timetableForm.section_id) {
      setError("Select a section.");
      return;
    }

    if (timetableForm.start_time >= timetableForm.end_time) {
      setError("Start time must be earlier than end time.");
      return;
    }

    const payload: TimetableInput = {
      section_id: Number(timetableForm.section_id),
      day_of_week: Number(timetableForm.day_of_week),
      start_time: `${timetableForm.start_time}:00`,
      end_time: `${timetableForm.end_time}:00`,
      room: timetableForm.room.trim() || null,
      status: timetableForm.status,
    };

    setSaving(true);
    setError("");

    try {
      if (editingTimetableId === null) {
        await createTimetable(payload);
      } else {
        await updateTimetable(editingTimetableId, payload);
      }

      closeTimetableForm();
      await loadSchedulingData();
    } catch (saveError) {
      setError(
        getErrorMessage(saveError, "Unable to save timetable.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteTimetable(id: number) {
    if (!window.confirm("Delete this timetable?")) return;

    setError("");

    try {
      await removeTimetable(id);
      await loadSchedulingData();
    } catch (deleteError) {
      setError(
        getErrorMessage(deleteError, "Unable to delete timetable.")
      );
    }
  }

  // =========================================================
  // CLASS SESSION
  // =========================================================

  function openNewSession() {
    setEditingSessionId(null);

    setSessionForm({
      timetable_id: "",
      subject_id: "",
      staff_id: "",
      session_date: attendanceDate(),
      is_conducted: "false",
      remarks: "",
    });

    setSessionFormOpen(true);
    setError("");
  }

  function openEditSession(session: ClassSessionRecord) {
    setEditingSessionId(session.id);

    setSessionForm({
      timetable_id: String(session.timetable_id),
      subject_id: String(session.subject_id),
      staff_id: String(session.staff_id),
      session_date: session.session_date.slice(0, 10),
      is_conducted: String(session.is_conducted),
      remarks: session.remarks ?? "",
    });

    setSessionFormOpen(true);
    setError("");
  }

  function closeSessionForm() {
    setSessionFormOpen(false);
    setEditingSessionId(null);

    setSessionForm({
      timetable_id: "",
      subject_id: "",
      staff_id: "",
      session_date: attendanceDate(),
      is_conducted: "false",
      remarks: "",
    });
  }

  async function submitSession(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !sessionForm.timetable_id ||
      !sessionForm.subject_id ||
      !sessionForm.staff_id ||
      !sessionForm.session_date
    ) {
      setError(
        "Select a timetable, subject, staff member, and session date."
      );
      return;
    }

    const payload: ClassSessionInput = {
      timetable_id: Number(sessionForm.timetable_id),
      subject_id: Number(sessionForm.subject_id),
      staff_id: Number(sessionForm.staff_id),
      session_date: sessionForm.session_date,
      is_conducted: sessionForm.is_conducted === "true",
      remarks: sessionForm.remarks.trim() || null,
    };

    setSaving(true);
    setError("");

    try {
      if (editingSessionId === null) {
        await createClassSession(payload);
      } else {
        await updateClassSession(editingSessionId, payload);
      }

      closeSessionForm();
      await loadSchedulingData();
    } catch (saveError) {
      setError(
        getErrorMessage(saveError, "Unable to save class session.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSession(id: number) {
    if (!window.confirm("Delete this class session?")) return;

    setError("");

    try {
      await removeClassSession(id);
      await loadSchedulingData();
    } catch (deleteError) {
      setError(
        getErrorMessage(deleteError, "Unable to delete class session.")
      );
    }
  }

  // =========================================================
  // DISPLAY HELPERS
  // =========================================================

  function timetableLabel(item: TimetableRecord) {
    const section =
      sectionNames.get(item.section_id) ??
      `Section ${item.section_id}`;

    return `${section} / ${
      dayNames[item.day_of_week - 1] ?? "Unknown day"
    } ${displayTime(item.start_time)}–${displayTime(item.end_time)}${
      item.room ? ` / ${item.room}` : ""
    }`;
  }

  return (
    <section className="page-section admin-page">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Academics</p>
          <h1>Scheduling</h1>
          <p>
            Manage weekly timetables and the class sessions scheduled
            from them.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      <div className="data-panel" style={{ marginTop: 0 }}>
        <div
          className="toolbar"
          role="tablist"
          aria-label="Scheduling views"
        >
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "timetable"}
              className="small-button"
              onClick={() => setTab("timetable")}
            >
              Timetables
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={tab === "sessions"}
              className="small-button"
              onClick={() => setTab("sessions")}
            >
              Class sessions
            </button>
          </div>

          <button
            className="action-button primary"
            type="button"
            onClick={
              tab === "timetable"
                ? openNewTimetable
                : openNewSession
            }
          >
            {tab === "timetable"
              ? "+ Add timetable"
              : "+ Create session"}
          </button>
        </div>

        {/* =====================================================
            TIMETABLE TAB
        ===================================================== */}

        {tab === "timetable" ? (
          <>
            {timetableFormOpen && (
              <form
                className="editor-panel"
                onSubmit={submitTimetable}
              >
                <div className="panel-title">
                  <div>
                    <p className="eyebrow">
                      {editingTimetableId === null
                        ? "New record"
                        : "Update record"}
                    </p>

                    <h2>
                      {editingTimetableId === null
                        ? "Add timetable"
                        : "Edit timetable"}
                    </h2>
                  </div>

                  <button
                    type="button"
                    className="close-button"
                    aria-label="Close form"
                    onClick={closeTimetableForm}
                  >
                    ×
                  </button>
                </div>

                <div className="form-grid">
                  {/* SECTION */}
                  <label>
                    Section

                    <select
                      required
                      value={timetableForm.section_id}
                      onChange={(event) =>
                        setTimetableForm({
                          ...timetableForm,
                          section_id: event.target.value,
                        })
                      }
                    >
                      <option value="">Select section</option>

                      {sections.map((section) => (
                        <option
                          key={section.id}
                          value={section.id}
                        >
                          {section.section}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* DAY */}
                  <label>
                    Day

                    <select
                      value={timetableForm.day_of_week}
                      onChange={(event) =>
                        setTimetableForm({
                          ...timetableForm,
                          day_of_week: event.target.value,
                        })
                      }
                    >
                      {dayNames.map((day, index) => (
                        <option
                          key={day}
                          value={index + 1}
                        >
                          {day}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* START TIME */}
                  <label>
                    Start time

                    <input
                      required
                      type="time"
                      value={timetableForm.start_time}
                      onChange={(event) =>
                        setTimetableForm({
                          ...timetableForm,
                          start_time: event.target.value,
                        })
                      }
                    />
                  </label>

                  {/* END TIME */}
                  <label>
                    End time

                    <input
                      required
                      type="time"
                      value={timetableForm.end_time}
                      onChange={(event) =>
                        setTimetableForm({
                          ...timetableForm,
                          end_time: event.target.value,
                        })
                      }
                    />
                  </label>

                  {/* ROOM */}
                  <label>
                    Room

                    <input
                      value={timetableForm.room}
                      onChange={(event) =>
                        setTimetableForm({
                          ...timetableForm,
                          room: event.target.value,
                        })
                      }
                      placeholder="Room 12"
                    />
                  </label>

                  {/* STATUS */}
                  <label>
                    Status

                    <select
                      value={timetableForm.status}
                      onChange={(event) =>
                        setTimetableForm({
                          ...timetableForm,
                          status: event.target.value,
                        })
                      }
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                </div>

                <button
                  className="action-button primary"
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingTimetableId === null
                    ? "Create timetable"
                    : "Save changes"}
                </button>
              </form>
            )}

            {loading ? (
              <p className="state-text">
                Loading timetables...
              </p>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Time</th>
                      <th>Section</th>
                      <th>Room</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {timetables.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="state-text"
                        >
                          No timetables found.
                        </td>
                      </tr>
                    ) : (
                      timetables.map((item) => (
                        <tr key={item.id}>
                          <td>
                            {dayNames[item.day_of_week - 1] ??
                              `Day ${item.day_of_week}`}
                          </td>

                          <td>
                            {displayTime(item.start_time)}–
                            {displayTime(item.end_time)}
                          </td>

                          <td>
                            {sectionNames.get(item.section_id) ??
                              `Section ${item.section_id}`}
                          </td>

                          <td>{item.room || "—"}</td>

                          <td>
                            <span
                              className={`status-pill ${
                                item.status === "active"
                                  ? ""
                                  : "inactive"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="small-button"
                              onClick={() =>
                                openEditTimetable(item)
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="small-button danger"
                              onClick={() =>
                                void deleteTimetable(item.id)
                              }
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          /* =====================================================
             CLASS SESSION TAB
          ===================================================== */

          <>
            {sessionFormOpen && (
              <form
                className="editor-panel"
                onSubmit={submitSession}
              >
                <div className="panel-title">
                  <div>
                    <p className="eyebrow">
                      {editingSessionId === null
                        ? "New record"
                        : "Update record"}
                    </p>

                    <h2>
                      {editingSessionId === null
                        ? "Create class session"
                        : "Edit class session"}
                    </h2>
                  </div>

                  <button
                    type="button"
                    className="close-button"
                    aria-label="Close form"
                    onClick={closeSessionForm}
                  >
                    ×
                  </button>
                </div>

                <div className="form-grid">
                  {/* TIMETABLE */}
                  <label>
                    Timetable

                    <select
                      required
                      value={sessionForm.timetable_id}
                      onChange={(event) =>
                        setSessionForm({
                          ...sessionForm,
                          timetable_id: event.target.value,
                        })
                      }
                    >
                      <option value="">
                        Select timetable
                      </option>

                      {timetables.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {timetableLabel(item)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* SUBJECT */}
                  <label>
                    Subject

                    <select
                      required
                      value={sessionForm.subject_id}
                      onChange={(event) =>
                        setSessionForm({
                          ...sessionForm,
                          subject_id: event.target.value,
                        })
                      }
                    >
                      <option value="">
                        Select subject
                      </option>

                      {subjects.map((subject) => (
                        <option
                          key={subject.id}
                          value={subject.id}
                        >
                          {displaySubject(
                            subject,
                            subject.id
                          )}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* STAFF */}
                  <label>
                    Staff

                    <select
                      required
                      value={sessionForm.staff_id}
                      onChange={(event) =>
                        setSessionForm({
                          ...sessionForm,
                          staff_id: event.target.value,
                        })
                      }
                    >
                      <option value="">
                        Select staff
                      </option>

                      {staff.map((member) => (
                        <option
                          key={member.id}
                          value={member.id}
                        >
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* DATE */}
                  <label>
                    Session date

                    <input
                      required
                      type="date"
                      value={sessionForm.session_date}
                      onChange={(event) =>
                        setSessionForm({
                          ...sessionForm,
                          session_date: event.target.value,
                        })
                      }
                    />
                  </label>

                  {/* CONDUCTED */}
                  <label>
                    Conducted

                    <select
                      value={sessionForm.is_conducted}
                      onChange={(event) =>
                        setSessionForm({
                          ...sessionForm,
                          is_conducted: event.target.value,
                        })
                      }
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </label>

                  {/* REMARKS */}
                  <label>
                    Remarks

                    <input
                      value={sessionForm.remarks}
                      onChange={(event) =>
                        setSessionForm({
                          ...sessionForm,
                          remarks: event.target.value,
                        })
                      }
                      placeholder="Optional"
                    />
                  </label>
                </div>

                <button
                  className="action-button primary"
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingSessionId === null
                    ? "Create session"
                    : "Save changes"}
                </button>
              </form>
            )}

            {loading ? (
              <p className="state-text">
                Loading class sessions...
              </p>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Class timetable</th>
                      <th>Subject</th>
                      <th>Staff</th>
                      <th>Conducted</th>
                      <th>Remarks</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sessions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="state-text"
                        >
                          No class sessions found.
                        </td>
                      </tr>
                    ) : (
                      sessions.map((session) => {
                        const timetable = timetables.find(
                          (item) =>
                            item.id === session.timetable_id
                        );

                        return (
                          <tr key={session.id}>
                            <td>
                              {session.session_date.slice(
                                0,
                                10
                              )}
                            </td>

                            <td>
                              {timetable
                                ? timetableLabel(timetable)
                                : `Timetable ${session.timetable_id}`}
                            </td>

                            <td>
                              {subjectNames.get(
                                session.subject_id
                              ) ??
                                `Subject ${session.subject_id}`}
                            </td>

                            <td>
                              {staffNames.get(
                                session.staff_id
                              ) ??
                                `Staff ${session.staff_id}`}
                            </td>

                            <td>
                              <span className="status-pill">
                                {session.is_conducted
                                  ? "Conducted"
                                  : "Pending"}
                              </span>
                            </td>

                            <td>
                              {session.remarks || "—"}
                            </td>

                            <td>
                              <button
                                type="button"
                                className="small-button"
                                onClick={() =>
                                  openEditSession(session)
                                }
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="small-button danger"
                                onClick={() =>
                                  void deleteSession(
                                    session.id
                                  )
                                }
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}