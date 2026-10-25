# Solvane frontend audit and redesign checklist

Reviewed the frontend source, role-aware navigation, API/auth helpers, app configuration, shared styles, and the no-slop design references. “Updated” identifies direct edits in this redesign; “Verified” means reviewed and retained with the shared theme/responsive token bridge. Routes retain their existing data and permission behavior.

## Routes

| Route | Role / feature | Status |
| --- | --- | --- |
| `/` | Entry / redirect | Audited; verified |
| `/login` | All roles / sign-in | Audited; verified |
| `/dashboard` | Admin, staff, student, parent role switch | Admin dashboard replaced with live school analytics; other role dashboards unchanged |
| `/academic` | Admin / grades and sections | Audited; verified |
| `/attendance` | Admin / attendance management; student role branch | Audited; verified |
| `/class` | Admin / class management | Audited; verified |
| `/exams` | Admin, staff, student / exam workflows by role | Updated for staff; audited and verified for admin/student |
| `/my-class` | Staff / assigned class and roster | Updated; verified |
| `/profile` | All roles / profile | Audited; verified |
| `/schedule` | Staff and student / personal timetable | Audited; verified |
| `/scheduling` | Admin / timetable scheduling | Updated with shared loader; verified |
| `/staff` | Admin / staff records | Audited; verified |
| `/staff-attendance` | Staff / take attendance and review reports | Updated; verified |
| `/staff-debug` | Staff / assignment diagnostics | Updated with shared loader; verified |
| `/student-attendance` | Student / attendance history | Audited; verified |
| `/students` | Admin / student records | Audited; verified |
| `/users` | Admin / user administration | Audited; verified |
| `/users/[id]/profile` | Admin / user profile record | Audited; verified |

No announcement or digital diary route/component exists in the inspected frontend. These were not added.

## Role-specific screens

| Role | Screens/components | Status |
| --- | --- | --- |
| Admin | Dashboard, student records, staff records, classes, grades/sections, scheduling, attendance, exams, users, user profile, personal profile | Dashboard updated; loading states standardized; remaining screens audited and verified with shared theme bridge |
| Staff | Dashboard, assigned class/roster, attendance marking/history, exam evaluation, timetable, profile, assignment diagnostics | Dashboard, class/roster, attendance, exam evaluation, and diagnostics updated; timetable and profile audited and verified |
| Student | Dashboard, attendance, exams/results, timetable, profile | Dashboard, charts, and loading states updated; remaining screens audited and verified |
| Parent | Dashboard and profile | Audited and verified |

## UI and infrastructure files

