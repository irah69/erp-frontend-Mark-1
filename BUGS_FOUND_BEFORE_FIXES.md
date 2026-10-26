# Bugs Found Before Fixes

This is the evidence log of defects found during the pre-deployment audit. **No fixes have been applied.** Findings will be added here as testing continues, before any remediation is considered.

## Confirmed bugs

### BUG-001 — Password recovery link opens a 404

- **Severity**: P2 (feature unavailable; lower priority than core authentication)
- **Status**: Confirmed; not fixed
- **Affected UI**: Login page, “Forgot password?” link
- **Evidence**: Signed-in browser navigated to `http://localhost:3000/forgot-password`; the rendered page showed `404` and “This page could not be found.” The frontend route inventory contains no `/forgot-password` page, while `erp/app/login/page.tsx` links to that path.
- **Impact**: Users who cannot remember their password have no working recovery path from the login screen.
- **Reproduction**: Open `/login` → activate “Forgot password?” → observe 404.
- **Suggested fix**: Implement the supported recovery flow or remove/disable the link until a working flow exists. Do not change until the audit's pre-fix findings list is complete.

### BUG-002 — Student “My schedule” sidebar page fails to load

- **Severity**: P2 (student schedule feature unavailable for the supplied Student account)
- **Status**: Reproduced; root cause not yet isolated; not fixed
- **Affected UI**: Student sidebar → My schedule
- **Evidence**: Signed in as Student, opened **My schedule** from the visible sidebar, and waited for loading to finish. The page showed “Unable to load schedule” / “Request failed”. Activating “Try again” repeated the same result. The Student dashboard and Student attendance/exam pages load successfully for the same account.
- **Reproduction**: Sign in as Student → open sidebar → choose **My schedule** → observe error → select **Try again** → observe same error.
- **Root cause**: Confirmed in source. `app/schedule/page.tsx:219-222` requests grades, sections, subjects, and staff together before role-specific processing. Backend GET routes for grades, sections, and subjects use `require_admin_or_staff` (`Mark-1/api/grade_api.py:39`, `sections_api.py:40`, `subject_api.py:40`), which rejects Students. The `Promise.all` rejects and the page displays the generic request error. This conflicts with the Student schedule link exposed in the sidebar.
- **Suggested fix**: Make the Student schedule use a Student-authorized endpoint/data subset, or grant only the necessary read scope; show a meaningful empty state when no schedule exists. Do not change until the audit's pre-fix findings list is complete.

### SEC-001 — Authenticated non-admin users can enumerate Staff contact numbers

- **Severity**: Medium
- **Status**: Confirmed from source; not fixed
- **Affected API**: `GET /api/staff` and `GET /api/staff/{staff_id}`
- **Evidence**: `Mark-1/api/staff_api.py:34-48` protects both reads only with `get_current_user`, not an Admin/Staff authorization dependency. `Mark-1/models/staff_model.py:6,11-18,23-32` returns each Staff record's ID, name, phone number, status, and creation time. The normal sidebar lists Staff management for Admin only (`components/sidebar.tsx`); the route itself is not linked for Students. The debug component also fetches the entire staff list for a Staff user (`components/StaffAssignmentDebug.tsx:89-93`).
- **Attack path**: Any authenticated Student (or other non-admin account) calls `GET /api/staff` or changes a `staff_id` on `GET /api/staff/{staff_id}` → endpoint accepts any authenticated user → returns staff directory details including phone numbers.
- **Impact**: Disclosure of staff contact information beyond the normal Admin-only Staff management surface.
- **Suggested fix**: Restrict list/detail reads to roles and records that need them, or expose a minimal directory response without private contact numbers. Do not change until the audit's pre-fix findings list is complete.

### SEC-002 — Logout does not revoke an issued access token

- **Severity**: Medium (limited by the short access-token lifetime)
- **Status**: Confirmed from source; not fixed
- **Affected flow**: Logout and subsequent use of an already-issued bearer token
- **Evidence**: `Mark-1/services/auth_service.py:309-335` revokes the refresh-token record and clears its cookie. Access tokens are stateless JWTs with a 15-minute default lifetime (`Mark-1/utils/jwt.py:14,25-33`); `Mark-1/security/auth.py:24-58` validates signature/type/expiry and account state but does not check an access-token revocation record. The frontend clears its local token, which does not invalidate a copied bearer token.
- **Attack path**: An attacker obtains a valid access token before logout → the user logs out → the attacker continues using that bearer token until expiry.
- **Impact**: A stolen access token remains usable for up to its remaining lifetime after logout.
- **Suggested fix**: Use a revocable access-session identifier/denylist, or document and enforce an acceptable short revocation window. Do not change until the audit's pre-fix findings list is complete.

### Observation requiring product confirmation — GET attendance-session lookup creates database rows

- **Severity**: Potential data-integrity/design issue; pending intent confirmation
- **Status**: Code path confirmed; exact rows created during this run cannot be distinguished safely from pre-existing rows
- **Evidence**: Selecting a class/date in the Admin Attendance UI calls `GET /api/scheduling/sessions/by-class`. `Mark-1/services/scheduling_service.py:1036-1186` inserts missing `class_sessions` for timetable slots and commits the transaction before returning the GET response.
- **Impact**: Merely viewing attendance for a class/date can create class-session records. During this run, the UI selected the Admin Class 10 / Section A attendance view for 2026-10-26 and 2026-10-27, so this endpoint may have created missing session rows. No IDs or pre-run snapshot were captured; I will not delete potentially pre-existing rows.
- **Suggested fix**: Confirm that lazy session materialization is intended. If not, move it to an explicit idempotent command or write endpoint and keep GET read-only.

## Potential security concerns under review

- The frontend stores its access token in `localStorage` (`erp/app/login/page.tsx` and `erp/lib/api.ts`). This increases token exposure if same-origin script execution is compromised; no exploitable XSS path has been established yet, so this is not currently classified as a confirmed vulnerability.

## Audit state

- Frontend reachable at `http://localhost:3000`; local backend configured at `http://127.0.0.1:8000` responded to the Admin login and dashboard requests.
- Student login, dashboard, attendance summary/history, and published exam results were verified through the actual browser UI. Student schedule failure was reproduced.
- User confirmed `localhost:5432/erp` is a local development database and safe for testing. Controlled test writes may proceed; possible GET-side-effect session rows are described above.
- No code fixes have been applied.
- Existing uncommitted workspace changes in the student dashboard and attendance API have been preserved.
