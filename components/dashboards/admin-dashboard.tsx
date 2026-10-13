import Link from "next/link";
import type { CurrentUser } from "../../lib/auth";

export default function AdminDashboard({
  user,
}: {
  user: CurrentUser;
}) {
  return (
    <section className="page-section dashboard-page">
      <p className="eyebrow">Administrator workspace</p>

      <h1>Welcome back, {user.username}.</h1>

      <p>
        Manage students, academic structure, accounts, and access
        from your admin dashboard.
      </p>

      <div className="dashboard-actions">
        <Link
          className="dashboard-action"
          href="/students"
        >
          <strong>Students</strong>
          <span>
            Create, update, and manage student profiles →
          </span>
        </Link>

        <Link
          className="dashboard-action"
          href="/staff"
        >
          <strong>Staff</strong>
          <span>
            Create, update, and manage staff profiles →
          </span>
        </Link>

        <Link
          className="dashboard-action"
          href="/users"
        >
          <strong>Users</strong>
          <span>
            Manage accounts and student relationships →
          </span>
        </Link>

        <Link
          className="dashboard-action"
          href="/class"
        >
          <strong>Class</strong>
          <span>
            View assigned staff and students by grade and section →
          </span>
        </Link>

        <Link
          className="dashboard-action"
          href="/academic"
        >
          <strong>Grades</strong>
          <span>
            Create, update, and manage academic grades →
          </span>
        </Link>

      </div>

    </section>
  );
}