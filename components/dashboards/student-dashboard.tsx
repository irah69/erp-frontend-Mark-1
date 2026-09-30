"use client";

import { useEffect, useState } from "react";

import type { CurrentUser } from "../../lib/auth";

import {
  getSchedulingStudents,
  type StudentRecord,
} from "../../lib/api";

import {
  getStudentReport,
  type StudentAttendanceReport,
} from "../../lib/attendanceApi";

import DashboardNav from "../../components/dashboardnav";

export default function StudentDashboard({
  user,
}: {
  user: CurrentUser;
}) {
  const [student, setStudent] =
    useState<StudentRecord | null>(null);

  const [attendance, setAttendance] =
    useState<StudentAttendanceReport | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        if (!user.person_id) {
          throw new Error(
            "Student account is not linked to a student record."
          );
        }

        // ---------------------------------------------------------
        // 1. Get all students
        // ---------------------------------------------------------
        const response =
          await getSchedulingStudents();

        const students: StudentRecord[] =
          Array.isArray(response)
            ? response
            : response.students ?? [];

        // ---------------------------------------------------------
        // 2. Find logged-in student
        // ---------------------------------------------------------
        const currentStudent =
          students.find(
            (item) =>
              Number(item.id) ===
              Number(user.person_id)
          );

        if (!currentStudent) {
          throw new Error(
            "Student record could not be found for this account."
          );
        }

        setStudent(currentStudent);

        // ---------------------------------------------------------
        // 3. Get attendance
        // ---------------------------------------------------------
        if (!currentStudent.roll_number) {
          throw new Error(
            "Student does not have a roll number."
          );
        }

        const report =
          await getStudentReport({
            rollNumber:
              currentStudent.roll_number,
          });

        setAttendance(report);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load student dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [user.person_id]);

  // ---------------------------------------------------------
  // Loading
  // ---------------------------------------------------------
  if (loading) {
    return (
      <>
        <DashboardNav />

        <main className="student-page">
          <section className="student-container">
            <div className="dashboard-card loading-card">
              <div className="loading-spinner" />

              <h1>
                Loading your dashboard...
              </h1>

              <p>
                Please wait while we load your
                student information.
              </p>
            </div>
          </section>
        </main>

        <style jsx>{`
          .student-page {
            min-height: calc(100vh - 65px);
            background:
              radial-gradient(
                circle at top left,
                rgba(226, 232, 240, 0.75),
                transparent 35%
              ),
              #f8fafc;
          }

          .student-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 42px 24px;
          }

          .dashboard-card {
            background: white;
            border-radius: 18px;
            padding: 32px;
            border: 1px solid rgba(15, 23, 42, 0.06);
            box-shadow:
              0 8px 20px rgba(15, 23, 42, 0.05),
              0 20px 45px rgba(15, 23, 42, 0.08);
          }

          .loading-card {
            text-align: center;
          }

          .loading-spinner {
            width: 34px;
            height: 34px;
            margin: 0 auto 18px;
            border: 3px solid #e2e8f0;
            border-top-color: #0f172a;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          h1 {
            margin: 0 0 8px;
            font-size: 25px;
            color: #0f172a;
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

  // ---------------------------------------------------------
  // Error
  // ---------------------------------------------------------
  if (error) {
    return (
      <>
        <DashboardNav />

        <main className="student-page">
          <section className="student-container">
            <div className="dashboard-card error-card">
              <div className="error-icon">!</div>

              <h1>
                Unable to load dashboard
              </h1>

              <p>{error}</p>
            </div>
          </section>
        </main>

        <style jsx>{`
          .student-page {
            min-height: calc(100vh - 65px);
            background: #f8fafc;
          }

          .student-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 42px 24px;
          }

          .dashboard-card {
            background: white;
            border-radius: 18px;
            padding: 32px;
            border: 1px solid rgba(15, 23, 42, 0.06);
            box-shadow:
              0 8px 20px rgba(15, 23, 42, 0.05),
              0 20px 45px rgba(15, 23, 42, 0.08);
          }

          .error-card {
            text-align: center;
          }

          .error-icon {
            width: 44px;
            height: 44px;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #fee2e2;
            color: #b91c1c;
            font-weight: 800;
            font-size: 20px;
          }

          h1 {
            margin: 0 0 8px;
            font-size: 25px;
            color: #0f172a;
          }

          p {
            color: #64748b;
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      <DashboardNav />

      <main className="student-page">
        <section className="student-container">

          {/* -------------------------------------------------
              HEADER
          ------------------------------------------------- */}
          <div className="dashboard-header">
            <div>
              <p className="eyebrow">
                Student Dashboard
              </p>

              <h1>
                Hello,{" "}
                {student?.name ||
                  user.username}
                .
              </h1>

              <p className="welcome-text">
                Welcome back. Here is your
                current academic and
                attendance information.
              </p>
            </div>
          </div>

          {/* -------------------------------------------------
              QUICK SUMMARY
          ------------------------------------------------- */}
          <div className="summary-grid">

            <div className="summary-card">
              <div className="summary-label">
                Student
              </div>

              <div className="summary-value">
                {student?.name ||
                  "Not available"}
              </div>

              <div className="summary-subtext">
                Student ID:{" "}
                {student?.id ??
                  user.person_id}
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-label">
                Class
              </div>

              <div className="summary-value">
                {student?.grade || "—"}{" "}
                {student?.section
                  ? `- ${student.section}`
                  : ""}
              </div>

              <div className="summary-subtext">
                Current class
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-label">
                Attendance
              </div>

              <div className="summary-value">
                {attendance
                  ? `${attendance.percentage}%`
                  : "—"}
              </div>

              <div className="summary-subtext">
                Overall attendance
              </div>
            </div>

          </div>

          {/* -------------------------------------------------
              ATTENDANCE
          ------------------------------------------------- */}
          {attendance && (
            <div className="dashboard-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">
                    Attendance
                  </p>

                  <h2>
                    Attendance overview
                  </h2>
                </div>

                <div className="attendance-percentage">
                  {attendance.percentage}%
                </div>
              </div>

              <div className="attendance-grid">

                <div className="attendance-stat">
                  <span>Total Classes</span>
                  <strong>
                    {attendance.total_classes}
                  </strong>
                </div>

                <div className="attendance-stat">
                  <span>Attended</span>
                  <strong>
                    {attendance.attended_classes}
                  </strong>
                </div>

                <div className="attendance-stat">
                  <span>Present</span>
                  <strong>
                    {attendance.present}
                  </strong>
                </div>

                <div className="attendance-stat">
                  <span>Absent</span>
                  <strong>
                    {attendance.absent}
                  </strong>
                </div>

                <div className="attendance-stat">
                  <span>Late</span>
                  <strong>
                    {attendance.late}
                  </strong>
                </div>

                <div className="attendance-stat">
                  <span>Excused</span>
                  <strong>
                    {attendance.excused}
                  </strong>
                </div>

              </div>
            </div>
          )}

          {/* -------------------------------------------------
              RECENT ATTENDANCE
          ------------------------------------------------- */}
          {attendance &&
            attendance.records.length > 0 && (
              <div className="dashboard-card">

                <div className="card-header">
                  <div>
                    <p className="eyebrow">
                      Activity
                    </p>

                    <h2>
                      Recent attendance
                    </h2>
                  </div>
                </div>

                <div className="attendance-list">

                  {attendance.records
                    .slice(0, 5)
                    .map((record) => (
                      <div
                        key={
                          record.attendance_id
                        }
                        className="attendance-row"
                      >
                        <div>
                          <strong>
                            {new Date(
                              record.session_date
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </strong>

                          <p>
                            Period{" "}
                            {record.period_number ??
                              "—"}
                          </p>
                        </div>

                        <span
                          className={`status-badge status-${record.status.toLowerCase()}`}
                        >
                          {record.status}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

          {attendance &&
            attendance.records.length === 0 && (
              <div className="dashboard-card">
                <p className="eyebrow">
                  Attendance
                </p>

                <h2>
                  No attendance records
                </h2>

                <p className="empty-text">
                  No attendance records have
                  been recorded yet.
                </p>
              </div>
            )}

        </section>
      </main>

      <style jsx>{`
        .student-page {
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

        .student-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 42px 24px 60px;
        }

        .dashboard-header {
          margin-bottom: 30px;
        }

        .eyebrow {
          margin: 0 0 7px;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        h1 {
          margin: 0;
          color: #0f172a;
          font-size: clamp(30px, 4vw, 42px);
          line-height: 1.1;
          letter-spacing: -1px;
        }

        .welcome-text {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 15px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 22px;
        }

        .summary-card {
          padding: 23px;
          border-radius: 17px;
          background: white;
          border: 1px solid
            rgba(15, 23, 42, 0.06);
          box-shadow:
            0 5px 12px rgba(15, 23, 42, 0.04),
            0 15px 35px rgba(15, 23, 42, 0.07);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 8px 18px rgba(15, 23, 42, 0.06),
            0 20px 40px rgba(15, 23, 42, 0.09);
        }

        .summary-label {
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
        }

        .summary-value {
          margin-top: 8px;
          color: #0f172a;
          font-size: 23px;
          font-weight: 800;
        }

        .summary-subtext {
          margin-top: 5px;
          color: #94a3b8;
          font-size: 12px;
        }

        .dashboard-card {
          margin-bottom: 22px;
          padding: 26px;
          border-radius: 18px;
          background: white;
          border: 1px solid
            rgba(15, 23, 42, 0.06);
          box-shadow:
            0 6px 14px rgba(15, 23, 42, 0.04),
            0 18px 40px rgba(15, 23, 42, 0.07);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        h2 {
          margin: 0;
          color: #0f172a;
          font-size: 21px;
          letter-spacing: -0.3px;
        }

        .attendance-percentage {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 72px;
          height: 72px;
          padding: 10px;
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

        .attendance-grid {
          display: grid;
          grid-template-columns:
            repeat(6, minmax(0, 1fr));
          gap: 12px;
        }

        .attendance-stat {
          padding: 17px;
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

        .attendance-list {
          display: flex;
          flex-direction: column;
        }

        .attendance-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 15px 0;
          border-bottom: 1px solid #eef2f7;
        }

        .attendance-row:last-child {
          border-bottom: none;
        }

        .attendance-row strong {
          color: #0f172a;
          font-size: 14px;
        }

        .attendance-row p {
          margin: 4px 0 0;
          color: #94a3b8;
          font-size: 12px;
        }

        .status-badge {
          padding: 6px 11px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .status-present {
          background: #dcfce7;
          color: #166534;
        }

        .status-absent {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-late {
          background: #fef3c7;
          color: #92400e;
        }

        .status-excused {
          background: #e0e7ff;
          color: #3730a3;
        }

        .empty-text {
          margin-top: 8px;
          color: #64748b;
        }

        @media (max-width: 900px) {
          .summary-grid {
            grid-template-columns:
              1fr;
          }

          .attendance-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .student-container {
            padding: 28px 16px 45px;
          }

          .dashboard-card {
            padding: 20px;
          }

          .attendance-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .card-header {
            align-items: flex-start;
          }
        }
      `}</style>
    </>
  );
}