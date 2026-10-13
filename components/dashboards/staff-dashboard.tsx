"use client";

import Link from "next/link";
import type { CurrentUser } from "../../lib/auth";

export default function StaffDashboard({
  user,
}: {
  user: CurrentUser;
}) {
  return (
    <section className="staff-dashboard">
      <main className="staff-dashboard-content">
        <div className="staff-container">
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

          </section>

          <section className="staff-section">
            <div className="staff-section-heading">
              <div>
                <h2>Your tools</h2>
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

              <Link href="/staff-attendance" className="staff-action-card">
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

        .staff-dashboard-content {
          width: 100%;
          padding: 42px 24px 70px;
        }

        .staff-container {
          max-width: 1200px;
          margin: 0 auto;
        }

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

        @media (max-width: 900px) {
          .staff-action-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .staff-dashboard-content {
            padding: 24px 16px 50px;
          }

          .staff-hero {
            flex-direction: column;
            padding: 24px;
            border-radius: 20px;
          }
        }

        @media (max-width: 520px) {
          .staff-hero h1 {
            font-size: 31px;
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