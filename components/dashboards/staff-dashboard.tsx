"use client";
import StaffAssignmentDebug from "../../components/StaffAssignmentDebug";
import Link from "next/link";
import type { CurrentUser } from "../../lib/auth";

export default function StaffDashboard({
  user,
}: {
  user: CurrentUser;
}) {
  return (
    <section className="staff-dashboard">
      {/* Navigation */}
      <nav className="staff-nav">
        <div className="staff-nav-inner">
          <Link href="/dashboard" className="staff-brand">
            School ERP
          </Link>

          <div className="staff-nav-links">
            <Link
              href="/dashboard"
              className="staff-nav-link staff-nav-link-active"
            >
              Dashboard
            </Link>

            <Link href="/schedule" className="staff-nav-link">
              Schedule
            </Link>

            <Link href="/staff-debug" className="staff-nav-link">
              Attendance
            </Link>

            <Link href="/profile" className="staff-nav-link">
              Profile
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="staff-dashboard-content">
        <div className="staff-container">
          {/* Header */}
          <section className="staff-hero">
            <div>
              <p className="staff-eyebrow">Staff workspace</p>

              <h1>
                Hello, {user.username}
                <span>.</span>
              </h1>

              <p className="staff-subtitle">
                Manage your classes, view your schedule, and mark student
                attendance from one place.
              </p>
            </div>

            <div className="staff-role-badge">
              <span className="staff-role-dot" />
              Staff
            </div>
          </section>

          {/* Quick actions */}
          <section className="staff-section">
            <div className="staff-section-heading">
              <div>
                <p className="staff-eyebrow">Quick access</p>
                <h2>Manage your workspace</h2>
              </div>
            </div>

            <div className="staff-action-grid">
              <Link href="/schedule" className="staff-action-card">
                <div className="staff-action-icon schedule-icon">
                  <span>▣</span>
                </div>

                <div className="staff-action-content">
                  <h3>My Schedule</h3>
                  <p>
                    View your classes, periods, subjects, and timings.
                  </p>
                </div>

                <span className="staff-action-arrow">→</span>
              </Link>

              <Link href="/attendance" className="staff-action-card">
                <div className="staff-action-icon attendance-icon">
                  <span>✓</span>
                </div>

                <div className="staff-action-content">
                  <h3>Attendance</h3>
                  <p>
                    Mark attendance for students attending your classes.
                  </p>
                </div>

                <span className="staff-action-arrow">→</span>
              </Link>

              <Link href="/profile" className="staff-action-card">
                <div className="staff-action-icon profile-icon">
                  <span>◉</span>
                </div>

                <div className="staff-action-content">
                  <h3>My Profile</h3>
                  <p>
                    View your staff and account information.
                  </p>
                </div>

                <span className="staff-action-arrow">→</span>
              </Link>
            </div>
          </section>

          {/* Account information */}
          <section className="staff-section">
            <div className="staff-section-heading">
              <div>
                <p className="staff-eyebrow">Account</p>
                <h2>Your account</h2>
              </div>
            </div>

            <div className="staff-account-card">
              <div className="staff-account-grid">
                <div className="staff-info-item">
                  <span>Username</span>
                  <strong>{user.username}</strong>
                </div>

                <div className="staff-info-item">
                  <span>Email</span>
                  <strong>{user.email}</strong>
                </div>

                <div className="staff-info-item">
                  <span>User ID</span>
                  <strong>{user.id}</strong>
                </div>

                <div className="staff-info-item">
                  <span>Staff ID</span>
                  <strong>{user.person_id ?? "—"}</strong>
                </div>

                <div className="staff-info-item">
                  <span>Role ID</span>
                  <strong>{user.role_id}</strong>
                </div>

                <div className="staff-info-item">
                  <span>Account status</span>
                  <strong
                    className={
                      user.is_active
                        ? "staff-status-active"
                        : "staff-status-inactive"
                    }
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          {/* Information */}
          <section className="staff-info-banner">
            <div className="staff-info-banner-icon">i</div>

            <div>
              <strong>Staff access</strong>

              <p>
                Your schedule and attendance workspace is limited to the
                classes assigned to your staff account.
              </p>
            </div>
          </section>
        </div>
      </main>

      <style jsx>{`
        .staff-dashboard {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top left,
              rgba(59, 130, 246, 0.08),
              transparent 34%
            ),
            radial-gradient(
              circle at top right,
              rgba(14, 165, 233, 0.06),
              transparent 30%
            ),
            #f8fafc;
          color: #0f172a;
        }

        /* NAVIGATION */

        .staff-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow:
            0 4px 12px rgba(15, 23, 42, 0.04),
            0 12px 30px rgba(15, 23, 42, 0.06);
        }

        .staff-nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .staff-brand {
          color: #111827;
          text-decoration: none;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          white-space: nowrap;
        }

        .staff-nav-links {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .staff-nav-link {
          padding: 10px 17px;
          border-radius: 10px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255, 255, 255, 0.96);
          color: #64748b;
          text-decoration: none;
          font-size: 14px;
          font-weight: 650;
          box-shadow:
            0 2px 5px rgba(15, 23, 42, 0.05),
            0 6px 14px rgba(15, 23, 42, 0.05);
          transition:
            transform 0.2s ease,
            color 0.2s ease,
            background 0.2s ease,
            box-shadow 0.2s ease;
        }

        .staff-nav-link:hover {
          color: #111827;
          transform: translateY(-2px);
          box-shadow:
            0 4px 8px rgba(15, 23, 42, 0.08),
            0 10px 20px rgba(15, 23, 42, 0.07);
        }

        .staff-nav-link-active {
          color: #111827;
          background: #eef2f7;
          border-color: rgba(15, 23, 42, 0.1);
          box-shadow:
            inset 0 1px 1px rgba(255, 255, 255, 0.9),
            0 4px 8px rgba(15, 23, 42, 0.08),
            0 8px 18px rgba(15, 23, 42, 0.06);
        }

        /* CONTENT */

        .staff-dashboard-content {
          width: 100%;
          padding: 42px 24px 70px;
        }

        .staff-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* HERO */

        .staff-hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          padding: 34px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(15, 23, 42, 0.07);
          box-shadow:
            0 10px 25px rgba(15, 23, 42, 0.05),
            0 25px 55px rgba(15, 23, 42, 0.06);
        }

        .staff-eyebrow {
          margin: 0 0 8px;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .staff-hero h1 {
          margin: 0;
          font-size: clamp(30px, 5vw, 46px);
          line-height: 1.08;
          letter-spacing: -1.5px;
          font-weight: 800;
          color: #0f172a;
        }

        .staff-hero h1 span {
          color: #2563eb;
        }

        .staff-subtitle {
          max-width: 680px;
          margin: 14px 0 0;
          color: #64748b;
          font-size: 15px;
          line-height: 1.7;
        }

        .staff-role-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 999px;
          background: #f1f5f9;
          border: 1px solid rgba(15, 23, 42, 0.08);
          color: #334155;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow:
            0 3px 8px rgba(15, 23, 42, 0.05),
            inset 0 1px 1px rgba(255, 255, 255, 0.8);
        }

        .staff-role-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1);
        }

        /* SECTIONS */

        .staff-section {
          margin-top: 34px;
        }

        .staff-section-heading {
          margin-bottom: 15px;
        }

        .staff-section-heading h2 {
          margin: 0;
          color: #0f172a;
          font-size: 21px;
          font-weight: 800;
          letter-spacing: -0.4px;
        }

        /* ACTION CARDS */

        .staff-action-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .staff-action-card {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 15px;
          min-height: 155px;
          padding: 22px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(15, 23, 42, 0.07);
          text-decoration: none;
          color: inherit;
          box-shadow:
            0 5px 12px rgba(15, 23, 42, 0.04),
            0 16px 30px rgba(15, 23, 42, 0.05);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .staff-action-card:hover {
          transform: translateY(-4px);
          border-color: rgba(37, 99, 235, 0.18);
          box-shadow:
            0 10px 20px rgba(15, 23, 42, 0.07),
            0 22px 40px rgba(15, 23, 42, 0.08);
        }

        .staff-action-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          font-size: 19px;
          font-weight: 800;
          box-shadow:
            inset 0 1px 1px rgba(255, 255, 255, 0.8),
            0 4px 10px rgba(15, 23, 42, 0.07);
        }

        .schedule-icon {
          background: #eff6ff;
          color: #2563eb;
        }

        .attendance-icon {
          background: #f0fdf4;
          color: #16a34a;
        }

        .profile-icon {
          background: #f8fafc;
          color: #475569;
        }

        .staff-action-content {
          padding-right: 20px;
        }

        .staff-action-content h3 {
          margin: 2px 0 7px;
          color: #111827;
          font-size: 16px;
          font-weight: 800;
        }

        .staff-action-content p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }

        .staff-action-arrow {
          position: absolute;
          right: 18px;
          bottom: 17px;
          color: #94a3b8;
          font-size: 18px;
          transition: transform 0.2s ease;
        }

        .staff-action-card:hover .staff-action-arrow {
          transform: translateX(3px);
          color: #2563eb;
        }

        /* ACCOUNT */

        .staff-account-card {
          padding: 24px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(15, 23, 42, 0.07);
          box-shadow:
            0 7px 18px rgba(15, 23, 42, 0.04),
            0 18px 36px rgba(15, 23, 42, 0.05);
        }

        .staff-account-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          overflow: hidden;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.06);
        }

        .staff-info-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 18px;
          background: #ffffff;
        }

        .staff-info-item span {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .staff-info-item strong {
          color: #1e293b;
          font-size: 14px;
          font-weight: 700;
          word-break: break-word;
        }

        .staff-status-active {
          color: #16a34a !important;
        }

        .staff-status-inactive {
          color: #dc2626 !important;
        }

        /* INFO */

        .staff-info-banner {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-top: 28px;
          padding: 18px 20px;
          border-radius: 16px;
          background: rgba(239, 246, 255, 0.8);
          border: 1px solid rgba(37, 99, 235, 0.1);
          box-shadow:
            0 5px 14px rgba(15, 23, 42, 0.04),
            inset 0 1px 1px rgba(255, 255, 255, 0.8);
        }

        .staff-info-banner-icon {
          width: 28px;
          height: 28px;
          flex: 0 0 28px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #dbeafe;
          color: #2563eb;
          font-size: 14px;
          font-weight: 800;
        }

        .staff-info-banner strong {
          display: block;
          margin-bottom: 4px;
          color: #1e3a8a;
          font-size: 13px;
        }

        .staff-info-banner p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }

        /* RESPONSIVE */

        @media (max-width: 900px) {
          .staff-action-grid {
            grid-template-columns: 1fr;
          }

          .staff-account-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 700px) {
          .staff-nav-inner {
            padding: 12px 16px;
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .staff-brand {
            text-align: center;
          }

          .staff-nav-links {
            justify-content: center;
            flex-wrap: wrap;
          }

          .staff-nav-link {
            padding: 9px 13px;
            font-size: 13px;
          }

          .staff-dashboard-content {
            padding: 24px 16px 50px;
          }

          .staff-hero {
            flex-direction: column;
            padding: 24px;
            border-radius: 20px;
          }

          .staff-role-badge {
            align-self: flex-start;
          }
        }

        @media (max-width: 520px) {
          .staff-hero h1 {
            font-size: 31px;
          }

          .staff-account-grid {
            grid-template-columns: 1fr;
          }

          .staff-account-card {
            padding: 15px;
          }

          .staff-action-card {
            min-height: 135px;
            padding: 18px;
          }
        }
      `}</style>
    </section>
  );
}