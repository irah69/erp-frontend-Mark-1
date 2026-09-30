"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DashboardNav from "../../components/dashboardnav";

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

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateOffset(offset: number) {
  const date = new Date();

  date.setDate(
    date.getDate() + offset
  );

  return getLocalDateString(date);
}

function formatDate(dateString: string) {
  const date = new Date(
    `${dateString}T00:00:00`
  );

  return date.toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    }
  );
}

/* =========================================================
   TIME HELPERS
   ========================================================= */

function getTimeInMinutes(time: string) {
  const parts = time.split(":");

  const hours =
    Number(parts[0]) || 0;

  const minutes =
    Number(parts[1]) || 0;

  return hours * 60 + minutes;
}

/* =========================================================
   SUBJECT NAME
   ========================================================= */

function getSubjectName(
  session: ClassDaySession,
  subjects: SubjectOption[]
) {
  const subjectId =
    session.subject_id ??
    session.default_subject_id;

  if (!subjectId) {
    return "Subject not assigned";
  }

  const subject =
    subjects.find(
      (item) =>
        Number(item.id) ===
        Number(subjectId)
    );

  return (
    subject?.name ??
    subject?.subject ??
    subject?.code ??
    `Subject #${subjectId}`
  );
}

/* =========================================================
   STAFF NAME
   ========================================================= */

function getStaffName(
  session: ClassDaySession,
  staff: StaffOption[]
) {
  const staffId =
    session.staff_id ??
    session.default_staff_id;

  if (!staffId) {
    return "Staff not assigned";
  }

  const member =
    staff.find(
      (item) =>
        Number(item.id) ===
        Number(staffId)
    );

  return (
    member?.name ??
    `Staff #${staffId}`
  );
}

/* =========================================================
   GROUP BY DATE
   ========================================================= */

function groupByDate(
  schedule: ScheduleItem[]
) {
  const groups: Record<
    string,
    ScheduleItem[]
  > = {};

  for (const item of schedule) {
    if (!groups[item.date]) {
      groups[item.date] = [];
    }

    groups[item.date].push(item);
  }

  return groups;
}

/* =========================================================
   ATTENDANCE LABEL
   ========================================================= */

