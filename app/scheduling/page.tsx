"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GradeOption,
  SectionOption,
  StaffOption,
  SubjectOption,
  TimetableRecord,
  assignTimetableSlot,
  generateClassSessions,
  getSchedulingGrades,
  getSchedulingSections,
  getSchedulingStaff,
  getSchedulingSubjects,
  openTimetable,
} from "../../lib/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [1, 2, 3, 4, 5, 6];

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function subjectLabel(subject: SubjectOption | undefined) {
  return subject?.name ?? subject?.subject ?? subject?.code ?? "";
}

export default function TimetablePage() {
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);

  // One dropdown: each /api/grades row already pairs a class with a section.
  const [gradeRowId, setGradeRowId] = useState("");
  const [validFrom, setValidFrom] = useState("2026-06-01");
  const [validTo, setValidTo] = useState("2027-03-31");

  const [slots, setSlots] = useState<TimetableRecord[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [skipDates, setSkipDates] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function loadOptions() {
      try {
        const [gradeData, sectionData, subjectData, staffData] = await Promise.all([
          getSchedulingGrades(),
          getSchedulingSections(),
          getSchedulingSubjects(),
          getSchedulingStaff(),
        ]);
        setGrades(gradeData);
        setSections(sectionData);
        setSubjects(subjectData);
        setStaff(staffData);
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Unable to load timetable options."));
      } finally {
        setLoading(false);
      }
    }
    void loadOptions();
  }, []);

  const selectedGrade = grades.find((grade) => String(grade.id) === gradeRowId) ?? null;
  const gradeId = selectedGrade?.id ?? null;
  const sectionId = selectedGrade?.section_id ?? null;

  function gradeLabel(grade: GradeOption) {
    const section = sections.find((item) => item.id === grade.section_id)?.section;
    return section
      ? `Class ${grade.grade} · Section ${section} · ${grade.academic_year}`
      : `Class ${grade.grade} · ${grade.academic_year} (no section assigned)`;
  }

  const slotMap = useMemo(
    () => new Map(slots.map((slot) => [`${slot.day_of_week}-${slot.period_number}`, slot])),
    [slots]
  );
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) ?? null;
  const assignedCount = slots.filter((slot) => slot.default_subject_id && slot.default_staff_id).length;

  function selectSlot(slot: TimetableRecord) {
    setSelectedSlotId(slot.id);
    setSubjectId(slot.default_subject_id ? String(slot.default_subject_id) : "");
    setStaffId(slot.default_staff_id ? String(slot.default_staff_id) : "");
    setNotice("");
    setError("");
  }

  async function handleOpen() {
    if (!gradeId || !sectionId) {
      setError("Select a class and section that has a section assigned.");
      return;
    }
    if (!validFrom || !validTo || validTo < validFrom) {
      setError("Enter a valid academic year start and end date.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await openTimetable({
        grade_id: gradeId,
        section_id: sectionId,
        valid_from: validFrom,
        valid_to: validTo,
      });
      setSlots(data);
      setSelectedSlotId(null);
    } catch (openError) {
      setError(getErrorMessage(openError, "Unable to open the timetable."));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSlot() {
    if (!selectedSlot) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await assignTimetableSlot(selectedSlot.id, {
        subject_id: subjectId ? Number(subjectId) : null,
        staff_id: staffId ? Number(staffId) : null,
      });
      setSlots((current) => current.map((slot) => (slot.id === updated.id ? updated : slot)));
      setNotice("Slot saved.");
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Unable to save this slot."));
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate() {
    if (!gradeId || !sectionId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const dates = skipDates
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const result = await generateClassSessions({
        grade_id: gradeId,
        section_id: sectionId,
        start_date: validFrom,
        end_date: validTo,
        skip_dates: dates,
      });
      setNotice(
        `${result.created} sessions created from ${result.start_date} to ${result.end_date}. ` +
          `${result.unassigned_slots} slot(s) had no subject/staff and were skipped.`
      );
    } catch (generateError) {
      setError(getErrorMessage(generateError, "Unable to generate class sessions."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-section admin-page">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Scheduling</p>
          <h1>Timetable</h1>
          <p>Open a class timetable, fill the weekly grid, then generate dated class sessions.</p>
        </div>
      </div>

      {error && <div className="alert error" role="alert">{error}</div>}
      {notice && <div className="alert" role="status">{notice}</div>}

      <div className="data-panel" style={{ marginTop: 0 }}>
        <div className="form-grid">
          <label>Class &amp; section
            <select
              value={gradeRowId}
              onChange={(event) => {
                setGradeRowId(event.target.value);
                setSlots([]);
                setSelectedSlotId(null);
              }}
            >
              <option value="">Select class and section</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id} disabled={!grade.section_id}>
                  {gradeLabel(grade)}
                </option>
              ))}
            </select>
          </label>
          <label>Academic year start
            <input type="date" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} />
          </label>
          <label>Academic year end
            <input type="date" value={validTo} onChange={(event) => setValidTo(event.target.value)} />
          </label>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button className="action-button primary" type="button" disabled={busy || loading} onClick={() => void handleOpen()}>
            {busy ? "Working..." : "Create / Open timetable"}
          </button>
        </div>
      </div>

      {slots.length > 0 && (
        <>
          <div className="data-panel">
            <div className="toolbar" style={{ flexWrap: "wrap" }}>
              <h2>Weekly grid <span>{assignedCount}/{slots.length} assigned</span></h2>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    {PERIODS.map((period) => <th key={period}>Period {period}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, dayIndex) => (
                    <tr key={day}>
                      <td>{day}</td>
                      {PERIODS.map((period) => {
                        const slot = slotMap.get(`${dayIndex + 1}-${period}`);
                        if (!slot) return <td key={period}>—</td>;
                        const subject = subjectLabel(subjects.find((item) => item.id === slot.default_subject_id));
                        const teacher = staff.find((item) => item.id === slot.default_staff_id)?.name;
                        const isSelected = slot.id === selectedSlotId;
                        return (
                          <td key={period}>
                            <button
                              type="button"
                              onClick={() => selectSlot(slot)}
                              aria-pressed={isSelected}
                              style={{
                                width: "100%",
                                minWidth: 110,
                                textAlign: "left",
                                padding: 8,
                                borderRadius: 6,
                                cursor: "pointer",
                                background: "transparent",
                                color: "inherit",
                                border: isSelected ? "2px solid currentColor" : "1px dashed currentColor",
                                opacity: subject || teacher ? 1 : 0.6,
                              }}
                            >
                              <strong>{subject || "Unassigned"}</strong>
                              <br />
                              <small>{teacher ?? "No staff"}</small>
                              <br />
                              <small>{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</small>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="data-panel">
            {selectedSlot ? (
              <>
                <div className="toolbar">
                  <h2>{DAYS[selectedSlot.day_of_week - 1]} · Period {selectedSlot.period_number}</h2>
                </div>
                <div className="form-grid">
                  <label>Subject
                    <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
                      <option value="">No subject</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>{subjectLabel(subject) || `Subject ${subject.id}`}</option>
                      ))}
                    </select>
                  </label>
                  <label>Staff
                    <select value={staffId} onChange={(event) => setStaffId(event.target.value)}>
                      <option value="">No staff</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <button className="action-button primary" type="button" disabled={busy} onClick={() => void handleSaveSlot()}>
                    Save slot
                  </button>
                </div>
              </>
            ) : (
              <p className="state-text">Select a cell in the grid to assign a subject and staff member.</p>
            )}
          </div>

          <div className="data-panel">
            <div className="toolbar">
              <h2>Generate class sessions</h2>
            </div>
            <div className="form-grid">
              <label>Holidays to skip (YYYY-MM-DD, comma separated)
                <input value={skipDates} onChange={(event) => setSkipDates(event.target.value)} placeholder="2026-10-02, 2026-12-25" />
              </label>
            </div>
            <p className="state-text">
              Creates one dated session for every assigned slot between {validFrom} and {validTo}.
              Dates that already have a session are left unchanged.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button className="action-button primary" type="button" disabled={busy || assignedCount === 0} onClick={() => void handleGenerate()}>
                Generate sessions
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}