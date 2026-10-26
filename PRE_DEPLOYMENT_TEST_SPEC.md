# Feature: Solvane Full Application Pre-Deployment Audit

## 0. Codex Test Context

- **Test mode**: Full Flow Test
- **Target URL**: `http://localhost:3000` (currently unavailable)
- **Dev server command**: `npm run dev` in `erp` (not started during this inspection)
- **Frontend entry**: `erp/app`
- **Backend entry**: Not present in this checkout; frontend configuration selects `http://127.0.0.1:8000` in the current local environment.
- **Test data source**: Unknown; no backend source, fixture, or database config is present in this checkout.
- **Allowed test data actions**: Read-only until backend/database are reachable and the active database is confirmed as development/test. Then use uniquely named test records, preserve pre-existing data, and clean up only confirmed run-owned records.
- **Default viewport assumption**: Desktop `1280x800`; tablet/mobile checks at execution.
- **Codex tools expected**: Browser Use + Screenshot Review, Playwright Script, API/Security Supplemental. Actual browser capability will be confirmed before execution.

## 1. Interface

### 1.1 Routes

Implemented Next.js routes:

- `/` — entry/redirect page (`erp/app/page.tsx`)
- `/login` — login form
- `/dashboard` — role-selected dashboard
- `/students` — student management
- `/staff` — staff management
- `/class` — class/roster management
- `/academic` — grades and sections
- `/scheduling` — timetable management
- `/schedule` — current user's schedule
- `/attendance` — admin attendance
- `/staff-attendance` — staff attendance
- `/student-attendance` — student attendance
- `/exams` — role-selected examinations
- `/users` — user management
- `/users/[id]/profile` — user profile by ID
- `/profile` — current user's profile
- `/my-class` — staff class roster
- `/staff-debug` — staff debugging page

Navigation exposes role-specific links for Admin (role 1), Staff (2), Student (3), and Parent (4). Parent navigation includes dashboard/profile; no Parent test credentials were supplied.

### 1.2 API Endpoints

The frontend calls the following API families; backend method/schema/authorization details are not available in this checkout and must be confirmed from the backend before execution:

- Auth: `/api/auth/login`, `/api/auth/me`, `/api/auth/refresh`, `/api/auth/logout`
- Users and profiles: `/api/users`, `/api/user-details`, `/api/user-images`
- Students and staff: `/api/students`, `/api/staff`, `/api/classes/students`
- Academic setup: `/api/grades`, `/api/sections`, `/api/subjects`, `/api/roles`
- Scheduling: `/api/scheduling/sessions`, `/api/scheduling/timetables`
- Attendance: `/api/attendance`, `/api/attendance/bulk`, `/api/attendance/teacher`, `/api/attendance/student-report`
- Exams: `/api/exams` and nested assigned, subjects, marks, results, roster, schedule, progress, publish operations

Source: `erp/lib/api.ts`, `erp/lib/auth.ts`, `erp/lib/attendanceApi.ts`, `erp/lib/examApi.ts`, and route components.

## 2. Constraints (MUST)

### 2.1 Behaviors

#### B1: Sign-in and session lifecycle

- **Preconditions**: local app and configured backend are reachable; test account is provisioned. Browser begins signed out.
- **Trigger**: user submits valid or invalid credentials, refreshes a signed-in page, or logs out.
- **Expected (eventually)**:
  - Valid supplied Admin and Student credentials establish an authenticated session and route to the dashboard.
  - Invalid/empty/malformed credentials show a safe error and do not establish a session.
  - Session refresh, expiry, logout, and protected-route behavior agree with backend token/cookie behavior.
  - Passwords do not appear in URL, browser storage, logs, or reports. Access-token storage behavior is explicitly assessed as a security concern.
- **Logical basis**: login stores `access_token` and serialized `user` in `localStorage`, then routes to dashboard; shared API code adds Bearer token and includes credentials, attempts refresh on 401, and clears local session if refresh fails. Backend semantics remain unknown.

#### B2: Role-specific navigation and access

- **Preconditions**: authenticated Admin, Student, and (after user supplies password) Staff accounts; backend authorization available.
- **Trigger**: user follows navigation or directly opens each route and attempts an operation outside their role.
- **Expected**: permitted pages/records render; unauthorized pages and API mutations are rejected server-side; changing IDs cannot expose another user's/student's records.
- **Logical basis**: navigation and several pages branch on client-side role IDs. This proves UI behavior only; server-side enforcement must be verified independently.

#### B3: Admin user, student, staff, and academic CRUD

- **Preconditions**: confirmed safe development/test database; baseline state recorded; uniquely identifiable test data.
- **Trigger**: Admin creates, lists, searches, edits, links, and deletes supported users, students, staff, grades, sections, and subjects; submits invalid and duplicate values.
- **Expected**: valid changes persist with correct relationships; invalid, duplicate, malformed, or nonexistent references return safe errors without partial writes; existing accounts and records remain intact.
- **Logical basis**: UI components call corresponding REST endpoints with list/detail/create/update/delete operations. Backend constraints and transactions are not in this repository.