function getAttendanceLabel(
  status: AttendanceStatus | null
) {
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

/* =========================================================
   ATTENDANCE CLASS
   ========================================================= */

function getAttendanceClass(
  status: AttendanceStatus | null
) {
  switch (status) {
    case "PRESENT":
      return "attendance-present";

    case "ABSENT":
      return "attendance-absent";

    case "LATE":
      return "attendance-late";

    case "EXCUSED":
      return "attendance-excused";

    default:
      return "attendance-not-marked";
  }
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function SchedulePage() {
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [student, setStudent] =
    useState<StudentRecord | null>(null);

  const [subjects, setSubjects] =
    useState<SubjectOption[]>([]);

  const [staff, setStaff] =
    useState<StaffOption[]>([]);

  const [schedule, setSchedule] =
    useState<ScheduleItem[]>([]);

  const [attendanceReport, setAttendanceReport] =
    useState<StudentAttendanceReport | null>(
      null
    );

  /* =======================================================
     LOAD STUDENT + SCHEDULE + ATTENDANCE
     ======================================================= */

useEffect(() => {
  async function loadSchedule() {
    try {
      setLoading(true);
      setError(null);

      /* =================================================
         1. CURRENT USER
         ================================================= */

      const currentUser = await getCurrentUser();

      if (currentUser.person_id === null) {
        throw new Error(
          "This account is not linked to a person record."
        );
      }

      const personId = Number(currentUser.person_id);
      const roleId = Number(currentUser.role_id);

      /* =================================================
         2. LOAD COMMON DATA
         ================================================= */

      const [
        gradesResponse,
        sectionsResponse,
        subjectsResponse,
        staffResponse,
      ] = await Promise.all([
        getSchedulingGrades(),
        getSchedulingSections(),
        getSchedulingSubjects(),
        getSchedulingStaff(),
      ]);

      setSubjects(subjectsResponse);
      setStaff(staffResponse);

      /* =================================================
         3. ROLE-BASED SCHEDULE SETUP
         ================================================= */

      type ClassTarget = {
        gradeId: number;
        sectionId: number;
        gradeName: string;
        sectionName: string;
      };

      let classTargets: ClassTarget[] = [];

      let matchedStudent: StudentRecord | null = null;

      /* =================================================
         STUDENT
         role_id = 3
         ================================================= */

      if (roleId === 3) {
        const studentsResponse =
          await getSchedulingStudents();

        const students = Array.isArray(studentsResponse)
          ? studentsResponse
          : studentsResponse.students ?? [];

        matchedStudent = students.find(
          (item) =>
            Number(item.id) === personId
        ) ?? null;

        if (!matchedStudent) {
          throw new Error(
            `Student record not found for person_id=${personId}`
          );
        }

        setStudent(matchedStudent);

        if (
          !matchedStudent.grade ||
          !matchedStudent.section
        ) {
          throw new Error(
            "Student grade or section is not assigned."
          );
        }

        /* =============================================
           FIND STUDENT GRADE
           ============================================= */

        const matchedGrade =
          gradesResponse.find(
            (grade) =>
              String(grade.grade)
                .trim()
                .toLowerCase() ===
                String(matchedStudent?.grade)
                  .trim()
                  .toLowerCase()
          );

        if (!matchedGrade) {
          throw new Error(
            `Grade "${matchedStudent.grade}" was not found.`
          );
        }

        /* =============================================
           FIND STUDENT SECTION
           ============================================= */

        const matchedSection =
          sectionsResponse.find(
            (section) =>
              String(section.section)
                .trim()
                .toLowerCase() ===
              String(matchedStudent?.section)
                .trim()
                .toLowerCase()
          );

        if (!matchedSection) {
          throw new Error(
            `Section "${matchedStudent.section}" was not found.`
          );
        }

        classTargets = [
          {
            gradeId: Number(matchedGrade.id),
            sectionId: Number(matchedSection.id),
            gradeName: String(matchedStudent.grade),
            sectionName: String(matchedStudent.section),
          },
        ];

        /* =============================================
           STUDENT ATTENDANCE
           ============================================= */

        try {
          const studentAttendance =
            await getStudentReport({
              rollNumber:
                matchedStudent.roll_number,
              gradeId: Number(matchedGrade.id),
              sectionId: Number(matchedSection.id),
            });

          setAttendanceReport(
            studentAttendance
          );
        } catch (attendanceError) {
          console.error(
            "Attendance report failed:",
            attendanceError
          );

          setAttendanceReport(null);
        }
      }

      /* =================================================
         STAFF
         role_id = 2
         ================================================= */

      else if (roleId === 2) {
        /*
         * IMPORTANT:
         * person_id is the STAFF ID for staff accounts.
         *
         * We only select classes whose staff_id belongs
         * to the logged-in staff member.
         */

        const staffClasses =
          gradesResponse.filter(
            (grade) =>
              Number(grade.staff_id) === personId
          );

        if (staffClasses.length === 0) {
          throw new Error(
            `No classes are assigned to staff_id=${personId}.`
          );
        }

        /*
         * Resolve section information.
         */

        classTargets = staffClasses
          .filter(
            (grade) =>
              grade.section_id !== null &&
              grade.section_id !== undefined
          )
          .map((grade) => {
            const section =
              sectionsResponse.find(
                (item) =>
                  Number(item.id) ===
                  Number(grade.section_id)
              );

            return {
              gradeId: Number(grade.id),
              sectionId: Number(
                grade.section_id
              ),
              gradeName: String(
                grade.grade
              ),
              sectionName:
                section?.section ??
                "Unknown",
            };
          });

        if (classTargets.length === 0) {
          throw new Error(
            `No valid classes are assigned to staff_id=${personId}.`
          );
        }

        /*
         * Staff should NOT load student attendance reports.
         */

        setAttendanceReport(null);
        setStudent(null);
      }

      /* =================================================
         ADMIN
         role_id = 1
         ================================================= */

      else if (roleId === 1) {
        /*
         * The schedule page is normally a personal schedule
         * page, so admin does not have a student/staff
         * schedule here.
         *
         * If you want admin to see every class, we can
         * handle that separately.
         */

        throw new Error(
          "Admin schedule view is not configured for this page."
        );
      }

      /* =================================================
         UNKNOWN ROLE
         ================================================= */

      else {
        throw new Error(
          `Unsupported role_id=${roleId}`
        );
      }

      /* =================================================
         4. DATES
         
         Yesterday
         Today
         Next 12 days
         
         Total = 14 days
         ================================================= */

      const dates: string[] = [];

      for (let i = -1; i < 13; i++) {
        dates.push(
          getDateOffset(i)
        );
      }

      /* =================================================
         5. LOAD SCHEDULE FOR ALL TARGET CLASSES
         ================================================= */

      const results = await Promise.all(
        classTargets.flatMap(
          (target) =>
            dates.map(
              async (date) => {
                try {
                  const result =
                    await getClassDaySessions({
                      gradeId:
                        target.gradeId,
                      sectionId:
                        target.sectionId,
                      date,
                    });

                  return {
                    date,
                    gradeId:
                      target.gradeId,
                    sectionId:
                      target.sectionId,
                    gradeName:
                      target.gradeName,
                    sectionName:
                      target.sectionName,
                    sessions:
                      result.sessions ?? [],
                  };
                } catch (err) {
                  console.error(
                    `Failed to load schedule for ${date}`,
                    err
                  );

                  return {
                    date,
                    gradeId:
                      target.gradeId,
                    sectionId:
                      target.sectionId,
                    gradeName:
                      target.gradeName,
                    sectionName:
                      target.sectionName,
                    sessions: [],
                  };
                }
              }
            )
        )
      );

      /* =================================================
         6. STUDENT ATTENDANCE MAP
         ================================================= */

      const attendanceMap =
        new Map<
          number,
          AttendanceStatus
        >();

      if (attendanceReport) {
        for (
          const record of
            attendanceReport.records
        ) {
          attendanceMap.set(
            Number(
              record.session_id
            ),
            record.status
          );
        }
      }

      /* =================================================
         7. BUILD SCHEDULE
         ================================================= */

      const allClasses: ScheduleItem[] = [];

      for (const day of results) {
        for (const session of day.sessions) {
          /*
           * Ignore empty timetable slots.
           */

          if (
            session.ready === false &&
            !session.session_id
          ) {
            continue;
          }

          /*
           * Need an actual generated session.
           */

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
            const sessionStaffId =
              session.staff_id ??
              session.default_staff_id;

            if (
              Number(sessionStaffId) !==
              personId
            ) {
              continue;
            }
          }

          const attendanceStatus =
            attendanceMap.get(
              Number(
                session.session_id
              )
            ) ?? null;

          allClasses.push({
            ...session,

            date: day.date,

            subjectName:
              getSubjectName(
                session,
                subjectsResponse
              ),

            staffName:
              getStaffName(
                session,
                staffResponse
              ),

            attendanceStatus,
          });
        }
      }

      /* =================================================
         8. SORT
         ================================================= */

      allClasses.sort(
        (a, b) => {
          if (
            a.date !== b.date
          ) {
            return a.date.localeCompare(
              b.date
            );
          }

          const periodA =
            a.period_number ?? 999;

          const periodB =
            b.period_number ?? 999;

          if (
            periodA !== periodB
          ) {
            return (
              periodA - periodB
            );
          }

          return (
            getTimeInMinutes(
              a.start_time
            ) -
            getTimeInMinutes(
              b.start_time
            )
          );
        }
      );

      setSchedule(
        allClasses
      );
    } catch (err) {
      console.error(
        "SCHEDULE ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load schedule"
      );
    } finally {
      setLoading(false);
    }
  }

  loadSchedule();
}, []);

  /* =======================================================
     GROUP SCHEDULE
     ======================================================= */

  const groupedSchedule =
    useMemo(
      () =>
        groupByDate(
          schedule
        ),
      [schedule]
    );

  const scheduleDates =
    Object.keys(
      groupedSchedule
    );

  /* =======================================================
     LOADING
     ======================================================= */

  if (loading) {
    return (
      <>
        <DashboardNav />

        <main className="schedule-page">
          <div className="schedule-container">
            <div className="state-card">

              <div className="loading-spinner" />

              <h1>
                Loading schedule...
              </h1>

              <p>
                Loading your classes
                and attendance.
              </p>

            </div>
          </div>
        </main>

        <style jsx>{`
          .schedule-page {
            min-height: calc(100vh - 65px);
            background:
              radial-gradient(
                circle at 0% 0%,
                rgba(226, 232, 240, 0.8),
                transparent 32%
              ),
              #f8fafc;
          }

          .schedule-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 42px 24px;
          }

          .state-card {
            padding: 40px;
            text-align: center;
            background: white;
            border-radius: 20px;
            border: 1px solid
              rgba(15, 23, 42, 0.06);
            box-shadow:
              0 8px 18px
                rgba(15, 23, 42, 0.05),
              0 22px 50px
                rgba(15, 23, 42, 0.08);
          }

          .loading-spinner {
            width: 36px;
            height: 36px;
            margin: 0 auto 18px;
            border: 3px solid #e2e8f0;
            border-top-color: #0f172a;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          h1 {
            margin: 0 0 8px;
            color: #0f172a;
            font-size: 24px;
          }

          p {
            margin: 0;
            color: #64748b;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </>
    );
  }

  /* =======================================================
     ERROR
     ======================================================= */

  if (error) {
    return (
      <>
        <DashboardNav />

        <main className="schedule-page">
          <div className="schedule-container">
            <div className="state-card">

              <div className="error-icon">
                !
              </div>

              <h1>
                Unable to load schedule
              </h1>

              <p className="error-message">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
                className="retry-button"
              >
                Try Again
              </button>

            </div>
          </div>
        </main>

        <style jsx>{`
          .schedule-page {
            min-height: calc(100vh - 65px);
            background: #f8fafc;
          }

          .schedule-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 42px 24px;
          }

          .state-card {
            padding: 40px;
            text-align: center;
            background: white;
            border-radius: 20px;
            border: 1px solid
              rgba(15, 23, 42, 0.06);
            box-shadow:
              0 8px 18px
                rgba(15, 23, 42, 0.05),
              0 22px 50px
                rgba(15, 23, 42, 0.08);
          }

          .error-icon {
            width: 46px;
            height: 46px;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #fee2e2;
            color: #b91c1c;
            font-size: 20px;
            font-weight: 800;
          }

          h1 {
            margin: 0 0 8px;
            color: #0f172a;
            font-size: 24px;
          }

          .error-message {
            margin: 0 auto;
            max-width: 600px;
            color: #64748b;
          }

          .retry-button {
            margin-top: 22px;
            padding: 10px 18px;
            border: none;
            border-radius: 9px;
            background: #0f172a;
            color: white;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            box-shadow:
              0 4px 10px
                rgba(15, 23, 42, 0.16);
            transition:
              transform 0.2s ease,
              box-shadow 0.2s ease;
          }

          .retry-button:hover {
            transform: translateY(-1px);
            box-shadow:
              0 7px 16px
                rgba(15, 23, 42, 0.2);
          }
        `}</style>
      </>
    );
  }

  /* =======================================================
     PAGE
     ======================================================= */

  return (
    <>
      <DashboardNav />

      <main className="schedule-page">
        <div className="schedule-container">

          {/* =================================================
              HEADER
              ================================================= */}

          <div className="schedule-header">

            <div>
              <p className="eyebrow">
                Academic Schedule
              </p>

              <h1>
                My Schedule
              </h1>

              {student && (
                <p className="student-meta">
                  {student.name}
                  <span>•</span>
                  Roll No:{" "}
                  {student.roll_number}
                  <span>•</span>
                  Grade{" "}
                  {student.grade}
                  <span>•</span>
                  Section{" "}
                  {student.section}
                </p>
              )}
            </div>

          </div>

          {/* =================================================
              ATTENDANCE SUMMARY
              ================================================= */}

          {attendanceReport && (
            <section className="attendance-card">

              <div className="attendance-header">

                <div>
                  <p className="eyebrow">
                    Attendance
                  </p>

                  <h2>
                    Attendance overview
                  </h2>
                </div>

                <div className="attendance-circle">
                  {
                    attendanceReport.percentage
                  }%
                </div>

              </div>

              <div className="attendance-stats">

                <div className="attendance-stat">
                  <span>
                    Total Classes
                  </span>

                  <strong>
                    {
                      attendanceReport.total_classes
                    }
                  </strong>
                </div>

                <div className="attendance-stat">
                  <span>
                    Present
                  </span>

                  <strong>
                    {
                      attendanceReport.present
                    }
                  </strong>
                </div>

                <div className="attendance-stat">
                  <span>
                    Absent
                  </span>

                  <strong>
                    {
                      attendanceReport.absent
                    }
                  </strong>
                </div>

                <div className="attendance-stat">
                  <span>
                    Late
                  </span>

                  <strong>
                    {
                      attendanceReport.late
                    }
                  </strong>
                </div>

              </div>

            </section>
          )}

          {/* =================================================
              NO CLASSES
              ================================================= */}

          {scheduleDates.length === 0 && (
            <div className="empty-card">

              <div className="empty-icon">
                📅
              </div>

              <h2>
                No classes found
              </h2>

              <p>
                No scheduled classes were
                found for this period.
              </p>

            </div>
          )}

          {/* =================================================
              DAILY SCHEDULE
              ================================================= */}

          {scheduleDates.map(
            (date) => {
              const today =
                getLocalDateString(
                  new Date()
                );

              const yesterday =
                getDateOffset(-1);

              let dayLabel =
                formatDate(date);

              let dayType =
                "Upcoming";

              if (date === today) {
                dayLabel =
                  `Today • ${formatDate(
                    date
                  )}`;

                dayType = "Today";
              } else if (
                date === yesterday
              ) {
                dayLabel =
                  `Yesterday • ${formatDate(
                    date
                  )}`;

                dayType = "Yesterday";
              } else if (
                date < today
              ) {
                dayType = "Completed";
              }

              return (
                <section
                  key={date}
                  className="day-section"
                >

                  {/* =========================================
                      DATE HEADER
                      ========================================= */}

                  <div className="day-header">

                    <div>
                      <p className="day-label">
                        {dayType}
                      </p>

                      <h2>
                        {dayLabel
                          .replace(
                            `${dayType} • `,
                            ""
                          )}
                      </h2>
                    </div>

                    <span
                      className={`day-badge day-${dayType.toLowerCase()}`}
                    >
                      {
                        groupedSchedule[
                          date
                        ].length
                      }{" "}
                      {groupedSchedule[
                        date
                      ].length === 1
                        ? "class"
                        : "classes"}
                    </span>

                  </div>

                  {/* =========================================
                      CLASSES
                      ========================================= */}

                  <div className="classes-list">

                    {groupedSchedule[
                      date
                    ].map(
                      (
                        session,
                        index
                      ) => {

                        const attendanceClass =
                          getAttendanceClass(
                            session.attendanceStatus
                          );

                        return (
                          <div
                            key={`${date}-${session.timetable_id}-${session.session_id}-${index}`}
                            className="class-card"
                          >

                            {/* =================================
                                PERIOD
                                ================================= */}

                            <div className="period-box">
                              <span>
                                Period
                              </span>

                              <strong>
                                {session.period_number ??
                                  "—"}
                              </strong>
                            </div>

                            {/* =================================
                                CLASS INFO
                                ================================= */}

                            <div className="class-info">

                              <h3>
                                {
                                  session.subjectName
                                }
                              </h3>

                              <div className="class-details">

                                <span>
                                  <strong>
                                    Teacher
                                  </strong>

                                  {
                                    session.staffName
                                  }
                                </span>

                                <span>
                                  <strong>
                                    Time
                                  </strong>

                                  {
                                    session.start_time
                                  }
                                  {" – "}
                                  {
                                    session.end_time
                                  }
                                </span>

                              </div>

                            </div>

                            {/* =================================
                                ATTENDANCE
                                ================================= */}

                            <div className="class-status">

                              <span
                                className={`attendance-badge ${attendanceClass}`}
                              >
                                <span className="status-dot" />

                                {getAttendanceLabel(
                                  session.attendanceStatus
                                )}
                              </span>

                              <span className="session-state">
                                {date < today
                                  ? "Completed"
                                  : date ===
                                    today
                                  ? "Today"
                                  : "Upcoming"}
                              </span>

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>

                </section>
              );
            }
          )}

        </div>
      </main>

      <style jsx>{`
        .schedule-page {
          min-height: calc(100vh - 65px);
          background:
            radial-gradient(
              circle at 0% 0%,
              rgba(226, 232, 240, 0.8),
              transparent 32%
            ),
            radial-gradient(
              circle at 100% 20%,
              rgba(241, 245, 249, 0.9),
              transparent 30%
            ),
            #f8fafc;
        }

        .schedule-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 42px 24px 65px;
        }

        /* =====================================================
           HEADER
           ===================================================== */

        .schedule-header {
          margin-bottom: 28px;
        }

        .eyebrow {
          margin: 0 0 7px;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .schedule-header h1 {
          margin: 0;
          color: #0f172a;
          font-size: clamp(30px, 4vw, 40px);
          line-height: 1.1;
          letter-spacing: -1px;
        }

        .student-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin: 10px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .student-meta span {
          color: #cbd5e1;
        }

        /* =====================================================
           ATTENDANCE
           ===================================================== */

        .attendance-card {
          margin-bottom: 32px;
          padding: 26px;
          border-radius: 19px;
          background: white;
          border: 1px solid
            rgba(15, 23, 42, 0.06);
          box-shadow:
            0 6px 14px
              rgba(15, 23, 42, 0.04),
            0 18px 40px
              rgba(15, 23, 42, 0.07);
        }

        .attendance-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .attendance-header h2 {
          margin: 0;
          color: #0f172a;
          font-size: 21px;
        }

        .attendance-circle {
          width: 70px;
          height: 70px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f1f5f9;
          color: #0f172a;
          font-size: 16px;
          font-weight: 800;
          box-shadow:
            inset 0 2px 5px
              rgba(15, 23, 42, 0.06),
            0 5px 12px
              rgba(15, 23, 42, 0.06);
        }

        .attendance-stats {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .attendance-stat {
          padding: 16px;
          border-radius: 13px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .attendance-stat span {
          display: block;
          color: #64748b;
          font-size: 12px;
        }

        .attendance-stat strong {
          display: block;
          margin-top: 7px;
          color: #0f172a;
          font-size: 21px;
        }

        /* =====================================================
           DAY
           ===================================================== */

        .day-section {
          margin-bottom: 34px;
        }

        .day-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 14px;
        }

        .day-label {
          margin: 0 0 4px;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .day-header h2 {
          margin: 0;
          color: #0f172a;
          font-size: 21px;
          letter-spacing: -0.3px;
        }

        .day-badge {
          padding: 7px 11px;
          border-radius: 999px;
          background: white;
          color: #64748b;
          border: 1px solid #e2e8f0;
          font-size: 11px;
          font-weight: 700;
          box-shadow:
            0 3px 8px
              rgba(15, 23, 42, 0.04);
        }

        /* =====================================================
           CLASS CARDS
           ===================================================== */

        .classes-list {
          display: grid;
          gap: 12px;
        }

        .class-card {
          display: grid;
          grid-template-columns: 62px minmax(0, 1fr) auto;
          align-items: center;
          gap: 18px;
          padding: 18px;
          background: white;
          border: 1px solid
            rgba(15, 23, 42, 0.06);
          border-radius: 17px;
          box-shadow:
            0 4px 10px
              rgba(15, 23, 42, 0.035),
            0 12px 28px
              rgba(15, 23, 42, 0.06);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .class-card:hover {
          transform: translateY(-2px);
          border-color: #e2e8f0;
          box-shadow:
            0 8px 18px
              rgba(15, 23, 42, 0.06),
            0 20px 40px
              rgba(15, 23, 42, 0.09);
        }

        .period-box {
          width: 62px;
          height: 62px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
          box-shadow:
            inset 0 1px 2px
              rgba(15, 23, 42, 0.03);
        }

        .period-box span {
          color: #94a3b8;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .period-box strong {
          margin-top: 3px;
          color: #0f172a;
          font-size: 20px;
        }

        .class-info {
          min-width: 0;
        }

        .class-info h3 {
          margin: 0 0 9px;
          color: #0f172a;
          font-size: 17px;
          font-weight: 750;
        }

        .class-details {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
        }

        .class-details span {
          color: #64748b;
          font-size: 12px;
        }

        .class-details strong {
          margin-right: 5px;
          color: #475569;
          font-weight: 700;
        }

        .class-status {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        /* =====================================================
           ATTENDANCE BADGES
           ===================================================== */

        .attendance-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .attendance-present {
          background: #dcfce7;
          color: #166534;
        }

        .attendance-absent {
          background: #fee2e2;
          color: #991b1b;
        }

        .attendance-late {
          background: #fef3c7;
          color: #92400e;
        }

        .attendance-excused {
          background: #e0e7ff;
          color: #3730a3;
        }

        .attendance-not-marked {
          background: #f1f5f9;
          color: #64748b;
        }

        .session-state {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
        }

        /* =====================================================
           EMPTY
           ===================================================== */

        .empty-card {
          padding: 45px 30px;
          text-align: center;
          background: white;
          border-radius: 19px;
          border: 1px solid
            rgba(15, 23, 42, 0.06);
          box-shadow:
            0 6px 14px
              rgba(15, 23, 42, 0.04),
            0 18px 40px
              rgba(15, 23, 42, 0.07);
        }

        .empty-icon {
          width: 50px;
          height: 50px;
          margin: 0 auto 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: #f1f5f9;
          font-size: 22px;
        }

        .empty-card h2 {
          margin: 0 0 7px;
          color: #0f172a;
          font-size: 21px;
        }

        .empty-card p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        /* =====================================================
           MOBILE
           ===================================================== */

        @media (max-width: 800px) {
          .attendance-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .class-card {
            grid-template-columns:
              54px minmax(0, 1fr);
          }

          .period-box {
            width: 54px;
            height: 54px;
          }

          .class-status {
            grid-column: 2;
            align-items: flex-start;
            flex-direction: row;
            flex-wrap: wrap;
          }
        }

        @media (max-width: 600px) {
          .schedule-container {
            padding: 28px 16px 45px;
          }

          .schedule-header h1 {
            font-size: 31px;
          }

          .attendance-card {
            padding: 20px;
          }

          .attendance-header {
            align-items: flex-start;
          }

          .attendance-circle {
            width: 60px;
            height: 60px;
          }

          .attendance-stats {
            gap: 9px;
          }

          .attendance-stat {
            padding: 13px;
          }

          .day-header {
            align-items: flex-start;
          }

          .day-badge {
            display: none;
          }

          .class-card {
            grid-template-columns: 48px minmax(0, 1fr);
            gap: 13px;
            padding: 15px;
          }

          .period-box {
            width: 48px;
            height: 48px;
            border-radius: 12px;
          }

          .period-box strong {
            font-size: 17px;
          }

          .class-info h3 {
            font-size: 15px;
          }

          .class-details {
            flex-direction: column;
            gap: 5px;
          }

          .class-status {
            grid-column: 1 / -1;
            padding-top: 2px;
          }
        }
      `}</style>
    </>
  );
}