| Files | Status |
| --- | --- |
| `app/page.tsx`, `app/login/page.tsx`, `app/academic/page.tsx`, `app/attendance/page.tsx`, `app/class/page.tsx`, `app/exams/page.tsx`, `app/profile/page.tsx`, `app/schedule/page.tsx`, `app/scheduling/page.tsx`, `app/staff/page.tsx`, `app/staff-debug/page.tsx`, `app/student-attendance/page.tsx`, `app/students/page.tsx`, `app/users/page.tsx`, `app/users/[id]/profile/page.tsx` | Audited; verified with shared theme and responsive styles |
| `app/dashboard/page.tsx`, `app/my-class/page.tsx`, `app/staff-attendance/page.tsx` | Updated; verified |
| `app/layout.tsx`, `app/globals.css`, `app/design-system.css`, `config/design-system.ts` | Updated: font, semantic theme, layout tokens, Tailwind bridge, early theme initialization, responsive/shared surface rules |
| `components/sidebar.tsx` | Updated: compact header layout, accessible 44px control, compact-mode labels/account handling, mobile drawer, immediate content width response |
| `components/theme-provider.tsx`, `components/ui/button.tsx`, `components/ui/form-field.tsx`, `components/ui/page-header.tsx` | Added shared theme and UI components |
| `components/ui/loader.tsx`, `app/loading.tsx` | Added the supplied animated loader as a reusable component and App Router fallback; `motion` added as a dependency |
| `components/dashboards/admin-dashboard.tsx`, `components/dashboards/staff-dashboard.tsx`, `components/dashboards/student-dashboard.tsx`, `components/ui/line-charts-9.tsx` | Updated: shared headers, accurate staff attendance rate, theme-aware real-data charts |
| `components/exams/staff-exam.tsx` | Updated: staff evaluation header and shared refresh control; existing API workflows retained |
| `components/dashboards/page.tsx`, `components/dashboards/parent-dashboard.tsx`, `components/profile/profile-editor.tsx`, `components/session-guard.tsx`, `components/image-slider.tsx`, `components/Card .tsx`, `components/ui/card.tsx` | Audited; verified against shared styles and existing feature behavior |
| `components/dashboards/student-attendance.tsx`, `components/exams/admin-exam.tsx`, `components/exams/student-exam.tsx`, `components/StaffAssignmentDebug.tsx` | Updated to use the shared loader for data loads; action-level feedback preserved |
| `lib/api.ts`, `lib/attendanceApi.ts`, `lib/auth.ts`, `lib/examApi.ts`, `lib/utils.ts` | API base URL now honors `NEXT_PUBLIC_BACKEND_API_URL` (local default `http://127.0.0.1:8000` in development); normalized subjects URL; live backend OpenAPI paths checked |
| `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, repository guidance, public assets | Audited; existing configuration and assets retained |
| `package.json`, `package-lock.json` | Updated with the requested `motion` runtime dependency |

The `no-slop-ui` reference files were read and left unchanged. No backend files or API contracts were changed.

## Sidebar diagnosis

The desktop rail kept `pointer-events-none` from its closed mobile-drawer state. Desktop classes restored visibility and opacity, but did not restore pointer events, leaving the visible sidebar inert. The desktop state now adds `lg:pointer-events-auto`. The rail defaults to hover expansion and collapses on pointer exit; its control pins the expanded state, then returns to hover behavior when unpinned. The control is hidden while collapsed. The mobile drawer and backdrop behavior remain unchanged.

## Shared loader coverage

The supplied component uses `motion/react`; `motion` was missing and is now installed. The loader was added at `components/ui/loader.tsx` and used for the app route fallback, session/page initialization, dashboard and chart data, attendance/report/roster data, academic and class tables, staff/student/user lists, exam data, profiles, schedules, and staff assignment diagnostics. Existing button-level “Saving”, “Uploading”, “Searching”, and other action feedback remains local to those actions. Errors and empty states continue through their existing branches.

## Verification record

- An authenticated local admin session rendered the dashboard at the connected browser's 854px viewport. The KPI and chart grid was visually checked and adjusted to a balanced two-column tablet layout. Dedicated 320, 375, 768, 1024, and 1440px viewport sweeps were not available.
- Lint, type-check, and production build results are recorded in the task completion report.
- The package does not define a test script or test suite.
- Fixed the theme pre-hydration mismatch reported in the console by marking the root `<html>` with `suppressHydrationWarning`; the early theme initializer remains in place to prevent a flash.
- Local backend checks: `GET /health` returned `{"status":"ok","message":"API is running"}`. `GET /openapi.json` confirmed the frontend's schedule/admin attendance routes and assigned-exam progress route are implemented; the progress route is present in OpenAPI even though it is omitted from the supplied summary table.
- Production build was attempted in an isolated output directory to avoid the running dev server's `.next` files. It could not complete because Next.js could not fetch the existing Geist fonts from `fonts.googleapis.com` in this environment.
- The admin overview now follows the provided 21.dev reference's compact bento-card hierarchy, filters, and restrained chart treatment while using school-specific data from existing APIs. It includes student/staff totals, recorded attendance, enabled accounts by role, exam averages/trends, subject/class comparisons, enrollment trend, and existing administration shortcuts.
- No fee or login-activity metrics are shown because the available API has no fee or last-login/activity endpoint. Attendance rates use recorded rows (present + late divided by all recorded statuses), and exam averages use entered non-absent marks. Backend source code is not included in this frontend workspace, so aggregations use existing API responses; no new backend analytics endpoint was added.
- The deployed API base URL now honors `NEXT_PUBLIC_BACKEND_API_URL`; production builds ignore loopback/private-network values and use the public backend fallback, preventing an accidental deployed request to local services.
- The full repository lint, `npx tsc --noEmit`, and `git diff --check` passed. The production build remains blocked by the environment's inability to fetch the existing Geist fonts.
