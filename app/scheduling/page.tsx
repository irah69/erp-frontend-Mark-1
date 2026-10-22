"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
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

/* ---------- shared style tokens ---------- */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1";

const buttonBase = `inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const buttonPrimary = `${buttonBase} border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800`;

const inputClass =
  "w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm";

/* panels: accent panels carry the left border, the grid panel stays plain */
const plainPanel = "rounded-lg border border-slate-200 bg-white";
const accentPanel = `${plainPanel} border-l-4 border-l-indigo-600 p-4 sm:p-5`;

/* ---------- small pieces ---------- */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function Alert({
  tone,
  role,
  onDismiss,
  children,
}: {
  tone: "error" | "success";
  role: "alert" | "status";
  onDismiss: () => void;
  children: ReactNode;
}) {
  const isError = tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      role={role}
      className={`mt-4 flex items-start gap-3 rounded-md border p-3 text-sm ${
        isError ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"
      }`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 break-words">{children}</p>
      <button
        type="button"
        aria-label="Dismiss message"
        onClick={onDismiss}
        className={`rounded p-0.5 ${isError ? "hover:bg-red-100" : "hover:bg-green-100"} ${focusRing}`}
      >
        <X size={16} />
      </button>
    </div>
  );
}

/* ---------- page ---------- */

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

  /* One grid cell: used by the desktop table and the mobile day lists */
  function renderSlot(slot: TimetableRecord) {
    const subject = subjectLabel(subjects.find((item) => item.id === slot.default_subject_id));
    const teacher = staff.find((item) => item.id === slot.default_staff_id)?.name;
    const isSelected = slot.id === selectedSlotId;
    const isEmpty = !subject && !teacher;

    return (
      <button
        type="button"
        onClick={() => selectSlot(slot)}
        aria-pressed={isSelected}
        className={`block w-full min-w-[7.5rem] rounded-md border p-2 text-left text-sm transition-colors ${focusRing} ${
          isSelected
            ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600"
            : isEmpty
              ? "border-dashed border-slate-300 text-slate-500 hover:bg-slate-50"
              : "border-slate-300 hover:bg-slate-50"
        }`}
      >
        <strong className="block font-medium">{subject || "Unassigned"}</strong>
        <small className="block text-xs text-slate-500">{teacher ?? "No staff"}</small>
        <small className="block text-xs text-slate-500">
          {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
        </small>
      </button>
    );
  }

  return (
    <section className="min-h-dvh bg-slate-50 font-sans text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-semibold">Timetable</h1>
          <p className="mt-1 text-sm text-slate-600">
            Open a class timetable, fill the weekly grid, then generate dated class sessions.
          </p>
        </div>

        {error && (
          <Alert tone="error" role="alert" onDismiss={() => setError("")}>
            {error}
          </Alert>
        )}
        {notice && (
          <Alert tone="success" role="status" onDismiss={() => setNotice("")}>
            {notice}
          </Alert>
        )}

        <div className="mt-6 space-y-4">
          {/* Open timetable */}
          <div className={accentPanel}>
            <h2 className="text-base font-semibold">Open timetable</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Class & section">
                <select
                  className={inputClass}
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
              </Field>
              <Field label="Academic year start">
                <input
                  type="date"
                  className={inputClass}
                  value={validFrom}
                  onChange={(event) => setValidFrom(event.target.value)}
                />
              </Field>
              <Field label="Academic year end">
                <input
                  type="date"
                  className={inputClass}
                  value={validTo}
                  onChange={(event) => setValidTo(event.target.value)}
                />
              </Field>
            </div>

            <div className="mt-4 flex sm:justify-end">
              <button
                type="button"
                disabled={busy || loading}
                onClick={() => void handleOpen()}
                className={`${buttonPrimary} w-full sm:w-auto`}
              >
                {busy ? "Working..." : "Create / Open timetable"}
              </button>
            </div>
          </div>

          {slots.length > 0 && (
            <>
              {/* Weekly grid */}
              <div className={plainPanel}>
                <div className="border-b border-slate-200 p-4">
                  <h2 className="text-base font-semibold">
                    Weekly grid{" "}
                    <span className="font-normal text-slate-500">
                      ({assignedCount}/{slots.length} assigned)
                    </span>
                  </h2>
                </div>

                {/* Below lg: one list per day */}
                <div className="divide-y divide-slate-200 lg:hidden">
                  {DAYS.map((day, dayIndex) => (
                    <div key={day} className="p-4">
                      <h3 className="text-sm font-semibold">{day}</h3>
                      <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {PERIODS.map((period) => {
                          const slot = slotMap.get(`${dayIndex + 1}-${period}`);
                          return (
                            <li key={period}>
                              <p className="mb-1 text-xs text-slate-500">Period {period}</p>
                              {slot ? renderSlot(slot) : <p className="text-sm text-slate-400">—</p>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* lg+: table */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-2.5">Day</th>
                        {PERIODS.map((period) => (
                          <th key={period} className="px-2 py-2.5">
                            Period {period}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {DAYS.map((day, dayIndex) => (
                        <tr key={day}>
                          <td className="px-4 py-3 font-medium">{day}</td>
                          {PERIODS.map((period) => {
                            const slot = slotMap.get(`${dayIndex + 1}-${period}`);
                            return (
                              <td key={period} className="px-2 py-2 align-top">
                                {slot ? renderSlot(slot) : <span className="text-slate-400">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Slot editor */}
              <div className={accentPanel}>
                {selectedSlot ? (
                  <>
                    <h2 className="text-base font-semibold">
                      {DAYS[selectedSlot.day_of_week - 1]} · Period {selectedSlot.period_number}
                    </h2>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:max-w-2xl sm:grid-cols-2">
                      <Field label="Subject">
                        <select className={inputClass} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
                          <option value="">No subject</option>
                          {subjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subjectLabel(subject) || `Subject ${subject.id}`}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Staff">
                        <select className={inputClass} value={staffId} onChange={(event) => setStaffId(event.target.value)}>
                          <option value="">No staff</option>
                          {staff.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <div className="mt-4 flex sm:justify-end">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSaveSlot()}
                        className={`${buttonPrimary} w-full sm:w-auto`}
                      >
                        Save slot
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-600">
                    Select a cell in the grid to assign a subject and staff member.
                  </p>
                )}
              </div>

              {/* Generate sessions */}
              <div className={accentPanel}>
                <h2 className="text-base font-semibold">Generate class sessions</h2>

                <div className="mt-4 sm:max-w-2xl">
                  <Field label="Holidays to skip (YYYY-MM-DD, comma separated)">
                    <input
                      className={inputClass}
                      value={skipDates}
                      onChange={(event) => setSkipDates(event.target.value)}
                      placeholder="2026-10-02, 2026-12-25"
                    />
                  </Field>
                </div>

                <p className="mt-3 text-sm text-slate-600">
                  Creates one dated session for every assigned slot between {validFrom} and {validTo}. Dates that
                  already have a session are left unchanged.
                </p>

                <div className="mt-4 flex sm:justify-end">
                  <button
                    type="button"
                    disabled={busy || assignedCount === 0}
                    onClick={() => void handleGenerate()}
                    className={`${buttonPrimary} w-full sm:w-auto`}
                  >
                    Generate sessions
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}