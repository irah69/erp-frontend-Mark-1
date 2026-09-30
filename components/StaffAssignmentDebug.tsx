"use client";

import { useEffect, useState } from "react";

import {
  getCurrentUser,
  getSchedulingStaff,
  type StaffOption,
} from "../lib/api";

import {
  getStaffClassSessions,
  type StaffClassSession,
  type StaffClassSessionsResponse,
} from "../lib/attendanceApi";

type DebugState = {
  currentUser: Awaited<ReturnType<typeof getCurrentUser>> | null;
  staffRecord: StaffOption | null;
  staffResponse: StaffOption[];
  staffClasses: StaffClassSession[];
  staffClassesResponse: StaffClassSessionsResponse | null;
};

export default function StaffAssignmentDebug() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [debug, setDebug] = useState<DebugState>({
    currentUser: null,
    staffRecord: null,
    staffResponse: [],
    staffClasses: [],
    staffClassesResponse: null,
  });

  async function loadDebugData() {
    setLoading(true);
    setError("");

    try {
      console.log("========================================");
      console.log("STAFF DEBUG START");
      console.log("========================================");

      // --------------------------------------------------
      // 1. CURRENT USER
      // --------------------------------------------------

      console.log("[1] Calling /api/auth/me");

      const currentUser = await getCurrentUser();

      console.log("[1] Current user:");
      console.log(currentUser);

      console.log("[1] role_id:", currentUser.role_id);
      console.log("[1] person_id:", currentUser.person_id);

      if (currentUser.role_id !== 2) {
        throw new Error(
          `Current user is not staff. role_id=${currentUser.role_id}`
        );
      }

      if (currentUser.person_id === null) {
        throw new Error(
          "Current staff user does not have a person_id."
        );
      }

      const personId = Number(currentUser.person_id);

      if (!Number.isInteger(personId) || personId <= 0) {
        throw new Error(
          `Invalid staff person_id: ${currentUser.person_id}`
        );
      }

      console.log("[1] Staff person_id:", personId);

      // --------------------------------------------------
      // 2. LOAD ALL STAFF
      // --------------------------------------------------

      console.log("[2] Calling /api/staff");

      const staffResponse = await getSchedulingStaff();

      console.log("[2] Staff response:");
      console.log(staffResponse);

      console.log(
        `[2] Total staff records: ${staffResponse.length}`
      );

      // --------------------------------------------------
      // 3. FIND CURRENT STAFF RECORD
      // --------------------------------------------------

      const staffRecord =
        staffResponse.find(
          (staff) =>
            Number(staff.id) === personId
        ) ?? null;

      console.log("[3] Looking for staff record:");
      console.log("person_id:", personId);

      console.log("[3] Matched staff record:");
      console.log(staffRecord);

      if (!staffRecord) {
        throw new Error(
          `Staff record not found for person_id=${personId}`
        );
      }

      // --------------------------------------------------
      // 4. LOAD STAFF ASSIGNED CLASSES
      // --------------------------------------------------

      console.log(
        "[4] Calling /api/scheduling/sessions/by-staff"
      );

      console.log(
        "[4] Sending staff_id:",
        personId
      );

      const staffClassesResponse =
        await getStaffClassSessions(personId);

      console.log(
        "[4] Staff class response:"
      );

      console.log(
        staffClassesResponse
      );

      const staffClasses =
        staffClassesResponse.sessions ?? [];

      console.log(
        `[4] Assigned sessions: ${staffClasses.length}`
      );

      // --------------------------------------------------
      // 5. PRINT EACH ASSIGNMENT
      // --------------------------------------------------

      staffClasses.forEach(
        (item, index) => {
          console.log(
            `---------- ASSIGNMENT ${index + 1} ----------`
          );

          console.log(
            "Timetable ID:",
            item.timetable_id
          );

          console.log(
            "Session ID:",
            item.session_id
          );

          console.log(
            "Grade ID:",
            item.grade_id
          );

          console.log(
            "Grade:",
            item.grade
          );

          console.log(
            "Section ID:",
            item.section_id
          );

          console.log(
            "Section:",
            item.section
          );

          console.log(
            "Academic Year:",
            item.academic_year
          );

          console.log(
            "Subject ID:",
            item.subject_id
          );

          console.log(
            "Staff ID:",
            item.staff_id
          );

          console.log(
            "Day:",
            item.day_of_week
          );

          console.log(
            "Period:",
            item.period_number
          );

          console.log(
            "Time:",
            item.start_time,
            "-",
            item.end_time
          );

          console.log(
            "Session Date:",
            item.session_date
          );

          console.log(
            "Ready:",
            item.ready
          );

          console.log(
            "Conducted:",
            item.is_conducted
          );
        }
      );

      // --------------------------------------------------
      // 6. SAVE DEBUG DATA
      // --------------------------------------------------

      setDebug({
        currentUser,
        staffRecord,
        staffResponse,
        staffClasses,
        staffClassesResponse,
      });

      console.log("========================================");
      console.log("STAFF DEBUG COMPLETE");
      console.log("========================================");
    } catch (debugError) {
      console.error(
        "STAFF DEBUG ERROR:",
        debugError
      );

      setError(
        debugError instanceof Error
          ? debugError.message
          : "Staff debugging failed."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDebugData();
  }, []);

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <section className="staff-debug">
        <div className="staff-debug-card">
          <h1>Staff Assignment Debug</h1>

          <p>
            Loading current user, staff record,
            and assigned classes...
          </p>

          <div className="staff-debug-loader">
            Loading...
          </div>
        </div>

        <style jsx>{debugCss}</style>
      </section>
    );
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (error) {
    return (
      <section className="staff-debug">
        <div className="staff-debug-card error-card">
          <div className="debug-label">
            ERROR
          </div>

          <h1>
            Staff Assignment Debug
          </h1>

          <div className="error-message">
            {error}
          </div>

          <button
            type="button"
            onClick={() =>
              void loadDebugData()
            }
          >
            Retry
          </button>

          <details>
            <summary>
              Current user response
            </summary>

            <pre>
              {JSON.stringify(
                debug.currentUser,
                null,
                2
              )}
            </pre>
          </details>

          <details>
            <summary>
              Staff response
            </summary>

            <pre>
              {JSON.stringify(
                debug.staffResponse,
                null,
                2
              )}
            </pre>
          </details>
        </div>

        <style jsx>{debugCss}</style>
      </section>
    );
  }

  const user =
    debug.currentUser;

  const staff =
    debug.staffRecord;

  const classes =
    debug.staffClasses;

  // Unique classes
  const uniqueClasses =
    Array.from(
      new Map(
        classes.map((item) => [
          `${item.grade_id}-${item.section_id}`,
          item,
        ])
      ).values()
    );

  return (
    <section className="staff-debug">
      <div className="staff-debug-container">

        {/* ========================================= */}
        {/* HEADER */}
        {/* ========================================= */}

        <div className="staff-debug-card">
          <div className="debug-label">
            DEBUG MODE
          </div>

          <h1>
            Staff Assignment Debug
          </h1>

          <p>
            This page only checks the logged-in
            staff account and the classes assigned
            to that staff member.
          </p>

          <button
            type="button"
            onClick={() =>
              void loadDebugData()
            }
          >
            Reload Debug Data
          </button>
        </div>

        {/* ========================================= */}
        {/* STEP 1 - CURRENT USER */}
        {/* ========================================= */}

        <div className="staff-debug-card">

          <div className="step-title">
            <span>1</span>

            <div>
              <h2>
                Current User
              </h2>

              <p>
                Response from
                <code>
                  /api/auth/me
                </code>
              </p>
            </div>
          </div>

          {user ? (
            <div className="info-grid">

              <Info
                label="User ID"
                value={user.id}
              />

              <Info
                label="Username"
                value={user.username}
              />

              <Info
                label="Email"
                value={user.email}
              />

              <Info
                label="Role ID"
                value={user.role_id}
              />

              <Info
                label="Person ID"
                value={user.person_id}
              />

              <Info
                label="Active"
                value={
                  user.is_active
                    ? "Yes"
                    : "No"
                }
              />

            </div>
          ) : (
            <p>No user response.</p>
          )}

          <details>
            <summary>
              Raw current user JSON
            </summary>

            <pre>
              {JSON.stringify(
                user,
                null,
                2
              )}
            </pre>
          </details>
        </div>

        {/* ========================================= */}
        {/* STEP 2 - STAFF RECORD */}
        {/* ========================================= */}

        <div className="staff-debug-card">

          <div className="step-title">
            <span>2</span>

            <div>
              <h2>
                Staff Record
              </h2>

              <p>
                Looking for staff ID:
                <strong>
                  {user?.person_id ?? "—"}
                </strong>
              </p>
            </div>
          </div>

          {staff ? (
            <>
              <div className="success-box">
                Staff record found.
              </div>

              <div className="info-grid">

                <Info
                  label="Staff ID"
                  value={staff.id}
                />

                <Info
                  label="Name"
                  value={staff.name}
                />

                <Info
                  label="Number"
                  value={
                    staff.number ??
                    "—"
                  }
                />

                <Info
                  label="Status"
                  value={
                    staff.status ??
                    "—"
                  }
                />

              </div>
            </>
          ) : (
            <div className="error-message">
              Staff record was not found.
            </div>
          )}

          <details>
            <summary>
              Raw staff record
            </summary>

            <pre>
              {JSON.stringify(
                staff,
                null,
                2
              )}
            </pre>
          </details>
        </div>

        {/* ========================================= */}
        {/* STEP 3 - STAFF CLASS API */}
        {/* ========================================= */}

        <div className="staff-debug-card">

          <div className="step-title">
            <span>3</span>

            <div>
              <h2>
                Assigned Class Sessions
              </h2>

              <p>
                Request:
              </p>

              <code className="request-url">
                /api/scheduling/sessions/by-staff
                ?staff_id=
                {user?.person_id ?? "?"}
              </code>
            </div>
          </div>

          <div className="stats-grid">

            <div className="stat">
              <span>
                Total Sessions
              </span>

              <strong>
                {classes.length}
              </strong>
            </div>

            <div className="stat">
              <span>
                Unique Classes
              </span>

              <strong>
                {uniqueClasses.length}
              </strong>
            </div>

          </div>

          {classes.length === 0 ? (
            <div className="warning-box">
              No sessions were returned for
              this staff member.
            </div>
          ) : (
            <div className="class-list">

              {uniqueClasses.map(
                (item) => (
                  <div
                    className="class-card"
                    key={`${item.grade_id}-${item.section_id}`}
                  >

                    <div>
                      <span className="class-label">
                        Class
                      </span>

                      <h3>
                        {item.grade ??
                          `Grade ${item.grade_id}`}
                      </h3>
                    </div>

                    <div>
                      <span className="class-label">
                        Section
                      </span>

                      <strong>
                        {item.section ??
                          `Section ${item.section_id}`}
                      </strong>
                    </div>

                    <div>
                      <span className="class-label">
                        Grade ID
                      </span>

                      <strong>
                        {item.grade_id}
                      </strong>
                    </div>

                    <div>
                      <span className="class-label">
                        Section ID
                      </span>

                      <strong>
                        {item.section_id}
                      </strong>
                    </div>

                    <div>
                      <span className="class-label">
                        Academic Year
                      </span>

                      <strong>
                        {item.academic_year ??
                          "—"}
                      </strong>
                    </div>

                  </div>
                )
              )}

            </div>
          )}
        </div>

        {/* ========================================= */}
        {/* STEP 4 - EVERY SESSION */}
        {/* ========================================= */}

        <div className="staff-debug-card">

          <div className="step-title">
            <span>4</span>

            <div>
              <h2>
                Every Assigned Session
              </h2>

              <p>
                Complete data returned by the
                staff scheduling endpoint.
              </p>
            </div>
          </div>

          {classes.length === 0 ? (
            <p>
              No sessions returned.
            </p>
          ) : (
            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>
                      Timetable
                    </th>

                    <th>
                      Session
                    </th>

                    <th>
                      Class
                    </th>

                    <th>
                      Section
                    </th>

                    <th>
                      Subject
                    </th>

                    <th>
                      Staff
                    </th>

                    <th>
                      Day
                    </th>

                    <th>
                      Period
                    </th>

                    <th>
                      Time
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {classes.map(
                    (
                      item,
                      index
                    ) => (
                      <tr
                        key={
                          item.session_id ??
                          `${item.timetable_id}-${index}`
                        }
                      >

                        <td>
                          {item.timetable_id}
                        </td>

                        <td>
                          {item.session_id ??
                            "—"}
                        </td>

                        <td>
                          {item.grade ??
                            item.grade_id}
                        </td>

                        <td>
                          {item.section ??
                            item.section_id}
                        </td>

                        <td>
                          {item.subject_id ??
                            "—"}
                        </td>

                        <td>
                          {item.staff_id ??
                            "—"}
                        </td>

                        <td>
                          {item.day_of_week}
                        </td>

                        <td>
                          {item.period_number ??
                            "—"}
                        </td>

                        <td>
                          {item.start_time?.slice(
                            0,
                            5
                          )}
                          {" – "}
                          {item.end_time?.slice(
                            0,
                            5
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}
        </div>

        {/* ========================================= */}
        {/* STEP 5 - RAW API */}
        {/* ========================================= */}

        <div className="staff-debug-card">

          <div className="step-title">
            <span>5</span>

            <div>
              <h2>
                Raw Staff Sessions Response
              </h2>

              <p>
                Useful for checking exactly what
                FastAPI is returning.
              </p>
            </div>
          </div>

          <details open>
            <summary>
              Show raw response
            </summary>

            <pre>
              {JSON.stringify(
                debug.staffClassesResponse,
                null,
                2
              )}
            </pre>
          </details>

        </div>

      </div>

      <style jsx>{debugCss}</style>
    </section>
  );
}

// ============================================================
// SMALL INFO COMPONENT
// ============================================================

function Info({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="info-item">
      <span>
        {label}
      </span>

      <strong>
        {value === null ||
        value === undefined
          ? "—"
          : String(value)}
      </strong>
    </div>
  );
}

// ============================================================
// CSS
// ============================================================

const debugCss = `
.staff-debug {
  width: 100%;
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;

  background:
    radial-gradient(
      circle at top left,
      rgba(10, 132, 255, 0.08),
      transparent 35%
    ),
    radial-gradient(
      circle at bottom right,
      rgba(124, 58, 237, 0.08),
      transparent 35%
    );
}

.staff-debug-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;

  display: grid;
  gap: 18px;
}

.staff-debug-card {
  width: 100%;
  padding: 22px;

  border: 1px solid rgba(128, 128, 128, 0.22);
  border-radius: 18px;

  background: rgba(255, 255, 255, 0.7);

  box-shadow:
    0 8px 30px rgba(20, 30, 60, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);

  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

@media (prefers-color-scheme: dark) {
  .staff-debug-card {
    background: rgba(20, 25, 35, 0.72);
    border-color: rgba(255, 255, 255, 0.14);
  }
}

.debug-label {
  display: inline-flex;
  padding: 5px 10px;

  border-radius: 999px;

  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;

  background: rgba(10, 132, 255, 0.12);
  color: rgb(10, 100, 200);
}

.staff-debug-card h1 {
  margin: 10px 0 6px;

  font-size: clamp(
    1.5rem,
    1.2rem + 1vw,
    2.1rem
  );
}

.staff-debug-card h2 {
  margin: 0;

  font-size: 1.15rem;
}

.staff-debug-card h3 {
  margin: 4px 0 0;
}

.staff-debug-card p {
  margin: 6px 0 0;
  opacity: 0.72;
}

.step-title {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}

.step-title > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 32px;
  height: 32px;

  flex: 0 0 32px;

  border-radius: 50%;

  background: rgba(10, 132, 255, 0.12);
  color: rgb(10, 100, 200);

  font-weight: 700;
}

.info-grid {
  display: grid;
  grid-template-columns:
    repeat(
      auto-fit,
      minmax(180px, 1fr)
    );

  gap: 12px;
}

.info-item {
  padding: 14px;

  border-radius: 12px;

  background: rgba(128, 128, 128, 0.08);

  border: 1px solid
    rgba(128, 128, 128, 0.15);
}

.info-item span,
.class-label {
  display: block;

  margin-bottom: 4px;

  font-size: 0.78rem;
  opacity: 0.65;
}

.info-item strong {
  display: block;

  overflow-wrap: anywhere;
}

.success-box,
.warning-box,
.error-message {
  padding: 12px 14px;

  border-radius: 10px;

  margin-bottom: 14px;
}

.success-box {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.warning-box {
  background: rgba(234, 179, 8, 0.12);
  border: 1px solid rgba(234, 179, 8, 0.25);
}

.error-message {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);

  color: #b91c1c;
}

.staff-debug button {
  appearance: none;

  padding: 10px 16px;

  border: 0;
  border-radius: 10px;

  background: rgb(10, 132, 255);
  color: white;

  font: inherit;
  font-weight: 600;

  cursor: pointer;
}

.staff-debug button:hover {
  opacity: 0.9;
}

.staff-debug details {
  margin-top: 16px;
}

.staff-debug summary {
  cursor: pointer;

  font-weight: 600;

  margin-bottom: 8px;
}

.staff-debug pre {
  width: 100%;
  max-height: 500px;

  overflow: auto;

  padding: 14px;

  border-radius: 12px;

  background: #111827;
  color: #e5e7eb;

  font-size: 0.82rem;
  line-height: 1.5;

  white-space: pre-wrap;
  word-break: break-word;
}

.request-url {
  display: block;

  margin-top: 8px;
  padding: 10px 12px;

  border-radius: 8px;

  background: rgba(128, 128, 128, 0.1);

  overflow-wrap: anywhere;
}

.stats-grid {
  display: grid;

  grid-template-columns:
    repeat(
      auto-fit,
      minmax(180px, 1fr)
    );

  gap: 12px;

  margin-bottom: 18px;
}

.stat {
  padding: 16px;

  border-radius: 12px;

  background: rgba(128, 128, 128, 0.08);

  border: 1px solid
    rgba(128, 128, 128, 0.15);
}

.stat span {
  display: block;

  font-size: 0.8rem;
  opacity: 0.65;
}

.stat strong {
  display: block;

  margin-top: 4px;

  font-size: 1.7rem;
}

.class-list {
  display: grid;

  grid-template-columns:
    repeat(
      auto-fit,
      minmax(250px, 1fr)
    );

  gap: 12px;
}

.class-card {
  display: grid;

  gap: 12px;

  padding: 16px;

  border-radius: 14px;

  border: 1px solid
    rgba(128, 128, 128, 0.18);

  background: rgba(
    128,
    128,
    128,
    0.06
  );
}

.table-wrapper {
  width: 100%;

  overflow-x: auto;

  border-radius: 12px;

  border: 1px solid
    rgba(128, 128, 128, 0.18);
}

.table-wrapper table {
  width: 100%;

  border-collapse: collapse;

  min-width: 850px;
}

.table-wrapper th,
.table-wrapper td {
  padding: 12px 14px;

  text-align: left;

  border-bottom: 1px solid
    rgba(128, 128, 128, 0.15);

  white-space: nowrap;
}

.table-wrapper th {
  font-size: 0.8rem;

  opacity: 0.7;

  background: rgba(
    128,
    128,
    128,
    0.08
  );
}

.table-wrapper tbody tr:hover {
  background: rgba(
    10,
    132,
    255,
    0.05
  );
}

.staff-debug-loader {
  margin-top: 18px;

  padding: 14px;

  border-radius: 10px;

  background: rgba(
    10,
    132,
    255,
    0.08
  );
}

.error-card {
  max-width: 1000px;
  margin: 0 auto;
}

@media (max-width: 640px) {
  .staff-debug {
    padding: 12px;
  }

  .staff-debug-card {
    padding: 16px;
    border-radius: 14px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
`;