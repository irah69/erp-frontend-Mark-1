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

        {/* Students */}
        <Link
          className="dashboard-action"
          href="/students"
        >
          <strong>Students</strong>
          <span>
            Create, update, and manage student profiles →
          </span>
        </Link>

        {/* Staff */}
        <Link
          className="dashboard-action"
          href="/staff"
        >
          <strong>Staff</strong>
          <span>
            Create, update, and manage staff profiles →
          </span>
        </Link>

        {/* Users */}
        <Link
          className="dashboard-action"
          href="/users"
        >
          <strong>Users</strong>
          <span>
            Manage accounts and student relationships →
          </span>
        </Link>

        {/* Class overview */}
        <Link
          className="dashboard-action"
          href="/class"
        >
          <strong>Class</strong>
          <span>
            View assigned staff and students by grade and section →
          </span>
        </Link>

        {/* Grades */}
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

      <div className="user-info-card">
        <p className="eyebrow">
          Signed-in administrator
        </p>

        <div className="info-grid">

          <span>
            Username
            <strong>{user.username}</strong>
          </span>

          <span>
            Email
            <strong>{user.email}</strong>
          </span>

          <span>
            User ID
            <strong>{user.id}</strong>
          </span>

          <span>
            Role ID
            <strong>{user.role_id}</strong>
          </span>

        </div>
      </div>
    </section>
  );
}