"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";

import {
  getCurrentUser,
  getSchedulingStudents,
  getSchedulingGrades,
  getSchedulingSections,
  getSchedulingSubjects,
  getSchedulingStaff,
  type StudentRecord,
  type SubjectOption,
  type StaffOption,
  type AttendanceStatus,
} from "../../lib/api";

import {
  getClassDaySessions,
  getStudentReport,
  type ClassDaySession,
  type StudentAttendanceReport,
} from "../../lib/attendanceApi";

/* =========================================================
   TYPES
   ========================================================= */

type ScheduleItem = ClassDaySession & {
  date: string;
  subjectName: string;
  staffName: string;
  attendanceStatus: AttendanceStatus | null;
};

/* =========================================================
   DATE HELPERS
   ========================================================= */

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);

  return getLocalDateString(date);
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/* =========================================================
   TIME HELPERS
   ========================================================= */

function getTimeInMinutes(time: string) {
  const parts = time.split(":");
  const hours = Number(parts[0]) || 0;
  const minutes = Number(parts[1]) || 0;

  return hours * 60 + minutes;
}

/* =========================================================
   SUBJECT / STAFF NAMES
   ========================================================= */

function getSubjectName(session: ClassDaySession, subjects: SubjectOption[]) {
  const subjectId = session.subject_id ?? session.default_subject_id;

  if (!subjectId) {
    return "Subject not assigned";
  }

  const subject = subjects.find((item) => Number(item.id) === Number(subjectId));

  return subject?.name ?? subject?.subject ?? subject?.code ?? `Subject #${subjectId}`;
}

function getStaffName(session: ClassDaySession, staff: StaffOption[]) {
  const staffId = session.staff_id ?? session.default_staff_id;

  if (!staffId) {
    return "Staff not assigned";
  }

  const member = staff.find((item) => Number(item.id) === Number(staffId));

  return member?.name ?? `Staff #${staffId}`;
}

/* =========================================================
   GROUP BY DATE
   ========================================================= */

function groupByDate(schedule: ScheduleItem[]) {
  const groups: Record<string, ScheduleItem[]> = {};

  for (const item of schedule) {
    if (!groups[item.date]) {
      groups[item.date] = [];
    }

    groups[item.date].push(item);
  }

  return groups;
}

/* =========================================================
   ATTENDANCE LABEL / STYLE
   ========================================================= */

function getAttendanceLabel(status: AttendanceStatus | null) {
  switch (status) {
    case "PRESENT":
      return "Present";
    case "ABSENT":
      return "Absent";
    case "LATE":
      return "Late";
    case "EXCUSED":
      return "Excused";
    default:
      return "Not marked";
  }
}

function getAttendanceClass(status: AttendanceStatus | null) {
  switch (status) {
    case "PRESENT":
      return "border-green-200 bg-green-50 text-green-700";
    case "ABSENT":
      return "border-red-200 bg-red-50 text-red-700";
    case "LATE":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "EXCUSED":
      return "border-slate-300 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-white text-slate-500";
  }
}

/* ---------- shared style tokens ---------- */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1";