#### B4: Class assignment, schedule, and roster workflows

- **Preconditions**: applicable academic year, grade, section, subject, staff, student, and timetable relationships exist in confirmed test data.
- **Trigger**: Admin configures schedules and assignments; Staff/Student views their schedule or class roster.
- **Expected**: schedule and roster content reflects authorized assignments and academic-year boundaries; unassigned Staff cannot access another class.

#### B5: Attendance lifecycle

- **Preconditions**: valid timetable/class session and roster; Staff credentials required for Staff-specific workflow.
- **Trigger**: eligible user views attendance, records/edits attendance, or views summaries/reports.
- **Expected**: supported statuses and dates validate; duplicate/repeated submission is handled consistently; stored records and dashboard summaries agree; cross-role/class access is denied.

#### B6: Examination and marks lifecycle

- **Preconditions**: existing exam configuration and relevant test roster; backend grading rules discovered before choosing boundaries.
- **Trigger**: Admin configures/publishes exam; Staff enters/completes/corrects marks; Student views published results.
- **Expected**: class/subject/roster relationships are correct, invalid marks are rejected, publication visibility follows role and state, and result calculations match configured rules.

#### B7: Dashboards and profiles

- **Preconditions**: role account and known test data.
- **Trigger**: user views role dashboard/profile and (where enabled) edits permitted profile fields or uploads an image.
- **Expected**: counts/graphs match API/database records; profiles are scoped to current identity unless an authorized Admin action; uploaded files are safely validated and served.

### 2.2 Invariants

- **Client-side**: passwords are never put in URLs or persisted after login; no secret appears in screenshots/reports. Current implementation stores access tokens in localStorage and must be evaluated against threat model.
- **Server-side**: every API mutation/read enforces authentication, role, ownership, and assigned-class scope; request bodies cannot grant role/ownership; sensitive server errors do not expose stack traces or secrets.
- **Cross-cutting**: existing user and student records are preserved; unauthorized users cannot distinguish or retrieve other students' sensitive information through direct IDs; persisted state agrees with successful UI feedback.

### 2.3 Out of Scope

#### 3.4a Out of Scope - Business Boundary

- Production deployment, push, commit, and production infrastructure changes — explicitly excluded by the user.
- Staff login until the user provides the Staff password — explicitly required by the user.
- Parent account workflows — no Parent credential supplied and Parent is outside supplied three-role test set; static review remains included where relevant.

#### 3.4b Out of Scope - Engineering Boundary

- Backend/database behavior — backend source is absent from this checkout and configured service did not respond during initial check. Risk: all persistence, validation, authorization, migrations, and DB integrity claims remain unverified. Alternative: review frontend/API contract; resume integration checks when backend is available.
- Browser execution — local frontend did not respond and Playwright availability has not yet been established. Risk: rendering, console, network, and responsive behavior remain unverified. Alternative: use installed browser/Playwright capability after app startup.
- Write-path testing — active database identity and safety cannot be established while backend is unavailable. Risk: data workflows remain untested. Alternative: keep checks read-only until environment is confirmed.

### 2.4 Setup Strategy

- For execution, start frontend from `erp` using `npm run dev`; make sure it targets the configured local backend. Confirm the backend's database name/environment and migration state before any writes. Authenticate through the browser using only the supplied Admin/Student credentials; request Staff password before Staff login. Use UI interactions for test steps; API/database access only for explicit security supplemental probes and server-state verification.

## 3. Hints (SHOULD)

### 3.1 Boundary Values

- Discover actual server-side field limits, formats, mark maximums, date/session rules, and upload limits from backend schemas before selecting boundary tests; none can be inferred safely from this frontend checkout alone.

### 3.2 Decision Table

| Identity/session | Role | Object in permitted scope | Expected |
|---|---|---|---|
| Missing/invalid | Any | Any protected resource | Denied; no data returned or mutation |
| Valid | Admin | In-scope management | Allowed where implemented |
| Valid | Staff | Assigned classes/subjects only | Allowed only within assignment |
| Valid | Student | Own data and published results | Read only within own scope |
| Valid | Any non-admin | Admin management endpoint | Denied by backend |

### 3.3 State Machine

- Session states: signed out → authenticated → refreshed or expired → signed out; exact server cookie/token lifecycle requires backend confirmation.
- Exam states: configured/scheduled/published behavior is indicated by UI operations; exact allowed transitions require backend confirmation.
- Attendance and academic record states/rollback behavior require backend schema and service inspection.

### 3.4 Scenario Pattern Identification

- Use case testing for multi-role business workflows and state transitions for session/exam lifecycle. Use equivalence partitioning and boundary-value analysis only after backend validators and business limits are known. Decision-table testing applies to role × ownership/assignment access.

