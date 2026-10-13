"use client";

import { useEffect, useState } from "react";

import {
  getCurrentUser,
  getSchedulingStaff,
  getSchedulingStudents,
  type StaffOption,
  type StudentRecord,
} from "../../lib/api";
import type { CurrentUserResponse } from "../../lib/api";

type ProfileRecord =
  | { kind: "staff"; record: StaffOption }
  | { kind: "student"; record: StudentRecord };

function getDisplayName(user: CurrentUserResponse, profile: ProfileRecord) {
  return profile.record.name || user.username;
}

export default function ProfilePage() {
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const currentUser = await getCurrentUser();
        if (cancelled) return;

        setUser(currentUser);

        if (currentUser.person_id === null) {
          throw new Error("Your account is not linked to a profile.");
        }

        if (currentUser.role_id === 2) {
          const staff = await getSchedulingStaff();
          const currentStaff = staff.find(
            (member) => Number(member.id) === Number(currentUser.person_id)
          );

          if (!currentStaff) {
            throw new Error("Your staff profile could not be found.");
          }

          if (!cancelled) setProfile({ kind: "staff", record: currentStaff });
        } else if (currentUser.role_id === 3) {
          const response = await getSchedulingStudents();
          const students = Array.isArray(response)
            ? response
            : response.students ?? [];
          const currentStudent = students.find(
            (student) => Number(student.id) === Number(currentUser.person_id)
          );

          if (!currentStudent) {
            throw new Error("Your student profile could not be found.");
          }

          if (!cancelled) setProfile({ kind: "student", record: currentStudent });
        } else {
          throw new Error("Profiles are not available for this account.");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your profile."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = user && profile ? getDisplayName(user, profile) : "";
  const initials = displayName.slice(0, 1).toUpperCase();
  const staff = profile?.kind === "staff" ? profile.record : null;
  const student = profile?.kind === "student" ? profile.record : null;
  const details = staff
    ? [
        { label: "Staff number", value: staff.number },
        { label: "Status", value: staff.status },
      ]
    : student
      ? [
          { label: "Roll number", value: student.roll_number },
          {
            label: "Grade",
            value: student.grade && student.section
              ? `${student.grade} - ${student.section}`
              : student.grade,
          },
          { label: "Status", value: student.status },
        ]
      : [];

  return (
    <main className="profile-page">
      <div className="profile-container">
        <header className="profile-header">
          <p className="eyebrow">Account</p>
          <h1>My profile</h1>
          {!loading && !error && user && <p>{user.email}</p>}
        </header>

        {loading ? (
          <section className="profile-card profile-state" aria-live="polite">
            <span className="profile-spinner" aria-hidden="true" />
            <p>Loading your profile…</p>
          </section>
        ) : error ? (
          <section className="profile-card profile-state" role="alert">
            <h2>Unable to load profile</h2>
            <p>{error}</p>
          </section>
        ) : user && profile ? (
          <>
            <section className="profile-hero">
              <div className="profile-avatar" aria-hidden="true">{initials}</div>
              <div>
                <h2>{displayName}</h2>
                <p>{profile.kind === "staff" ? "Staff" : "Student"}</p>
              </div>
            </section>

            <section className="profile-card">
              <h2>{staff ? "Staff details" : "Academic details"}</h2>
              <div className="profile-grid">
                {details.map(({ label, value }) =>
                  value ? (
                    <div key={label} className="profile-item">
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ) : null
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>

      <style jsx>{`
        .profile-page {
          min-height: 100dvh;
          background: #f8fafc;
          padding: 42px 24px 60px;
        }

        .profile-container {
          margin: 0 auto;
          max-width: 920px;
        }

        .profile-header {
          margin-bottom: 26px;
        }

        .eyebrow {
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .08em;
          margin: 0 0 7px;
          text-transform: uppercase;
        }

        .profile-header h1 {
          color: #0f172a;
          font-size: clamp(30px, 4vw, 38px);
          letter-spacing: -.04em;
          margin: 0;
        }

        .profile-header > p:last-child,
        .profile-hero p,
        .profile-state p {
          color: #64748b;
          margin: 8px 0 0;
        }

        .profile-hero,
        .profile-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          box-shadow: 0 8px 24px #0f172a0a;
        }

        .profile-hero {
          align-items: center;
          display: flex;
          gap: 16px;
          margin-bottom: 18px;
          padding: 22px;
        }

        .profile-avatar {
          align-items: center;
          background: #dbeafe;
          border-radius: 50%;
          color: #1d4ed8;
          display: flex;
          flex: 0 0 54px;
          font-size: 20px;
          font-weight: 700;
          height: 54px;
          justify-content: center;
        }

        .profile-hero h2,
        .profile-card h2,
        .profile-state h2 {
          color: #0f172a;
          font-size: 19px;
          margin: 0;
        }

        .profile-card {
          padding: 24px;
        }

        .profile-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          margin-top: 18px;
        }

        .profile-item {
          background: #f8fafc;
          border: 1px solid #eef2f7;
          border-radius: 12px;
          min-width: 0;
          padding: 15px;
        }

        .profile-item span {
          color: #64748b;
          display: block;
          font-size: 12px;
          margin-bottom: 6px;
        }

        .profile-item strong {
          color: #0f172a;
          display: block;
          font-size: 14px;
          overflow-wrap: anywhere;
        }

        .profile-state {
          padding: 32px;
          text-align: center;
        }

        .profile-spinner {
          animation: profile-spin .8s linear infinite;
          border: 3px solid #dbeafe;
          border-radius: 50%;
          border-top-color: #2563eb;
          display: inline-block;
          height: 30px;
          width: 30px;
        }

        @keyframes profile-spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 600px) {
          .profile-page { padding: 28px 16px 45px; }
          .profile-grid { grid-template-columns: 1fr; }
          .profile-card { padding: 19px; }
        }
      `}</style>
    </main>
  );
}