const buttonPrimary = `inline-flex items-center justify-center gap-2 rounded-md border border-indigo-600 bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

const plainPanel = "rounded-lg border border-slate-200 bg-white";
const accentBorder = "border-l-4 border-l-indigo-600";

/* ---------- page shell (shared by loading, error and content) ---------- */

function Shell({ children }: { children: ReactNode }) {
  return (
    <section className="min-h-dvh bg-slate-50 font-[family-name:var(--font-charis-sil)] text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function SchedulePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [attendanceReport, setAttendanceReport] = useState<StudentAttendanceReport | null>(null);

  /* =======================================================
     LOAD STUDENT + SCHEDULE + ATTENDANCE
     ======================================================= */

  useEffect(() => {
    async function loadSchedule() {
      try {
        setLoading(true);
        setError(null);

        /* 1. CURRENT USER */

        const currentUser = await getCurrentUser();

        if (currentUser.person_id === null) {
          throw new Error("This account is not linked to a person record.");
        }

        const personId = Number(currentUser.person_id);
        const roleId = Number(currentUser.role_id);

        /* 2. LOAD COMMON DATA */

        const [gradesResponse, sectionsResponse, subjectsResponse, staffResponse] = await Promise.all([
          getSchedulingGrades(),
          getSchedulingSections(),
          getSchedulingSubjects(),
          getSchedulingStaff(),
        ]);

        setSubjects(subjectsResponse);
        setStaff(staffResponse);

        /* 3. ROLE-BASED SCHEDULE SETUP */

        type ClassTarget = {
          gradeId: number;
          sectionId: number;
          gradeName: string;
          sectionName: string;
        };

        let classTargets: ClassTarget[] = [];

        let matchedStudent: StudentRecord | null = null;

        /* STUDENT (role_id = 3) */

        if (roleId === 3) {
          const studentsResponse = await getSchedulingStudents();

          const students = Array.isArray(studentsResponse)
            ? studentsResponse
            : studentsResponse.students ?? [];

          matchedStudent = students.find((item) => Number(item.id) === personId) ?? null;

          if (!matchedStudent) {
            throw new Error(`Student record not found for person_id=${personId}`);
          }

          setStudent(matchedStudent);

          if (!matchedStudent.grade || !matchedStudent.section) {
            throw new Error("Student grade or section is not assigned.");
          }

          /* FIND STUDENT GRADE */

          const matchedGrade = gradesResponse.find(
            (grade) =>
              String(grade.grade).trim().toLowerCase() ===
              String(matchedStudent?.grade).trim().toLowerCase()
          );

          if (!matchedGrade) {
            throw new Error(`Grade "${matchedStudent.grade}" was not found.`);
          }

          /* FIND STUDENT SECTION */

          const matchedSection = sectionsResponse.find(
            (section) =>
              String(section.section).trim().toLowerCase() ===
              String(matchedStudent?.section).trim().toLowerCase()
          );

          if (!matchedSection) {
            throw new Error(`Section "${matchedStudent.section}" was not found.`);
          }

          classTargets = [
            {
              gradeId: Number(matchedGrade.id),
              sectionId: Number(matchedSection.id),
              gradeName: String(matchedStudent.grade),
              sectionName: String(matchedStudent.section),
            },
          ];

          /* STUDENT ATTENDANCE */

          try {
            const studentAttendance = await getStudentReport({
              rollNumber: matchedStudent.roll_number,
              gradeId: Number(matchedGrade.id),
              sectionId: Number(matchedSection.id),
            });

            setAttendanceReport(studentAttendance);
          } catch (attendanceError) {
            console.error("Attendance report failed:", attendanceError);

            setAttendanceReport(null);
          }
        }

        /* STAFF (role_id = 2) */

        else if (roleId === 2) {
          /*
           * IMPORTANT:
           * person_id is the STAFF ID for staff accounts.
           *
           * We only select classes whose staff_id belongs
           * to the logged-in staff member.
           */

          const staffClasses = gradesResponse.filter((grade) => Number(grade.staff_id) === personId);

          if (staffClasses.length === 0) {
            throw new Error(`No classes are assigned to staff_id=${personId}.`);
          }

          /* Resolve section information. */

          classTargets = staffClasses
            .filter((grade) => grade.section_id !== null && grade.section_id !== undefined)
            .map((grade) => {
              const section = sectionsResponse.find(
                (item) => Number(item.id) === Number(grade.section_id)
              );

              return {
                gradeId: Number(grade.id),
                sectionId: Number(grade.section_id),
                gradeName: String(grade.grade),
                sectionName: section?.section ?? "Unknown",
              };
            });

          if (classTargets.length === 0) {
            throw new Error(`No valid classes are assigned to staff_id=${personId}.`);
          }

          /* Staff should NOT load student attendance reports. */

          setAttendanceReport(null);
          setStudent(null);
        }

        /* ADMIN (role_id = 1) */

        else if (roleId === 1) {
          /*
           * The schedule page is normally a personal schedule
           * page, so admin does not have a student/staff
           * schedule here.
           *
           * If you want admin to see every class, we can
           * handle that separately.
           */

          throw new Error("Admin schedule view is not configured for this page.");
        }

        /* UNKNOWN ROLE */

        else {
          throw new Error(`Unsupported role_id=${roleId}`);
        }

        /* 4. DATES: yesterday, today and the next 12 days (14 days) */

        const dates: string[] = [];

        for (let i = -1; i < 13; i++) {
          dates.push(getDateOffset(i));
        }

        /* 5. LOAD SCHEDULE FOR ALL TARGET CLASSES */

        const results = await Promise.all(
          classTargets.flatMap((target) =>
            dates.map(async (date) => {
              try {
                const result = await getClassDaySessions({
                  gradeId: target.gradeId,
                  sectionId: target.sectionId,
                  date,
                });

                return {
                  date,
                  gradeId: target.gradeId,
                  sectionId: target.sectionId,
                  gradeName: target.gradeName,
                  sectionName: target.sectionName,
                  sessions: result.sessions ?? [],
                };
              } catch (err) {
                console.error(`Failed to load schedule for ${date}`, err);

                return {
                  date,
                  gradeId: target.gradeId,
                  sectionId: target.sectionId,
                  gradeName: target.gradeName,
                  sectionName: target.sectionName,
                  sessions: [],
                };
              }
            })
          )
        );

        /* 6. STUDENT ATTENDANCE MAP */

        const attendanceMap = new Map<number, AttendanceStatus>();

        if (attendanceReport) {
          for (const record of attendanceReport.records) {
            attendanceMap.set(Number(record.session_id), record.status);
          }
        }

        /* 7. BUILD SCHEDULE */

        const allClasses: ScheduleItem[] = [];

        for (const day of results) {
          for (const session of day.sessions) {
            /* Ignore empty timetable slots. */

            if (session.ready === false && !session.session_id) {
              continue;
            }

            /* Need an actual generated session. */

            if (!session.session_id) {
              continue;
            }

            /*
             * STAFF SECURITY FILTER
             *
             * A staff member should only see sessions
             * belonging to their own staff ID.
             */

            if (roleId === 2) {
              const sessionStaffId = session.staff_id ?? session.default_staff_id;

              if (Number(sessionStaffId) !== personId) {
                continue;
              }
            }

            const attendanceStatus = attendanceMap.get(Number(session.session_id)) ?? null;

            allClasses.push({
              ...session,
              date: day.date,
              subjectName: getSubjectName(session, subjectsResponse),
              staffName: getStaffName(session, staffResponse),
              attendanceStatus,
            });
          }
        }

        /* 8. SORT */

        allClasses.sort((a, b) => {
          if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
          }

          const periodA = a.period_number ?? 999;
          const periodB = b.period_number ?? 999;

          if (periodA !== periodB) {
            return periodA - periodB;
          }

          return getTimeInMinutes(a.start_time) - getTimeInMinutes(b.start_time);
        });

        setSchedule(allClasses);
      } catch (err) {
        console.error("SCHEDULE ERROR:", err);

        setError(err instanceof Error ? err.message : "Failed to load schedule");
      } finally {
        setLoading(false);
      }
    }

    void loadSchedule();
  }, []);

  /* =======================================================
     GROUP SCHEDULE
     ======================================================= */

  const groupedSchedule = useMemo(() => groupByDate(schedule), [schedule]);

  const scheduleDates = Object.keys(groupedSchedule);

  /* =======================================================
     LOADING
     ======================================================= */

  if (loading) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold">My schedule</h1>

        <div className={`${plainPanel} mt-6`}>
          <p className="px-4 py-10 text-center text-sm text-slate-500" role="status">
            Loading schedule... Loading your classes and attendance.
          </p>
        </div>
      </Shell>
    );
  }

  /* =======================================================
     ERROR
     ======================================================= */

  if (error) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold">My schedule</h1>

        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Unable to load schedule</p>
            <p className="mt-1 break-words">{error}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`${buttonPrimary} mt-4 w-full sm:w-auto`}
        >
          Try again
        </button>
      </Shell>
    );
  }

  /* =======================================================
     PAGE
     ======================================================= */

  const today = getLocalDateString(new Date());
  const yesterday = getDateOffset(-1);

  return (
    <Shell>
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-semibold">My schedule</h1>

        {student && (
          <p className="mt-1 text-sm text-slate-600">
            {[
              student.name,
              `Roll No: ${student.roll_number}`,
              `Grade ${student.grade}`,
              `Section ${student.section}`,
            ].join(" · ")}
          </p>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {/* Attendance summary */}
        {attendanceReport && (
          <section className={`${plainPanel} ${accentBorder} p-4 sm:p-5`}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-base font-semibold">Attendance overview</h2>
              <p className="text-3xl font-semibold tabular-nums">{attendanceReport.percentage}%</p>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-500">Total classes</dt>
                <dd className="mt-0.5 text-xl font-semibold tabular-nums">{attendanceReport.total_classes}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Present</dt>
                <dd className="mt-0.5 text-xl font-semibold tabular-nums">{attendanceReport.present}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Absent</dt>
                <dd className="mt-0.5 text-xl font-semibold tabular-nums">{attendanceReport.absent}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Late</dt>
                <dd className="mt-0.5 text-xl font-semibold tabular-nums">{attendanceReport.late}</dd>
              </div>
            </dl>
          </section>
        )}

        {/* No classes */}
        {scheduleDates.length === 0 && (
          <div className={plainPanel}>
            <div className="px-4 py-10 text-center">
              <h2 className="text-base font-semibold">No classes found</h2>
              <p className="mt-1 text-sm text-slate-500">No scheduled classes were found for this period.</p>
            </div>
          </div>
        )}

        {/* Daily schedule */}
        {scheduleDates.map((date) => {
          const dayItems = groupedSchedule[date];
          const isToday = date === today;

          let dayType = "Upcoming";

          if (date === today) {
            dayType = "Today";
          } else if (date === yesterday) {
            dayType = "Yesterday";
          } else if (date < today) {
            dayType = "Completed";
          }

          return (
            <section key={date} className={`${plainPanel} ${isToday ? accentBorder : ""}`}>
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-4">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">{formatDate(date)}</h2>
                  <p className="text-sm text-slate-500">{dayType}</p>
                </div>
                <p className="shrink-0 text-sm text-slate-500">
                  {dayItems.length} {dayItems.length === 1 ? "class" : "classes"}
                </p>
              </div>

              <ul className="divide-y divide-slate-200">
                {dayItems.map((session, index) => (
                  <li
                    key={`${date}-${session.timetable_id}-${session.session_id}-${index}`}
                    className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 p-4 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div>
                      <p className="text-xs text-slate-500">Period</p>
                      <p className="text-lg font-semibold leading-tight">{session.period_number ?? "—"}</p>
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold">{session.subjectName}</h3>
                      <dl className="mt-1 flex flex-col gap-0.5 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-5">
                        <div className="flex gap-1.5">
                          <dt className="text-slate-500">Teacher</dt>
                          <dd className="min-w-0 break-words">{session.staffName}</dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-slate-500">Time</dt>
                          <dd>
                            {session.start_time.slice(0, 5)} – {session.end_time.slice(0, 5)}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="col-start-2 flex items-center gap-3 sm:col-start-auto sm:flex-col sm:items-end sm:gap-1">
                      <span
                        className={`rounded border px-1.5 py-0.5 text-xs font-medium ${getAttendanceClass(
                          session.attendanceStatus
                        )}`}
                      >
                        {getAttendanceLabel(session.attendanceStatus)}
                      </span>
                      <p className="text-xs text-slate-500">
                        {date < today ? "Completed" : date === today ? "Today" : "Upcoming"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </Shell>
  );
}