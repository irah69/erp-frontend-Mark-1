"use client";

import { useEffect, useState } from "react";

import DashboardNav from "../../components/dashboardnav";

import {
  getCurrentUser,
  getSchedulingStudents,
  type StudentRecord,
} from "../../lib/api";

import type { CurrentUser } from "../../lib/auth";

export default function ProfilePage() {
  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [student, setStudent] =
    useState<StudentRecord | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);

        // ---------------------------------------------------------
        // 1. Get current logged-in user
        // ---------------------------------------------------------
        const currentUser =
          await getCurrentUser();

        setUser(currentUser);

        if (!currentUser.person_id) {
          throw new Error(
            "Student account is not linked to a student record."
          );
        }

        // ---------------------------------------------------------
        // 2. Get students
        // ---------------------------------------------------------
        const response =
          await getSchedulingStudents();

        const students: StudentRecord[] =
          Array.isArray(response)
            ? response
            : response.students ?? [];

        // ---------------------------------------------------------
        // 3. Find current student
        // ---------------------------------------------------------
        const currentStudent =
          students.find(
            (item) =>
              Number(item.id) ===
              Number(currentUser.person_id)
          );

        if (!currentStudent) {
          throw new Error(
            "Student record could not be found."
          );
        }

        setStudent(currentStudent);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load profile."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  if (loading) {
    return (
      <>
        <DashboardNav />

        <main className="profile-page">
          <div className="profile-container">
            <div className="profile-card loading-card">
              <div className="spinner" />

              <h1>
                Loading profile...
              </h1>

              <p>
                Please wait while we load your
                profile information.
              </p>
            </div>
          </div>
        </main>

        <style jsx>{`
          .profile-page {
            min-height: calc(100vh - 65px);
            background: #f8fafc;
          }

          .profile-container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 42px 24px;
          }

          .profile-card {
            background: white;
            border-radius: 20px;
            padding: 32px;
            border: 1px solid
              rgba(15, 23, 42, 0.06);
            box-shadow:
              0 8px 18px rgba(15, 23, 42, 0.05),
              0 22px 50px rgba(15, 23, 42, 0.08);
          }

          .loading-card {
            text-align: center;
          }

          .spinner {
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
            color: #0f172a;
          }

          p {
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

  if (error || !user || !student) {
    return (
      <>
        <DashboardNav />

        <main className="profile-page">
          <div className="profile-container">
            <div className="profile-card error-card">
              <div className="error-icon">
                !
              </div>

              <h1>
                Unable to load profile
              </h1>

              <p>
                {error ||
                  "Profile information is unavailable."}
              </p>
            </div>
          </div>
        </main>

        <style jsx>{`
          .profile-page {
            min-height: calc(100vh - 65px);
            background: #f8fafc;
          }

          .profile-container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 42px 24px;
          }

          .profile-card {
            background: white;
            border-radius: 20px;
            padding: 32px;
            border: 1px solid
              rgba(15, 23, 42, 0.06);
            box-shadow:
              0 8px 18px rgba(15, 23, 42, 0.05),
              0 22px 50px rgba(15, 23, 42, 0.08);
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

      <main className="profile-page">
        <div className="profile-container">

          {/* -------------------------------------------------
              PAGE HEADER
          ------------------------------------------------- */}
          <div className="profile-header">
            <p className="eyebrow">
              Student Account
            </p>

            <h1>
              My Profile
            </h1>

            <p>
              View your student and account
              information.
            </p>
          </div>

          {/* -------------------------------------------------
              PROFILE HERO
          ------------------------------------------------- */}
          <div className="profile-hero">
            <div className="avatar">
              {student.name
                ? student.name
                    .charAt(0)
                    .toUpperCase()
                : "S"}
            </div>

            <div>
              <h2>
                {student.name ||
                  "Student"}
              </h2>

              <p>
                Student ID: {student.id}
              </p>
            </div>
          </div>

          {/* -------------------------------------------------
              STUDENT INFORMATION
          ------------------------------------------------- */}
          <section className="profile-card">
            <div className="section-heading">
              <p className="eyebrow">
                Academic Information
              </p>

              <h2>
                Student details
              </h2>
            </div>

            <div className="info-grid">

              <div className="info-item">
                <span>Name</span>
                <strong>
                  {student.name ||
                    "Not available"}
                </strong>
              </div>

              <div className="info-item">
                <span>Roll Number</span>
                <strong>
                  {student.roll_number ||
                    "Not available"}
                </strong>
              </div>

              <div className="info-item">
                <span>Grade</span>
                <strong>
                  {student.grade ||
                    "Not available"}
                </strong>
              </div>

              <div className="info-item">
                <span>Section</span>
                <strong>
                  {student.section ||
                    "Not available"}
                </strong>
              </div>

              <div className="info-item">
                <span>Student ID</span>
                <strong>
                  {student.id}
                </strong>
              </div>

              <div className="info-item">
                <span>Status</span>
                <strong className="active-status">
                  {student.status ||
                    "Active"}
                </strong>
              </div>

            </div>
          </section>

          {/* -------------------------------------------------
              ACCOUNT INFORMATION
          ------------------------------------------------- */}
          <section className="profile-card">
            <div className="section-heading">
              <p className="eyebrow">
                Account Information
              </p>

              <h2>
                Login details
              </h2>
            </div>

            <div className="info-grid">

              <div className="info-item">
                <span>Username</span>
                <strong>
                  {user.username}
                </strong>
              </div>

              <div className="info-item">
                <span>Email</span>
                <strong>
                  {user.email}
                </strong>
              </div>

              <div className="info-item">
                <span>Account ID</span>
                <strong>
                  {user.id}
                </strong>
              </div>

              <div className="info-item">
                <span>Student ID</span>
                <strong>
                  {user.person_id}
                </strong>
              </div>

            </div>
          </section>

        </div>
      </main>

      <style jsx>{`
        .profile-page {
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

        .profile-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 42px 24px 60px;
        }

        .profile-header {
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

        .profile-header h1 {
          margin: 0;
          color: #0f172a;
          font-size: 38px;
          letter-spacing: -0.8px;
        }

        .profile-header > p:last-child {
          margin-top: 8px;
          color: #64748b;
        }

        .profile-hero {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 22px;
          padding: 25px;
          border-radius: 20px;
          background: white;
          border: 1px solid
            rgba(15, 23, 42, 0.06);
          box-shadow:
            0 7px 16px rgba(15, 23, 42, 0.05),
            0 20px 45px rgba(15, 23, 42, 0.08);
        }

        .avatar {
          width: 64px;
          height: 64px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #0f172a;
          color: white;
          font-size: 24px;
          font-weight: 800;
          box-shadow:
            0 6px 14px
              rgba(15, 23, 42, 0.2);
        }

        .profile-hero h2 {
          margin: 0;
          color: #0f172a;
          font-size: 23px;
        }

        .profile-hero p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .profile-card {
          margin-bottom: 22px;
          padding: 27px;
          border-radius: 19px;
          background: white;
          border: 1px solid
            rgba(15, 23, 42, 0.06);
          box-shadow:
            0 6px 14px rgba(15, 23, 42, 0.04),
            0 18px 40px rgba(15, 23, 42, 0.07);
        }

        .section-heading {
          margin-bottom: 22px;
        }

        .section-heading h2 {
          margin: 0;
          color: #0f172a;
          font-size: 21px;
        }

        .info-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 13px;
        }

        .info-item {
          padding: 17px;
          border-radius: 13px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
        }

        .info-item span {
          display: block;
          margin-bottom: 6px;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .info-item strong {
          display: block;
          color: #0f172a;
          font-size: 15px;
          word-break: break-word;
        }

        .active-status {
          color: #15803d !important;
        }

        @media (max-width: 600px) {
          .profile-container {
            padding: 28px 16px 45px;
          }

          .profile-header h1 {
            font-size: 31px;
          }

          .profile-card {
            padding: 20px;
          }

          .profile-hero {
            padding: 20px;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}